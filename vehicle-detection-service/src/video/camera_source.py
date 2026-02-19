"""
Fuente de video desde cámara USB/webcam
"""
import cv2
import logging
from .base_source import VideoSource

logger = logging.getLogger(__name__)


class CameraSource(VideoSource):
    """
    Fuente de video desde cámara USB o webcam.
    
    Maneja la apertura y lectura de frames desde dispositivos de cámara
    conectados al sistema.
    """
    
    def __init__(self, camera_index: int = 0):
        """
        Inicializa la fuente de cámara.
        
        Args:
            camera_index: Índice de la cámara (0 para cámara por defecto)
        """
        super().__init__()
        self.camera_index = camera_index
    
    def open(self) -> bool:
        """
        Abre la cámara especificada.
        
        Returns:
            True si se abrió exitosamente, False en caso contrario
        """
        logger.info(f"Abriendo cámara {self.camera_index}...")
        
        self.capture = cv2.VideoCapture(self.camera_index)
        self.is_open = self.capture.isOpened()
        
        if self.is_open:
            logger.info("✓ Cámara abierta exitosamente")
            return True
        else:
            logger.error(f"No se pudo abrir la cámara {self.camera_index}")
            return False
    
    def __str__(self) -> str:
        """Representación en string de la fuente."""
        return f"CameraSource(index={self.camera_index})"
