"""
Video source implementations.

Provides implementations for different video sources: USB cameras, URL streams,
and local files. All implementations follow the VideoSource interface contract.

Exports:
    VideoSource: Abstract base class for video sources
    CameraSource: USB camera implementation
    StreamSource: URL/YouTube/local file implementation
"""
from .base_source import VideoSource
from .camera_source import CameraSource
from .stream_source import StreamSource

__all__ = ['VideoSource', 'CameraSource', 'StreamSource']
