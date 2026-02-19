"""
Fuente de video desde streams (YouTube, archivos, RTSP, etc.)
"""
import cv2
import yt_dlp
import logging
from typing import Optional
from .base_source import VideoSource

logger = logging.getLogger(__name__)


class StreamSource(VideoSource):
    """
    Fuente de video desde streams, URLs de YouTube o archivos locales.
    
    Maneja la extracción de URLs reales de YouTube usando yt-dlp y
    la apertura de archivos de video locales o streams RTSP.
    """
    
    def __init__(self, url: str, ytdlp_options: dict, ytdlp_download_options: dict):
        """
        Inicializa la fuente de stream.
        
        Args:
            url: URL de YouTube, archivo local o stream RTSP
            ytdlp_options: Opciones para yt-dlp (extracción de info)
            ytdlp_download_options: Opciones para yt-dlp (descarga)
        """
        super().__init__()
        self.url = url
        self.ytdlp_options = ytdlp_options
        self.ytdlp_download_options = ytdlp_download_options
        self.stream_url: Optional[str] = None
    
    def _is_youtube_url(self) -> bool:
        """
        Verifica si la URL es de YouTube.
        
        Returns:
            True si es URL de YouTube, False en caso contrario
        """
        return 'youtube.com' in self.url or 'youtu.be' in self.url
    
    def _extract_youtube_url(self) -> Optional[str]:
        """
        Extrae la URL real del stream de YouTube.
        
        Returns:
            URL del stream o None si falla
        """
        try:
            logger.info("Extrayendo información del video de YouTube...")
            with yt_dlp.YoutubeDL(self.ytdlp_options) as ydl:
                info = ydl.extract_info(self.url, download=False)
                logger.info(f"✓ Video encontrado: {info.get('title', 'sin título')}")
                return info['url']
        except Exception as e:
            logger.error(f"Error al extraer URL de YouTube: {e}")
            return None
    
    def _download_youtube_video(self) -> Optional[str]:
        """
        Descarga el video de YouTube localmente como fallback.
        
        Returns:
            Ruta al archivo descargado o None si falla
        """
        logger.warning("No se pudo obtener stream directo, descargando video...")
        
        try:
            with yt_dlp.YoutubeDL(self.ytdlp_download_options) as ydl:
                ydl.download([self.url])
            
            downloaded_file = self.ytdlp_download_options.get('outtmpl', 'downloaded_video.mp4')
            logger.info("✓ Video descargado exitosamente")
            return downloaded_file
        except Exception as e:
            logger.error(f"Error descargando video: {e}")
            print("\nAlternativa: Intenta con un archivo local:")
            print("  python src/main.py stream ./tu-video.mp4")
            return None
    
    def open(self) -> bool:
        """
        Abre la fuente de stream.
        
        Para URLs de YouTube, intenta extraer el stream directo.
        Si falla, intenta descargar el video.
        Para archivos locales o streams RTSP, los abre directamente.
        
        Returns:
            True si se abrió exitosamente, False en caso contrario
        """
        logger.info(f"Obteniendo URL del stream: {self.url}")
        
        if self._is_youtube_url():
            self.stream_url = self._extract_youtube_url()
            
            if not self.stream_url:
                self.stream_url = self._download_youtube_video()
                
                if not self.stream_url:
                    return False
        else:
            self.stream_url = self.url
        
        logger.info("Abriendo stream...")
        self.capture = cv2.VideoCapture(self.stream_url)
        self.is_open = self.capture.isOpened()
        
        if self.is_open:
            logger.info("✓ Video/stream abierto exitosamente")
            return True
        else:
            logger.error("No se pudo abrir el video/stream")
            return False
    
    def __str__(self) -> str:
        """Representación en string de la fuente."""
        return f"StreamSource(url={self.url})"
