"""
Vehicle detection module.

Provides YOLO-based vehicle detection with counting and deduplication logic.

Exports:
    VehicleDetector: YOLO detector with vehicle counting
"""
from .vehicle_detector import VehicleDetector

__all__ = ['VehicleDetector']
