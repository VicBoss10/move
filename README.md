# move
Mobile Observatory of Vehicular Emissions (Observatorio Móvil de Emisiones Vehiculares)
Sistema para un prototipo de monitoreo ambiental móvil con IoT. Mide contaminantes vehiculares (CO₂, partículas, etc.) y su correlación con el tráfico.

---

## Pila Tecnológica (Tech Stack)

| Área    | Tecnología                               |
| :------ | :--------------------------------------- |
| **Frontend** | Angular, TypeScript, Tailwind CSS        |
| **Backend**  | Java 21, Spring Boot, Maven              |
| **Base de Datos** | PostgreSQL                               |
| **Contenerización** | Docker, Docker Compose                   |

#
## Estructura del Proyecto

```
.
├── backend/         # Contiene la API de Spring Boot
├── frontend/        # Contiene la aplicación de Angular
├── docker-compose.yml # Orquesta todos los servicios
└── README.md        # Esta documentación
```

---

## Cómo Empezar

Este proyecto utiliza Docker para orquestar todos los servicios necesarios (frontend, backend y base de datos). Sigue estos pasos para levantar la aplicación en tu entorno local.

### Requisitos

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/) (generalmente incluido con Docker Desktop)
- Git

### Instalación y Ejecución

1.  **Clona el repositorio (rama `develop`):**
    ```bash
    git clone -b develop https://github.com/VicBoss10/move.git
    cd move
    ```

2.  **Levanta los servicios con Docker Compose:**
    Este comando construirá las imágenes de `frontend` y `backend` y luego iniciará todos los contenedores en el orden correcto.

    ```bash
    docker-compose up --build
    ```
    - La opción `--build` es importante la primera vez para construir las imágenes a partir de los Dockerfiles.
    - Si quieres ejecutar los contenedores en segundo plano, usa la opción `-d`:
      ```bash
      docker-compose up --build -d
      ```

3.  **Accede a la aplicación:**
    Una vez que todos los contenedores estén en funcionamiento, podrás acceder a los servicios:
    - **Frontend (Aplicación web):** Abre tu navegador y ve a `http://localhost` o `http://localhost:80`
    - **Backend (API):** La API estará disponible en `http://localhost:8080`
    - **Base de Datos (PostgreSQL):** Puedes conectarte a la base de datos usando tus herramientas preferidas en `localhost:5432` con el usuario `postgres` y la contraseña `postgres`.

### Estructura de Servicios

El archivo `docker-compose.yml` define los siguientes servicios:

-   `frontend`: El contenedor con la aplicación de Angular.
-   `backend`: El contenedor con la API de Spring Boot.
-   `move_db`: El contenedor con la base de datos PostgreSQL. Los datos se guardan en un volumen de Docker (`move_db_data`) para persistencia.

### Detener la Aplicación

Para detener todos los servicios, ejecuta el siguiente comando en la misma carpeta:
```bash
docker-compose down
```
- Si quieres detener y eliminar también los volúmenes (¡cuidado, esto borrará los datos de la base de datos!), usa:
  ```bash
  docker-compose down -v
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
