"""
Módulo de integración con el backend
"""
from .models import VehicleType, VehicleDetectedEvent, YOLO_TO_VEHICLE_TYPE
from .backend_client import BackendClient

__all__ = [
    'VehicleType',
    'VehicleDetectedEvent',
    'YOLO_TO_VEHICLE_TYPE',
    'BackendClient'
]
