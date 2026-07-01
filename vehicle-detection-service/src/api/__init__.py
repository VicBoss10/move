"""
Backend integration module.

Provides classes and types for communicating with the Spring Boot backend API.
Handles vehicle detection event serialization and HTTP client for sending
detections to the backend.

Exports:
    VehicleType: Enum of supported vehicle types
    VehicleDetectedEvent: DTO for detection events
    YOLO_TO_VEHICLE_TYPE: Mapping from YOLO class names to VehicleType
    BackendClient: HTTP client for backend communication
"""
from .models import VehicleType, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE
from .backend_client import BackendClient

__all__ = [
    'VehicleType',
    'VehicleDetectedEvent',
    'YOLO_TO_VEHICLE_TYPE',
    'BackendClient'
]
