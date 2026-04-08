"""
API Flask para streaming de video con detección de vehículos en tiempo real
"""
import cv2
import logging
import threading
import time
import uuid
import queue
from dataclasses import dataclass, asdict, field
from typing import Dict, Optional, Generator, List, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo
from flask import Flask, Response, request, jsonify
from flask_cors import CORS

import config
from detectors import VehicleDetector
from video import CameraSource, StreamSource
from api import BackendClient, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


@dataclass
class StreamSession:
    session_id: str
    stream_type: str
    source: str
    status: str
    created_at: datetime
    video_source: Optional[object] = None
    detector: Optional[VehicleDetector] = None
    is_running: bool = False
    last_frame_bytes: Optional[bytes] = None
    last_frame_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    frame_event: threading.Event = field(default_factory=threading.Event, compare=False, repr=False)
    # Frame más reciente del reader thread (compartido con processor)
    _current_frame: Optional[object] = None
    _current_frame_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    # Últimas detecciones (lista de tuples (xyxy, label, conf, cx, cy)) — escritas por yolo thread
    last_detections: Optional[List[Tuple]] = None
    _detections_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    # Detecciones del frame anterior (para drawing deferido — evita lag en drawing)
    prev_detections: Optional[List[Tuple]] = None
    # Cola de eventos de detección para envío asíncrono al backend
    detection_event_queue: queue.Queue = field(default_factory=queue.Queue, compare=False, repr=False)
    # Contador de frames leídos — YOLO sólo procesa cuando cambia (evita trabajo redundante)
    _frame_id: int = 0
    # Dimensiones originales del frame (antes de redimensionar)
    frame_width: int = 0
    frame_height: int = 0
    # ID de la ubicación/cámara (si se proporcionó al iniciar la sesión)
    location_id: Optional[int] = None


class StreamManager:
    """
    Gestor de múltiples streams de video concurrentes.
    Thread-safe para permitir múltiples clientes simultáneos.
    """
    
    def __init__(self):
        self.sessions: Dict[str, StreamSession] = {}
        self.lock = threading.Lock()
        self.logger = logging.getLogger(__name__)
            
        # Inicializar cliente backend para guardar detecciones
        self.backend_client = None
        if config.SEND_DETECTIONS_ENABLED:
            try:
                self.backend_client = BackendClient(
                    base_url=config.BACKEND_URL,
                    timeout=config.BACKEND_TIMEOUT
                )
                self.logger.info(f"Backend client configurado: {config.BACKEND_URL}")
            except Exception as e:
                self.logger.warning(f"No se pudo inicializar backend client: {e}")
    
    def create_stream(self, stream_type: str, source: str, location_id: Optional[int] = None) -> Dict:
        """
        Crea una nueva sesión de streaming.
        
        Args:
            stream_type: Tipo de stream (USB, URL, RTSP, YOUTUBE)
            source: Fuente del video (índice de cámara o URL)
            
        Returns:
            Diccionario con sessionId y estado
        """
        session_id = str(uuid.uuid4())
        
        try:
            if stream_type == "USB":
                camera_index = int(source)
                video_source = CameraSource(camera_index)
            else:
                video_source = StreamSource(
                    url=source,
                    ytdlp_options=config.YTDLP_OPTIONS,
                    ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
                )
            
            if not video_source.open():
                self.logger.error(f"No se pudo abrir la fuente de video: {source}")
                return {"error": "Cannot open video source", "status": "failed"}
            
            detector = VehicleDetector(
                model_path=config.YOLO_MODEL_PATH,
                vehicle_classes=config.VEHICLE_CLASSES,
                dist_threshold=config.DIST_THRESHOLD,
                time_threshold=config.TIME_THRESHOLD,
                line_tolerance=config.LINE_TOLERANCE
            )
            detector.model.to(config.YOLO_DEVICE)
            
            session = StreamSession(
                session_id=session_id,
                stream_type=stream_type,
                source=source,
                status="active",
                created_at=datetime.now(ZoneInfo("America/Bogota")),
                video_source=video_source,
                detector=detector,
                is_running=True,
                location_id=location_id
            )
            
            with self.lock:
                self.sessions[session_id] = session

            # Iniciar thread lector (solo cap.read en loop)
            reader = threading.Thread(
                target=self._frame_reader,
                args=(session_id,),
                daemon=True,
                name=f"reader-{session_id[:8]}"
            )
            reader.start()

            # Iniciar thread YOLO (detección asíncrona — no bloquea el encoder)
            yolo = threading.Thread(
                target=self._yolo_detector,
                args=(session_id,),
                daemon=True,
                name=f"yolo-{session_id[:8]}"
            )
            yolo.start()

            # Iniciar thread encoder (solo encoding JPEG, nunca bloqueado por YOLO)
            processor = threading.Thread(
                target=self._frame_processor,
                args=(session_id,),
                daemon=True,
                name=f"processor-{session_id[:8]}"
            )
            processor.start()

            # Iniciar worker thread para envío de detecciones al backend (no bloquea YOLO thread)
            if self.backend_client:
                backend_worker = threading.Thread(
                    target=self._backend_worker,
                    args=(session_id,),
                    daemon=True,
                    name=f"backend-{session_id[:8]}"
                )
                backend_worker.start()

            self.logger.info(f"Stream creado: {session_id} ({stream_type}: {source})")
            return {
                "sessionId": session_id,
                "status": "active",
                "streamType": stream_type
            }
            
        except ValueError as e:
            self.logger.error(f"Valor inválido para fuente: {source}")
            return {"error": f"Invalid source value: {str(e)}", "status": "failed"}
        except Exception as e:
            self.logger.error(f"Error al crear stream: {e}")
            return {"error": str(e), "status": "failed"}
    
    def get_stream(self, session_id: str) -> Optional[StreamSession]:
        """
        Obtiene una sesión de streaming por su ID.
        
        Args:
            session_id: ID de la sesión
            
        Returns:
            StreamSession si existe, None en caso contrario
        """
        with self.lock:
            return self.sessions.get(session_id)
    
    def stop_stream(self, session_id: str) -> bool:
        """
        Detiene y elimina una sesión de streaming.
        Espera a que los threads terminen antes de liberar VideoCapture
        para evitar SIGSEGV.
        
        Args:
            session_id: ID de la sesión a detener
            
        Returns:
            True si se detuvo exitosamente, False si no existe
        """
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            
            # Señalar a los threads que paren
            session.is_running = False
            session.status = "stopped"
            del self.sessions[session_id]

        # Esperar fuera del lock a que los threads terminen (máx 3s)
        time.sleep(0.5)

        # Ahora es seguro liberar VideoCapture
        if session.video_source:
            try:
                session.video_source.release()
            except Exception as e:
                self.logger.warning(f"Error al liberar video source: {e}")
        
        self.logger.info(f"Stream detenido: {session_id}")
        return True
    
    def get_status(self, session_id: str) -> Dict:
        """
        Obtiene el estado de una sesión.
        
        Args:
            session_id: ID de la sesión
            
        Returns:
            Diccionario con información del estado
        """
        session = self.get_stream(session_id)
        if not session:
            return {"error": "Session not found", "status": "not_found"}
        
        return {
            "sessionId": session.session_id,
            "status": session.status,
            "streamType": session.stream_type,
            "isRunning": session.is_running,
            "detectionCount": session.detector.get_count() if session.detector else 0
        }
    
    def _frame_reader(self, session_id: str):
        """
        Thread dedicado SOLO a leer frames de VideoCapture.
        Siempre guarda el frame más reciente para que el processor nunca
        trabaje con frames atrasados (drena el buffer de red/cámara).
        Para fuentes HTTP/YouTube, throttlea la lectura al FPS de la fuente
        para no consumir el video instantáneamente.
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            return

        cap = session.video_source.get_capture()
        if not cap:
            self.logger.error(f"Reader: no se pudo obtener VideoCapture para {session_id}")
            return

        # Calcular delay entre lecturas basado en FPS de la fuente
        try:
            fps = session.video_source.get_fps()
            frame_interval = 1.0 / fps if fps > 0 else 1.0 / 30
        except Exception:
            frame_interval = 1.0 / 30

        while session.is_running:
            try:
                read_start = time.time()
                ret, frame = cap.read()
                if not ret:
                    self.logger.warning(f"Reader: fin de stream {session_id}")
                    session.is_running = False
                    break
                with session._current_frame_lock:
                    session._current_frame = frame
                    session._frame_id += 1  # señal al YOLO: frame nuevo disponible

                # Throttle: si cap.read() fue muy rápido (fuente HTTP/buffered),
                # dormir para respetar el FPS original del video.
                # Para RTSP/cámaras, cap.read() ya tarda ~frame_interval así que
                # el sleep será ~0 y no afecta.
                elapsed = time.time() - read_start
                sleep_time = frame_interval - elapsed
                if sleep_time > 0.001:
                    time.sleep(sleep_time)
            except Exception as e:
                if not session.is_running:
                    break
                self.logger.error(f"Reader: error leyendo frame: {e}")
                session.is_running = False
                break

        self.logger.info(f"Reader terminado para sesión: {session_id}")

    def _yolo_detector(self, session_id: str):
        """
        Thread dedicado a inferencia YOLO.
        Corre tan rápido como el CPU permite, actualizando last_detections.
        El encoder lee last_detections de forma asíncrona — nunca es bloqueado.
        """
        session = self.get_stream(session_id)
        if not session:
            return

        # Esperar primer frame
        deadline = time.time() + 10.0
        while session._current_frame is None and session.is_running and time.time() < deadline:
            time.sleep(0.01)

        max_width = getattr(config, 'STREAM_MAX_WIDTH', 0)
        last_frame_id = -1  # ID del último frame procesado por YOLO

        while session.is_running:
            try:
                with session._current_frame_lock:
                    current_frame_id = session._frame_id
                    frame = session._current_frame

                # OPTIMIZACIÓN: sólo procesar si llegó un frame nuevo
                # Evita que YOLO consuma CPU en el mismo frame repetidamente
                if frame is None or current_frame_id == last_frame_id:
                    time.sleep(0.005)
                    continue

                frame = frame.copy()
                last_frame_id = current_frame_id

                # Redimensionar para YOLO (reduce carga de inferencia)
                process_frame = frame
                resize_scale = 1.0
                if max_width and frame.shape[1] > max_width:
                    resize_scale = max_width / float(frame.shape[1])
                    process_frame = cv2.resize(
                        frame,
                        (int(frame.shape[1] * resize_scale), int(frame.shape[0] * resize_scale))
                    )

                session.detector.clean_old_detections()
                results = session.detector.detect(process_frame)
                detections = session.detector.get_vehicle_detections(results)

                # Escalar coordenadas al tamaño original si se redimensionó
                if resize_scale != 1.0:
                    detections = [
                        (
                            (int(x1/resize_scale), int(y1/resize_scale),
                             int(x2/resize_scale), int(y2/resize_scale)),
                            label, conf,
                            int(cx/resize_scale), int(cy/resize_scale)
                        )
                        for (x1, y1, x2, y2), label, conf, cx, cy in detections
                    ]

                # Calcular line_y usando dimensiones de la sesión
                line_y = (session.frame_height // 2) if session.frame_height > 0 else (frame.shape[0] // 2)

                # Procesar conteos (thread-safe: detector tiene su propio estado)
                for (xyxy, label, conf, center_x, center_y) in detections:
                    if session.detector.update_count(center_x, center_y, line_y):
                        if self.backend_client and label in YOLO_TO_VEHICLE_TYPE:
                            # Use session-specific location_id if available, otherwise fallback to config
                            loc_id = session.location_id if getattr(session, 'location_id', None) else config.LOCATION_ID
                            event = VehicleDetectedEvent(
                                vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                                timestamp=datetime.now(ZoneInfo("America/Bogota")),
                                location_id=loc_id
                            )
                            # Encolar el evento para envío asíncrono (no bloquea YOLO thread)
                            try:
                                session.detection_event_queue.put_nowait((label, event))
                            except queue.Full:
                                self.logger.warning(f"YOLO: cola de eventos llena, descartando evento {label}")

                # Publicar detecciones para el encoder
                with session._detections_lock:
                    session.last_detections = detections

            except Exception as e:
                if not session.is_running:
                    break
                self.logger.debug(f"YOLO: error en detección: {e}")

        self.logger.info(f"YOLO detector terminado para sesión: {session_id}")

    def _frame_processor(self, session_id: str):
        """
        Thread dedicado SOLO a encoding JPEG.
        Nunca corre YOLO — toma detecciones del yolo thread y codifica a STREAM_MAX_FPS.
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            return

        # Esperar primer frame
        deadline = time.time() + 10.0
        while session._current_frame is None and session.is_running and time.time() < deadline:
            time.sleep(0.01)

        if session._current_frame is None:
            self.logger.error(f"Processor: no se recibió frame inicial para {session_id}")
            return

        with session._current_frame_lock:
            first_frame = session._current_frame.copy()

        height, width = first_frame.shape[:2]
        line_y = height // 2
        session.frame_width = width
        session.frame_height = height

        try:
            fps = session.video_source.get_fps()
            self.logger.info(f"Processor {session_id[:8]}: source FPS={fps:.1f}")
        except Exception:
            pass

        # Codificar primer frame inmediatamente
        try:
            ret_enc, buf = cv2.imencode('.jpg', first_frame,
                                        [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
            if ret_enc:
                with session.last_frame_lock:
                    session.last_frame_bytes = buf.tobytes()
                session.frame_event.set()
        except Exception as e:
            self.logger.warning(f"Processor: error al codificar primer frame: {e}")

        encode_interval = 1.0 / getattr(config, 'STREAM_MAX_FPS', 20)
        last_encode_time = time.time()
        max_width = getattr(config, 'STREAM_MAX_WIDTH', 0)
        metrics_interval = getattr(config, 'METRICS_LOG_INTERVAL', 20)
        frames_encoded = 0
        last_metrics = time.time()

        while session.is_running:
            try:
                loop_start = time.time()

                # Tomar el frame más reciente
                with session._current_frame_lock:
                    frame = session._current_frame
                if frame is None:
                    time.sleep(0.005)
                    continue
                frame = frame.copy()

                # OPTIMIZACIÓN: Dibujar detecciones del frame ANTERIOR (1 frame de delay)
                # Esto desacopla la ejecución de drawing de la ejecución de YOLO,
                # evitando picos de CPU cuando ambas ocurren simultáneamente
                with session._detections_lock:
                    current_detections = session.last_detections

                # Actualizar buffer de detecciones anteriores para próximo frame
                detections_to_draw = session.prev_detections or current_detections
                session.prev_detections = current_detections

                # OPTIMIZACIÓN: Siempre dibujar la línea de conteo (barato)
                # bbox+texto sólo cuando el vehículo está cerca de line_y
                # (zona ±DRAW_PROXIMITY_PX px alrededor de la línea)
                draw_proximity = getattr(config, 'DRAW_PROXIMITY_PX', height // 4)
                vehicle_frame = frame
                if detections_to_draw:
                    vehicle_frame = frame.copy()
                    cv2.line(vehicle_frame, (0, line_y), (width, line_y),
                             config.LINE_COLOR, config.LINE_THICKNESS)
                    for (xyxy, label, conf, center_x, center_y) in detections_to_draw:
                        # Dibujar bbox + texto sólo si el centro está dentro de la zona de la línea
                        if abs(center_y - line_y) <= draw_proximity:
                            cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]),
                                          config.BBOX_COLOR, config.BBOX_THICKNESS)
                            cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                            cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)
                        else:
                            # Fuera de zona: sólo punto pequeño para indicar presencia
                            cv2.circle(vehicle_frame, (center_x, center_y), 3, config.BBOX_COLOR, -1)

                # Redimensionar para encoding
                encode_frame = vehicle_frame
                try:
                    if max_width:
                        h, w = encode_frame.shape[:2]
                        if w > max_width:
                            scale = max_width / float(w)
                            encode_frame = cv2.resize(encode_frame, (int(w * scale), int(h * scale)))
                except Exception:
                    pass

                # Codificar a JPEG respetando STREAM_MAX_FPS
                now_encode = time.time()
                if now_encode - last_encode_time >= encode_interval:
                    try:
                        ret_enc, buf = cv2.imencode('.jpg', encode_frame,
                                                   [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
                        if ret_enc:
                            with session.last_frame_lock:
                                session.last_frame_bytes = buf.tobytes()
                            session.frame_event.set()
                            frames_encoded += 1
                            last_encode_time = now_encode
                    except Exception:
                        pass

                # Métricas periódicas
                now = time.time()
                if now - last_metrics >= metrics_interval:
                    self.logger.info(
                        f"Encoder {session_id[:8]}: encoded/s={frames_encoded / (now - last_metrics):.1f}"
                    )
                    frames_encoded = 0
                    last_metrics = now

                # Dormir lo necesario para mantener STREAM_MAX_FPS
                elapsed = time.time() - loop_start
                sleep_time = max(0, encode_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                self.logger.error(f"Processor: error en loop: {e}")
                break

        self.logger.info(f"Processor terminado para sesión: {session_id}")

    def _backend_worker(self, session_id: str):
        """
        Worker thread dedicado a procesar la cola de eventos de detección
        y enviarlos al backend de forma asíncrona (no bloquea YOLO/processor threads).
        
        Esta separación es crítica: evita que HTTP I/O bloquee la detección o
        el encoding JPEG, que son operaciones en tiempo real.
        """
        session = self.get_stream(session_id)
        if not session:
            return

        while session.is_running:
            try:
                # Intentar obtener evento de la cola con timeout
                # (si no hay evento, espera 100ms y vuelve a intentar)
                try:
                    label, event = session.detection_event_queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                # Enviar evento al backend (puede bloquearse, pero en un thread aparte)
                if self.backend_client:
                    try:
                        success = self.backend_client.send_detection(event)
                        if success:
                            self.logger.info(f"✓ {label.upper()} | Total: {session.detector.get_count()}")
                        else:
                            self.logger.warning(f"✗ {label.upper()} no guardado")
                    except Exception as e:
                        self.logger.error(f"Backend worker: error enviando detección: {e}")

            except Exception as e:
                if not session.is_running:
                    break
                self.logger.debug(f"Backend worker: error procesando cola: {e}")

        self.logger.info(f"Backend worker terminado para sesión: {session_id}")

    def generate_frames(self, session_id: str) -> Generator[bytes, None, None]:
        """
        Generador MJPEG. Espera notificación del grabber para enviar frames.
        No accede a VideoCapture directamente (thread-safe).
        """
        session = self.get_stream(session_id)
        if not session:
            self.logger.error(f"generate_frames: sesión no encontrada: {session_id}")
            return

        # Esperar primer frame (máx 5 s)
        session.frame_event.wait(timeout=5.0)

        while session.is_running:
            # Esperar a que el grabber notifique un nuevo frame
            session.frame_event.wait(timeout=1.0)
            session.frame_event.clear()

            with session.last_frame_lock:
                frame_bytes = session.last_frame_bytes

            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        self.logger.info(f"Generador de frames terminado para sesión: {session_id}")


stream_manager = StreamManager()


@app.route('/stream/start', methods=['POST'])
def start_stream():
    """
    Inicia una nueva sesión de streaming.
    
    Request Body:
        {
            "streamType": "USB|URL|RTSP|YOUTUBE",
            "source": "0" o URL completa
        }
    
    Returns:
        JSON con sessionId y estado
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        stream_type = data.get('streamType')
        source = data.get('source')
        
        if not stream_type or not source:
            return jsonify({"error": "streamType and source are required"}), 400
        
        valid_types = {"USB", "URL", "RTSP", "YOUTUBE"}
        if stream_type not in valid_types:
            return jsonify({"error": f"Invalid streamType. Must be one of: {valid_types}"}), 400
        
        # Optional: allow caller to provide a location id for this camera/session
        location_id = None
        if isinstance(data.get('location'), dict):
            try:
                location_id = int(data['location'].get('id'))
            except Exception:
                location_id = None
        else:
            try:
                location_id = int(data.get('location_id') or data.get('location') or 0) or None
            except Exception:
                location_id = None

        result = stream_manager.create_stream(stream_type, source, location_id=location_id)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Error en /stream/start: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/stream/feed/<session_id>')
def stream_feed(session_id):
    """
    Endpoint MJPEG para visualizar el stream de video.
    
    Args:
        session_id: ID de la sesión
    
    Returns:
        Stream MJPEG multipart/x-mixed-replace
    """
    session = stream_manager.get_stream(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    response = Response(
        stream_manager.generate_frames(session_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Connection'] = 'keep-alive'
    return response


@app.route('/stream/snapshot/<session_id>')
def stream_snapshot(session_id):
    """
    Retorna un único frame JPEG del stream activo.
    Usado como fallback para navegadores que no soportan MJPEG (Safari/iOS).

    Parámetros query opcionales:
        w: ancho máximo en px (ej. 640). Si el frame es más ancho, se redimensiona.
        q: calidad JPEG 1-100 (default: calidad original del stream).

    Args:
        session_id: ID de la sesión

    Returns:
        Frame JPEG con cabeceras no-cache
    """
    session = stream_manager.get_stream(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    # Esperar brevemente si el grabber aún no produjo el primer frame
    if not session.last_frame_bytes:
        deadline = time.time() + 3.0
        while not session.last_frame_bytes and session.is_running and time.time() < deadline:
            time.sleep(0.05)

    with session.last_frame_lock:
        frame_bytes = session.last_frame_bytes

    if not frame_bytes:
        return jsonify({"error": "No frame available yet"}), 503

    # Re-encode si el cliente pide ancho o calidad diferentes
    req_width = request.args.get('w', type=int)
    req_quality = request.args.get('q', type=int)
    if req_width or req_quality:
        import numpy as np
        arr = np.frombuffer(frame_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            if req_width and img.shape[1] > req_width:
                scale = req_width / float(img.shape[1])
                img = cv2.resize(img, (req_width, int(img.shape[0] * scale)))
            quality = max(10, min(100, req_quality)) if req_quality else config.STREAM_JPEG_QUALITY
            ret, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if ret:
                frame_bytes = buf.tobytes()

    response = Response(frame_bytes, mimetype='image/jpeg')
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/stream/stop/<session_id>', methods=['POST'])
def stop_stream(session_id):
    """
    Detiene una sesión de streaming.
    
    Args:
        session_id: ID de la sesión
    
    Returns:
        JSON con confirmación
    """
    success = stream_manager.stop_stream(session_id)
    
    if not success:
        return jsonify({"error": "Session not found"}), 404
    
    return jsonify({"message": "Stream stopped successfully", "sessionId": session_id}), 200


@app.route('/stream/status/<session_id>', methods=['GET'])
def stream_status(session_id):
    """
    Obtiene el estado de una sesión.
    
    Args:
        session_id: ID de la sesión
    
    Returns:
        JSON con información del estado
    """
    status = stream_manager.get_status(session_id)
    
    if "error" in status:
        return jsonify(status), 404
    
    return jsonify(status), 200


@app.route('/health', methods=['GET'])
def health():
    """
    Endpoint de health check.
    
    Returns:
        JSON con estado del servicio
    """
    return jsonify({
        "status": "healthy",
        "service": "vehicle-detection-streaming",
        "activeSessions": len(stream_manager.sessions)
    }), 200


if __name__ == '__main__':
    logger.info(f"Iniciando servidor Flask en {config.FLASK_HOST}:{config.FLASK_PORT}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG, threaded=True)
