"""Configuración centralizada para el servicio de detección de vehículos"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

YOLO_MODEL_PATH = BASE_DIR / "models" / "yolo11n.pt"

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle"}

CONFIDENCE_THRESHOLD = 0.25
DIST_THRESHOLD = 50
TIME_THRESHOLD = 1.0
LINE_TOLERANCE = 5

DEFAULT_VIDEO_URL = "https://youtu.be/dzxoZoH192c"
DEFAULT_CAMERA_INDEX = 0

YTDLP_OPTIONS = {
    'format': 'best[ext=mp4]/best',
    'quiet': False,
    'no_warnings': False,
    'socket_timeout': 30,
    'extractor_args': {
        'youtube': {
            'player_client': ['web', 'android'],
        }
    },
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}

YTDLP_DOWNLOAD_OPTIONS = {
    'format': 'best[ext=mp4]/best',
    'outtmpl': 'downloaded_video.mp4',
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
}

LINE_COLOR = (0, 0, 255)
LINE_THICKNESS = 2
BBOX_COLOR = (0, 255, 0)
BBOX_THICKNESS = 2

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
LOCATION_ID = 1
BACKEND_TIMEOUT = 5
SEND_DETECTIONS_ENABLED = True

FLASK_HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5000"))
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# Cap stream FPS - 5 fps es el máximo realista dado CPU (25 fps lectura vs 5 fps encoding)
# Cuello de botella: codificación JPEG + detección YOLO; lectura es barata
STREAM_MAX_FPS = 5
# JPEG quality - muy agresivo: 25 = mínima calidad aceptable para streaming
# JPEG quality es lo más caro; reducir de 50→25 reduce CPU de encoding ~80%
STREAM_JPEG_QUALITY = 60
# Detectar cada 15 frames = 1.67 fps de detección @ 25 fps lectura
# Detección es extremadamente cara en CPU; saltarla es prioritario
DETECTION_SKIP_FRAMES = 5

# Redimensionar ancho máximo ANTES de detección para reducir cálculo YOLO
# 480px es 36% menor que 640px = ~36% YOLO más rápido
STREAM_MAX_WIDTH = 720

# Intervalo (segundos) para loguear métricas simples (fps, frames procesados)
METRICS_LOG_INTERVAL = 10
