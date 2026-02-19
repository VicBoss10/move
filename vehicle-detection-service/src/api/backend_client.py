"""
Cliente HTTP para comunicación con el backend Spring Boot
"""
import requests
import logging
from typing import Optional
from .models import VehicleDetectedEvent


class BackendClient:
    """
    Cliente HTTP para enviar detecciones de vehículos al backend.
    
    Maneja la comunicación con el API REST del backend Spring Boot,
    incluyendo manejo de errores, timeouts y logging.
    """
    
    def __init__(self, base_url: str, timeout: int = 5):
        """
        Inicializa el cliente del backend.
        
        Args:
            base_url: URL base del backend (ej: http://localhost:8080)
            timeout: Tiempo máximo de espera en segundos
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        self._is_available = False
    
    def health_check(self) -> bool:
        """
        Verifica si el backend está disponible.
        
        Intenta conectarse al endpoint base del backend.
        
        Returns:
            True si el backend responde, False en caso contrario
        """
        try:
            response = requests.get(
                self.base_url,
                timeout=2
            )
            self._is_available = response.status_code < 500
            return self._is_available
        except requests.exceptions.ConnectionError:
            self.logger.debug(f"No se pudo conectar a {self.base_url}")
            self._is_available = False
            return False
        except Exception as e:
            self.logger.debug(f"Health check fallido: {e}")
            self._is_available = True
            return True
    
    def send_detection(self, event: VehicleDetectedEvent) -> bool:
        """
        Envía una detección de vehículo al backend.
        
        Args:
            event: Evento con los datos de la detección
            
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        endpoint = f"{self.base_url}/vehicles"
        
        try:
            response = requests.post(
                endpoint,
                json=event.to_dict(),
                headers={"Content-Type": "application/json"},
                timeout=self.timeout
            )
            
            if response.status_code in [200, 201]:
                self.logger.debug(
                    f"✓ Detección enviada: {event.vehicle_type.value} "
                    f"a location {event.location_id}"
                )
                return True
            else:
                self.logger.warning(
                    f"✗ Error HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except requests.exceptions.Timeout:
            self.logger.error(
                f"✗ Timeout al enviar detección (>{self.timeout}s)"
            )
            return False
            
        except requests.exceptions.ConnectionError:
            self.logger.error(
                "✗ No se pudo conectar con el backend. "
                "¿Está corriendo en " + self.base_url + "?"
            )
            return False
            
        except Exception as e:
            self.logger.error(f"✗ Error inesperado al enviar detección: {e}")
            return False
    
    def is_available(self) -> bool:
        """
        Retorna si el backend está disponible según el último health check.
        
        Returns:
            True si está disponible, False en caso contrario
        """
        return self._is_available
    
    def __str__(self) -> str:
        """Representación en string del cliente."""
        status = "disponible" if self._is_available else "no disponible"
        return f"BackendClient({self.base_url}, {status})"
