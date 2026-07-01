"""
Configuration module for vehicle detection service.

Central configuration management for the vehicle detection service. Loads settings
from environment variables with sensible defaults. Handles YOLO model configuration,
video source options, Flask API settings, and stream encoding parameters.

Attributes:
    BASE_DIR (Path): Base directory of the service
    YOLO_MODEL_PATH (Path): Path to the YOLO model file
    VEHICLE_CLASSES (set): Set of vehicle classes to detect
    DIST_THRESHOLD (int): Distance threshold for vehicle deduplication (pixels)
    TIME_THRESHOLD (float): Time threshold for deduplication (seconds)
    LINE_TOLERANCE (int): Tolerance for line crossing detection (pixels)
    DEFAULT_VIDEO_URL (str): Default YouTube video URL for demo
    DEFAULT_CAMERA_INDEX (int): Default camera index (0 = system default)
    BACKEND_URL (str): Base URL of the backend API
    BACKEND_TIMEOUT (int): HTTP timeout for backend requests (seconds)
    SEND_DETECTIONS_ENABLED (bool): Whether to send detections to backend
    FLASK_HOST (str): Flask server host address
    FLASK_PORT (int): Flask server port
    FLASK_DEBUG (bool): Flask debug mode
    STREAM_MAX_FPS (int): Maximum FPS for streaming (encoding throttle)
    STREAM_JPEG_QUALITY (int): JPEG compression quality (1-100)
    STREAM_MAX_WIDTH (int): Maximum width for stream encoding (pixels)
    YOLO_DEVICE (str): Device for inference ('cuda' if GPU available, else 'cpu')
"""
import os
from pathlib import Path
import torch

BASE_DIR = Path(__file__).parent.parent

# Load environment variables from .env if available
try:
    from dotenv import load_dotenv
    _env_file = BASE_DIR.parent / ".env"
    if _env_file.exists():
        load_dotenv(dotenv_path=_env_file, override=False)
except ImportError:
    pass

# ============================================================================
# YOLO & DETECTION SETTINGS
# ============================================================================

YOLO_MODEL_PATH = BASE_DIR / "models" / "yolo11n.pt"
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle"}
DIST_THRESHOLD = 50
TIME_THRESHOLD = 1.0
LINE_TOLERANCE = 5

# ============================================================================
# DEFAULT VIDEO SOURCES
# ============================================================================

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

# ============================================================================
# VISUALIZATION SETTINGS (OpenCV drawing)
# ============================================================================

LINE_COLOR = (0, 0, 255)
LINE_THICKNESS = 2
BBOX_COLOR = (0, 255, 0)
BBOX_THICKNESS = 2
DRAW_PROXIMITY_PX = 100

# ============================================================================
# BACKEND INTEGRATION
# ============================================================================

BACKEND_URL = os.environ.get("BACKEND_URL", "https://api.moveiot.online")
BACKEND_TIMEOUT = 5
SEND_DETECTIONS_ENABLED = True

# ============================================================================
# FLASK API SERVER SETTINGS
# ============================================================================

FLASK_HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5000"))
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

# ============================================================================
# STREAM ENCODING SETTINGS
# ============================================================================

STREAM_MAX_FPS = 15
STREAM_JPEG_QUALITY = 60
STREAM_MAX_WIDTH = 640
METRICS_LOG_INTERVAL = 120

# ============================================================================
# INFERENCE DEVICE
# ============================================================================

YOLO_DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
