"""
Streaming module for video stream management and HTTP API.

Provides classes and utilities for managing concurrent video streaming sessions
with real-time vehicle detection and MJPEG endpoint exposure.

Exports:
    StreamManager: Manages multiple concurrent streaming sessions
    StreamSession: Data model for a single streaming session
    streaming_bp: Flask blueprint with streaming API endpoints
    set_stream_manager: Function to inject StreamManager into Flask routes
"""
from .stream_manager import StreamManager
from .stream_session import StreamSession
from .routes import streaming_bp, set_stream_manager

__all__ = [
    'StreamManager',
    'StreamSession',
    'streaming_bp',
    'set_stream_manager'
]
