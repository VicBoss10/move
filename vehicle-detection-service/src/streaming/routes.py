"""
Flask routes for streaming API endpoints.

Provides HTTP endpoints for managing video streams and consuming MJPEG feeds.
"""
import time
import logging
from flask import Blueprint, Response, request, jsonify
from .stream_manager import StreamManager

logger = logging.getLogger(__name__)

# Create blueprint
streaming_bp = Blueprint('streaming', __name__, url_prefix='/stream')

# Reference to StreamManager (injected by app)
_stream_manager: StreamManager = None


def set_stream_manager(manager: StreamManager):
    """Sets the StreamManager instance for this blueprint."""
    global _stream_manager
    _stream_manager = manager


@streaming_bp.route('/start', methods=['POST'])
def start_stream():
    """
    Starts a new streaming session.

    Request Body (required):
    {
        "streamType": "USB|URL|RTSP|YOUTUBE",
        "source": "0" or URL,
        "device_id": ID of camera device in backend - REQUIRED
    }

    Returns:
        JSON with sessionId and status
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        stream_type = data.get('streamType')
        source = data.get('source')
        device_id = data.get('device_id')

        if not stream_type or not source:
            return jsonify({"error": "streamType and source are required"}), 400

        if device_id is None:
            return jsonify({"error": "device_id is required (ID of the camera device in backend)"}), 400

        try:
            device_id = int(device_id)
            if device_id <= 0:
                return jsonify({"error": "device_id must be a positive integer"}), 400
        except (TypeError, ValueError):
            return jsonify({"error": "device_id must be a valid integer"}), 400

        valid_types = {"USB", "URL", "RTSP", "YOUTUBE"}
        if stream_type not in valid_types:
            return jsonify({"error": f"Invalid streamType. Must be one of: {valid_types}"}), 400

        result = _stream_manager.create_stream(stream_type, source, device_id=device_id)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 201

    except Exception as e:
        logger.error(f"Error in /stream/start: {e}")
        return jsonify({"error": "Internal server error"}), 500


@streaming_bp.route('/feed/<session_id>')
def stream_feed(session_id):
    """
    MJPEG stream feed endpoint.

    Args:
        session_id: ID of the streaming session

    Returns:
        MJPEG multipart/x-mixed-replace stream
    """
    session = _stream_manager.get_stream(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    response = Response(
        _stream_manager.generate_frames(session_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Connection'] = 'keep-alive'
    return response


@streaming_bp.route('/snapshot/<session_id>')
def stream_snapshot(session_id):
    """
    Returns a single JPEG frame from the active stream.

    Fallback for browsers that don't support MJPEG (Safari/iOS).

    Query parameters (optional):
        w: max width in px (e.g., 640). Resizes if frame is wider.
        q: JPEG quality 1-100 (default: config STREAM_JPEG_QUALITY).

    Args:
        session_id: ID of the streaming session

    Returns:
        JPEG frame with no-cache headers
    """
    session = _stream_manager.get_stream(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    if not session.last_frame_bytes:
        deadline = time.time() + 3.0
        while not session.last_frame_bytes and session.is_running and time.time() < deadline:
            time.sleep(0.05)

    with session.last_frame_lock:
        frame_bytes = session.last_frame_bytes

    if not frame_bytes:
        return jsonify({"error": "No frame available yet"}), 503

    # Re-encode if client requests different width or quality
    req_width = request.args.get('w', type=int)
    req_quality = request.args.get('q', type=int)
    if req_width or req_quality:
        import cv2
        import numpy as np
        import config

        arr = np.frombuffer(frame_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            if req_width and img.shape[1] > req_width:
                scale = req_width / float(img.shape[1])
                img = cv2.resize(img, (req_width, int(img.shape[0] * scale)))
            quality = max(10, min(100, req_quality)) if req_quality else config.STREAM_JPEG_QUALITY
            ret, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if ret:
                frame_bytes = buf.tobytes()

    response = Response(frame_bytes, mimetype='image/jpeg')
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@streaming_bp.route('/stop/<session_id>', methods=['POST'])
def stop_stream(session_id):
    """
    Stops a streaming session.

    Args:
        session_id: ID of the streaming session

    Returns:
        JSON confirmation
    """
    success = _stream_manager.stop_stream(session_id)

    if not success:
        return jsonify({"error": "Session not found"}), 404

    return jsonify({"message": "Stream stopped successfully", "sessionId": session_id}), 200


@streaming_bp.route('/status/<session_id>', methods=['GET'])
def stream_status(session_id):
    """
    Gets the status of a streaming session.

    Args:
        session_id: ID of the streaming session

    Returns:
        JSON with status information
    """
    status = _stream_manager.get_status(session_id)

    if "error" in status:
        return jsonify(status), 404

    return jsonify(status), 200


@streaming_bp.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint.

    Returns:
        JSON with service status
    """
    return jsonify({
        "status": "healthy",
        "service": "vehicle-detection-streaming",
        "activeSessions": len(_stream_manager.sessions)
    }), 200
