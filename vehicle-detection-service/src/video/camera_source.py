"""
Video source for USB cameras and webcams.

Provides implementation for USB camera input using OpenCV's VideoCapture.

Classes:
    CameraSource: USB camera video source
"""
import cv2
import logging
from .base_source import VideoSource

logger = logging.getLogger(__name__)


class CameraSource(VideoSource):
    """
    Video source for USB cameras and webcams.

    Implements VideoSource interface for local USB camera devices.
    Uses OpenCV's VideoCapture with numeric device index to access
    system cameras.

    Examples:
        >>> camera = CameraSource(0)  # Default camera
        >>> if camera.open():
        ...     cap = camera.get_capture()
        ...     fps = camera.get_fps()
        ... else:
        ...     print("Could not open camera")

    Attributes:
        camera_index (int): System camera device index (0 = default)
    """
    
    def __init__(self, camera_index: int = 0):
        """
        Initializes the camera source.

        Args:
            camera_index (int): System camera device index. Default: 0
                (system default camera)
        """
        super().__init__()
        self.camera_index = camera_index

    def open(self) -> bool:
        """
        Opens the specified camera device.

        Returns:
            bool: True if opened successfully, False otherwise
        """
        logger.info(f"Opening camera {self.camera_index}...")

        self.capture = cv2.VideoCapture(self.camera_index)
        self.is_open = self.capture.isOpened()

        if self.is_open:
            logger.info("✓ Camera opened successfully")
            return True
        else:
            logger.error(f"Could not open camera {self.camera_index}")
            return False

    def __str__(self) -> str:
        """String representation of the camera source."""
        return f"CameraSource(index={self.camera_index})"
