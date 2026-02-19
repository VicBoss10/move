"""
Clase base abstracta para fuentes de video
"""
from abc import ABC, abstractmethod
import cv2
from typing import Optional


class VideoSource(ABC):
    """
    Clase base abstracta para diferentes fuentes de video.
    
    Define la interfaz común que deben implementar todas las fuentes
    de video (cámara, stream, archivo, etc.)
    """
    
    def __init__(self):
        """Inicializa la fuente de video."""
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_open = False
    
    @abstractmethod
    def open(self) -> bool:
        """
        Abre la fuente de video.
        
        Returns:
            True si se abrió exitosamente, False en caso contrario
        """
        pass
    
    def get_capture(self) -> Optional[cv2.VideoCapture]:
        """
        Retorna el objeto VideoCapture de OpenCV.
        
        Returns:
            VideoCapture si está abierto, None en caso contrario
        """
        return self.capture if self.is_open else None
    
    def get_fps(self) -> float:
        """
        Obtiene los FPS del video.
        
        Returns:
            FPS del video, 30 por defecto si no se puede determinar
        """
        if self.capture and self.is_open:
            fps = self.capture.get(cv2.CAP_PROP_FPS)
            return fps if fps > 0 else 30.0
        return 30.0
    
    def read_frame(self):
        """
        Lee un frame del video.
        
        Returns:
            Tupla (ret, frame) donde ret es bool y frame es numpy array
        """
        if self.capture and self.is_open:
            return self.capture.read()
        return False, None
    
    def release(self):
        """Libera los recursos del video."""
        if self.capture:
            self.capture.release()
            self.is_open = False
    
    def get_frame_dimensions(self):
        """
        Obtiene las dimensiones del frame.
        
        Returns:
            Tupla (height, width) o None si no está disponible
        """
        if self.capture and self.is_open:
            ret, frame = self.capture.read()
            if ret:
                height, width = frame.shape[:2]
                return height, width
        return None
