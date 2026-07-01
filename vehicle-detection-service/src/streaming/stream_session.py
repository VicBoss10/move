"""
Stream session data model.

Represents a single streaming session with its associated resources and state.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional, List, Tuple
import threading
import queue


@dataclass
class StreamSession:
    """
    Represents a single streaming session with its associated resources.

    Thread-safe container for a video stream with concurrent access from
    four dedicated threads (reader, YOLO, encoder, backend worker).
    Uses locks and threading events for synchronization.

    Attributes:
        session_id (str): Unique session identifier (UUID)
        stream_type (str): Type of stream (USB, URL, RTSP, YOUTUBE)
        source (str): Source location (camera index or URL)
        status (str): Current status (active, stopped)
        created_at (datetime): Timestamp when session was created
        video_source: VideoSource instance (CameraSource or StreamSource)
        detector (VehicleDetector): YOLO detector instance
        is_running (bool): Flag to signal thread termination
        last_frame_bytes (bytes): Latest encoded JPEG frame
        last_frame_lock: Lock protecting last_frame_bytes
        frame_event: Event signaled when new frame is encoded
        _current_frame: Latest raw frame from reader thread
        _current_frame_lock: Lock protecting _current_frame
        last_detections: Latest detections from YOLO thread
        _detections_lock: Lock protecting last_detections
        prev_detections: Detections from previous frame (for deferred drawing)
        detection_event_queue (queue.Queue): Async event queue for backend
        _frame_id (int): Counter incremented by reader (signals new frame to YOLO)
        frame_width (int): Original frame width (before resizing)
        frame_height (int): Original frame height (before resizing)
        device_id (int): Backend device ID for saving detections
    """
    session_id: str
    stream_type: str
    source: str
    status: str
    created_at: datetime
    video_source: Optional[object] = None
    detector: Optional[object] = None
    is_running: bool = False
    last_frame_bytes: Optional[bytes] = None
    last_frame_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    frame_event: threading.Event = field(default_factory=threading.Event, compare=False, repr=False)
    _current_frame: Optional[object] = None
    _current_frame_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    last_detections: Optional[List[Tuple]] = None
    _detections_lock: threading.Lock = field(default_factory=threading.Lock, compare=False, repr=False)
    prev_detections: Optional[List[Tuple]] = None
    detection_event_queue: queue.Queue = field(default_factory=queue.Queue, compare=False, repr=False)
    _frame_id: int = 0
    frame_width: int = 0
    frame_height: int = 0
    device_id: Optional[int] = None
