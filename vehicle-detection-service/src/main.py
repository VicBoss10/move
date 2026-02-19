from ultralytics import YOLO
import cv2
import time
import sys
import yt_dlp
from pathlib import Path

# Cargar el modelo YOLO 
model_path = Path(__file__).parent.parent / "models" / "yolo11n.pt"
model = YOLO(str(model_path))

# Determinar fuente: camera o stream
source_type = "stream"  # Por defecto
video_url = "https://youtu.be/dzxoZoH192c"  # URL por defecto

# Procesar argumentos de línea de comandos
if len(sys.argv) > 1:
    source_type = sys.argv[1].lower()
    
    if source_type == "camera":
        # Usar cámara USB
        camera_index = 0
        if len(sys.argv) > 2:
            camera_index = int(sys.argv[2])
        video_url = camera_index
    elif source_type == "stream":
        # Usar stream/YouTube/archivo
        if len(sys.argv) > 2:
            video_url = sys.argv[2]
    else:
        print("Uso:")
        print("  python src/main.py camera [índice]          # Usar cámara (default 0)")
        print("  python src/main.py stream [URL]             # Usar stream (default: YouTube)")
        print("\nEjemplos:")
        print("  python src/main.py camera")
        print("  python src/main.py camera 1")
        print("  python src/main.py stream https://youtu.be/xxxxx")
        print("  python src/main.py stream ./video.mp4")
        sys.exit(0)

# Si es stream de YouTube, obtener URL
if source_type == "stream":
    print(f"Obteniendo URL del stream de: {video_url}")

# Extraer la URL del stream real de YouTube
def get_stream_url(url):
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'quiet': False,
        'no_warnings': False,
        'socket_timeout': 30,
        'extractor_args': {
            'youtube': {
                'player_client': ['web', 'android'],
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }
    try:
        print("Intentando obtener información del video...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("Extrayendo información...")
            info = ydl.extract_info(url, download=False)
            print(f"✓ Video encontrado: {info.get('title', 'sin título')}")
            video_url = info['url']
            print(f"✓ URL del stream obtenida exitosamente")
            return video_url
    except Exception as e:
        print(f"✗ Error: {e}")
        return None

# Solo procesar stream si es de tipo stream
if source_type == "stream":
    stream_url = get_stream_url(video_url)
    if not stream_url:
        print("\n⚠ No se pudo obtener el stream directo desde YouTube")
        print("Intentando descargar el video localmente...")
        try:
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': 'downloaded_video.mp4',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print("Descargando video...")
                ydl.download([video_url])
            stream_url = "downloaded_video.mp4"
            print("✓ Video descargado exitosamente")
        except Exception as e:
            print(f"✗ Error descargando: {e}")
            print("\nAlternativa: Intenta con un archivo local:")
            print("  python main.py stream ./tu-video.mp4")
            exit(1)
else:
    # Es camera
    stream_url = video_url 

# Define las clases de vehículos según el modelo (pueden variar)
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle"}

if source_type == "camera":
    print(f"Abriendo cámara {stream_url}...")
else:
    print("Abriendo stream...")

cap = cv2.VideoCapture(stream_url)

if not cap.isOpened():
    print("✗ Error: No se pudo abrir el video/stream")
    exit(1)

print("✓ Video/stream abierto exitosamente")

fps = cap.get(cv2.CAP_PROP_FPS)
wait_time = int(1000 / fps) if fps > 0 else 30

# Definir la posición de la línea de conteo (por ejemplo, a la mitad de la imagen)
ret, frame = cap.read()
if not ret:
    print("✗ No se pudo leer el primer frame del video")
    print("Asegúrate de que el video sea accesible y esté en formato soportado")
    exit()
height, width, _ = frame.shape
line_y = height // 2

vehicle_count = 0
recent_centers = []  # Lista de (x, y, timestamp)
DIST_THRESHOLD = 50  # píxeles de tolerancia en X para considerar que es el mismo vehículo
TIME_THRESHOLD = 1.0  # segundos para considerar un centro como "reciente"

while True:
    start_time = time.time()
    ret, frame = cap.read()
    if not ret:
        break

    now = time.time()
    # Elimina centros viejos
    recent_centers = [(x, y, t) for (x, y, t) in recent_centers if now - t < TIME_THRESHOLD]

    results = model(frame)
    boxes = results[0].boxes
    names = results[0].names

    vehicle_frame = frame.copy()
    # Dibuja la línea horizontal de conteo
    cv2.line(vehicle_frame, (0, line_y), (width, line_y), (0, 0, 255), 2)

    for i, box in enumerate(boxes):
        cls_id = int(box.cls)
        label = names[cls_id]
        if label in VEHICLE_CLASSES:
            xyxy = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf)
            center_x = int((xyxy[0] + xyxy[2]) / 2)
            center_y = int((xyxy[1] + xyxy[3]) / 2)
            cv2.rectangle(vehicle_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]), (0, 255, 0), 2)
            cv2.putText(vehicle_frame, f"{label} {conf:.2f}", (xyxy[0], xyxy[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            cv2.circle(vehicle_frame, (center_x, center_y), 4, (255, 0, 0), -1)
            # Contar si cruza la línea y no ha sido contado antes
            if abs(center_y - line_y) < 5:
                if not any(abs(center_x - x) < DIST_THRESHOLD for (x, y, t) in recent_centers):
                    vehicle_count += 1
                    recent_centers.append((center_x, center_y, now))

    # Asegúrate de que el frame tenga el tamaño correcto
    vehicle_frame = cv2.resize(vehicle_frame, (width, height))

    title = f"YOLO Vehicle Detection & Counting - {source_type.upper()}"
    cv2.imshow(title, vehicle_frame)

    elapsed = (time.time() - start_time) * 1000  # en ms
    delay = max(1, int(wait_time - elapsed))
    if cv2.waitKey(delay) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

print(f"\n{'='*50}")
print(f"Procesamiento completado")
print(f"Fuente: {source_type.upper()}")
print(f"Total de vehículos detectados: {vehicle_count}")
print(f"{'='*50}")