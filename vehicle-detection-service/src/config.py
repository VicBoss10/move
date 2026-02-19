"""Configuración centralizada para el servicio de detección de vehículos"""
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

BACKEND_URL = "http://localhost:8080"
LOCATION_ID = 1
BACKEND_TIMEOUT = 5
SEND_DETECTIONS_ENABLED = True
