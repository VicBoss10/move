# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MOVE (Mobile Observatory of Vehicular Emissions) is an IoT environmental monitoring system. It correlates vehicle traffic (detected via AI/YOLO) with air quality sensor data (CO₂, gases, particles) in real time.

## Development Commands

### Frontend (Angular)
```bash
cd frontend
npm install          # Install dependencies
npm start            # Dev server at http://localhost:4200
npm run build        # Production build
npm run lint         # ESLint on src/**/*.ts
npm run format       # Prettier on all source files
npm test             # Karma unit tests
```

### Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run                          # Run with embedded Tomcat
mvn test                                     # Run all tests
mvn test -Dtest=ClassName#methodName         # Run a single test
mvn package -DskipTests                      # Build JAR without tests
```

### Vehicle Detection Service (Python)
```bash
cd vehicle-detection-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
gunicorn --worker-class gthread --workers 1 --threads 12 --bind 0.0.0.0:5000 --chdir src api_server:app
```

### Docker (full environment)
```bash
docker compose up -d                                            # Core: Backend + Keycloak + DBs
docker compose --profile frontend --profile tools up -d        # + Angular/Nginx + pgAdmin
docker compose down                                            # Stop all
docker compose down -v                                         # Stop + wipe DB volumes
```

## Architecture

### System Data Flow
```
ESP32/IoT Device → POST /sensordata → Backend API → PostgreSQL
Camera URL       → POST /stream/start → Backend → Python Detection Service (YOLO)
                                                 → VehicleDetected records in DB
Frontend         → GET endpoints + MJPEG proxy via /stream/{cameraId}/feed
```

### Authentication (Keycloak → JWT → Spring Security)
- Keycloak realm `move`, client `move-frontend` (public client)
- Tokens contain roles at `realm_access.roles` (Keycloak standard)
- `JwtAuthConverter` maps them to Spring's `ROLE_ADMIN`, `ROLE_USER`, `ROLE_DEVICE`
- Backend is a stateless OAuth2 resource server — no sessions, only JWT validation
- Two distinct Keycloak URIs must be set: `KEYCLOAK_ISSUER_URI` (public URL, matches JWT `iss` claim) and `KEYCLOAK_JWK_SET_URI` (internal URL for key fetching). In Docker these differ.

### Role Permissions
| Role | Access |
|---|---|
| `ADMIN` | Full access to all endpoints |
| `USER` | Read-only access to data, streaming |
| `DEVICE` | POST sensor data, PUT device state, stream |
| (public) | `POST /users` (register), `POST /devices/register-from-device` |

### Frontend Architecture
- **Runtime config injection**: `window.__API_BASE_URL__` and `window.__AUTH_BASE_URL__` are injected from `/assets/config.json` before Angular bootstraps. Services read these globals with a fallback to `localhost`.
- **Auth flow**: `AuthService` manages tokens in `sessionStorage` (`kc_access_token`, `kc_refresh_token`, `kc_token_expiry`). Proactive refresh runs 60s before expiry.
- **HTTP layer**: `authInterceptor` attaches `Bearer` token to every request except Keycloak `/openid-connect/` endpoints. On 401, it attempts one token refresh then retries; on failure it calls `auth.logout()`.
- **Route guards**: `authGuard` (must be logged in), `authRedirectGuard` (redirects away if already logged in), `roleGuard` (checks `data.roles` against Keycloak roles for admin-only routes).
- **Service pattern**: All backend calls go through `ApiService` (base HTTP wrapper). Domain services (`camera.service.ts`, `device.service.ts`, etc.) extend or inject `ApiService`.

### Backend Architecture
- Standard Spring Boot layered architecture: Controller → Service → Repository
- JPA with `ddl-auto=update` — schema evolves automatically; no migration tool
- `DeviceStateScheduler` runs every 60s (configurable) and marks sensor devices `INACTIVE` after 3 min without data, camera devices after 60 min
- `StreamService` proxies stream start/stop/feed to the Python detection service via `RestTemplate`. Uses pessimistic locking on `Device` to prevent concurrent stream conflicts.
- `StartupConfig` ensures a provisional `Location` with `id=0` always exists — used as the default before a real location is assigned to a device.
- Device self-registration flow: ESP32 uses `PROVISIONING_FACTORY_TOKEN` to call `POST /devices/register-from-device`, which creates a provisional device and starts a TTL countdown; if no sensor data arrives within `PROVISIONING_TTL_SECONDS` (default 120s) the provisional record is rolled back.

### Python Detection Service
- Flask + Gunicorn serving MJPEG streams and detection results
- YOLO v11 (`yolo11n.pt`) inference; uses CUDA if available, falls back to CPU
- Detects every `DETECTION_SKIP_FRAMES` frames (default 2) to reduce CPU load
- Sends detection events to backend via `BACKEND_URL` (default: `https://api.moveiot.online`)
- All tuneable parameters are in `vehicle-detection-service/src/config.py`

## Key Configuration Variables

All services are driven by the `.env` file (copy from `.env.example`). The most critical ones:

| Variable | Purpose |
|---|---|
| `KEYCLOAK_ISSUER_URI` | Public Keycloak URL — must match JWT `iss` claim |
| `KEYCLOAK_JWK_SET_URI` | Internal Keycloak URL — used by backend to fetch signing keys |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `PYTHON_SERVICE_URL` | URL where the detection service is reachable from the backend container |
| `PROVISIONING_FACTORY_TOKEN` | Shared secret for ESP32 self-registration |
| `BACKEND_URL` | URL the Python service uses to POST detections to the backend |

Mixing public and internal URLs (e.g., using a public domain for `KEYCLOAK_JWK_SET_URI` inside Docker) breaks inter-service communication.
