"""
Detector de vehículos usando YOLO
"""
from ultralytics import YOLO
import time
from collections import deque
from typing import List, Tuple


class VehicleDetector:
    """
    Clase para detectar y contar vehículos en frames de video usando YOLO.
    
    Implementa lógica de deduplicación para evitar contar el mismo vehículo
    múltiples veces basándose en distancia espacial y temporal.
    """
    
    def __init__(self, model_path: str, vehicle_classes: set, 
                 dist_threshold: int, time_threshold: float, line_tolerance: int = 5):
        """
        Inicializa el detector de vehículos.
        
        Args:
            model_path: Ruta al archivo del modelo YOLO (.pt)
            vehicle_classes: Set de clases a considerar como vehículos
            dist_threshold: Distancia en píxeles para deduplicación
            time_threshold: Tiempo en segundos para deduplicación
            line_tolerance: Tolerancia en píxeles para cruce de línea
        """
        self.model = YOLO(str(model_path), verbose=False)
        self.vehicle_classes = vehicle_classes
        self.dist_threshold = dist_threshold
        self.time_threshold = time_threshold
        self.line_tolerance = line_tolerance
        
        self.vehicle_count = 0
        self.recent_centers = deque()
    
    def detect(self, frame):
        """
        Ejecuta detección YOLO en un frame.
        
        Args:
            frame: Frame de video (numpy array)
            
        Returns:
            results: Resultados de YOLO con detecciones
        """
        return self.model(frame, verbose=False)
    
    def get_vehicle_detections(self, results):
        """
        Filtra detecciones para obtener solo vehículos.
        
        Args:
            results: Resultados de YOLO
            
        Returns:
            Lista de tuplas (xyxy, label, confidence, center_x, center_y)
        """
        boxes = results[0].boxes
        names = results[0].names
        
        detections = []
        for box in boxes:
            cls_id = int(box.cls)
            label = names[cls_id]
            
            if label in self.vehicle_classes:
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf)
                center_x = int((xyxy[0] + xyxy[2]) / 2)
                center_y = int((xyxy[1] + xyxy[3]) / 2)
                
                detections.append((xyxy, label, conf, center_x, center_y))
        
        return detections
    
    def _is_duplicate(self, center_x: int, center_y: int) -> bool:
        """
        Verifica si un centro ya fue contado recientemente.
        
        Args:
            center_x: Coordenada X del centro
            center_y: Coordenada Y del centro
            
        Returns:
            True si es un duplicado, False si es nuevo
        """
        for (x, y, t) in self.recent_centers:
            if abs(center_x - x) < self.dist_threshold:
                return True
        return False
    
    def update_count(self, center_x: int, center_y: int, line_y: int) -> bool:
        """
        Actualiza el contador si el vehículo cruza la línea.
        
        Args:
            center_x: Coordenada X del centro del vehículo
            center_y: Coordenada Y del centro del vehículo
            line_y: Posición Y de la línea de conteo
            
        Returns:
            True si se incrementó el contador, False si no
        """
        if abs(center_y - line_y) < self.line_tolerance:
            if not self._is_duplicate(center_x, center_y):
                self.vehicle_count += 1
                self.recent_centers.append((center_x, center_y, time.time()))
                return True
        return False
    
    def clean_old_detections(self):
        """
        Elimina detecciones antiguas según el umbral de tiempo.
        Optimizado con deque: O(k) donde k es el número de elementos antiguos.
        """
        now = time.time()
        while self.recent_centers and now - self.recent_centers[0][2] >= self.time_threshold:
            self.recent_centers.popleft()
    
    def get_count(self) -> int:
        """
        Retorna el conteo total de vehículos.
        
        Returns:
            Número total de vehículos contados
        """
        return self.vehicle_count
    
    def reset_count(self):
        """
        Reinicia el contador y limpia detecciones.
        """
        self.vehicle_count = 0
        self.recent_centers.clear()
