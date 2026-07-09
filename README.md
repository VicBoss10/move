# MOVE — Mobile Observatory of Vehicular Emissions

> Observatorio Móvil de Emisiones Vehiculares

Sistema de monitoreo ambiental móvil basado en IoT. Mide contaminantes vehiculares (CO₂, partículas, etc.) y analiza su correlación con el tráfico en tiempo real.

---

## Pila Tecnológica (Tech Stack)

| Área    | Tecnología                               |
| :------ | :--------------------------------------- |
| **Frontend** | Angular, TypeScript, Tailwind CSS        |
| **Backend**  | Java 21, Spring Boot, Maven              |
| **Base de Datos** | PostgreSQL (Main & Keycloak)             |
| **Autenticación** | Keycloak (OAuth2 / OIDC)                 |
| **IA / Detección** | Python, YOLO v11, PyTorch, OpenCV        |
| **Contenerización** | Docker, Docker Compose                   |
| **Despliegue** | Cloudflare Tunnel                        |

---

## Estructura del Proyecto

```
.
├── backend/            # API de Spring Boot (Java 21 + Maven)
├── frontend/           # Aplicación web (Angular + Nginx)
├── firmware/           # Código fuente (C++) para dispositivos IoT (Arduino/ESP32)
├── keycloak/           # Configuración de identidad (Realms & Client Import)
├── scripts/            # Scripts de configuración (setup de Keycloak)
├── vehicle-detection-service/ # Microservicio de IA (Python, YOLO v11, OpenCV)
├── docker-compose.yml  # Orquestador con perfiles (core, frontend, tools, tunnel)
└── README.md           # Documentación principal
```

---

## Cómo Empezar

Este proyecto combina servicios Docker (backend, frontend, Keycloak y bases de datos) con un microservicio de detección de vehículos que se ejecuta de forma nativa. Sigue estos pasos para levantar el sistema completo en tu entorno local.

### Requisitos

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Python 3.10+](https://www.python.org/downloads/) (para el microservicio de detección)
- Git

### Instalación y Ejecución

1.  **Clona el repositorio (rama `develop`):**
    ```bash
    git clone -b develop https://github.com/VicBoss10/move.git
    cd move
    ```

2.  **Configura el archivo `.env`:**
    Copia el archivo de ejemplo y ajusta los valores necesarios:
    ```bash
    cp .env.example .env
    ```
    > El archivo `docker-compose.yml` utiliza valores predeterminados, pero **estos apuntan al entorno de producción** (`moveiot.online`). Para trabajar en local es obligatorio descomentar y configurar la sección de desarrollo local del `.env`; sin eso, el login y el frontend no funcionarán en localhost. El sistema funciona en entornos locales e internet, pero mezclar configuraciones locales con URLs públicas impedirá que los servicios se comuniquen. Consulta los comentarios en [.env.example](.env.example).

3.  **Configura Keycloak:**
    El backend depende de Keycloak. Debes configurarlo primero.
    
    Ejecuta el script de setup que genera automáticamente `move-realm-import.json` con los valores de `.env`:
    
    **Linux/Mac (Terminal):**
    ```bash
    ./scripts/setup-keycloak.sh
    ```
    
    **Windows (PowerShell):**
    ```powershell
    .\scripts\setup-keycloak.ps1
    ```
    
    El script:
    - Lee `VEHICLE_CLIENT_SECRET` y `GOOGLE_CLIENT_SECRET` de `.env`
    - Reemplaza los placeholders en `move-realm.example.json`
    - Genera `keycloak/move-realm-import.json`
    
    Si prefieres hacerlo manual, consulta [`keycloak/move-realm.example.md`](keycloak/move-realm.example.md).
    
    > **Nota (entorno local):** `docker-compose.yml` construye `KC_HOSTNAME` como `https://${KEYCLOAK_PUBLIC_HOSTNAME}`. Si defines `KEYCLOAK_PUBLIC_HOSTNAME=localhost`, Keycloak anunciará su hostname como `https://localhost` mientras el resto del sistema usa `http://localhost:8081`, lo que puede romper el claim `iss` de los tokens y las redirecciones de login. Gracias a `KC_HOSTNAME_STRICT: "false"` el acceso por `http://localhost:8081` funciona, pero si tienes problemas de autenticación en local, revisa esta variable.

4.  **Inicia el Servicio de Detección Vehícular (Local):**
    Por razones de rendimiento (CPU/GPU), este servicio se ejecuta de forma nativa. Si no lo necesitas ahora, puedes saltarlo.
    
    1. Navega al directorio del servicio:
       ```bash
       cd vehicle-detection-service
       ```
    
    2. Crea y activa el entorno virtual:
       ```bash
       python -m venv .venv
       source .venv/bin/activate  # En Windows: .venv\Scripts\activate
       ```
    
    3. Instala dependencias:
       ```bash
       pip install -r requirements.txt
       ```
    
    4. Inicia el servidor (escucha en el puerto `5000`; el backend en Docker lo alcanza vía `host.docker.internal:5000`):
       ```bash
       gunicorn --worker-class gthread --workers 1 --threads 12 --bind 0.0.0.0:5000 --chdir src api_server:app
       ```
       > **Windows:** `gunicorn` no funciona en Windows. Usa WSL, o inicia el servidor de desarrollo de Flask:
       > ```powershell
       > python src\api_server.py
       > ```

5.  **Levanta los servicios con Docker Compose (en otra terminal):**
    Regresa a la raíz de `move/` y usa perfiles para modularizar:

    - **Solo Core (Backend + Keycloak + DBs):**
      ```bash
      docker compose up --build -d
      ```
    - **Full Stack (Core + Frontend + Tools):**
      ```bash
      docker compose --profile frontend --profile tools up --build -d
      ```
    - **Con túnel público (Cloudflare):**
      ```bash
      docker compose --profile tunnel up -d
      ```
      > Requiere tener un túnel de Cloudflare ya configurado en el host: el contenedor monta `~/cloudflared` y espera encontrar ahí `config.yml` y las credenciales del túnel.

6.  **Accede a la aplicación:**
    - **Frontend:** [http://localhost](http://localhost) (requiere `--profile frontend`)
    - **Backend API:** [http://localhost:8080](http://localhost:8080)
    - **Keycloak Admin:** [http://localhost:8081](http://localhost:8081)
    - **pgAdmin:** [http://localhost:5050](http://localhost:5050) (requiere `--profile tools`)
    - **Swagger UI:** [http://localhost:8080/docs](http://localhost:8080/docs)


### Perfiles Disponibles

| Perfil | Descripción |
| :--- | :--- |
| `(ninguno)` | Lanza el núcleo: Backend, Keycloak y bases de datos PostgreSQL. |
| `frontend` | Lanza el contenedor de Angular servido por Nginx. |
| `tools` | Lanza pgAdmin para gestión visual de la base de datos. |
| `tunnel` | Lanza el túnel de Cloudflare para acceso público. |

---

## Estructura de Servicios

El archivo `docker-compose.yml` define los servicios orquestados:

-   `frontend`: Aplicación Angular optimizada en Nginx.
-   `backend`: API Java Spring Boot (conecta al microservicio de detección en `host.docker.internal:5000`).
-   `keycloak`: Servidor de identidad y gestión de acceso.
-   `move_db` & `keycloak_db`: Instancias de PostgreSQL (datos persistentes en volúmenes).
-   `pgadmin`: Interfaz web para administración de BD.

### Documentación de la API (Swagger / OpenAPI)

El backend expone documentación interactiva de todos sus endpoints mediante **SpringDoc OpenAPI**.

| Recurso | URL |
| :--- | :--- |
| **Swagger UI** (interfaz interactiva) | [http://localhost:8080/docs](http://localhost:8080/docs) (redirige a `/swagger-ui/index.html`) |
| **OpenAPI YAML** (especificación raw) | [http://localhost:8080/docs.yaml](http://localhost:8080/docs.yaml) |

> La especificación en JSON se sirve en la misma ruta `/docs` mediante negociación de contenido: `curl -H "Accept: application/json" http://localhost:8080/docs`.

Desde Swagger UI puedes explorar todos los endpoints, ver los esquemas de request/response y ejecutar llamadas directamente contra la API. Para endpoints protegidos, utiliza el botón **Authorize** e introduce el Bearer token obtenido desde Keycloak.

### Detener la Aplicación

Para detener todos los servicios, ejecuta el siguiente comando en la raíz del proyecto:
```bash
docker compose down
```
- Para detener y eliminar también los volúmenes (⚠️ esto borrará todos los datos de las bases de datos):
  ```bash
  docker compose down -v
  ```

---

## Ejecución Individual 

Si prefieres ejecutar los servicios de forma nativa en tu máquina para desarrollo, sigue estas instrucciones.

### Backend (API - Spring Boot)

El backend está construido con Java y Spring Boot.

#### Requisitos Previos

-   **Java 21 (JDK):** Asegúrate de tener instalado el JDK de Java en su versión 21.
-   **Maven:** Necesitarás Maven para compilar y ejecutar el proyecto.

> **Nota Importante:** Al ejecutar el backend de forma nativa, este intentará conectarse a una base de datos PostgreSQL en `localhost:5432`. Asegúrate de tener una instancia de PostgreSQL corriendo localmente y de haber creado una base de datos llamada `move_db`, ya que la configuración por defecto está pensada para funcionar con el servicio `move_db` de Docker.

#### Pasos para Ejecutar

1.  **Navega al directorio del backend:**
    ```bash
    cd backend
    ```

2.  **Ejecuta la aplicación con Maven:**
    El siguiente comando compilará el proyecto y lo iniciará.
    ```bash
    mvn spring-boot:run
    ```

3.  **Acceso:**
    La API estará disponible en `http://localhost:8080`.

### Frontend (Aplicación Web - Angular)

El frontend es una aplicación de Angular.

#### Requisitos Previos

-   **Node.js:** Se recomienda la versión 20 (LTS), como se especifica en el Dockerfile.
-   **Angular CLI:** Debes tener la interfaz de línea de comandos de Angular instalada globalmente. Si no la tienes, instálala con:
    ```bash
    npm install -g @angular/cli
    ```

#### Pasos para Ejecutar

1.  **Navega al directorio del frontend:**
    ```bash
    cd frontend
    ```

2.  **Instala las dependencias:**
    Este comando leerá el archivo `package.json` e instalará todas las librerías necesarias.
    ```bash
    npm install
    ```

3.  **Inicia el servidor de desarrollo:**
    El comando `ng serve` compila la aplicación y la sirve localmente, recargando automáticamente cuando detecta cambios en el código.
    ```bash
    ng serve
    ```

4.  **Acceso:**
    La aplicación web estará disponible en `http://localhost:4200`.

### Servicio de Detección Vehicular (IA - Python)

Este servicio se ejecuta de forma nativa por razones de rendimiento. Consulta el paso 4 de la sección [Instalación y Ejecución](#instalación-y-ejecución).

---

## Contribuir

Si deseas contribuir, sigue el flujo de trabajo GitFlow: crea ramas desde `develop` con el prefijo `feature/nombre-de-funcionalidad` y abre un Pull Request describiendo los cambios.

## Licencia

Desarrollado como Proyecto Final para optar por el título de Ingeniería de Sistemas. Todos los derechos reservados por el autor.
