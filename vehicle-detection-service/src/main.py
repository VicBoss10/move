"""
Sistema de Detección de Vehículos con YOLO v11

Este módulo es el punto de entrada principal del sistema de detección de vehículos.
Permite procesar video desde múltiples fuentes (cámaras USB, streams de YouTube,
archivos locales) y enviar las detecciones automáticamente al backend Spring Boot.

Características:
    - Detección en tiempo real con YOLO v11
    - Soporte para múltiples fuentes de video
    - Conteo de vehículos con deduplicación
    - Integración automática con backend REST
    - Interfaz visual con OpenCV

Uso:
    python src/main.py camera [índice]          # Cámara USB
    python src/main.py stream [URL]             # Stream/YouTube/archivo

Ejemplos:
    python src/main.py camera                   # Cámara por defecto (0)
    python src/main.py camera 1                 # Cámara índice 1
    python src/main.py stream https://youtu.be/xxxxx
    python src/main.py stream ./video.mp4       # Archivo local

Author: Victor Narvaez
Date: 2026-02-19
"""
import cv2
import time
import sys
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import config
from detectors import VehicleDetector
from video import CameraSource, StreamSource
from api import BackendClient, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE
from zoneinfo import ZoneInfo

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


# =============================================================================
# INICIALIZACIÓN DE COMPONENTES
# =============================================================================

try:
    detector = VehicleDetector(
        model_path=config.YOLO_MODEL_PATH,
        vehicle_classes=config.VEHICLE_CLASSES,
        dist_threshold=config.DIST_THRESHOLD,
        time_threshold=config.TIME_THRESHOLD,
        line_tolerance=config.LINE_TOLERANCE
    )
except FileNotFoundError:
    print(f"✗ Error: No se encontró el modelo YOLO en {config.YOLO_MODEL_PATH}")
    print("  Asegúrate de que el archivo existe en la carpeta 'models/'")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error al cargar el modelo YOLO: {e}")
    sys.exit(1)

backend_client = None
if config.SEND_DETECTIONS_ENABLED:
    if not isinstance(config.DEVICE_ID, int) or config.DEVICE_ID <= 0:
        print("✗ Error: DEVICE_ID debe ser un entero positivo")
        print(f"  Valor actual en config.py: {config.DEVICE_ID}")
        sys.exit(1)
    
    if not config.BACKEND_URL or not isinstance(config.BACKEND_URL, str):
        print("✗ Error: BACKEND_URL no está configurado correctamente")
        sys.exit(1)
    
    try:
        backend_client = BackendClient(
            base_url=config.BACKEND_URL,
            timeout=config.BACKEND_TIMEOUT
        )
        print(f"\n✓ Cliente backend configurado: {config.BACKEND_URL}")
        print(f"  Device ID (fallback): {config.DEVICE_ID}")
        print("  Las detecciones se enviarán automáticamente al backend\n")
    except Exception as e:
        print(f"✗ Error al inicializar cliente backend: {e}")
        print("  Continuando sin integración con backend...\n")
        backend_client = None


# =============================================================================
# PROCESAMIENTO DE ARGUMENTOS CLI
# =============================================================================

source_type = "stream"
video_source = None

if len(sys.argv) > 1:
    source_type = sys.argv[1].lower()
    
    if source_type == "camera":
        camera_index = config.DEFAULT_CAMERA_INDEX
        if len(sys.argv) > 2:
            try:
                camera_index = int(sys.argv[2])
                if camera_index < 0:
                    print("✗ Error: El índice de la cámara debe ser un número positivo")
                    sys.exit(1)
            except ValueError:
                print(f"✗ Error: '{sys.argv[2]}' no es un índice de cámara válido")
                print("  Usa un número entero (ej: 0, 1, 2)")
                sys.exit(1)
        video_source = CameraSource(camera_index)
        
    elif source_type == "stream":
        url = config.DEFAULT_VIDEO_URL
        if len(sys.argv) > 2:
            url = sys.argv[2]
            
            if not url.startswith(('http://', 'https://', 'rtsp://', 'rtmp://')):
                file_path = Path(url)
                if not file_path.exists():
                    print(f"✗ Error: El archivo '{url}' no existe")
                    print("  Verifica la ruta del archivo")
                    sys.exit(1)
                if not file_path.is_file():
                    print(f"✗ Error: '{url}' no es un archivo válido")
                    sys.exit(1)
                
                valid_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v'}
                if file_path.suffix.lower() not in valid_extensions:
                    print(f"⚠ Advertencia: '{file_path.suffix}' puede no ser un formato de video soportado")
                    print(f"  Formatos recomendados: {', '.join(valid_extensions)}")
            else:
                if url.startswith(('http://', 'https://')):
                    if ' ' in url:
                        print("✗ Error: La URL no puede contener espacios")
                        sys.exit(1)
                    if not ('youtube.com' in url or 'youtu.be' in url or url.endswith(('.m3u8', '.mp4'))):
                        print("⚠ Advertencia: La URL puede no ser un stream de video válido")
                        print("  Soportado: YouTube, archivos .mp4, streams .m3u8")
        
        video_source = StreamSource(
            url=url,
            ytdlp_options=config.YTDLP_OPTIONS,
            ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
        )
        
    else:
        print("Uso:")
        print("  python src/main.py camera [índice]          # Usar cámara (default 0)")
        print("  python src/main.py stream [URL]             # Usar stream (default: YouTube)")
        print("\nEjemplos:")
        print("  python src/main.py camera")
        print("  python src/main.py camera 1")
        print("  python src/main.py stream https://youtu.be/xxxxx")
        print("  python src/main.py stream ./video.mp4")
        sys.exit(0)
else:
    video_source = StreamSource(
        url=config.DEFAULT_VIDEO_URL,
        ytdlp_options=config.YTDLP_OPTIONS,
        ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
    )


# =============================================================================
# CONFIGURACIÓN DE VIDEO
# =============================================================================

try:
    if not video_source.open():
        print("✗ No se pudo abrir la fuente de video")
        sys.exit(1)
except Exception as e:
    print(f"✗ Error al abrir la fuente de video: {e}")
    sys.exit(1)

cap = video_source.get_capture()
if cap is None:
    print("✗ Error: VideoCapture no está disponible")
    sys.exit(1)

try:
    fps = video_source.get_fps()
    wait_time = int(1000 / fps)
except ZeroDivisionError:
    print("⚠ Advertencia: FPS inválido, usando valor por defecto (30)")
    fps = 30
    wait_time = 33

ret, frame = cap.read()
if not ret:
    print("✗ No se pudo leer el primer frame del video")
    print("Asegúrate de que el video sea accesible y esté en formato soportado")
    sys.exit(1)

try:
    height, width, _ = frame.shape
    line_y = height // 2
except AttributeError:
    print("✗ Error: Frame inválido recibido de la fuente de video")
    sys.exit(1)


# =============================================================================
# VARIABLES DE CONTROL
# =============================================================================

frame_count = 0
last_summary_time = time.time()
SUMMARY_INTERVAL = 30


# =============================================================================
# INTERFAZ DE USUARIO - BANNER INICIAL
# =============================================================================

print("\n" + "="*60)
print("  SISTEMA DE DETECCIÓN DE VEHÍCULOS - ACTIVO")
print("="*60)
print(f"  Resolución: {width}x{height} px")
print(f"  Línea de conteo: Y={line_y}")
print(f"  Presiona 'q' para salir")
print("="*60 + "\n")


# =============================================================================
# BUCLE PRINCIPAL DE PROCESAMIENTO
# =============================================================================
"""
El bucle principal procesa cada frame del video en 6 fases:
1. Detección: YOLO identifica vehículos en el frame
2. Visualización: Dibuja elementos visuales (línea, bounding boxes)
3. Procesamiento: Cuenta vehículos que cruzan la línea y envía al backend
4. Display: Muestra el frame procesado
5. Resumen: Imprime estadísticas periódicas cada 30 segundos
6. Control: Gestiona FPS y permite salida con 'q'
"""

while True:
    try:
        start_time = time.time()
        
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        detector.clean_old_detections()
        results = detector.detect(frame)
        detections = detector.get_vehicle_detections(results)
    except KeyboardInterrupt:
        print("\n⚠ Interrupción detectada, finalizando...")
        break
    except Exception as e:
        print(f"\n✗ Error procesando frame {frame_count}: {e}")
        print("  Continuando con siguiente frame...")
        continue
    
    vehicle_frame = frame.copy()
    cv2.line(vehicle_frame, (0, line_y), (width, line_y), 
             config.LINE_COLOR, config.LINE_THICKNESS)

    try:
        for (xyxy, label, conf, center_x, center_y) in detections:
            cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]), 
                         config.BBOX_COLOR, config.BBOX_THICKNESS)
            cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)
            
            if detector.update_count(center_x, center_y, line_y):
                if backend_client and label in YOLO_TO_VEHICLE_TYPE:
                    try:
                        # Use Colombia timezone explicitly (America/Bogota) so timestamps match local time
                        event = VehicleDetectedEvent(
                            vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                            timestamp=datetime.now(ZoneInfo("America/Bogota")),
                            device_id=config.DEVICE_ID
                        )
                        success = backend_client.send_detection(event)
                        status = "✓" if success else "✗"
                        print(f"{status} {label.upper():12s} | Total: {detector.get_count():3d} | "
                              f"Enviado al backend: {'OK' if success else 'FAIL'}")
                    except Exception as e:
                        logger.error(f"Error al enviar detección: {e}")
    except Exception as e:
        logger.error(f"Error en procesamiento de detecciones: {e}")

    if vehicle_frame.shape[:2] != (height, width):
        vehicle_frame = cv2.resize(vehicle_frame, (width, height))
    
    title = f"YOLO Vehicle Detection & Counting - {source_type.upper()}"
    cv2.imshow(title, vehicle_frame)
    
    current_time = time.time()
    if current_time - last_summary_time >= SUMMARY_INTERVAL:
        print(f"\nRESUMEN ({SUMMARY_INTERVAL}s): {detector.get_count()} vehículos detectados | "
              f"Frames procesados: {frame_count}\n")
        last_summary_time = current_time

    elapsed = (time.time() - start_time) * 1000
    delay = max(1, int(wait_time - elapsed))
    
    if cv2.waitKey(delay) & 0xFF == ord('q'):
        break


# =============================================================================
# LIMPIEZA Y RESUMEN FINAL
# =============================================================================

try:
    video_source.release()
    cv2.destroyAllWindows()
except Exception as e:
    logger.warning(f"Advertencia al liberar recursos: {e}")

print(f"\n{'='*50}")
print(f"Procesamiento completado")
print(f"Fuente: {source_type.upper()}")
print(f"Total de vehículos detectados: {detector.get_count()}")
print(f"Frames procesados: {frame_count}")
print(f"{'='*50}")