"""
Modelos de datos (DTOs) para comunicación con el backend
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from enum import Enum
from typing import Dict


class VehicleType(Enum):
    """
    Enum de tipos de vehículos.
    Debe coincidir exactamente con VehicleType.java del backend.
    """
    CAR = "CAR"
    BUS = "BUS"
    MOTORCYCLE = "MOTORCYCLE"
    BICYCLE = "BICYCLE"
    TRUCK = "TRUCK"


@dataclass
class VehicleDetectedEvent:
    """
    DTO para enviar detecciones de vehículos al backend.
    Mapea al modelo VehicleDetected.java
    
    Attributes:
        vehicle_type: Tipo de vehículo detectado
        timestamp: Fecha y hora de la detección
        device_id: ID del dispositivo (cámara) que detectó el vehículo
    """
    vehicle_type: VehicleType
    timestamp: datetime
    device_id: int
    
    def to_dict(self) -> Dict:
        """
        Convierte el evento a formato JSON para el backend.
        
        El backend Spring Boot espera un objeto device con id,
        no un deviceId simple.
        
        Returns:
            Diccionario con el formato esperado por el backend
        """
        # Ensure we send a naive local datetime string so backend's LocalDateTime
        # parser interprets the time as local server time.
        try:
            # Convert to Colombia timezone explicitly and strip tzinfo so backend LocalDateTime parses as local time
            target_tz = ZoneInfo("America/Bogota")
            if self.timestamp.tzinfo is not None:
                ts_local = self.timestamp.astimezone(target_tz).replace(tzinfo=None)
            else:
                # Treat naive datetime as if it's already in local Colombia time
                ts_local = self.timestamp
        except Exception:
            ts_local = self.timestamp

        return {
            "vehicleType": self.vehicle_type.value,
            "timestamp": ts_local.isoformat(),
            "device": {
                "id": self.device_id
            }
        }


# Mapeo de clases YOLO a tipos de vehículos del backend
YOLO_TO_VEHICLE_TYPE = {
    "car": VehicleType.CAR,
    "bus": VehicleType.BUS,
    "truck": VehicleType.TRUCK,
    "motorcycle": VehicleType.MOTORCYCLE,
    "bicycle": VehicleType.BICYCLE
}
