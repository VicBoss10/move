"""Configuración centralizada para el servicio de detección de vehículos"""
import os
from pathlib import Path
import torch

BASE_DIR = Path(__file__).parent.parent

# Cargar variables de entorno desde .env automáticamente (si existe)
try:
    from dotenv import load_dotenv
    _env_file = BASE_DIR.parent / ".env"
    if _env_file.exists():
        load_dotenv(dotenv_path=_env_file, override=False)
except ImportError:
    pass  # python-dotenv no instalado, continuar con env del sistema

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

BACKEND_URL = os.environ.get("BACKEND_URL", "https://api.moveiot.online")
LOCATION_ID = 1
BACKEND_TIMEOUT = 5
SEND_DETECTIONS_ENABLED = True

FLASK_HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5000"))
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# Stream encoding a 20 fps
STREAM_MAX_FPS = 20
# JPEG quality - 70 da buena calidad visual para 720p
STREAM_JPEG_QUALITY = 70
# Detectar cada 8 frames = ~2.5 detecciones/s, libera CPU para encoding
DETECTION_SKIP_FRAMES = 3

# Redimensionar ancho máximo para encoding (1280 = 720p, buena calidad)
STREAM_MAX_WIDTH = 1280

# Intervalo (segundos) para loguear métricas simples (fps, frames procesados)
METRICS_LOG_INTERVAL = 20

# Dispositivo para inferencia YOLO: 'cuda' si hay GPU disponible, sino 'cpu'
YOLO_DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
