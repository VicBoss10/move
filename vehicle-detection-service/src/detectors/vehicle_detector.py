"""
Vehicle detection and counting using YOLO.

Provides vehicle detection with deduplication logic to avoid counting the
same vehicle multiple times. Uses spatial-temporal distance thresholds to
identify unique vehicles crossing a detection line.

Classes:
    VehicleDetector: YOLO-based vehicle detector with counting
"""
from ultralytics import YOLO
import time
from collections import deque
from typing import List, Tuple


class VehicleDetector:
    """
    Vehicle detection and counting using YOLO.

    Detects and counts vehicles in video frames with spatial-temporal
    deduplication. Maintains a sliding window of recent vehicle centers
    to avoid counting the same vehicle multiple times as it moves across
    frames. Counts vehicles only when their center crosses a specified
    horizontal line.

    Deduplication:
        Uses two thresholds to identify duplicates:
        - DIST_THRESHOLD: Distance in pixels between centers
        - TIME_THRESHOLD: Time window in seconds for recent detections

        If a new detection's center is within distance threshold of any
        recent detection (within time window), it's considered a duplicate.

    Optimization notes:
        - Uses bit shifts (>>) for division (faster than /)
        - Converts all coordinates once for efficiency
        - Deque for O(k) removal of expired detections

    Examples:
        >>> from config import *
        >>> detector = VehicleDetector(
        ...     model_path=YOLO_MODEL_PATH,
        ...     vehicle_classes=VEHICLE_CLASSES,
        ...     dist_threshold=DIST_THRESHOLD,
        ...     time_threshold=TIME_THRESHOLD
        ... )
        >>> while True:
        ...     ret, frame = cap.read()
        ...     if not ret: break
        ...     detector.clean_old_detections()
        ...     results = detector.detect(frame)
        ...     detections = detector.get_vehicle_detections(results)
        ...     for (xyxy, label, conf, cx, cy) in detections:
        ...         if detector.update_count(cx, cy, line_y):
        ...             print(f"Vehicle counted: {label}")

    Attributes:
        model (YOLO): YOLO model instance
        vehicle_classes (set): Set of class names to detect as vehicles
        dist_threshold (int): Distance threshold for deduplication (pixels)
        time_threshold (float): Time threshold for deduplication (seconds)
        line_tolerance (int): Tolerance for line crossing detection (pixels)
        vehicle_count (int): Total vehicle count
        recent_centers (deque): Recent vehicle centers with timestamps
    """
    
    def __init__(self, model_path: str, vehicle_classes: set,
                 dist_threshold: int, time_threshold: float, line_tolerance: int = 5):
        """
        Initializes the vehicle detector.

        Args:
            model_path (str): Path to YOLO model file (.pt)
            vehicle_classes (set): Set of class names to detect as vehicles
            dist_threshold (int): Distance threshold for deduplication (pixels)
            time_threshold (float): Time window for deduplication (seconds)
            line_tolerance (int): Tolerance for line crossing detection (pixels).
                Default: 5
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
        Runs YOLO detection on a video frame.

        Args:
            frame: Video frame as numpy array (BGR format from OpenCV)

        Returns:
            YOLO detection results object with bounding boxes and confidence
        """
        return self.model(frame, verbose=False)
    
    def get_vehicle_detections(self, results) -> List[Tuple]:
        """
        Filters YOLO detections to extract only vehicle detections.

        Extracts bounding boxes and metadata for vehicles only (filters out
        other classes). Optimized to convert all coordinates once for efficiency.

        Args:
            results: YOLO detection results (from model() call)

        Returns:
            List of tuples: (xyxy, label, confidence, center_x, center_y)
            where xyxy is (x1, y1, x2, y2) as int tuple
        """
        boxes = results[0].boxes
        names = results[0].names
        
        detections = []
        if len(boxes) == 0:
            return detections
        
        # Convertir TODAS las coordenadas de una vez (más eficiente)
        xyxy_all = boxes.xyxy.cpu().numpy().astype(int)
        
        for i, box in enumerate(boxes):
            cls_id = int(box.cls)
            label = names[cls_id]
            
            if label in self.vehicle_classes:
                # Usar coordenadas ya convertidas
                xyxy = xyxy_all[i]
                conf = float(box.conf)
                # Optimizar cálculo del centro (evitar divisiones)
                center_x = (xyxy[0] + xyxy[2]) >> 1  # Bit shift es más rápido que /2
                center_y = (xyxy[1] + xyxy[3]) >> 1
                
                detections.append((xyxy, label, conf, center_x, center_y))
        
        return detections
    
    def _is_duplicate(self, center_x: int, center_y: int) -> bool:
        """
        Checks if a vehicle center was recently detected (deduplication).

        Looks up the center in recent_centers using spatial distance threshold.
        If found within DIST_THRESHOLD pixels and TIME_THRESHOLD seconds,
        the detection is considered a duplicate of the same vehicle.

        Args:
            center_x (int): X coordinate of vehicle center
            center_y (int): Y coordinate of vehicle center (unused, kept for
                symmetry with update_count)

        Returns:
            bool: True if duplicate found, False if new detection
        """
        for (x, y, t) in self.recent_centers:
            if abs(center_x - x) < self.dist_threshold:
                return True
        return False
    
    def update_count(self, center_x: int, center_y: int, line_y: int) -> bool:
        """
        Updates vehicle count if center crosses the counting line.

        Increments the counter only if:
        1. Vehicle center is within LINE_TOLERANCE of the counting line (Y-axis)
        2. Vehicle is not a duplicate (by distance/time thresholds)

        When a new vehicle is counted, its center is added to recent_centers
        with current timestamp for future deduplication.

        Args:
            center_x (int): X coordinate of vehicle center
            center_y (int): Y coordinate of vehicle center
            line_y (int): Y position of the counting line

        Returns:
            bool: True if counter was incremented (new vehicle), False otherwise
        """
        if abs(center_y - line_y) < self.line_tolerance:
            if not self._is_duplicate(center_x, center_y):
                self.vehicle_count += 1
                self.recent_centers.append((center_x, center_y, time.time()))
                return True
        return False
    
    def clean_old_detections(self) -> None:
        """
        Removes expired detections from the recent centers buffer.

        Removes detections older than TIME_THRESHOLD seconds. Should be called
        before processing each frame to maintain accurate deduplication window.

        Time complexity: O(k) where k = number of expired detections
        (deque.popleft is O(1) per removal)
        """
        now = time.time()
        while self.recent_centers and now - self.recent_centers[0][2] >= self.time_threshold:
            self.recent_centers.popleft()

    def get_count(self) -> int:
        """
        Returns the total vehicle count.

        Returns:
            int: Total number of vehicles counted
        """
        return self.vehicle_count

    def reset_count(self) -> None:
        """
        Resets the vehicle counter and clears detection history.

        Clears recent_centers buffer and resets vehicle_count to 0.
        Useful for starting a new counting session.
        """
        self.vehicle_count = 0
        self.recent_centers.clear()
