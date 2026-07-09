"""
Vehicle detection CLI application using YOLO v11.

Main entry point for the vehicle detection system. Processes video from multiple
sources (USB cameras, YouTube streams, local files) and sends detections to the
backend REST API.

Features:
    - Real-time vehicle detection with YOLO v11
    - Support for multiple video sources (USB camera, URL stream, local file)
    - Vehicle counting with spatial-temporal deduplication
    - Automatic backend integration (sends detection events)
    - OpenCV visualization with bounding boxes and counting line

Usage:
    python src/main.py camera [index]           # USB camera (default: 0)
    python src/main.py stream [URL]             # Stream/YouTube/local file

Examples:
    python src/main.py camera                   # Default camera
    python src/main.py camera 1                 # Camera index 1
    python src/main.py stream https://youtu.be/xxxxx
    python src/main.py stream ./video.mp4       # Local video file

Processing pipeline:
    1. Load YOLO model and initialize backend client
    2. Parse command line arguments (source type and source)
    3. Open video source and read first frame
    4. Main loop (per-frame processing):
        a) Detect vehicles with YOLO
        b) Draw visualization (line, bounding boxes)
        c) Count vehicles crossing the line
        d) Send detections to backend
        e) Display frame and handle user input
    5. Cleanup: release resources and print summary

Author: Victor Narvaez
Date: 2026-02-19
"""
import cv2
import time
import sys
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import config
from detectors import VehicleDetector
from video import CameraSource, StreamSource
from api import BackendClient, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE, get_colombia_datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


# =============================================================================
# INITIALIZATION HELPERS
# =============================================================================

def initialize_detector() -> VehicleDetector:
    """
    Initializes and returns a VehicleDetector instance.

    Loads the YOLO model from config and creates a detector with
    configured vehicle classes and thresholds.

    Returns:
        VehicleDetector: Initialized detector instance

    Raises:
        FileNotFoundError: If YOLO model file not found
        Exception: If model loading fails
    """
    try:
        detector = VehicleDetector(
            model_path=config.YOLO_MODEL_PATH,
            vehicle_classes=config.VEHICLE_CLASSES,
            dist_threshold=config.DIST_THRESHOLD,
            time_threshold=config.TIME_THRESHOLD,
            line_tolerance=config.LINE_TOLERANCE
        )
        return detector
    except FileNotFoundError:
        print(f"✗ Error: YOLO model not found at {config.YOLO_MODEL_PATH}")
        print("  Make sure the file exists in the 'models/' folder")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error loading YOLO model: {e}")
        sys.exit(1)


def initialize_backend_client() -> BackendClient:
    """
    Initializes and returns a BackendClient instance.

    Creates a client for sending detections to the backend API.
    Returns None if backend integration is disabled or initialization fails.

    Returns:
        BackendClient: Initialized client instance, or None if disabled/failed
    """
    if not config.SEND_DETECTIONS_ENABLED:
        return None

    if not config.BACKEND_URL or not isinstance(config.BACKEND_URL, str):
        print("✗ Error: BACKEND_URL not configured correctly")
        sys.exit(1)

    try:
        backend_client = BackendClient(
            base_url=config.BACKEND_URL,
            timeout=config.BACKEND_TIMEOUT
        )
        print(f"\n✓ Backend client configured: {config.BACKEND_URL}")
        print("  Detections will be sent automatically to backend\n")
        return backend_client
    except Exception as e:
        print(f"✗ Error initializing backend client: {e}")
        print("  Continuing without backend integration...\n")
        return None


def parse_video_source(args: list) -> tuple:
    """
    Parses command line arguments to determine video source.

    Args:
        args: Command line arguments (sys.argv[1:])

    Returns:
        Tuple of (source_type, video_source) where:
        - source_type: "camera" or "stream"
        - video_source: VideoSource instance

    Exits on invalid arguments.
    """
    source_type = "stream"
    video_source = None

    if len(args) > 0:
        source_type = args[0].lower()

        if source_type == "camera":
            camera_index = config.DEFAULT_CAMERA_INDEX
            if len(args) > 1:
                try:
                    camera_index = int(args[1])
                    if camera_index < 0:
                        print("✗ Error: Camera index must be a positive number")
                        sys.exit(1)
                except ValueError:
                    print(f"✗ Error: '{args[1]}' is not a valid camera index")
                    print("  Use an integer (e.g., 0, 1, 2)")
                    sys.exit(1)
            video_source = CameraSource(camera_index)

        elif source_type == "stream":
            url = config.DEFAULT_VIDEO_URL
            if len(args) > 1:
                url = args[1]

                if not url.startswith(('http://', 'https://', 'rtsp://', 'rtmp://')):
                    # Treat as local file
                    file_path = Path(url)
                    if not file_path.exists():
                        print(f"✗ Error: File '{url}' not found")
                        print("  Check the file path")
                        sys.exit(1)
                    if not file_path.is_file():
                        print(f"✗ Error: '{url}' is not a valid file")
                        sys.exit(1)

                    valid_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v'}
                    if file_path.suffix.lower() not in valid_extensions:
                        print(f"⚠ Warning: '{file_path.suffix}' may not be a supported video format")
                        print(f"  Recommended formats: {', '.join(valid_extensions)}")
                else:
                    # Validate URL format
                    if url.startswith(('http://', 'https://')):
                        if ' ' in url:
                            print("✗ Error: URL cannot contain spaces")
                            sys.exit(1)
                        if not ('youtube.com' in url or 'youtu.be' in url or url.endswith(('.m3u8', '.mp4'))):
                            print("⚠ Warning: URL may not be a valid video stream")
                            print("  Supported: YouTube, .mp4 files, .m3u8 streams")

            video_source = StreamSource(
                url=url,
                ytdlp_options=config.YTDLP_OPTIONS,
                ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
            )

        else:
            print("Usage:")
            print("  python src/main.py camera [index]          # Use camera (default 0)")
            print("  python src/main.py stream [URL]             # Use stream (default: YouTube)")
            print("\nExamples:")
            print("  python src/main.py camera")
            print("  python src/main.py camera 1")
            print("  python src/main.py stream https://youtu.be/xxxxx")
            print("  python src/main.py stream ./video.mp4")
            sys.exit(0)
    else:
        video_source = StreamSource(
            url=config.DEFAULT_VIDEO_URL,
            ytdlp_options=config.YTDLP_OPTIONS,
            ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
        )

    return source_type, video_source


def open_video_source(video_source, source_type: str) -> tuple:
    """
    Opens a video source and returns VideoCapture and metadata.

    Args:
        video_source: VideoSource instance (CameraSource or StreamSource)
        source_type: Type of source ("camera" or "stream")

    Returns:
        Tuple of (cap, height, width, line_y, fps) where:
        - cap: OpenCV VideoCapture object
        - height, width: Frame dimensions
        - line_y: Y coordinate of counting line
        - fps: Frames per second

    Exits on failure.
    """
    try:
        if not video_source.open():
            print("✗ Could not open video source")
            sys.exit(1)
    except Exception as e:
        print(f"✗ Error opening video source: {e}")
        sys.exit(1)

    cap = video_source.get_capture()
    if cap is None:
        print("✗ Error: VideoCapture not available")
        sys.exit(1)

    try:
        fps = video_source.get_fps()
        wait_time = int(1000 / fps)
    except ZeroDivisionError:
        print("⚠ Warning: Invalid FPS, using default (30)")
        fps = 30
        wait_time = 33

    ret, frame = cap.read()
    if not ret:
        print("✗ Could not read first frame from video")
        print("Make sure the video is accessible and in a supported format")
        sys.exit(1)

    try:
        height, width, _ = frame.shape
        line_y = height // 2
    except AttributeError:
        print("✗ Error: Invalid frame received from video source")
        sys.exit(1)

    return cap, height, width, line_y, fps, wait_time


# =============================================================================
# MAIN PROCESSING LOOP
# =============================================================================

def main_loop(cap, detector, backend_client, height, width, line_y, wait_time):
    """
    Main frame processing loop.

    Continuously reads frames, runs detection, counts vehicles, and sends
    results to backend. Runs until user presses 'q' or video ends.

    Args:
        cap: OpenCV VideoCapture object
        detector: VehicleDetector instance
        backend_client: BackendClient instance (or None)
        height: Frame height in pixels
        width: Frame width in pixels
        line_y: Y coordinate of counting line
        wait_time: Milliseconds to wait between frames
    """
    frame_count = 0
    last_summary_time = time.time()
    SUMMARY_INTERVAL = 30

    print("\n" + "="*60)
    print("  VEHICLE DETECTION SYSTEM - ACTIVE")
    print("="*60)
    print(f"  Resolution: {width}x{height} px")
    print(f"  Counting line: Y={line_y}")
    print(f"  Press 'q' to exit")
    print("="*60 + "\n")

    while True:
        try:
            start_time = time.time()

            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            detector.clean_old_detections()
            results = detector.detect(frame)
            detections = detector.get_vehicle_detections(results)

        except KeyboardInterrupt:
            print("\n⚠ Interrupt detected, stopping...")
            break
        except Exception as e:
            print(f"\n✗ Error processing frame {frame_count}: {e}")
            print("  Continuing with next frame...")
            continue

        # Draw visualization
        vehicle_frame = frame.copy()
        cv2.line(vehicle_frame, (0, line_y), (width, line_y),
                 config.LINE_COLOR, config.LINE_THICKNESS)

        try:
            for (xyxy, label, conf, center_x, center_y) in detections:
                cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]),
                             config.BBOX_COLOR, config.BBOX_THICKNESS)
                cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)

                # Update count and send to backend if crossed line
                if detector.update_count(center_x, center_y, line_y):
                    if backend_client and label in YOLO_TO_VEHICLE_TYPE:
                        try:
                            event = VehicleDetectedEvent(
                                vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                                timestamp=get_colombia_datetime(),
                                device_id=None
                            )
                            success = backend_client.send_detection(event)
                            status = "✓" if success else "✗"
                            print(f"{status} {label.upper():12s} | Total: {detector.get_count():3d} | "
                                  f"Backend: {'OK' if success else 'FAIL'}")
                        except Exception as e:
                            logger.error(f"Error sending detection: {e}")
        except Exception as e:
            logger.error(f"Error in detection processing: {e}")

        # Display frame
        if vehicle_frame.shape[:2] != (height, width):
            vehicle_frame = cv2.resize(vehicle_frame, (width, height))

        title = f"YOLO Vehicle Detection & Counting - Stream"
        cv2.imshow(title, vehicle_frame)

        # Periodic summary
        current_time = time.time()
        if current_time - last_summary_time >= SUMMARY_INTERVAL:
            print(f"\nSUMMARY ({SUMMARY_INTERVAL}s): {detector.get_count()} vehicles detected | "
                  f"Frames processed: {frame_count}\n")
            last_summary_time = current_time

        # Frame rate control and user input
        elapsed = (time.time() - start_time) * 1000
        delay = max(1, int(wait_time - elapsed))

        if cv2.waitKey(delay) & 0xFF == ord('q'):
            break

    # Cleanup
    try:
        cap.release()
        cv2.destroyAllWindows()
    except Exception as e:
        logger.warning(f"Warning releasing resources: {e}")

    print(f"\n{'='*50}")
    print(f"Processing completed")
    print(f"Total vehicles detected: {detector.get_count()}")
    print(f"Frames processed: {frame_count}")
    print(f"{'='*50}")


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    # Initialize components
    detector = initialize_detector()
    backend_client = initialize_backend_client()

    # Parse video source from command line
    source_type, video_source = parse_video_source(sys.argv[1:])

    # Open video source and get metadata
    cap, height, width, line_y, fps, wait_time = open_video_source(video_source, source_type)

    # Run main processing loop
    main_loop(cap, detector, backend_client, height, width, line_y, wait_time)
