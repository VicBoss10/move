"""
Flask API server for real-time vehicle detection streaming.

Provides HTTP endpoints for streaming video with concurrent vehicle detection.
Initializes the Flask application and registers streaming routes.

Entry point for running the server:
    gunicorn -w 1 -b 0.0.0.0:5000 api_server:app

Author: Victor Narvaez
Date: 2026-02-19
"""
import logging
from flask import Flask, jsonify
from flask_cors import CORS

import config
from streaming import StreamManager, streaming_bp, set_stream_manager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Initialize StreamManager
stream_manager = StreamManager()

# Register streaming blueprint and inject StreamManager
set_stream_manager(stream_manager)
app.register_blueprint(streaming_bp)


# =============================================================================
# ROOT ENDPOINTS
# =============================================================================

@app.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint for the vehicle detection service.

    Called by the backend to verify the Python service is running.
    Always returns 200 OK with status information.

    Returns:
        JSON with status and service name
    """
    return jsonify({
        "status": "HEALTHY",
        "service": "vehicle-detection",
        "activeSessions": len(stream_manager.sessions)
    }), 200


if __name__ == '__main__':
    logger.info(f"Starting Flask server at {config.FLASK_HOST}:{config.FLASK_PORT}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.FLASK_DEBUG, threaded=True)
