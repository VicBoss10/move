"""
Video source for streams, YouTube URLs, and local video files.

Provides implementation for URL-based video sources including YouTube videos,
RTSP streams, and local video files. Uses yt-dlp to extract direct stream
URLs from YouTube with fallback to local download.

Classes:
    StreamSource: URL-based video source
"""
import cv2
import yt_dlp
import logging
from typing import Optional
from .base_source import VideoSource

logger = logging.getLogger(__name__)


class StreamSource(VideoSource):
    """
    Video source for streaming URLs, YouTube videos, and local files.

    Implements VideoSource interface for network streams and files.
    For YouTube URLs, uses yt-dlp to extract the actual stream URL.
    Falls back to downloading the video if direct streaming fails.
    For local files and RTSP streams, opens directly with OpenCV.

    Examples:
        >>> # YouTube video
        >>> source = StreamSource("https://youtu.be/xxxxx", ytdlp_options, download_opts)
        >>> if source.open():
        ...     cap = source.get_capture()
        ...
        >>> # Local file
        >>> source = StreamSource("./video.mp4", {}, {})
        >>> if source.open():
        ...     cap = source.get_capture()

    Attributes:
        url (str): YouTube URL, RTSP URL, or local file path
        ytdlp_options (dict): Options for yt-dlp info extraction
        ytdlp_download_options (dict): Options for yt-dlp download fallback
        stream_url (str): Resolved stream URL after open()
    """
    
    def __init__(self, url: str, ytdlp_options: dict, ytdlp_download_options: dict):
        """
        Initializes the stream source.

        Args:
            url (str): YouTube URL, local file path, or RTSP stream URL
            ytdlp_options (dict): Options for yt-dlp info extraction
            ytdlp_download_options (dict): Options for yt-dlp download fallback
        """
        super().__init__()
        self.url = url
        self.ytdlp_options = ytdlp_options
        self.ytdlp_download_options = ytdlp_download_options
        self.stream_url: Optional[str] = None

    def _is_youtube_url(self) -> bool:
        """
        Checks if the URL is a YouTube link.

        Returns:
            bool: True if YouTube URL, False otherwise
        """
        return 'youtube.com' in self.url or 'youtu.be' in self.url

    def _extract_youtube_url(self) -> Optional[str]:
        """
        Extracts the actual stream URL from a YouTube video.

        Uses yt-dlp to fetch video info and extract the stream URL without
        downloading the entire video.

        Returns:
            str: Stream URL, or None if extraction fails
        """
        try:
            logger.info("Extracting YouTube video info...")
            with yt_dlp.YoutubeDL(self.ytdlp_options) as ydl:
                info = ydl.extract_info(self.url, download=False)
                logger.info(f"✓ Video found: {info.get('title', 'untitled')}")
                return info['url']
        except Exception as e:
            logger.error(f"Error extracting YouTube URL: {e}")
            return None

    def _download_youtube_video(self) -> Optional[str]:
        """
        Downloads a YouTube video locally as fallback.

        If direct stream URL extraction fails, attempts to download the video
        for local playback.

        Returns:
            str: Path to downloaded file, or None if download fails
        """
        logger.warning("Direct stream unavailable, downloading video...")

        try:
            with yt_dlp.YoutubeDL(self.ytdlp_download_options) as ydl:
                ydl.download([self.url])

            downloaded_file = self.ytdlp_download_options.get('outtmpl', 'downloaded_video.mp4')
            logger.info("✓ Video downloaded successfully")
            return downloaded_file
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            print("\nAlternative: Try with a local file:")
            print("  python src/main.py stream ./your-video.mp4")
            return None

    def open(self) -> bool:
        """
        Opens the stream source.

        Strategy:
        1. If YouTube URL: Extract stream URL with yt-dlp
        2. If extraction fails: Download video locally
        3. If local file/RTSP: Open directly with OpenCV

        Returns:
            bool: True if opened successfully, False otherwise
        """
        logger.info(f"Getting stream URL: {self.url}")
        
        if self._is_youtube_url():
            self.stream_url = self._extract_youtube_url()
            
            if not self.stream_url:
                self.stream_url = self._download_youtube_video()
                
                if not self.stream_url:
                    return False
        else:
            self.stream_url = self.url
        
        logger.info("Opening stream...")
        self.capture = cv2.VideoCapture(self.stream_url)
        self.is_open = self.capture.isOpened()

        if self.is_open:
            logger.info("✓ Video/stream opened successfully")
            return True
        else:
            logger.error("Could not open video/stream")
            return False

    def __str__(self) -> str:
        """String representation of the stream source."""
        return f"StreamSource(url={self.url})"
