#include <Wire.h>
#include <SparkFun_SCD30_Arduino_Library.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

// ===== Configuración WiFi =====
const char* ssid = "";
const char* password = "";

// ===== Configuración servidor =====
const char* serverUrl = "";

// ===== Configuración NTP para tiempo real =====
const char* ntpServers[] = {
  "time.nist.gov",
  "pool.ntp.org", 
  "time.google.com",
  "1.pool.ntp.org"
};
const int numNtpServers = 4;
const long gmtOffset_sec = -5 * 3600;  // UTC-5 para Colombia
const int daylightOffset_sec = 0;      // Colombia no usa horario de verano

// ===== Pines LEDs =====
const int ledOk = 2;    // LED verde / OK
const int ledFail = 4;  // LED rojo / FAIL

// ===== PMS7003 =====
HardwareSerial pmsSerial(2);
#define PMS_RX 16
#define PMS_TX 17
uint8_t buf[32];

static inline uint16_t be16(const uint8_t *b, int i) {
  return (uint16_t)b[i] << 8 | b[i + 1];
}

// ===== SCD30 =====
SCD30 airSensor;

// ===== MICS6814 =====
#define CO_PIN 34   // Sensor CO
#define NO2_PIN 35  // Sensor NO2
#define NH3_PIN 32  // Sensor NH3

// ===== Variables de control de tiempo =====
unsigned long lastNtpSync = 0;
const unsigned long ntpSyncInterval = 3600000; // Sincronizar cada hora
unsigned long lastReadingTime = 0;
const unsigned long readingInterval = 10000;  // Lectura cada 10s
int readingCount = 0;

// ===== Arrays para almacenar lecturas (3 lecturas) =====
float readings_pm25[3] = {-1, -1, -1};
float readings_pm10[3] = {-1, -1, -1};
float readings_temperature[3] = {-1, -1, -1};
float readings_humidity[3] = {-1, -1, -1};
float readings_co2[3] = {-1, -1, -1};
float readings_co[3] = {-1, -1, -1};
float readings_no2[3] = {-1, -1, -1};
float readings_nh3[3] = {-1, -1, -1};

void setup() {
  Serial.begin(115200);
  delay(500);
  
  pinMode(ledOk, OUTPUT);
  pinMode(ledFail, OUTPUT);
  digitalWrite(ledOk, LOW);
  digitalWrite(ledFail, LOW);
  
  // Pines analógicos MICS6814
  pinMode(CO_PIN, INPUT);
  pinMode(NO2_PIN, INPUT);
  pinMode(NH3_PIN, INPUT);
  
  // Conexión WiFi
  connectWiFi();
  
  // Configurar tiempo NTP
  setupTime();
  
  // PMS7003
  Serial.println("[PMS7003] Iniciando UART2 a 9600...");
  pmsSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pmsSerial.setTimeout(50);
  
  // SCD30
  Wire.begin(); // SDA=21, SCL=22
  if (!airSensor.begin()) {
    Serial.println("[SCD30] Sensor no detectado. Verifica conexiones.");
    while (1) {
      digitalWrite(ledFail, HIGH);
      delay(500);
      digitalWrite(ledFail, LOW);
      delay(500);
    }
  }
  Serial.println("[SCD30] Iniciado correctamente.");
  
  Serial.println("\n[SISTEMA] Iniciando ciclo de lecturas...");
  Serial.println("[SISTEMA] 3 lecturas cada 10s, envío cada 30s");
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Conectando");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado exitosamente.");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] ERROR: No se pudo conectar.");
  }
}

void setupTime() {
  Serial.println("[NTP] Configurando tiempo...");
  
  bool timeConfigured = false;
  
  for (int serverIndex = 0; serverIndex < numNtpServers && !timeConfigured; serverIndex++) {
    Serial.printf("[NTP] Intentando servidor: %s\n", ntpServers[serverIndex]);
    
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServers[serverIndex]);
    
    struct tm timeinfo;
    int attempts = 0;
    while (!getLocalTime(&timeinfo) && attempts < 15) {
      Serial.print(".");
      delay(1000);
      attempts++;
    }
    
    if (getLocalTime(&timeinfo)) {
      Serial.println("\n[NTP] Tiempo configurado correctamente.");
      Serial.printf("[NTP] Servidor usado: %s\n", ntpServers[serverIndex]);
      Serial.printf("[NTP] Fecha y hora: %04d-%02d-%02d %02d:%02d:%02d\n",
                    timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                    timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
      lastNtpSync = millis();
      timeConfigured = true;
    } else {
      Serial.printf("\n[NTP] Servidor %s falló, probando siguiente...\n", ntpServers[serverIndex]);
    }
  }
  
  if (!timeConfigured) {
    Serial.println("[NTP] ERROR: No se pudo obtener tiempo de ningún servidor.");
    Serial.println("[NTP] Usando tiempo basado en millis() como fallback.");
  }
}

String getCurrentTimestamp() {
  struct tm timeinfo;
  
  if (getLocalTime(&timeinfo)) {
    if (millis() - lastNtpSync > ntpSyncInterval) {
      Serial.println("[NTP] Resincronizando tiempo...");
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServers[0]);
      delay(2000);
      lastNtpSync = millis();
    }
    
    char timestamp[25];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S", &timeinfo);
    return String(timestamp);
  } else {
    Serial.println("[NTP] Usando tiempo estimado (sin NTP)");
    unsigned long seconds = millis() / 1000;
    unsigned long minutes = seconds / 60;
    unsigned long hours = minutes / 60;
    
    char timestamp[25];
    sprintf(timestamp, "2025-08-21T%02lu:%02lu:%02lu", 
            hours % 24, minutes % 60, seconds % 60);
    return String(timestamp);
  }
}

// ===== Función para calcular promedio ignorando -1 =====
float calculateAverage(float values[], int size) {
  float sum = 0;
  int validCount = 0;
  
  for (int i = 0; i < size; i++) {
    if (values[i] != -1) {
      sum += values[i];
      validCount++;
    }
  }
  
  if (validCount == 0) {
    return -1; // No hay lecturas válidas
  }
  
  return sum / validCount;
}

// ===== Lectura de PMS7003 =====
void readPMS7003(int index) {
  readings_pm25[index] = -1;
  readings_pm10[index] = -1;
  
  if (pmsSerial.available() >= 32) {
    while (pmsSerial.available() && pmsSerial.peek() != 0x42) {
      pmsSerial.read();
    }
    
    if (pmsSerial.available() >= 32) {
      pmsSerial.readBytes(buf, 32);
      if (buf[0] == 0x42 && buf[1] == 0x4D) {
        uint16_t frameLen = be16(buf, 2);
        if (frameLen == 28) {
          uint32_t sum = 0;
          for (int i = 0; i < 30; i++) sum += buf[i];
          uint16_t chk = be16(buf, 30);
          if ((sum & 0xFFFF) == chk) {
            readings_pm25[index] = be16(buf, 12);
            readings_pm10[index] = be16(buf, 14);
            Serial.printf("[PMS7003 #%d] PM2.5: %.0f μg/m³, PM10: %.0f μg/m³\n", 
                         index + 1, readings_pm25[index], readings_pm10[index]);
          } else {
            Serial.printf("[PMS7003 #%d] ERROR: Checksum inválido.\n", index + 1);
          }
        }
      }
    }
  } else {
    Serial.printf("[PMS7003 #%d] Sin datos disponibles.\n", index + 1);
  }
}

// ===== Lectura de SCD30 =====
void readSCD30(int index) {
  readings_temperature[index] = -1;
  readings_humidity[index] = -1;
  readings_co2[index] = -1;
  
  if (airSensor.dataAvailable()) {
    readings_co2[index] = airSensor.getCO2();
    readings_temperature[index] = airSensor.getTemperature();
    readings_humidity[index] = airSensor.getHumidity();
    Serial.printf("[SCD30 #%d] CO2: %.1f ppm, Temp: %.1f°C, Hum: %.1f%%\n", 
                 index + 1, readings_co2[index], readings_temperature[index], 
                 readings_humidity[index]);
  } else {
    Serial.printf("[SCD30 #%d] Sin datos disponibles.\n", index + 1);
  }
}

// ===== Lectura de MICS6814 =====
void readMICS6814(int index) {
  readings_co[index] = analogRead(CO_PIN);
  readings_no2[index] = analogRead(NO2_PIN);
  readings_nh3[index] = analogRead(NH3_PIN);
  
  Serial.printf("[MICS6814 #%d] CO: %.0f, NO2: %.0f, NH3: %.0f\n", 
               index + 1, readings_co[index], readings_no2[index], 
               readings_nh3[index]);
}

// ===== Función para realizar una lectura completa =====
void performReading(int index) {
  Serial.printf("\n=== LECTURA #%d ===\n", index + 1);
  readPMS7003(index);
  readSCD30(index);
  readMICS6814(index);
}

// ===== Envío de datos promediados =====
void sendAveragedData() {
  // Calcular promedios
  float avg_pm25 = calculateAverage(readings_pm25, 3);
  float avg_pm10 = calculateAverage(readings_pm10, 3);
  float avg_temperature = calculateAverage(readings_temperature, 3);
  float avg_humidity = calculateAverage(readings_humidity, 3);
  float avg_co2 = calculateAverage(readings_co2, 3);
  float avg_co = calculateAverage(readings_co, 3);
  float avg_no2 = calculateAverage(readings_no2, 3);
  float avg_nh3 = calculateAverage(readings_nh3, 3);
  
  Serial.println("\n=== PROMEDIOS CALCULADOS ===");
  Serial.printf("PM2.5: %.1f | PM10: %.1f\n", avg_pm25, avg_pm10);
  Serial.printf("CO2: %.1f | Temp: %.1f | Hum: %.1f\n", avg_co2, avg_temperature, avg_humidity);
  Serial.printf("CO: %.1f | NO2: %.1f | NH3: %.1f\n", avg_co, avg_no2, avg_nh3);
  
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi desconectado. Reintentando conexión...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      digitalWrite(ledFail, HIGH);
      delay(2000);
      digitalWrite(ledFail, LOW);
      return;
    }
  }
  
  // Verificar que tengamos al menos algunos datos válidos
  if (avg_co2 == -1 && avg_pm25 == -1 && avg_pm10 == -1) {
    Serial.println("[ERROR] No hay datos válidos para enviar.");
    digitalWrite(ledFail, HIGH);
    delay(2000);
    digitalWrite(ledFail, LOW);
    return;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String timestamp = getCurrentTimestamp();
  
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(avg_temperature, 1) + ",";
  jsonPayload += "\"humidity\":" + String(avg_humidity, 1) + ",";
  jsonPayload += "\"co2\":" + String(avg_co2, 1) + ",";
  jsonPayload += "\"pm25\":" + String(avg_pm25, 1) + ",";
  jsonPayload += "\"pm10\":" + String(avg_pm10, 1) + ",";
  jsonPayload += "\"co\":" + String(avg_co, 0) + ",";
  jsonPayload += "\"no2\":" + String(avg_no2, 0) + ",";
  jsonPayload += "\"nh3\":" + String(avg_nh3, 0) + ",";
  jsonPayload += "\"timestamp\":\"" + timestamp + "\",";
  jsonPayload += "\"device\":{\"id\":1}";
  jsonPayload += "}";
  
  Serial.println("\n[HTTP] Enviando datos promediados...");
  Serial.println("[HTTP] Payload: " + jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  Serial.printf("[HTTP] Código de respuesta: %d\n", httpResponseCode);
  
  if (httpResponseCode == 200) {
    Serial.println("[HTTP] ✓ Datos enviados correctamente.");
    digitalWrite(ledOk, HIGH);
    delay(2000);
    digitalWrite(ledOk, LOW);
  } else if (httpResponseCode > 0) {
    Serial.printf("[HTTP] ERROR: Servidor respondió con código %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println("[HTTP] Respuesta: " + response);
    digitalWrite(ledFail, HIGH);
    delay(2000);
    digitalWrite(ledFail, LOW);
  } else {
    Serial.printf("[HTTP] ERROR: Fallo en conexión HTTP (código: %d)\n", httpResponseCode);
    digitalWrite(ledFail, HIGH);
    delay(2000);
    digitalWrite(ledFail, LOW);
  }
  
  http.end();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Realizar lectura cada 10 segundos
  if (currentTime - lastReadingTime >= readingInterval || lastReadingTime == 0) {
    performReading(readingCount);
    readingCount++;
    lastReadingTime = currentTime;
    
    // Después de 3 lecturas (30 segundos), enviar datos
    if (readingCount >= 3) {
      sendAveragedData();
      
      // Reiniciar contador y arrays
      readingCount = 0;
      for (int i = 0; i < 3; i++) {
        readings_pm25[i] = -1;
        readings_pm10[i] = -1;
        readings_temperature[i] = -1;
        readings_humidity[i] = -1;
        readings_co2[i] = -1;
        readings_co[i] = -1;
        readings_no2[i] = -1;
        readings_nh3[i] = -1;
      }
      
      Serial.println("\n==========================================");
      Serial.println("Esperando siguiente ciclo de lecturas...");
      Serial.println("==========================================\n");
    }
  }
  
  delay(100); // Pequeño delay para no saturar el loop
}