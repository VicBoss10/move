"""
Modelos de datos (DTOs) para comunicación con el backend
"""
from dataclasses import dataclass
from datetime import datetime
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
        location_id: ID de la ubicación/cámara en la base de datos
    """
    vehicle_type: VehicleType
    timestamp: datetime
    location_id: int
    
    def to_dict(self) -> Dict:
        """
        Convierte el evento a formato JSON para el backend.
        
        El backend Spring Boot espera un objeto location con id,
        no un locationId simple.
        
        Returns:
            Diccionario con el formato esperado por el backend
        """
        return {
            "vehicleType": self.vehicle_type.value,
            "timestamp": self.timestamp.isoformat(),
            "location": {
                "id": self.location_id
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
