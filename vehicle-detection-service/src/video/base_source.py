"""
Abstract base class for video sources.

Defines the interface contract for different video source implementations
(USB cameras, URL streams, RTSP, local files). All VideoSource subclasses
must implement the open() method and provide consistent access to frame data.

Classes:
    VideoSource: Abstract base class for all video sources
"""
from abc import ABC, abstractmethod
import cv2
from typing import Optional


class VideoSource(ABC):
    """
    Abstract base class for video sources.

    Defines the common interface that all video source implementations must
    follow. Provides shared functionality for frame access and FPS detection.

    Subclasses should implement the open() method to handle source-specific
    initialization (camera index for USB, URL extraction for streams, etc.).

    Thread safety:
        VideoCapture is not thread-safe; external synchronization required
        when multiple threads access the same VideoSource.

    Attributes:
        capture (cv2.VideoCapture): OpenCV video capture object
        is_open (bool): Whether the source is currently open
    """
    
    def __init__(self):
        """Initializes the video source."""
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_open = False

    @abstractmethod
    def open(self) -> bool:
        """
        Opens the video source.

        Subclasses must implement source-specific initialization logic.

        Returns:
            bool: True if opened successfully, False otherwise
        """
        pass

    def get_capture(self) -> Optional[cv2.VideoCapture]:
        """
        Returns the OpenCV VideoCapture object.

        Returns:
            cv2.VideoCapture: If open, None otherwise
        """
        return self.capture if self.is_open else None

    def get_fps(self) -> float:
        """
        Gets the video frame rate (FPS).

        Returns:
            float: FPS of the video, 30.0 as default if unavailable
        """
        if self.capture and self.is_open:
            fps = self.capture.get(cv2.CAP_PROP_FPS)
            return fps if fps > 0 else 30.0
        return 30.0

    def read_frame(self):
        """
        Reads a single frame from the video source.

        Returns:
            Tuple[bool, Optional[np.ndarray]]: (ret, frame) where ret indicates
                success and frame is the BGR image as numpy array
        """
        if self.capture and self.is_open:
            return self.capture.read()
        return False, None

    def release(self):
        """Releases video source resources."""
        if self.capture:
            self.capture.release()
            self.is_open = False

    def get_frame_dimensions(self):
        """
        Gets the dimensions of video frames.

        Reads one frame to determine dimensions.

        Returns:
            Tuple[int, int]: (height, width) in pixels, or None if unavailable
        """
        if self.capture and self.is_open:
            ret, frame = self.capture.read()
            if ret:
                height, width = frame.shape[:2]
                return height, width
        return None
