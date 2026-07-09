"""
Data models (DTOs) for backend communication.

Defines data classes and enums for communication with the Spring Boot backend.
Handles vehicle type mapping between YOLO class names and backend VehicleType enum.

Classes:
    VehicleType: Enum of vehicle types
    VehicleDetectedEvent: DTO for sending vehicle detections to backend
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from enum import Enum
from typing import Dict


def get_colombia_datetime() -> datetime:
    """
    Returns a datetime for Colombia time when the timezone database is available.

    Some environments (notably some Windows or minimal Python installs) do not
    include the IANA timezone data. In that case, we fall back to the server's
    local time instead of crashing the stream creation flow.
    """
    try:
        return datetime.now(ZoneInfo("America/Bogota"))
    except (ZoneInfoNotFoundError, KeyError, Exception):
        return datetime.now().astimezone()


def to_backend_datetime(timestamp: datetime) -> datetime:
    """
    Converts a timestamp to a naive datetime suitable for backend serialization.
    """
    if timestamp.tzinfo is None:
        return timestamp

    try:
        target_tz = ZoneInfo("America/Bogota")
        return timestamp.astimezone(target_tz).replace(tzinfo=None)
    except (ZoneInfoNotFoundError, KeyError, Exception):
        return timestamp.astimezone().replace(tzinfo=None)


class VehicleType(Enum):
    """
    Enumeration of vehicle types.

    Must match exactly with VehicleType.java in the backend to ensure
    proper deserialization and data integrity.

    Attributes:
        CAR: Passenger vehicle
        BUS: Public transport bus
        MOTORCYCLE: Motorcycle or scooter
        BICYCLE: Pedal bicycle
        TRUCK: Commercial truck or heavy vehicle
    """
    CAR = "CAR"
    BUS = "BUS"
    MOTORCYCLE = "MOTORCYCLE"
    BICYCLE = "BICYCLE"
    TRUCK = "TRUCK"


@dataclass
class VehicleDetectedEvent:
    """
    Data Transfer Object for sending vehicle detection events to backend.

    Maps to the VehicleDetected entity in the Spring Boot backend.
    Handles timezone-aware timestamp conversion to local Colombia time
    for proper backend deserialization.

    Attributes:
        vehicle_type (VehicleType): Type of vehicle detected
        timestamp (datetime): Detection timestamp (should be timezone-aware)
        device_id (int): ID of the device (camera) that detected the vehicle

    Example:
        >>> from datetime import datetime
        >>> from zoneinfo import ZoneInfo
        >>> tz = ZoneInfo("America/Bogota")
        >>> event = VehicleDetectedEvent(
        ...     vehicle_type=VehicleType.CAR,
        ...     timestamp=datetime.now(tz),
        ...     device_id=1
        ... )
        >>> payload = event.to_dict()  # Ready for JSON serialization
    """
    vehicle_type: VehicleType
    timestamp: datetime
    device_id: int

    def to_dict(self) -> Dict:
        """
        Converts the event to JSON-serializable dictionary format.

        The Spring Boot backend expects a nested device object with id field,
        not a flat deviceId property. Timestamps are converted to Colombia
        timezone and sent as naive datetime strings for proper local time
        interpretation by the backend's LocalDateTime deserializer.

        Returns:
            Dictionary with keys: vehicleType, timestamp, device

        Example:
            {
                "vehicleType": "CAR",
                "timestamp": "2026-07-01T14:30:45.123456",
                "device": {"id": 1}
            }
        """
        # Ensure we send a naive local datetime string so backend's LocalDateTime
        # parser interprets the time as local server time.
        ts_local = to_backend_datetime(self.timestamp)

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
