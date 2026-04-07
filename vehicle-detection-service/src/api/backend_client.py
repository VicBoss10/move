"""
Cliente HTTP para comunicación con el backend Spring Boot
"""
import os
import time
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
        # Token cache for client_credentials
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

        # Keycloak client-credentials configuration (read from env)
        self.kc_token_url = os.getenv(
            "KEYCLOAK_TOKEN_URL",
            "https://auth.moveiot.online/realms/move/protocol/openid-connect/token",
        )
        self.client_id = os.getenv("VEHICLE_CLIENT_ID")
        self.client_secret = os.getenv("VEHICLE_CLIENT_SECRET")
    
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
            # Acquire access token via client_credentials (cached)
            token = self._get_token()
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            payload = event.to_dict()
            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=self.timeout,
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

    def _get_token(self) -> Optional[str]:
        """Obtener y cachear un access_token usando client_credentials.

        Retorna None si no hay credenciales configuradas o si falla la petición.
        """
        try:
            if self._token and time.time() < self._token_expiry - 10:
                return self._token

            if not self.client_id or not self.client_secret:
                self.logger.debug("VEHICLE_CLIENT_ID/VEHICLE_CLIENT_SECRET no configurados; enviando sin token")
                return None

            data = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }
            resp = requests.post(self.kc_token_url, data=data, timeout=5)
            resp.raise_for_status()
            j = resp.json()
            access_token = j.get("access_token")
            expires_in = int(j.get("expires_in", 60))
            if access_token:
                self._token = access_token
                self._token_expiry = time.time() + expires_in
                return self._token
            else:
                self.logger.warning("No se recibió access_token del token endpoint")
                return None
        except Exception as e:
            self.logger.warning(f"Fallo al obtener token de Keycloak: {e}")
            return None
    
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
