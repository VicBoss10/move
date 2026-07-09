"""
HTTP client for backend Spring Boot communication.

Manages HTTP requests to the backend REST API for sending vehicle detection
events. Handles Keycloak authentication via client_credentials flow, request
timeouts, and error recovery.

Classes:
    BackendClient: HTTP client for backend communication
"""
import os
import time
import requests
import logging
from typing import Optional
from .models import VehicleDetectedEvent


class BackendClient:
    """
    HTTP client for sending vehicle detection events to the backend API.

    Manages communication with the Spring Boot backend REST API. Handles
    Keycloak OAuth2 client_credentials authentication (cached), request
    timeouts, connection errors, and detailed logging.

    Environment Variables:
        KEYCLOAK_TOKEN_URL: OAuth2 token endpoint (default: auth.moveiot.online)
        VEHICLE_CLIENT_ID: OAuth2 client ID for this service
        VEHICLE_CLIENT_SECRET: OAuth2 client secret for this service

    Attributes:
        base_url (str): Backend API base URL
        timeout (int): Request timeout in seconds
        kc_token_url (str): Keycloak token endpoint URL
        client_id (str): OAuth2 client ID
        client_secret (str): OAuth2 client secret
    """
    
    def __init__(self, base_url: str, timeout: int = 5):
        """
        Initializes the backend API client.

        Args:
            base_url (str): Base URL of the backend API
                (e.g., http://localhost:8080)
            timeout (int): Request timeout in seconds. Default: 5
        """
        resolved_base_url = (
            os.getenv("BACKEND_URL")
            or os.getenv("FRONTEND_API_BASE_URL")
            or os.getenv("API_BASE_URL")
            or base_url
        )
        self.base_url = resolved_base_url.rstrip('/')
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        self._is_available = False
        # Token cache for client_credentials
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

        # Keycloak client-credentials configuration (read from env)
        self.kc_token_url = os.getenv("KEYCLOAK_TOKEN_URL")
        if not self.kc_token_url:
            issuer_uri = os.getenv("KEYCLOAK_ISSUER_URI") or os.getenv("KEYCLOAK_PUBLIC_HOSTNAME")
            if issuer_uri:
                issuer_uri = issuer_uri.rstrip('/')
                if issuer_uri.endswith('/token'):
                    self.kc_token_url = issuer_uri
                elif '/realms/' in issuer_uri:
                    self.kc_token_url = f"{issuer_uri}/protocol/openid-connect/token"
                else:
                    realm = os.getenv("KEYCLOAK_REALM", "move")
                    self.kc_token_url = f"{issuer_uri}/realms/{realm}/protocol/openid-connect/token"
            else:
                self.kc_token_url = "http://localhost:8081/realms/move/protocol/openid-connect/token"

        self.client_id = os.getenv("VEHICLE_CLIENT_ID")
        self.client_secret = os.getenv("VEHICLE_CLIENT_SECRET")
    
    def health_check(self) -> bool:
        """
        Checks if the backend is available and healthy.

        Attempts to connect to the backend base URL to verify availability.
        Updates internal availability flag.

        Returns:
            bool: True if backend responds with status < 500, False otherwise
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
        Sends a vehicle detection event to the backend API.

        Posts the detection event to the backend's /vehicles endpoint.
        Handles OAuth2 authentication, timeouts, and connection errors.
        Includes detailed error logging for debugging.

        Args:
            event (VehicleDetectedEvent): Detection event with vehicle type,
                timestamp, and device ID

        Returns:
            bool: True if sent successfully (HTTP 200/201), False otherwise
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
                    f"a device {event.device_id}"
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
        """
        Gets and caches an access token using OAuth2 client_credentials flow.

        Fetches a new token from Keycloak if the cached token is expired
        (with 10-second buffer). Returns None if credentials are not configured
        or if token endpoint fails.

        Returns:
            str: Access token for Authorization header, or None if unavailable
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
        Checks if the backend is available based on last health check.

        Returns:
            bool: True if available, False otherwise
        """
        return self._is_available

    def __str__(self) -> str:
        """String representation of the backend client."""
        status = "available" if self._is_available else "unavailable"
        return f"BackendClient({self.base_url}, {status})"
