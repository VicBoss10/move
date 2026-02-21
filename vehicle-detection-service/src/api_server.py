"""
API Flask para streaming de video con detección de vehículos en tiempo real
"""
import cv2
import logging
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Dict, Optional, Generator
from datetime import datetime
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
                created_at=datetime.now(),
                video_source=video_source,
                detector=detector,
                is_running=True
            )
            
            with self.lock:
                self.sessions[session_id] = session
            
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
    
    def generate_frames(self, session_id: str) -> Generator[bytes, None, None]:
        """
        Generador de frames MJPEG para streaming.
        
        Args:
            session_id: ID de la sesión
            
        Yields:
            Frames JPEG en formato multipart
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            self.logger.error(f"Sesión no encontrada: {session_id}")
            return
        
        cap = session.video_source.get_capture()
        if not cap:
            self.logger.error(f"No se pudo obtener VideoCapture para sesión: {session_id}")
            return
        
        try:
            ret, frame = cap.read()
            if ret:
                height, width = frame.shape[:2]
                line_y = height // 2
            else:
                self.logger.error(f"No se pudo leer frame inicial: {session_id}")
                return
        except Exception as e:
            self.logger.error(f"Error al leer frame inicial: {e}")
            return
        
        # Obtener FPS del video para controlar velocidad de reproducción
        try:
            fps = session.video_source.get_fps()
            frame_delay = 1.0 / fps if fps > 0 else 1.0 / 30
            self.logger.info(f"Stream {session_id}: FPS={fps:.1f}, delay={frame_delay:.3f}s")
        except Exception as e:
            self.logger.warning(f"No se pudo obtener FPS, usando 30 FPS por defecto: {e}")
            frame_delay = 1.0 / 30
        
        while session.is_running:
            try:
                frame_start_time = time.time()
                
                ret, frame = cap.read()
                if not ret:
                    self.logger.warning(f"No se pudo leer frame, terminando stream: {session_id}")
                    break
                
                session.detector.clean_old_detections()
                results = session.detector.detect(frame)
                detections = session.detector.get_vehicle_detections(results)
                
                vehicle_frame = frame.copy()
                cv2.line(vehicle_frame, (0, line_y), (width, line_y),
                        config.LINE_COLOR, config.LINE_THICKNESS)
                
                for (xyxy, label, conf, center_x, center_y) in detections:
                    cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]),
                                config.BBOX_COLOR, config.BBOX_THICKNESS)
                    cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                    cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)
                    
                    # Actualizar contador y enviar al backend si cruza la línea
                    if session.detector.update_count(center_x, center_y, line_y):
                        if self.backend_client and label in YOLO_TO_VEHICLE_TYPE:
                            try:
                                event = VehicleDetectedEvent(
                                    vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                                    timestamp=datetime.now(),
                                    location_id=config.LOCATION_ID
                                )
                                success = self.backend_client.send_detection(event)
                                if success:
                                    self.logger.info(f"✓ {label.upper()} detectado y guardado en BD | Total: {session.detector.get_count()}")
                                else:
                                    self.logger.warning(f"✗ {label.upper()} detectado pero falló guardar en BD")
                            except Exception as e:
                                self.logger.error(f"Error al enviar detección al backend: {e}")
                
                ret, buffer = cv2.imencode('.jpg', vehicle_frame, 
                                          [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
                if not ret:
                    continue
                
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Control de velocidad: respetar FPS original del video
                elapsed_time = time.time() - frame_start_time
                sleep_time = max(0, frame_delay - elapsed_time)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                
            except Exception as e:
                self.logger.error(f"Error en generación de frame: {e}")
                break
        
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
