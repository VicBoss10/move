"""
Módulo de fuentes de video
"""
from .base_source import VideoSource
from .camera_source import CameraSource
from .stream_source import StreamSource

__all__ = ['VideoSource', 'CameraSource', 'StreamSource']
