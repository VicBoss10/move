#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <SparkFun_SCD30_Arduino_Library.h>
#include <HardwareSerial.h>
#include <time.h>

// === Network ===
const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

WebServer server(80);
DNSServer dnsServer;
Preferences prefs;

// === State ===
bool softApRunning = false;
bool sensorMode    = false;
String softApSSID;
// SoftAP LED blink control
unsigned long softApLedLast = 0;
bool softApLedState = false;
const unsigned long softApLedInterval = 500;

// === NVS keys ===
const char* PREF_NS  = "provision";
const char* KEY_SSID  = "ssid";
const char* KEY_PASS  = "pass";
const char* KEY_NAME  = "name";
const char* KEY_MAC   = "mac";

// === Backend ===
const char* REG_URL            = "";
const char* SENSOR_DATA_URL    = "";
const char* FIRMWARE_VERSION   = "0.0.2";
const char* FACTORY_TOKEN      = "";
const char* KEYCLOAK_TOKEN_URL = "";

// === OAuth cache ===
String kcAccessToken = "";
unsigned long kcTokenExpiryMillis = 0;
const unsigned long KC_REFRESH_MARGIN_MS = 30000;

// === LEDs ===
const int LED_OK   = 2;
const int LED_FAIL = 4;

// === PMS7003 (UART2) ===
HardwareSerial pmsSerial(2);
#define PMS_RX 16
#define PMS_TX 17
uint8_t pmsBuf[32];

static inline uint16_t be16(const uint8_t *b, int i) {
  return (uint16_t)b[i] << 8 | b[i + 1];
}

String efuseMacString() {
  unsigned long long mac = ESP.getEfuseMac();
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
    (uint8_t)((mac >> 40) & 0xFF),
    (uint8_t)((mac >> 32) & 0xFF),
    (uint8_t)((mac >> 24) & 0xFF),
    (uint8_t)((mac >> 16) & 0xFF),
    (uint8_t)((mac >> 8) & 0xFF),
    (uint8_t)(mac & 0xFF));
  return String(buf);
}

void clearProvisionPrefsAndRestart() {
  Serial.println("[FW] Clearing provisioning preferences...");
  prefs.begin(PREF_NS, false);
  prefs.clear();
  prefs.end();
  Serial.println("[FW] Preferences cleared. Restarting...");
  delay(500);
  ESP.restart();
}

bool verifyDeviceExists(int deviceId) {
  if (deviceId <= 0) return false;
  Serial.printf("[FW] Verifying device exists on backend: id=%d\n", deviceId);
  const int maxAttempts = 3;
  int attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    WiFiClientSecure *client = new WiFiClientSecure();
    client->setInsecure();
    HTTPClient http;

    String url = String("") + String(deviceId);
    if (!http.begin(*client, url)) {
      Serial.println("[FW] verifyDeviceExists: http.begin failed");
      delete client;
      if (attempt < maxAttempts) { delay(1000); continue; }
      return false;
    }

    // Prefer device KC token; fallback to factory token
    if (ensureKcToken()) {
      http.addHeader("Authorization", "Bearer " + kcAccessToken);
    } else {
      http.addHeader("X-Factory-Token", FACTORY_TOKEN);
    }

    http.setTimeout(10000);
    int code = http.GET();
    Serial.printf("[FW] verifyDeviceExists HTTP -> %d (attempt %d/%d)\n", code, attempt, maxAttempts);

    String resp = "";
    if (code > 0) resp = http.getString();

    http.end();
    delete client;

    if (code == 200) {
      Serial.println("[FW] Device exists on backend");
      return true;
    }

    if (code == 404) {
      Serial.println("[FW] Device not found on backend -> clearing credentials");
      clearProvisionPrefsAndRestart();
      return false; // restart
    }

    // For other codes, retry up to maxAttempts
    Serial.printf("[FW] verifyDeviceExists: unexpected response (code=%d).\n", code);
    if (resp.length()) Serial.println(resp);
    if (attempt < maxAttempts) {
      Serial.println("[FW] Retrying verifyDeviceExists...");
      delay(1000);
      continue;
    }
    // After retries, do not enter sensor mode — keep credentials but pause sending
    Serial.println("[FW] verifyDeviceExists: retries exhausted, will NOT enter sensor mode (no definitive backend response)");
    return false;
  }
  return false;
}

// === SCD30 (I2C) ===
SCD30 airSensor;

// === MICS6814 (analog) ===
#define CO_PIN  34
#define NO2_PIN 35
#define NH3_PIN 32

// === NTP ===
const char* ntpServers[] = {"time.nist.gov", "pool.ntp.org", "time.google.com", "1.pool.ntp.org"};
const int numNtpServers = 4;
const long gmtOffset_sec = -5 * 3600;
const int daylightOffset_sec = 0;
unsigned long lastNtpSync = 0;
const unsigned long ntpSyncInterval = 3600000;

// === Sensor reading control ===
unsigned long lastReadingTime = 0;
const unsigned long readingInterval = 10000;
int readingCount = 0;
int nvs_deviceId = -1;

float readings_pm25[3]        = {-1, -1, -1};
float readings_pm10[3]        = {-1, -1, -1};
float readings_temperature[3] = {-1, -1, -1};
float readings_humidity[3]    = {-1, -1, -1};
float readings_co2[3]         = {-1, -1, -1};
float readings_co[3]          = {-1, -1, -1};
float readings_no2[3]         = {-1, -1, -1};
float readings_nh3[3]         = {-1, -1, -1};

// =====================================================================
// Captive portal HTML
// =====================================================================
const char* captivePage = R"rawliteral(
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MOVE Setup</title>
  <style>
    body{font-family:Arial;padding:1rem}
    label{display:block;margin-top:.6rem}
    input{width:100%;padding:.5rem;margin-top:.2rem}
    button{margin-top:1rem;padding:.6rem 1rem}
    .result-ok{color:green;font-weight:bold;margin-top:1rem}
    .result-err{color:#b00020;font-weight:bold;margin-top:1rem}
    .result-loading{color:#333;margin-top:1rem;font-weight:600}
  </style>
  <script>
    function submitForm(e){
      e.preventDefault();
      var fd=new FormData(document.getElementById('f'));
      var xhr=new XMLHttpRequest();
      xhr.open('POST','/submit');
      var loadingInterval=null;
      function startLoading(){
        var el=document.getElementById('result');
        var base='Intentando conectarse a la red';
        var dots=0;
        el.innerHTML='<div class="result-loading">'+base+'.</div>';
        loadingInterval=setInterval(function(){
          dots=(dots+1)%4;
          var suffix=dots===0?'':Array(dots+1).join('.');
          el.innerHTML='<div class="result-loading">'+base+suffix+'</div>';
        },500);
      }
      xhr.onreadystatechange=function(){
        if(xhr.readyState===4){
          if(loadingInterval){clearInterval(loadingInterval);loadingInterval=null;}
          try{
            var res=JSON.parse(xhr.responseText);
            var el=document.getElementById('result');
            if(res.status==='ok'){
              el.innerHTML='<div class="result-ok">'+res.message+'</div>';
              var inputs=document.querySelectorAll('#f input, #f button');
              inputs.forEach(function(i){i.disabled=true;});
              loadLocations();
            }else{
              el.innerHTML='<div class="result-err">'+res.message+'</div>';
            }
          }catch(e){
            document.getElementById('result').innerText=xhr.responseText||'Error inesperado';
          }
        }
      };
      startLoading();
      xhr.send(fd);
    }
    function loadLocations(){
      var el=document.getElementById('result');
      el.innerHTML='<div class="result-loading">Cargando ubicaciones...</div>';
      fetch('/locations')
        .then(function(r){return r.json();})
        .then(function(data){
          if(!Array.isArray(data)){
            el.innerHTML='<div class="result-err">No se pudieron obtener ubicaciones.</div>';
            return;
          }
          var html='<label>Selecciona ubicaci&oacute;n:<select id="locsel">';
          data.forEach(function(loc){
            html+='<option value="'+loc.id+'">'+(loc.description||loc.name||loc.id)+'</option>';
          });
          html+='</select></label>';
          html+='<button id="finalize">Finalizar Registro</button>';
          el.innerHTML=html;
          document.getElementById('finalize').addEventListener('click',function(){
            var sel=document.getElementById('locsel').value;
            var xhr2=new XMLHttpRequest();
            xhr2.open('POST','/set-location');
            xhr2.setRequestHeader('Content-Type','application/json');
            xhr2.onreadystatechange=function(){
              if(xhr2.readyState===4){
                try{
                  var r=JSON.parse(xhr2.responseText);
                  if(r.status==='ok'){
                    el.innerHTML='<div class="result-ok">'+r.message+'</div>';
                  }else{
                    el.innerHTML='<div class="result-err">'+r.message+'</div>';
                  }
                }catch(e){
                  el.innerText=xhr2.responseText||'Error inesperado';
                }
              }
            };
            xhr2.send(JSON.stringify({locationId:sel}));
          });
        })
        .catch(function(err){
          document.getElementById('result').innerHTML='<div class="result-err">Error cargando ubicaciones: '+err+'</div>';
        });
    }
  </script>
</head>
<body>
  <h3>Configurar Wi-Fi</h3>
  <form id="f" onsubmit="submitForm(event)">
    <label>SSID<input name="ssid" required></label>
    <label>Contrase&ntilde;a<input name="pass" type="password"></label>
    <label>Nombre del dispositivo (opcional)<input name="name"></label>
    <button type="submit">Guardar y Salir</button>
  </form>
  <div id="result"></div>
</body>
</html>
)rawliteral";

// =====================================================================
// JSON helpers
// =====================================================================

String jsonStr(const String &json, const String &key) {
  int idx = json.indexOf("\"" + key + "\"");
  if (idx < 0) return "";
  int col = json.indexOf(':', idx);
  if (col < 0) return "";
  int q1 = json.indexOf('"', col);
  int q2 = json.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 <= q1) return "";
  return json.substring(q1 + 1, q2);
}

int jsonInt(const String &json, const String &key) {
  int idx = json.indexOf("\"" + key + "\"");
  if (idx < 0) return -1;
  int col = json.indexOf(':', idx);
  if (col < 0) return -1;
  int i = col + 1;
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == '"')) i++;
  int j = i;
  while (j < (int)json.length() && (isDigit(json[j]) || json[j] == '-')) j++;
  return json.substring(i, j).toInt();
}

// =====================================================================
// Keycloak token helper
// =====================================================================

bool ensureKcToken() {
  if (kcAccessToken.length() > 0 && kcTokenExpiryMillis > 0
      && (millis() + KC_REFRESH_MARGIN_MS) < kcTokenExpiryMillis) {
    return true;
  }

  prefs.begin(PREF_NS, true);
  String cid  = prefs.getString("kc_client_id", "");
  String csec = prefs.getString("kc_csecret", "");
  prefs.end();

  if (!cid.length() || !csec.length()) {
    Serial.println("[FW] No KC creds in NVS");
    return false;
  }

  Serial.println("[FW] Requesting KC token...");
  WiFiClientSecure *tkClient = new WiFiClientSecure();
  tkClient->setInsecure();
  HTTPClient httpTk;
  bool got = false;

  if (httpTk.begin(*tkClient, KEYCLOAK_TOKEN_URL)) {
    httpTk.addHeader("Content-Type", "application/x-www-form-urlencoded");
    httpTk.setTimeout(15000);
    String body = "grant_type=client_credentials&client_id=" + cid + "&client_secret=" + csec;
    int code = httpTk.POST(body);
    Serial.printf("[FW] KC token HTTP %d\n", code);
    if (code == 200) {
      String resp = httpTk.getString();
      String token = jsonStr(resp, "access_token");
      if (token.length()) {
        kcAccessToken = token;
        int expiresIn = jsonInt(resp, "expires_in");
        if (expiresIn > 0) kcTokenExpiryMillis = millis() + ((unsigned long)expiresIn * 1000UL);
        got = true;
        Serial.printf("[FW] KC token OK (len=%d)\n", token.length());
      }
    }
    httpTk.end();
  }
  delete tkClient;
  return got;
}

// =====================================================================
// Registration POST
// =====================================================================

void sendRegistration(const String &mac, const String &name, const String &ssid, const String &pw) {
  Serial.println("[FW] Registering device...");
  WiFiClientSecure *client = new WiFiClientSecure();
  client->setInsecure();
  HTTPClient http;

  if (!http.begin(*client, REG_URL)) {
    Serial.println("[FW] http.begin failed");
    delete client;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Factory-Token", FACTORY_TOKEN);

  String payload = String("{") +
    "\"name\":\"" + name + "\"," +
    "\"type\":\"SENSOR\"," +
    "\"state\":\"ACTIVE\"," +
    "\"locationId\":0," +
    "\"macAddress\":\"" + mac + "\"," +
    "\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"," +
    "\"wifiSsid\":\"" + ssid + "\"," +
    "\"wifiPassword\":\"" + pw + "\"" +
    "}";

  int httpCode = http.POST(payload);
  Serial.printf("[FW] Register HTTP %d\n", httpCode);

  if (httpCode == 200) {
    String resp = http.getString();
    Serial.println("[FW] " + resp);

    int deviceId = jsonInt(resp, "deviceId");
    if (deviceId > 0) {
      prefs.begin(PREF_NS, false);
      prefs.putInt("device_id", deviceId);
      prefs.end();
      nvs_deviceId = deviceId;
      Serial.printf("[FW] deviceId=%d saved\n", deviceId);
    }

    int idxKc = resp.indexOf("\"keycloakClientInfo\"");
    if (idxKc >= 0) {
      int objStart = resp.indexOf('{', idxKc);
      int objEnd   = resp.indexOf('}', objStart);
      if (objStart > 0 && objEnd > objStart) {
        String sub          = resp.substring(objStart, objEnd + 1);
        String clientId     = jsonStr(sub, "clientId");
        String clientSecret = jsonStr(sub, "clientSecret");
        String internalId   = jsonStr(sub, "internalId");

        if (clientId.length() || clientSecret.length() || internalId.length()) {
          prefs.begin(PREF_NS, false);
          if (clientId.length())     prefs.putString("kc_client_id", clientId);
          if (clientSecret.length()) prefs.putString("kc_csecret", clientSecret);
          if (internalId.length())   prefs.putString("kc_internal_id", internalId);
          prefs.end();
          Serial.printf("[FW] KC creds saved (cid=%d sec=%d)\n", clientId.length(), clientSecret.length());
        }
      }
    }
  } else {
    Serial.printf("[FW] Register failed: %d\n", httpCode);
  }

  http.end();
  delete client;
}

// =====================================================================
// Provisioning HTTP handlers
// =====================================================================

void handleRoot() {
  server.send(200, "text/html; charset=utf-8", captivePage);
}

void handleSubmit() {
  String ss   = server.arg("ssid");
  String pw   = server.arg("pass");
  String name = server.arg("name");
  String mac  = WiFi.macAddress();
  mac.replace(" ", "");

  // Debug: print WiFi mode, reported MAC and efuse MAC to diagnose empty MAC issue
  uint8_t wmode = WiFi.getMode();
  unsigned long long efuseMac = ESP.getEfuseMac();
  Serial.printf("[FW] /submit ssid='%s' name='%s'\n", ss.c_str(), name.c_str());
  Serial.printf("[FW] Debug: WiFi.getMode()=%u WiFi.macAddress()='%s' EFUSE=%012llX\n", wmode, mac.c_str(), efuseMac);

  bool macInvalid = (mac == "00:00:00:00:00:00" || mac.length() == 0);
  Serial.printf("[FW] Debug: macInvalid=%d\n", macInvalid ? 1 : 0);
  if (macInvalid) {
    // fallback to EFUSE MAC when WiFi API reports zeros
    mac = efuseMacString();
    Serial.printf("[FW] Debug: using EFUSE MAC fallback '%s'\n", mac.c_str());
    macInvalid = false;
  }

  prefs.begin(PREF_NS, false);
  prefs.putString(KEY_SSID, ss);
  prefs.putString(KEY_PASS, pw);
  prefs.putString(KEY_NAME, name);
  if (!macInvalid) prefs.putString(KEY_MAC, mac);
  else             prefs.remove(KEY_MAC);
  prefs.putBool("provisioned", true);
  prefs.end();

  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(ss.c_str(), pw.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.printf("[FW] Connecting (%d/30)...\n", ++attempts);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[FW] Connected, IP: "); Serial.println(WiFi.localIP());
    sendRegistration(mac, name, ss, pw);
    server.send(200, "application/json; charset=utf-8",
      "{\"status\":\"ok\",\"message\":\"Conectado correctamente. Seleccione la ubicación.\"}");
  } else {
    Serial.printf("[FW] Connection failed, status=%d\n", WiFi.status());
    prefs.begin(PREF_NS, false);
    prefs.putBool("connected", false);
    prefs.end();
    server.send(200, "application/json; charset=utf-8",
      "{\"status\":\"error\",\"message\":\"No se pudo conectar a la red. Revise SSID/Clave y reintente.\"}");
  }
}

void handleStatus() {
  prefs.begin(PREF_NS, true);
  String ss   = prefs.getString(KEY_SSID, "");
  String name = prefs.getString(KEY_NAME, "");
  prefs.end();
  server.send(200, "application/json; charset=utf-8",
    "{\"softAp\":\"" + softApSSID + "\",\"savedSsid\":\"" + ss + "\",\"name\":\"" + name + "\"}");
}

void handleProxyLocations() {
  if (WiFi.status() != WL_CONNECTED) {
    server.send(503, "application/json; charset=utf-8",
      "{\"status\":\"error\",\"message\":\"Device not connected\"}");
    return;
  }

  WiFiClientSecure *client = new WiFiClientSecure();
  client->setInsecure();
  HTTPClient http;

  if (!http.begin(*client, "")) {
    server.send(500, "application/json; charset=utf-8",
      "{\"status\":\"error\",\"message\":\"http begin failed\"}");
    delete client;
    return;
  }

  http.setTimeout(15000);
  if (ensureKcToken()) {
    http.addHeader("Authorization", "Bearer " + kcAccessToken);
  } else {
    Serial.println("[FW] No token for /locations");
  }

  int code = http.GET();
  Serial.printf("[FW] GET /locations -> %d\n", code);
  if (code > 0) {
    server.send(code, "application/json; charset=utf-8", http.getString());
  } else {
    server.send(502, "application/json; charset=utf-8",
      "{\"status\":\"error\",\"message\":\"failed to fetch locations\"}");
  }
  http.end();
  delete client;
}

void handleSetLocation() {
  String body = server.arg("plain");
  int idx = body.indexOf("locationId");
  if (idx < 0) { server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"locationId not found\"}"); return; }
  int col = body.indexOf(':', idx);
  if (col < 0) { server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid body\"}"); return; }
  int i = col + 1;
  while (i < (int)body.length() && (body[i] == ' ' || body[i] == '"')) i++;
  int j = i;
  while (j < (int)body.length() && (isDigit(body[j]) || body[j] == '-')) j++;
  int locationId = body.substring(i, j).toInt();
  if (locationId < 0) { server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid locationId\"}"); return; }

  prefs.begin(PREF_NS, true);
  int deviceId = prefs.getInt("device_id", -1);
  prefs.end();
  if (deviceId <= 0) {
    server.send(500, "application/json", "{\"status\":\"error\",\"message\":\"device_id missing\"}");
    return;
  }

  Serial.printf("[FW] PUT locationId=%d deviceId=%d\n", locationId, deviceId);

  WiFiClientSecure *client = new WiFiClientSecure();
  client->setInsecure();
  HTTPClient http;

  if (!http.begin(*client, "")) {
    server.send(500, "application/json", "{\"status\":\"error\",\"message\":\"http begin failed\"}");
    delete client;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (ensureKcToken()) {
    http.addHeader("Authorization", "Bearer " + kcAccessToken);
  } else {
    Serial.println("[FW] PUT fallback to factory token");
    http.addHeader("X-Factory-Token", FACTORY_TOKEN);
  }

  http.setTimeout(30000);
  String payload = "{\"id\":" + String(deviceId) + ",\"location\":{\"id\":" + String(locationId) + "}}";
  int code = http.sendRequest("PUT", payload);
  Serial.printf("[FW] PUT /devices -> %d\n", code);

  if (code >= 200 && code < 300) {
    prefs.begin(PREF_NS, false);
    prefs.putInt("location_id", locationId);
    prefs.putBool("connected", true);
    prefs.end();

    server.send(200, "application/json; charset=utf-8",
      "{\"status\":\"ok\",\"message\":\"Ubicación asignada. El dispositivo se reiniciará.\"}");

    delay(1500);
    dnsServer.stop();
    WiFi.softAPdisconnect(true);
    server.stop();
    // stop portal and turn off AP LED before restart
    softApRunning = false;
    softApLedState = false;
    digitalWrite(LED_OK, LOW);
    Serial.println("[FW] Provisioning complete, restarting into sensor mode...");
    delay(500);
    ESP.restart();
  } else {
    Serial.println("[FW] PUT failed: " + http.getString());
    server.send(500, "application/json; charset=utf-8",
      "{\"status\":\"error\",\"message\":\"Backend update failed\"}");
  }
  http.end();
  delete client;
}

// =====================================================================
// NTP
// =====================================================================

void setupNTP() {
  Serial.println("[FW] Configuring NTP...");
  for (int s = 0; s < numNtpServers; s++) {
    Serial.printf("[FW] Trying NTP: %s\n", ntpServers[s]);
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServers[s]);
    struct tm timeinfo;
    int attempts = 0;
    while (!getLocalTime(&timeinfo) && attempts < 10) { delay(1000); attempts++; }
    if (getLocalTime(&timeinfo)) {
      Serial.printf("[FW] NTP OK: %04d-%02d-%02d %02d:%02d:%02d\n",
        timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
        timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
      lastNtpSync = millis();
      return;
    }
  }
  Serial.println("[FW] NTP failed, using millis fallback");
}

String getCurrentTimestamp() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    if (millis() - lastNtpSync > ntpSyncInterval) {
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServers[0]);
      delay(2000);
      lastNtpSync = millis();
    }
    char ts[25];
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%S", &timeinfo);
    return String(ts);
  }
  unsigned long sec = millis() / 1000;
  char ts[25];
  sprintf(ts, "2026-01-01T%02lu:%02lu:%02lu", (sec / 3600) % 24, (sec / 60) % 60, sec % 60);
  return String(ts);
}

// =====================================================================
// Sensor reading functions
// =====================================================================

float calculateAverage(float values[], int size) {
  float sum = 0;
  int valid = 0;
  for (int i = 0; i < size; i++) {
    if (values[i] != -1) { sum += values[i]; valid++; }
  }
  return valid > 0 ? sum / valid : -1;
}

void readPMS7003(int index) {
  readings_pm25[index] = -1;
  readings_pm10[index] = -1;

  if (pmsSerial.available() >= 32) {
    while (pmsSerial.available() && pmsSerial.peek() != 0x42) pmsSerial.read();
    if (pmsSerial.available() >= 32) {
      pmsSerial.readBytes(pmsBuf, 32);
      if (pmsBuf[0] == 0x42 && pmsBuf[1] == 0x4D) {
        uint16_t frameLen = be16(pmsBuf, 2);
        if (frameLen == 28) {
          uint32_t sum = 0;
          for (int k = 0; k < 30; k++) sum += pmsBuf[k];
          uint16_t chk = be16(pmsBuf, 30);
          if ((sum & 0xFFFF) == chk) {
            readings_pm25[index] = be16(pmsBuf, 12);
            readings_pm10[index] = be16(pmsBuf, 14);
            Serial.printf("[PMS #%d] PM2.5=%.0f PM10=%.0f\n", index + 1, readings_pm25[index], readings_pm10[index]);
          }
        }
      }
    }
  }
}

void readSCD30(int index) {
  readings_temperature[index] = -1;
  readings_humidity[index]    = -1;
  readings_co2[index]         = -1;

  if (airSensor.dataAvailable()) {
    readings_co2[index]         = airSensor.getCO2();
    readings_temperature[index] = airSensor.getTemperature();
    readings_humidity[index]    = airSensor.getHumidity();
    Serial.printf("[SCD #%d] CO2=%.1f Temp=%.1f Hum=%.1f\n",
      index + 1, readings_co2[index], readings_temperature[index], readings_humidity[index]);
  }
}

void readMICS6814(int index) {
  readings_co[index]  = analogRead(CO_PIN);
  readings_no2[index] = analogRead(NO2_PIN);
  readings_nh3[index] = analogRead(NH3_PIN);
  Serial.printf("[MICS #%d] CO=%.0f NO2=%.0f NH3=%.0f\n",
    index + 1, readings_co[index], readings_no2[index], readings_nh3[index]);
}

void performReading(int index) {
  Serial.printf("\n=== Reading #%d ===\n", index + 1);
  readPMS7003(index);
  readSCD30(index);
  readMICS6814(index);
}

// =====================================================================
// Send averaged sensor data to backend
// =====================================================================

void sendAveragedData() {
  float avg_pm25 = calculateAverage(readings_pm25, 3);
  float avg_pm10 = calculateAverage(readings_pm10, 3);
  float avg_temp = calculateAverage(readings_temperature, 3);
  float avg_hum  = calculateAverage(readings_humidity, 3);
  float avg_co2  = calculateAverage(readings_co2, 3);
  float avg_co   = calculateAverage(readings_co, 3);
  float avg_no2  = calculateAverage(readings_no2, 3);
  float avg_nh3  = calculateAverage(readings_nh3, 3);

  Serial.println("\n=== Averages ===");
  Serial.printf("PM2.5=%.1f PM10=%.1f CO2=%.1f T=%.1f H=%.1f CO=%.1f NO2=%.1f NH3=%.1f\n",
    avg_pm25, avg_pm10, avg_co2, avg_temp, avg_hum, avg_co, avg_no2, avg_nh3);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[FW] WiFi lost, reconnecting...");
    prefs.begin(PREF_NS, true);
    String ss = prefs.getString(KEY_SSID, "");
    String pw = prefs.getString(KEY_PASS, "");
    prefs.end();
    WiFi.begin(ss.c_str(), pw.c_str());
    int att = 0;
    while (WiFi.status() != WL_CONNECTED && att++ < 20) delay(500);
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[FW] Reconnect failed");
      digitalWrite(LED_FAIL, HIGH); delay(2000); digitalWrite(LED_FAIL, LOW);
      return;
    }
    Serial.println("[FW] Reconnected");
  }

  if (avg_co2 == -1 && avg_pm25 == -1 && avg_pm10 == -1) {
    Serial.println("[FW] No valid sensor data to send");
    digitalWrite(LED_FAIL, HIGH); delay(2000); digitalWrite(LED_FAIL, LOW);
    return;
  }

  WiFiClientSecure *client = new WiFiClientSecure();
  client->setInsecure();
  HTTPClient http;

  if (!http.begin(*client, SENSOR_DATA_URL)) {
    Serial.println("[FW] http.begin failed for sensordata");
    delete client;
    digitalWrite(LED_FAIL, HIGH); delay(2000); digitalWrite(LED_FAIL, LOW);
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (ensureKcToken()) {
    http.addHeader("Authorization", "Bearer " + kcAccessToken);
  }
  http.setTimeout(15000);

  String timestamp = getCurrentTimestamp();
  String payload = "{";
  payload += "\"temperature\":" + String(avg_temp, 1) + ",";
  payload += "\"humidity\":" + String(avg_hum, 1) + ",";
  payload += "\"co2\":" + String(avg_co2, 1) + ",";
  payload += "\"pm25\":" + String(avg_pm25, 1) + ",";
  payload += "\"pm10\":" + String(avg_pm10, 1) + ",";
  payload += "\"co\":" + String(avg_co, 0) + ",";
  payload += "\"no2\":" + String(avg_no2, 0) + ",";
  payload += "\"nh3\":" + String(avg_nh3, 0) + ",";
  payload += "\"timestamp\":\"" + timestamp + "\",";
  payload += "\"device\":{\"id\":" + String(nvs_deviceId) + "}";
  payload += "}";

  Serial.println("[FW] POST sensordata: " + payload);
  int code = http.POST(payload);
  Serial.printf("[FW] POST sensordata -> %d\n", code);

  if (code == 200) {
    Serial.println("[FW] Data sent OK");
    digitalWrite(LED_OK, HIGH); delay(2000); digitalWrite(LED_OK, LOW);
  } else {
    if (code > 0) Serial.println("[FW] Server: " + http.getString());
    else          Serial.printf("[FW] POST error: %d\n", code);
    digitalWrite(LED_FAIL, HIGH); delay(2000); digitalWrite(LED_FAIL, LOW);
  }
  http.end();
  delete client;
}

// =====================================================================
// Sensor hardware init
// =====================================================================

void initSensors() {
  Serial.println("[FW] Initializing sensors...");

  pmsSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pmsSerial.setTimeout(50);
  Serial.println("[FW] PMS7003 UART ready");

  Wire.begin();
  if (!airSensor.begin()) {
    Serial.println("[FW] SCD30 not detected!");
    while (1) {
      digitalWrite(LED_FAIL, HIGH); delay(500);
      digitalWrite(LED_FAIL, LOW);  delay(500);
    }
  }
  Serial.println("[FW] SCD30 ready");

  for (int i = 0; i < 3; i++) {
    readings_pm25[i] = readings_pm10[i] = -1;
    readings_temperature[i] = readings_humidity[i] = readings_co2[i] = -1;
    readings_co[i] = readings_no2[i] = readings_nh3[i] = -1;
  }
}

// =====================================================================
// SoftAP init (provisioning mode)
// =====================================================================

void startSoftAP() {
  uint64_t chipid = ESP.getEfuseMac();
  char macbuf[13];
  snprintf(macbuf, sizeof(macbuf), "%012llX", (unsigned long long)chipid);
  softApSSID = "MOVE-Setup-" + String(macbuf).substring(8);

  Serial.printf("[FW] Starting AP '%s'\n", softApSSID.c_str());
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);
  WiFi.softAP(softApSSID.c_str());

  dnsServer.start(53, "*", AP_IP);

  server.onNotFound([]() {
    server.sendHeader("Location", String("http://") + AP_IP.toString(), true);
    server.send(302, "text/plain", "");
  });
  server.on("/", HTTP_GET, handleRoot);
  server.on("/submit", HTTP_POST, handleSubmit);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/locations", HTTP_GET, handleProxyLocations);
  server.on("/set-location", HTTP_POST, handleSetLocation);
  server.begin();

  Serial.println("[FW] Portal ready");
  softApRunning = true;
  // initialize LED blink for captive portal
  softApLedLast = millis();
  softApLedState = true;
  digitalWrite(LED_OK, HIGH);
}

// =====================================================================
// Main
// =====================================================================

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  delay(500);
  Serial.println("========================================");
  Serial.printf("=== MOVE Sensor firmware v%s ===\n", FIRMWARE_VERSION);
  Serial.println("========================================\n");

  pinMode(LED_OK, OUTPUT);
  pinMode(LED_FAIL, OUTPUT);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_FAIL, LOW);
  pinMode(CO_PIN, INPUT);
  pinMode(NO2_PIN, INPUT);
  pinMode(NH3_PIN, INPUT);

  String startupMac = WiFi.macAddress();
  if (startupMac == "00:00:00:00:00:00" || startupMac.length() == 0) startupMac = efuseMacString();
  Serial.printf("[FW] MAC: %s  Heap: %u\n", startupMac.c_str(), ESP.getFreeHeap());

  prefs.begin(PREF_NS, true);
  bool wasConnected = prefs.getBool("connected", false);
  String savedSsid  = prefs.getString(KEY_SSID, "");
  String savedPass  = prefs.getString(KEY_PASS, "");
  nvs_deviceId      = prefs.getInt("device_id", -1);
  prefs.end();

  if (wasConnected && savedSsid.length() > 0) {
    Serial.printf("[FW] Reconnecting to '%s'...\n", savedSsid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(savedSsid.c_str(), savedPass.c_str());
    // Keep retrying until WiFi connects. Do NOT clear credentials or start SoftAP here.
    int retrySeconds = 0;
    while (WiFi.status() != WL_CONNECTED) {
      delay(1000);
      retrySeconds++;
      if (retrySeconds % 10 == 0) Serial.printf("[FW] Still trying to connect (%ds)...\n", retrySeconds);
      // periodically trigger reconnect attempt
      if (retrySeconds % 30 == 0) WiFi.reconnect();
    }

    if (WiFi.status() == WL_CONNECTED && nvs_deviceId > 0) {
      Serial.print("[FW] Connected, IP: "); Serial.println(WiFi.localIP());
      // Verify device exists in backend before entering sensor mode
      if (!verifyDeviceExists(nvs_deviceId)) {
        // verifyDeviceExists will clear prefs and restart on 404; if it returns false, bail
        Serial.println("[FW] verifyDeviceExists returned false");
        return;
      }
      Serial.printf("[FW] Device ID: %d — entering sensor mode\n", nvs_deviceId);
      initSensors();
      setupNTP();
      sensorMode = true;
      Serial.println("[FW] Sensor mode active (3 reads x 10s, send every 30s)");
      return;
    }
    // If we reach here, WiFi is connected but deviceId is missing -> fall through to SoftAP
  } else {
    Serial.println("[FW] No saved connection -> SoftAP");
  }

  startSoftAP();
}

void loop() {
  if (softApRunning) {
    dnsServer.processNextRequest();
    server.handleClient();
    // SoftAP LED blink every second
    unsigned long now = millis();
    if (now - softApLedLast >= softApLedInterval) {
      softApLedLast = now;
      softApLedState = !softApLedState;
      digitalWrite(LED_OK, softApLedState ? HIGH : LOW);
    }
  }

  if (sensorMode) {
    unsigned long now = millis();
    if (now - lastReadingTime >= readingInterval || lastReadingTime == 0) {
      performReading(readingCount);
      readingCount++;
      lastReadingTime = now;

      if (readingCount >= 3) {
        sendAveragedData();
        readingCount = 0;
        for (int i = 0; i < 3; i++) {
          readings_pm25[i] = readings_pm10[i] = -1;
          readings_temperature[i] = readings_humidity[i] = readings_co2[i] = -1;
          readings_co[i] = readings_no2[i] = readings_nh3[i] = -1;
        }
      }
    }
  }

  delay(10);
}
