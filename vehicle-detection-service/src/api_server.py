"""
API Flask para streaming de video con detección de vehículos en tiempo real
"""
import cv2
import logging
import threading
import time
import uuid
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
    # Últimas detecciones (lista de tuples (xyxy, label, conf, cx, cy))
    last_detections: Optional[List[Tuple]] = None
    # Dimensiones originales del frame (antes de redimensionar)
    frame_width: int = 0
    frame_height: int = 0


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
    
    def create_stream(self, stream_type: str, source: str) -> Dict:
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
            
            session = StreamSession(
                session_id=session_id,
                stream_type=stream_type,
                source=source,
                status="active",
                created_at=datetime.now(ZoneInfo("America/Bogota")),
                video_source=video_source,
                detector=detector,
                is_running=True
            )
            
            with self.lock:
                self.sessions[session_id] = session

            # Iniciar hilo grabber dedicado (único acceso a VideoCapture)
            grabber = threading.Thread(
                target=self._run_frame_grabber,
                args=(session_id,),
                daemon=True,
                name=f"grabber-{session_id[:8]}"
            )
            grabber.start()

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
        
        Args:
            session_id: ID de la sesión a detener
            
        Returns:
            True si se detuvo exitosamente, False si no existe
        """
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            
            session.is_running = False
            session.status = "stopped"
            
            if session.video_source:
                try:
                    session.video_source.release()
                except Exception as e:
                    self.logger.warning(f"Error al liberar video source: {e}")
            
            del self.sessions[session_id]
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
    
    def _run_frame_grabber(self, session_id: str):
        """
        Hilo dedicado de captura. Es el ÚNICO consumidor de VideoCapture;
        lee, procesa y almacena cada frame en session.last_frame_bytes.
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            return

        cap = session.video_source.get_capture()
        if not cap:
            self.logger.error(f"Grabber: no se pudo obtener VideoCapture para {session_id}")
            return

        try:
            ret, first_frame = cap.read()
            if not ret:
                self.logger.error(f"Grabber: no se pudo leer frame inicial para {session_id}")
                return
            height, width = first_frame.shape[:2]
            line_y = height // 2
            # Guardar dimensiones originales en la sesión
            session.frame_width = width
            session.frame_height = height
        except Exception as e:
            self.logger.error(f"Grabber: error al leer frame inicial: {e}")
            return

        try:
            fps = session.video_source.get_fps()
            frame_delay = 1.0 / fps if fps > 0 else 1.0 / 30
            self.logger.info(f"Grabber {session_id[:8]}: FPS={fps:.1f}")
        except Exception:
            frame_delay = 1.0 / 30

        # Codificar y cachear primer frame ya disponible
        try:
            ret_enc, buf = cv2.imencode('.jpg', first_frame,
                                        [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
            if ret_enc:
                with session.last_frame_lock:
                    session.last_frame_bytes = buf.tobytes()
        except Exception as e:
            self.logger.warning(f"Grabber: error al codificar primer frame: {e}")

        # Control de tasa de encoding (no queremos codificar cada frame si la fuente va rápido)
        encode_interval = 1.0 / getattr(config, 'STREAM_MAX_FPS', 15)
        last_encode_time = time.time()

        frame = first_frame
        frame_counter = 0
        detect_every = getattr(config, 'DETECTION_SKIP_FRAMES', 1)
        max_width = getattr(config, 'STREAM_MAX_WIDTH', 0)
        metrics_interval = getattr(config, 'METRICS_LOG_INTERVAL', 10)
        frames_read = 0
        frames_encoded = 0
        last_metrics = time.time()

        while session.is_running:
            try:
                frame_start = time.time()

                ret, frame = cap.read()
                if not ret:
                    self.logger.warning(f"Grabber: fin de stream {session_id}")
                    break

                frames_read += 1
                frame_counter += 1

                # OPTIMIZACIÓN: Redimensionar ANTES de detección para reducir cálculo YOLO
                # Este es el cuello de botella - reducir tamaño == detección más rápida
                process_frame = frame
                resize_scale = 1.0
                if max_width and frame.shape[1] > max_width:
                    resize_scale = max_width / float(frame.shape[1])
                    process_frame = cv2.resize(frame, (int(frame.shape[1] * resize_scale), int(frame.shape[0] * resize_scale)))

                vehicle_frame = frame  # Guardar frame original para codificar sin overlay
                frame_copy_needed = False
                detections_to_draw = session.last_detections  # Usar detecciones previas por defecto
                
                # Ejecutar detección solo cada N frames para ahorrar CPU
                if detect_every <= 1 or (frame_counter % detect_every) == 0:
                    try:
                        session.detector.clean_old_detections()
                        results = session.detector.detect(process_frame)
                        detections = session.detector.get_vehicle_detections(results)

                        # Escalar coordenadas de detecciones si se redimensionó
                        if resize_scale != 1.0:
                            detections = [(
                                (int(x1/resize_scale), int(y1/resize_scale), int(x2/resize_scale), int(y2/resize_scale)),
                                label, conf,
                                int(cx/resize_scale), int(cy/resize_scale)
                            ) for (x1, y1, x2, y2), label, conf, cx, cy in detections]

                        # Actualizar detecciones guardadas
                        session.last_detections = detections
                        detections_to_draw = detections
                        frame_copy_needed = len(detections) > 0
                        
                        # Procesar conteos de vehículos
                        for (xyxy, label, conf, center_x, center_y) in detections:
                            if session.detector.update_count(center_x, center_y, line_y):
                                if self.backend_client and label in YOLO_TO_VEHICLE_TYPE:
                                    try:
                                        event = VehicleDetectedEvent(
                                            vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                                            timestamp=datetime.now(ZoneInfo("America/Bogota")),
                                            location_id=config.LOCATION_ID
                                        )
                                        success = self.backend_client.send_detection(event)
                                        if success:
                                            self.logger.info(f"✓ {label.upper()} | Total: {session.detector.get_count()}")
                                        else:
                                            self.logger.warning(f"✗ {label.upper()} no guardado")
                                    except Exception as e:
                                        self.logger.error(f"Error enviando detección: {e}")
                    except Exception as e:
                        self.logger.debug(f"Grabber: error en detección: {e}")
                        session.last_detections = []
                        detections_to_draw = []
                        frame_copy_needed = False
                else:
                    # En frames sin detección, usar detecciones guardadas
                    frame_copy_needed = detections_to_draw and len(detections_to_draw) > 0

                # Dibujar overlay UNA SOLA VEZ en vehicle_frame si hay detecciones
                # IMPORTANTE: NO dibujar en frame a codificar si fue resizeado (pérdida de datos)
                if frame_copy_needed and detections_to_draw:
                    vehicle_frame = frame.copy()
                    
                    cv2.line(vehicle_frame, (0, line_y), (width, line_y),
                             config.LINE_COLOR, config.LINE_THICKNESS)

                    for (xyxy, label, conf, center_x, center_y) in detections_to_draw:
                        cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]),
                                      config.BBOX_COLOR, config.BBOX_THICKNESS)
                        cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                        cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)

                # Redimensionar para encoding SOLO si no se redimensionó antes
                encode_frame = vehicle_frame
                try:
                    if max_width and resize_scale == 1.0:
                        h, w = encode_frame.shape[:2]
                        if w > max_width:
                            scale = max_width / float(w)
                            encode_frame = cv2.resize(encode_frame, (int(w * scale), int(h * scale)))
                except Exception:
                    pass

                # Encode only at most at STREAM_MAX_FPS to reduce CPU/network
                now_encode = time.time()
                if now_encode - last_encode_time >= encode_interval:
                    try:
                        ret_enc, buf = cv2.imencode('.jpg', encode_frame,
                                                   [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
                        if ret_enc:
                            with session.last_frame_lock:
                                session.last_frame_bytes = buf.tobytes()
                            frames_encoded += 1
                            last_encode_time = now_encode
                    except Exception:
                        pass

                # Log métricas periódicas
                now = time.time()
                if now - last_metrics >= metrics_interval:
                    self.logger.info(f"Grabber {session_id[:8]} metrics - read/s={frames_read/ (now - last_metrics):.1f}, encoded/s={frames_encoded/ (now - last_metrics):.1f}, total_frames={frames_read}")
                    frames_read = 0
                    frames_encoded = 0
                    last_metrics = now

                elapsed = time.time() - frame_start
                sleep_time = max(0, frame_delay - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                self.logger.error(f"Grabber: error en frame loop: {e}")
                break

        self.logger.info(f"Grabber terminado para sesión: {session_id}")

    def generate_frames(self, session_id: str) -> Generator[bytes, None, None]:
        """
        Generador MJPEG. Lee frames del cache producido por _run_frame_grabber.
        No accede a VideoCapture directamente (thread-safe).
        
        Estrategia: Enviar TODO frame disponible sin esperar (drenar buffer).
        Si hay lag, es mejor mostrar video desfasado que acumularlo.
        """
        session = self.get_stream(session_id)
        if not session:
            self.logger.error(f"generate_frames: sesión no encontrada: {session_id}")
            return

        # Esperar primer frame (máx 5 s)
        deadline = time.time() + 5.0
        while not session.last_frame_bytes and session.is_running and time.time() < deadline:
            time.sleep(0.05)

        # Delay mínimo para no sobrecargar CPU en el yield (pero muy bajo)
        # Propósito: drenar buffer sin acumular
        min_frame_delay = 0.01  # 10ms, suficiente para sock write
        
        last_frame_id = None
        while session.is_running:
            with session.last_frame_lock:
                frame_bytes = session.last_frame_bytes
                frame_id = id(frame_bytes)  # ID de objeto, no contenido

            # Enviar frame SIEMPRE si es diferente (por referencia)
            if frame_bytes and frame_id != last_frame_id:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                last_frame_id = frame_id

            # Delay mínimo para evitar busy-loop (no sincronizar con FPS)
            time.sleep(min_frame_delay)

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
        
        result = stream_manager.create_stream(stream_type, source)
        
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
    
    return Response(
        stream_manager.generate_frames(session_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/stream/snapshot/<session_id>')
def stream_snapshot(session_id):
    """
    Retorna un único frame JPEG del stream activo.
    Usado como fallback para navegadores que no soportan MJPEG (Safari/iOS).

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
