"""
Stream management for concurrent video processing.

Manages multiple concurrent video streaming sessions with thread-per-stream
architecture for frame reading, YOLO detection, encoding, and backend communication.
"""
import cv2
import logging
import threading
import time
import uuid
import queue
from typing import Dict, Optional, Generator, List, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo

import config
from detectors import VehicleDetector
from video import CameraSource, StreamSource
from api import BackendClient, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE
from .stream_session import StreamSession

logger = logging.getLogger(__name__)


class StreamManager:
    """
    Manages multiple concurrent video streaming sessions.

    Thread-safe manager for creating, monitoring, and stopping video streams.
    Each stream runs four concurrent threads for frame reading, detection,
    encoding, and backend communication. Provides session lifecycle management.

    Thread safety:
        All methods are thread-safe using a lock for sessions dict access.
        Session-level state is protected with per-session locks.

    Note:
        Session.is_running flag is used for graceful shutdown; threads check
        this flag to exit their loops. Always wait for thread termination
        before releasing VideoCapture to avoid SIGSEGV.
    """

    def __init__(self):
        self.sessions: Dict[str, StreamSession] = {}
        self.lock = threading.Lock()
        self.logger = logging.getLogger(__name__)

        # Initialize backend client for saving detections
        self.backend_client = None
        if config.SEND_DETECTIONS_ENABLED:
            try:
                self.backend_client = BackendClient(
                    base_url=config.BACKEND_URL,
                    timeout=config.BACKEND_TIMEOUT
                )
                self.logger.info(f"Backend client configured: {config.BACKEND_URL}")
            except Exception as e:
                self.logger.warning(f"Could not initialize backend client: {e}")

    def create_stream(self, stream_type: str, source: str, device_id: Optional[int] = None) -> Dict:
        """
        Creates a new streaming session.

        Args:
            stream_type: Stream type (USB, URL, RTSP, YOUTUBE)
            source: Video source (camera index or URL)
            device_id: ID of the device (camera) in the backend DB

        Returns:
            Dictionary with sessionId and status
        """
        session_id = str(uuid.uuid4())

        try:
            if stream_type == "USB":
                camera_index = int(source)
                video_source = CameraSource(camera_index)
            else:
                video_source = StreamSource(
                    url=source,
                    ytdlp_options=config.YTDLP_OPTIONS,
                    ytdlp_download_options=config.YTDLP_DOWNLOAD_OPTIONS
                )

            if not video_source.open():
                self.logger.error(f"Could not open video source: {source}")
                return {"error": "Cannot open video source", "status": "failed"}

            detector = VehicleDetector(
                model_path=config.YOLO_MODEL_PATH,
                vehicle_classes=config.VEHICLE_CLASSES,
                dist_threshold=config.DIST_THRESHOLD,
                time_threshold=config.TIME_THRESHOLD,
                line_tolerance=config.LINE_TOLERANCE
            )
            detector.model.to(config.YOLO_DEVICE)

            session = StreamSession(
                session_id=session_id,
                stream_type=stream_type,
                source=source,
                status="active",
                created_at=datetime.now(ZoneInfo("America/Bogota")),
                video_source=video_source,
                detector=detector,
                is_running=True,
                device_id=device_id
            )

            with self.lock:
                self.sessions[session_id] = session

            # Start reader thread (frame reading only)
            reader = threading.Thread(
                target=self._frame_reader,
                args=(session_id,),
                daemon=True,
                name=f"reader-{session_id[:8]}"
            )
            reader.start()

            # Start YOLO thread (async detection — doesn't block encoder)
            yolo = threading.Thread(
                target=self._yolo_detector,
                args=(session_id,),
                daemon=True,
                name=f"yolo-{session_id[:8]}"
            )
            yolo.start()

            # Start processor thread (JPEG encoding only, never blocked by YOLO)
            processor = threading.Thread(
                target=self._frame_processor,
                args=(session_id,),
                daemon=True,
                name=f"processor-{session_id[:8]}"
            )
            processor.start()

            # Start backend worker thread for sending detections (doesn't block YOLO)
            if self.backend_client:
                backend_worker = threading.Thread(
                    target=self._backend_worker,
                    args=(session_id,),
                    daemon=True,
                    name=f"backend-{session_id[:8]}"
                )
                backend_worker.start()

            self.logger.info(f"Stream created: {session_id} ({stream_type}: {source})")
            return {
                "sessionId": session_id,
                "status": "active",
                "streamType": stream_type
            }

        except ValueError as e:
            self.logger.error(f"Invalid source value: {source}")
            return {"error": f"Invalid source value: {str(e)}", "status": "failed"}
        except Exception as e:
            self.logger.error(f"Error creating stream: {e}")
            return {"error": str(e), "status": "failed"}

    def get_stream(self, session_id: str) -> Optional[StreamSession]:
        """
        Gets a streaming session by ID.

        Args:
            session_id: Session identifier

        Returns:
            StreamSession if exists, None otherwise
        """
        with self.lock:
            return self.sessions.get(session_id)

    def stop_stream(self, session_id: str) -> bool:
        """
        Stops and removes a streaming session.

        Waits for threads to terminate before releasing VideoCapture
        to avoid SIGSEGV.

        Args:
            session_id: Session ID to stop

        Returns:
            True if stopped successfully, False if not found
        """
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return False

            # Signal threads to stop
            session.is_running = False
            session.status = "stopped"
            del self.sessions[session_id]

        # Wait outside lock for threads to finish (max 3s)
        time.sleep(0.5)

        # Now safe to release VideoCapture
        if session.video_source:
            try:
                session.video_source.release()
            except Exception as e:
                self.logger.warning(f"Error releasing video source: {e}")

        self.logger.info(f"Stream stopped: {session_id}")
        return True

    def get_status(self, session_id: str) -> Dict:
        """
        Gets the status of a session.

        Args:
            session_id: Session identifier

        Returns:
            Dictionary with status information
        """
        session = self.get_stream(session_id)
        if not session:
            return {"error": "Session not found", "status": "not_found"}

        return {
            "sessionId": session.session_id,
            "status": session.status,
            "streamType": session.stream_type,
            "isRunning": session.is_running,
            "detectionCount": session.detector.get_count() if session.detector else 0
        }

    def _frame_reader(self, session_id: str):
        """
        Thread dedicated ONLY to reading frames from VideoCapture.

        Always stores the most recent frame for the processor to never work
        with stale frames (drains network/camera buffer).
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            return

        cap = session.video_source.get_capture()
        if not cap:
            self.logger.error(f"Reader: could not get VideoCapture for {session_id}")
            return

        try:
            fps = session.video_source.get_fps()
            frame_interval = 1.0 / fps if fps > 0 else 1.0 / 30
        except Exception:
            frame_interval = 1.0 / 30

        while session.is_running:
            try:
                read_start = time.time()
                ret, frame = cap.read()
                if not ret:
                    self.logger.warning(f"Reader: end of stream {session_id}")
                    session.is_running = False
                    break
                with session._current_frame_lock:
                    session._current_frame = frame
                    session._frame_id += 1

                elapsed = time.time() - read_start
                sleep_time = frame_interval - elapsed
                if sleep_time > 0.001:
                    time.sleep(sleep_time)
            except Exception as e:
                if not session.is_running:
                    break
                self.logger.error(f"Reader: error reading frame: {e}")
                session.is_running = False
                break

        self.logger.info(f"Reader finished for session: {session_id}")

    def _yolo_detector(self, session_id: str):
        """
        Thread dedicated to YOLO inference.

        Runs as fast as CPU allows, updating last_detections.
        Encoder reads detections asynchronously — never blocked.
        """
        session = self.get_stream(session_id)
        if not session:
            return

        deadline = time.time() + 10.0
        while session._current_frame is None and session.is_running and time.time() < deadline:
            time.sleep(0.01)

        max_width = getattr(config, 'STREAM_MAX_WIDTH', 0)
        last_frame_id = -1

        while session.is_running:
            try:
                with session._current_frame_lock:
                    current_frame_id = session._frame_id
                    frame = session._current_frame

                if frame is None or current_frame_id == last_frame_id:
                    time.sleep(0.005)
                    continue

                frame = frame.copy()
                last_frame_id = current_frame_id

                process_frame = frame
                resize_scale = 1.0
                if max_width and frame.shape[1] > max_width:
                    resize_scale = max_width / float(frame.shape[1])
                    process_frame = cv2.resize(
                        frame,
                        (int(frame.shape[1] * resize_scale), int(frame.shape[0] * resize_scale))
                    )

                session.detector.clean_old_detections()
                results = session.detector.detect(process_frame)
                detections = session.detector.get_vehicle_detections(results)

                if resize_scale != 1.0:
                    detections = [
                        (
                            (int(x1/resize_scale), int(y1/resize_scale),
                             int(x2/resize_scale), int(y2/resize_scale)),
                            label, conf,
                            int(cx/resize_scale), int(cy/resize_scale)
                        )
                        for (x1, y1, x2, y2), label, conf, cx, cy in detections
                    ]

                line_y = (session.frame_height // 2) if session.frame_height > 0 else (frame.shape[0] // 2)

                for (xyxy, label, conf, center_x, center_y) in detections:
                    if session.detector.update_count(center_x, center_y, line_y):
                        if self.backend_client and label in YOLO_TO_VEHICLE_TYPE:
                            if not getattr(session, 'device_id', None):
                                self.logger.warning(f"YOLO: device_id not set for session {session.session_id}, skipping event")
                                continue
                            event = VehicleDetectedEvent(
                                vehicle_type=YOLO_TO_VEHICLE_TYPE[label],
                                timestamp=datetime.now(ZoneInfo("America/Bogota")),
                                device_id=session.device_id
                            )
                            try:
                                session.detection_event_queue.put_nowait((label, event))
                            except queue.Full:
                                self.logger.warning(f"YOLO: event queue full, dropping event {label}")

                with session._detections_lock:
                    session.last_detections = detections

            except Exception as e:
                if not session.is_running:
                    break
                self.logger.debug(f"YOLO: error in detection: {e}")

        self.logger.info(f"YOLO detector finished for session: {session_id}")

    def _frame_processor(self, session_id: str):
        """
        Thread dedicated ONLY to JPEG encoding.

        Never runs YOLO — takes detections from YOLO thread and encodes at STREAM_MAX_FPS.
        """
        session = self.get_stream(session_id)
        if not session or not session.video_source:
            return

        deadline = time.time() + 10.0
        while session._current_frame is None and session.is_running and time.time() < deadline:
            time.sleep(0.01)

        if session._current_frame is None:
            self.logger.error(f"Processor: no initial frame for {session_id}")
            return

        with session._current_frame_lock:
            first_frame = session._current_frame.copy()

        height, width = first_frame.shape[:2]
        line_y = height // 2
        session.frame_width = width
        session.frame_height = height

        try:
            fps = session.video_source.get_fps()
            self.logger.info(f"Processor {session_id[:8]}: source FPS={fps:.1f}")
        except Exception:
            pass

        try:
            ret_enc, buf = cv2.imencode('.jpg', first_frame,
                                        [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
            if ret_enc:
                with session.last_frame_lock:
                    session.last_frame_bytes = buf.tobytes()
                session.frame_event.set()
        except Exception as e:
            self.logger.warning(f"Processor: error encoding first frame: {e}")

        encode_interval = 1.0 / getattr(config, 'STREAM_MAX_FPS', 20)
        last_encode_time = time.time()
        max_width = getattr(config, 'STREAM_MAX_WIDTH', 0)
        metrics_interval = getattr(config, 'METRICS_LOG_INTERVAL', 20)
        frames_encoded = 0
        last_metrics = time.time()

        while session.is_running:
            try:
                loop_start = time.time()

                with session._current_frame_lock:
                    frame = session._current_frame
                if frame is None:
                    time.sleep(0.005)
                    continue
                frame = frame.copy()

                with session._detections_lock:
                    current_detections = session.last_detections

                detections_to_draw = session.prev_detections or current_detections
                session.prev_detections = current_detections

                draw_proximity = getattr(config, 'DRAW_PROXIMITY_PX', height // 4)
                vehicle_frame = frame
                if detections_to_draw:
                    vehicle_frame = frame.copy()
                    cv2.line(vehicle_frame, (0, line_y), (width, line_y),
                             config.LINE_COLOR, config.LINE_THICKNESS)
                    for (xyxy, label, conf, center_x, center_y) in detections_to_draw:
                        if abs(center_y - line_y) <= draw_proximity:
                            cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]),
                                          config.BBOX_COLOR, config.BBOX_THICKNESS)
                            cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                            cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)
                        else:
                            cv2.circle(vehicle_frame, (center_x, center_y), 3, config.BBOX_COLOR, -1)

                encode_frame = vehicle_frame
                try:
                    if max_width:
                        h, w = encode_frame.shape[:2]
                        if w > max_width:
                            scale = max_width / float(w)
                            encode_frame = cv2.resize(encode_frame, (int(w * scale), int(h * scale)))
                except Exception:
                    pass

                now_encode = time.time()
                if now_encode - last_encode_time >= encode_interval:
                    try:
                        ret_enc, buf = cv2.imencode('.jpg', encode_frame,
                                                   [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
                        if ret_enc:
                            with session.last_frame_lock:
                                session.last_frame_bytes = buf.tobytes()
                            session.frame_event.set()
                            frames_encoded += 1
                            last_encode_time = now_encode
                    except Exception:
                        pass

                now = time.time()
                if now - last_metrics >= metrics_interval:
                    self.logger.info(
                        f"Encoder {session_id[:8]}: encoded/s={frames_encoded / (now - last_metrics):.1f}"
                    )
                    frames_encoded = 0
                    last_metrics = now

                elapsed = time.time() - loop_start
                sleep_time = max(0, encode_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)

            except Exception as e:
                self.logger.error(f"Processor: error in loop: {e}")
                break

        self.logger.info(f"Processor finished for session: {session_id}")

    def _backend_worker(self, session_id: str):
        """
        Worker thread for processing detection events and sending to backend.

        Non-blocking I/O: HTTP calls don't block YOLO/processor threads.
        """
        session = self.get_stream(session_id)
        if not session:
            return

        while session.is_running:
            try:
                try:
                    label, event = session.detection_event_queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                if self.backend_client:
                    try:
                        success = self.backend_client.send_detection(event)
                        if success:
                            self.logger.info(f"✓ {label.upper()} | Total: {session.detector.get_count()}")
                        else:
                            self.logger.warning(f"✗ {label.upper()} not saved")
                    except Exception as e:
                        self.logger.error(f"Backend worker: error sending detection: {e}")

            except Exception as e:
                if not session.is_running:
                    break
                self.logger.debug(f"Backend worker: error processing queue: {e}")

        self.logger.info(f"Backend worker finished for session: {session_id}")

    def generate_frames(self, session_id: str) -> Generator[bytes, None, None]:
        """
        MJPEG frame generator. Waits for notification from processor to send frames.

        Thread-safe frame access without direct VideoCapture access.
        """
        session = self.get_stream(session_id)
        if not session:
            self.logger.error(f"generate_frames: session not found: {session_id}")
            return

        session.frame_event.wait(timeout=5.0)

        while session.is_running:
            session.frame_event.wait(timeout=1.0)
            session.frame_event.clear()

            with session.last_frame_lock:
                frame_bytes = session.last_frame_bytes

            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        self.logger.info(f"Frame generator finished for session: {session_id}")
