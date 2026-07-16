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
#include <LittleFS.h>

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
const char* DEVICES_URL        = "";
const char* LOCATIONS_URL      = "";
const char* FIRMWARE_VERSION   = "0.0.4";
const char* FACTORY_TOKEN      = "";
const char* KEYCLOAK_TOKEN_URL = "";

// === Local queue limits ===
const int MAX_LOCAL_RECORDS = 5760; // two days @ 1 record per minute-ish (configurable)
const char* KEY_QUEUE_COUNT = "queue_count";

// === OAuth cache ===
String kcAccessToken = "";
unsigned long kcTokenExpiryMillis = 0;
const unsigned long KC_REFRESH_MARGIN_MS = 30000;

// === LEDs ===
const int LED_OK   = 2;

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
  // Discard queued payloads: they carry the previous device id and would be
  // rejected (410) after re-provisioning, wiping the new credentials in a loop.
  if (LittleFS.begin() && LittleFS.exists("/queue.log")) {
    LittleFS.remove("/queue.log");
    Serial.println("[FW] Queued payloads discarded (previous registration)");
  }
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

    String url = String(DEVICES_URL) + String("/") + String(deviceId);
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
      // Device archived ("moved") on backend -> clear credentials and return to provisioning
      if (resp.indexOf("\"archived\":true") >= 0) {
        Serial.println("[FW] Device is archived on backend -> clearing credentials");
        clearProvisionPrefsAndRestart();
        return false; // restart
      }
      Serial.println("[FW] Device exists on backend");
      return true;
    }

    if (code == 401) {
      Serial.println("[FW] Keycloak credentials not found on backend -> clearing credentials");
      clearProvisionPrefsAndRestart();
      return false; // restart
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
// === Sensor warmup / detection ===
const unsigned long SCD30_DETECT_TIMEOUT_MS = 180000; // 3 minutes max to detect SCD30
const unsigned long SCD30_STABILIZE_MS = 30000;      // 30s extra stabilize after detection
const unsigned long PMS7003_WARMUP_MS = 30000;       // 30s warmup for PMS7003
const unsigned long SENSOR_DETECT_RETRY_INTERVAL_MS = 5000; // 5s between detection attempts
const int SENSOR_DETECT_MAX_ATTEMPTS = 12; // fallback attempts (total window controlled by timeouts)

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
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MOVE · Configuración</title>
  <style>
    :root{--brand:#2ea44f;--brand-d:#258a41;--brand-bg:#e9f7ef;--txt:#344054;--txt2:#667085;--bd:#d0d5dd;--err:#d92d20;--err-bg:#fef3f2;--ok:#039855;--ok-bg:#ecfdf3}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f8faf9;color:var(--txt);min-height:100vh;display:flex;justify-content:center;padding:1.25rem}
    .card{background:#fff;border:1px solid #e3e8e6;border-radius:16px;box-shadow:0 4px 8px -2px rgba(16,24,40,.1),0 2px 4px -2px rgba(16,24,40,.06);width:100%;max-width:420px;padding:1.5rem;height:fit-content;margin-top:.75rem}
    h1{font-size:1.5rem;color:var(--brand);text-align:center;letter-spacing:.08em}
    .sub{text-align:center;color:var(--txt2);font-size:.85rem;margin:.2rem 0 1.25rem}
    .steps{display:flex;gap:.5rem;margin-bottom:1.25rem}
    .step{flex:1;text-align:center;font-size:.75rem;color:var(--txt2);padding-top:.45rem;border-top:3px solid #e3e8e6}
    .step.on{color:var(--brand);border-top-color:var(--brand);font-weight:600}
    label{display:block;font-size:.85rem;font-weight:500;margin:.9rem 0 .3rem}
    input,select{width:100%;padding:.6rem .7rem;font-size:1rem;border:1px solid var(--bd);border-radius:8px;background:#fff;color:var(--txt)}
    input:focus,select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(46,164,79,.15)}
    .pw{position:relative}
    .pw input{padding-right:2.6rem}
    .pw button{position:absolute;right:.4rem;top:50%;transform:translateY(-50%);border:none;background:none;color:var(--txt2);padding:.25rem;cursor:pointer;display:flex;align-items:center}
    .link{background:none;border:none;color:var(--brand);font-size:.8rem;text-decoration:underline;padding:.35rem 0;cursor:pointer}
    .btn{width:100%;margin-top:1.25rem;padding:.7rem;font-size:1rem;font-weight:600;color:#fff;background:var(--brand);border:none;border-radius:8px;cursor:pointer}
    .btn:hover{background:var(--brand-d)}
    .btn:disabled{opacity:.55;cursor:default}
    .msg{margin-top:1rem;padding:.7rem .8rem;border-radius:8px;font-size:.9rem;display:none}
    .msg.err{display:block;background:var(--err-bg);color:var(--err)}
    .msg.ok{display:block;background:var(--ok-bg);color:var(--ok)}
    .msg.load{display:flex;align-items:center;gap:.6rem;background:#f1f5f3;color:var(--txt2)}
    .msg .link{font-size:.9rem}
    .spin{width:18px;height:18px;border:3px solid #d1f0e0;border-top-color:var(--brand);border-radius:50%;animation:r 1s linear infinite;flex:none}
    @keyframes r{to{transform:rotate(360deg)}}
    .hide{display:none}
    .done{text-align:center;padding:1rem 0}
    .done .ico{width:52px;height:52px;border-radius:50%;background:var(--brand-bg);color:var(--brand);font-size:1.6rem;line-height:52px;margin:0 auto .8rem}
    .done h2{font-size:1.1rem;color:#101828;margin-bottom:.5rem}
    .done p{font-size:.9rem;color:var(--txt2)}
  </style>
</head>
<body>
  <div class="card">
    <h1>MOVE</h1>
    <p class="sub">Configuración del sensor ambiental</p>
    <div class="steps">
      <div class="step on" id="st1">1 · Red Wi-Fi</div>
      <div class="step" id="st2">2 · Ubicación</div>
    </div>

    <div id="p1">
      <form id="f" onsubmit="submitForm(event)">
        <label for="netsel">Red Wi-Fi</label>
        <select id="netsel" onchange="showManual(this.value==='__other')"></select>
        <button type="button" class="link" id="rescan" onclick="scanNets()">Buscar redes de nuevo</button>
        <div id="manwrap" class="hide">
          <label for="ssid">Nombre de la red (SSID)</label>
          <input id="ssid" autocapitalize="none" autocorrect="off">
        </div>
        <label for="pass">Contraseña</label>
        <div class="pw">
          <input id="pass" type="password" autocapitalize="none" autocorrect="off">
          <button type="button" id="eye" onclick="togglePw()" title="Mostrar/ocultar contraseña"></button>
        </div>
        <label for="dname">Nombre del dispositivo (opcional)</label>
        <input id="dname" placeholder="Ej: Sensor patio norte (vacío = automático)">
        <button class="btn" id="sbtn" type="submit">Conectar y registrar</button>
      </form>
      <div class="msg" id="m1"></div>
    </div>

    <div id="p2" class="hide">
      <label for="locsel">Selecciona la ubicación</label>
      <select id="locsel"></select>
      <button class="btn" id="fbtn" onclick="finalize()">Finalizar registro</button>
      <div class="msg" id="m2"></div>
    </div>

    <div id="p3" class="hide done">
      <div class="ico">&#10003;</div>
      <h2>¡Registro completo!</h2>
      <p>El dispositivo se está reiniciando y comenzará a enviar datos en unos minutos. Esta red Wi-Fi de configuración desaparecerá; ya puedes cerrar esta página.</p>
    </div>
  </div>

  <script>
    function $(i){return document.getElementById(i)}
    function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}
    function msg(el,cls,html){el.className='msg '+cls;el.innerHTML=html}
    function msgLoad(el,text){el.className='msg load';el.innerHTML='<div class="spin"></div><div>'+text+'</div>'}
    function msgClear(el){el.className='msg';el.innerHTML=''}
    function req(method,url,body,timeoutMs,cb){
      var x=new XMLHttpRequest();
      x.open(method,url);
      x.timeout=timeoutMs;
      x.onload=function(){cb(null,x.status,x.responseText)};
      x.onerror=function(){cb('net')};
      x.ontimeout=function(){cb('timeout')};
      if(body&&typeof body==='string')x.setRequestHeader('Content-Type','application/json');
      x.send(body||null);
    }
    function sig(r){return r>=-55?'señal alta':r>=-70?'señal media':'señal baja'}
    function showManual(v){$('manwrap').className=v?'':'hide'}
    var eyeOn='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var eyeOff='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    function togglePw(){var p=$('pass');var show=p.type==='password';p.type=show?'text':'password';$('eye').innerHTML=show?eyeOff:eyeOn}
    function scanNets(){
      var sel=$('netsel');
      sel.disabled=true;$('rescan').disabled=true;
      sel.innerHTML='';
      var o=document.createElement('option');o.value='';o.textContent='Buscando redes…';sel.appendChild(o);
      req('GET','/scan',null,25000,function(err,st,txt){
        sel.disabled=false;$('rescan').disabled=false;
        sel.innerHTML='';
        var list=[];
        if(!err&&st===200){try{list=JSON.parse(txt)||[]}catch(e){list=[]}}
        list.sort(function(a,b){return b.rssi-a.rssi});
        list.forEach(function(n){
          var op=document.createElement('option');
          op.value=n.ssid;
          op.textContent=n.ssid+' — '+sig(n.rssi)+(n.secure?'':' · red abierta');
          sel.appendChild(op);
        });
        var oo=document.createElement('option');
        oo.value='__other';
        oo.textContent=list.length?'Otra red…':'No se encontraron redes — escribir manualmente';
        sel.appendChild(oo);
        if(!list.length){sel.value='__other';showManual(true)}else{showManual(false)}
      });
    }
    function setForm(dis){['netsel','ssid','pass','dname','sbtn','eye','rescan'].forEach(function(i){var el=$(i);if(el)el.disabled=dis})}
    function submitForm(e){
      e.preventDefault();
      var sel=$('netsel').value;
      var ssid=(sel===''||sel==='__other')?$('ssid').value.trim():sel;
      if(!ssid){msg($('m1'),'err','Selecciona o escribe el nombre de la red Wi-Fi.');return}
      var fd=new FormData();
      fd.append('ssid',ssid);
      fd.append('pass',$('pass').value);
      fd.append('name',$('dname').value.trim());
      setForm(true);
      msgLoad($('m1'),'Conectando a "'+esc(ssid)+'" y registrando el dispositivo… puede tardar hasta un minuto.');
      req('POST','/submit',fd,90000,function(err,st,txt){
        var r=null;try{r=JSON.parse(txt||'')}catch(e2){}
        if(!err&&r&&r.status==='ok'){
          msg($('m1'),'ok',esc(r.message));
          step2();
        }else{
          setForm(false);
          var t=err==='timeout'?'El dispositivo no respondió a tiempo. Vuelve a intentarlo.':err==='net'?'Se perdió la conexión con el dispositivo. Comprueba que sigues conectado a su red Wi-Fi y reintenta.':(r&&r.message?esc(r.message):'Respuesta inesperada del dispositivo. Reintenta.');
          msg($('m1'),'err',t);
        }
      });
    }
    function step2(){$('st2').className='step on';$('p1').className='hide';$('p2').className='';loadLocations()}
    function loadLocations(){
      var sel=$('locsel');var m=$('m2');
      sel.innerHTML='';sel.disabled=true;$('fbtn').disabled=true;
      msgLoad(m,'Cargando ubicaciones…');
      req('GET','/locations',null,25000,function(err,st,txt){
        var list=null;
        if(!err&&st<400){try{list=JSON.parse(txt)}catch(e){}}
        if(!Array.isArray(list)){
          msg(m,'err','No se pudieron cargar las ubicaciones. <button class="link" onclick="loadLocations()">Reintentar</button>');
          return;
        }
        if(!list.length){
          msg(m,'err','No hay ubicaciones registradas. Crea una en la plataforma MOVE y vuelve a intentar. <button class="link" onclick="loadLocations()">Reintentar</button>');
          return;
        }
        list.forEach(function(l){
          var o=document.createElement('option');
          o.value=l.id;
          o.textContent=l.description||l.name||('Ubicación #'+l.id);
          sel.appendChild(o);
        });
        sel.disabled=false;$('fbtn').disabled=false;
        msgClear(m);
      });
    }
    function finalize(){
      var id=$('locsel').value;
      if(!id){msg($('m2'),'err','Selecciona una ubicación.');return}
      $('fbtn').disabled=true;$('locsel').disabled=true;
      msgLoad($('m2'),'Asignando ubicación…');
      req('POST','/set-location',JSON.stringify({locationId:id}),45000,function(err,st,txt){
        var r=null;try{r=JSON.parse(txt||'')}catch(e){}
        if(!err&&r&&r.status==='ok'){
          $('p2').className='hide';$('p3').className='done';
        }else{
          $('fbtn').disabled=false;$('locsel').disabled=false;
          msg($('m2'),'err',((r&&r.message)?esc(r.message):'No se pudo asignar la ubicación.')+' <button class="link" onclick="finalize()">Reintentar</button>');
        }
      });
    }
    $('eye').innerHTML=eyeOn;
    scanNets();
  </script>
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

// Escapes a string so it can be embedded safely inside a JSON value
String jsonEscape(const String &s) {
  String out = s;
  out.replace("\\", "\\\\");
  out.replace("\"", "\\\"");
  return out;
}

// =====================================================================
// Registration POST
// =====================================================================

/**
 * Registers the device on the backend.
 *
 * Returns true only on full success (HTTP 201 + deviceId + Keycloak credentials).
 * On failure, fills errMsg with a user-friendly message (shown in the captive portal)
 * derived from the HTTP code and the backend's ProblemDetail 'detail' field.
 */
bool sendRegistration(const String &mac, const String &name, const String &ssid, const String &pw, String &errMsg) {
  Serial.println("[FW] Registering device...");
  // Stack allocation (like drainQueueBulk): destructors run in reverse order
  // (http first, then client), avoiding the use-after-free of delete + ~HTTPClient
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, REG_URL)) {
    Serial.println("[FW] http.begin failed");
    errMsg = "No se pudo iniciar la conexión con el servidor. Reintenta.";
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Factory-Token", FACTORY_TOKEN);
  http.setTimeout(20000);

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
  String resp = "";
  if (httpCode > 0) resp = http.getString();
  http.end();

  if (httpCode <= 0) {
    errMsg = "No se pudo contactar con el servidor. Verifica que la red Wi-Fi tenga acceso a internet y reintenta.";
    return false;
  }

  if (httpCode == 201) {
    Serial.println("[FW] " + resp);

    int deviceId = jsonInt(resp, "deviceId");
    if (deviceId <= 0) {
      errMsg = "El servidor no devolvió el identificador del dispositivo. Reintenta.";
      return false;
    }

    prefs.begin(PREF_NS, false);
    prefs.putInt("device_id", deviceId);
    prefs.putInt(KEY_QUEUE_COUNT, 0);
    prefs.end();
    nvs_deviceId = deviceId;
    Serial.printf("[FW] deviceId=%d saved\n", deviceId);

    if (LittleFS.exists("/queue.log")) {
      LittleFS.remove("/queue.log");
      Serial.println("[FW] queue.log cleared on new registration");
    }

    String clientId = "", clientSecret = "", internalId = "";
    int idxKc = resp.indexOf("\"keycloakClientInfo\"");
    if (idxKc >= 0) {
      int objStart = resp.indexOf('{', idxKc);
      int objEnd   = resp.indexOf('}', objStart);
      if (objStart > 0 && objEnd > objStart) {
        String sub   = resp.substring(objStart, objEnd + 1);
        clientId     = jsonStr(sub, "clientId");
        clientSecret = jsonStr(sub, "clientSecret");
        internalId   = jsonStr(sub, "internalId");

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

    // Without credentials the sensor could never authenticate: fail here, visibly
    if (clientId.length() == 0 || clientSecret.length() == 0) {
      errMsg = "El servidor no devolvió las credenciales del dispositivo. Reintenta.";
      return false;
    }
    return true;
  }

  // Error response: extract the backend's ProblemDetail 'detail' field when available
  String detail = jsonStr(resp, "detail");
  Serial.printf("[FW] Register failed: %d detail='%s'\n", httpCode, detail.c_str());

  if (httpCode == 409) {
    if (detail.indexOf("name") >= 0) {
      errMsg = "Ya existe un dispositivo con ese nombre. Elige un nombre diferente y reintenta.";
    } else if (detail.indexOf("MAC") >= 0) {
      errMsg = "Este sensor ya está registrado en la plataforma. Muévelo o elimínalo desde la plataforma y reintenta.";
    } else {
      errMsg = detail.length() ? detail : "Conflicto al registrar el dispositivo (HTTP 409).";
    }
  } else if (httpCode == 400) {
    errMsg = detail.length() ? ("Datos de registro inválidos: " + detail) : "Datos de registro inválidos.";
  } else if (httpCode == 401) {
    errMsg = "El servidor rechazó el token de fábrica del dispositivo.";
  } else {
    errMsg = "Error del servidor al registrar (HTTP " + String(httpCode) + "). Reintenta en unos segundos.";
  }
  return false;
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

  // The backend requires a non-empty unique name: generate one from the MAC if omitted
  if (name.length() == 0) {
    String suffix = mac;
    suffix.replace(":", "");
    if (suffix.length() > 6) suffix = suffix.substring(suffix.length() - 6);
    name = "Sensor-" + suffix;
    Serial.printf("[FW] Empty name, generated default '%s'\n", name.c_str());
  }

  prefs.begin(PREF_NS, false);
  prefs.putString(KEY_SSID, ss);
  prefs.putString(KEY_PASS, pw);
  prefs.putString(KEY_NAME, name);
  if (!macInvalid) prefs.putString(KEY_MAC, mac);
  else             prefs.remove(KEY_MAC);
  prefs.putBool("provisioned", true);
  prefs.end();

  // Fast retry: if a previous attempt already connected to this same network
  // (e.g. registration failed and the user fixed the name), skip the reconnect
  if (WiFi.status() == WL_CONNECTED && WiFi.SSID() == ss) {
    Serial.println("[FW] Already connected to requested SSID, skipping reconnect");
  } else {
    WiFi.disconnect(true);
    delay(100);
    WiFi.mode(WIFI_AP_STA);
    WiFi.begin(ss.c_str(), pw.c_str());

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(1000);
      Serial.printf("[FW] Connecting (%d/30)...\n", ++attempts);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[FW] Connected, IP: "); Serial.println(WiFi.localIP());
    String regErr;
    if (sendRegistration(mac, name, ss, pw, regErr)) {
      server.send(200, "application/json; charset=utf-8",
        "{\"status\":\"ok\",\"message\":\"Conectado correctamente. Seleccione la ubicación.\"}");
    } else {
      server.send(200, "application/json; charset=utf-8",
        "{\"status\":\"error\",\"message\":\"" + jsonEscape(regErr) + "\"}");
    }
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

// Scans nearby WiFi networks and returns them as JSON (used by the captive portal)
void handleScan() {
  Serial.println("[FW] /scan requested");
  WiFi.mode(WIFI_AP_STA); // STA interface required to scan while SoftAP is running
  int n = WiFi.scanNetworks();
  Serial.printf("[FW] Scan found %d networks\n", n);
  String json = "[";
  int included = 0;
  for (int i = 0; i < n && included < 25; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) continue;
    // Skip duplicate SSIDs (multiple APs broadcasting the same network)
    bool dup = false;
    for (int k = 0; k < i; k++) {
      if (WiFi.SSID(k) == ssid) { dup = true; break; }
    }
    if (dup) continue;
    String esc = ssid;
    esc.replace("\\", "\\\\");
    esc.replace("\"", "\\\"");
    if (included > 0) json += ",";
    json += "{\"ssid\":\"" + esc + "\",\"rssi\":" + String(WiFi.RSSI(i)) + ",\"secure\":";
    json += (WiFi.encryptionType(i) != WIFI_AUTH_OPEN) ? "true" : "false";
    json += "}";
    included++;
  }
  json += "]";
  WiFi.scanDelete();
  server.send(200, "application/json; charset=utf-8", json);
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

  if (!http.begin(*client, LOCATIONS_URL)) {
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

  if (!http.begin(*client, DEVICES_URL)) {
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

  if (avg_co2 == -1 && avg_pm25 == -1 && avg_pm10 == -1) {
    Serial.println("[FW] No valid sensor data to send");
    return;
  }

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
      // No connection: enqueue the reading so it is sent when WiFi returns
      Serial.println("[FW] Reconnect failed - enqueueing payload for later retry");
      if (!enqueuePayload(payload)) {
        Serial.println("[FW] Failed to enqueue payload (no WiFi)");
      } else {
        Serial.println("[FW] Payload enqueued due to WiFi loss");
        // Single quick blink to indicate queued
        digitalWrite(LED_OK, HIGH); delay(150); digitalWrite(LED_OK, LOW);
      }
      return;
    }
    Serial.println("[FW] Reconnected");
  }

  WiFiClientSecure *client = new WiFiClientSecure();
  client->setInsecure();
  HTTPClient http;

  if (!http.begin(*client, SENSOR_DATA_URL)) {
    Serial.println("[FW] http.begin failed for sensordata");
    delete client;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (ensureKcToken()) {
    http.addHeader("Authorization", "Bearer " + kcAccessToken);
  }
  http.setTimeout(15000);

  Serial.println("[FW] POST sensordata: " + payload);
  int code = http.POST(payload);
  Serial.printf("[FW] POST sensordata -> %d\n", code);

  if (code >= 200 && code < 300) {
    // 2xx: Success
    Serial.println("[FW] Data sent OK (2xx)");
    // Two short blinks to indicate success
    digitalWrite(LED_OK, HIGH); delay(150); digitalWrite(LED_OK, LOW); delay(100);
    digitalWrite(LED_OK, HIGH); delay(150); digitalWrite(LED_OK, LOW);
    // On success, attempt to drain any queued payloads
    if (LittleFS.begin()) {
      drainQueueBulk();
    }

  } else if (code == 410) {
    // 410: Gone - device was archived ("moved") on backend -> return to provisioning
    Serial.println("[FW] Server returned 410 Gone - device archived, clearing credentials and returning to portal");
    http.end();
    delete client;
    delay(200);
    clearProvisionPrefsAndRestart();

  } else if (code == 401) {
    // 401: Unauthorized - Keycloak token may be expired or missing
    Serial.println("[FW] Server returned 401 Unauthorized - restarting to re-validate credentials");
    http.end();
    delete client;
    delay(200);
    ESP.restart();

  } else if (code == 400 || code == 403 || code == 404 || code == 422) {
    // 4xx client errors that are likely permanent for this payload
    Serial.println("[FW] Permanent client error (4xx): " + String(code));
    // TODO: decide whether to drop or mark payload as invalid

  } else if (code > 0) {
    // 5xx or other server-side responses
    Serial.println("[FW] Server error or unexpected response: " + String(code));
    Serial.println("[FW] Server: " + http.getString());
    // Enqueue payload for later retry
    if (!enqueuePayload(payload)) {
      Serial.println("[FW] Failed to enqueue payload");
    } else {
      Serial.println("[FW] Payload enqueued for retry");
      // Single quick blink to indicate queued
      digitalWrite(LED_OK, HIGH); delay(150); digitalWrite(LED_OK, LOW);
    }

  } else {
    // Network-level error (no HTTP response / connection failure)
    Serial.printf("[FW] POST error: %d\n", code);
    Serial.println("[FW] Network error - enqueue for retry");
    if (!enqueuePayload(payload)) {
      Serial.println("[FW] Failed to enqueue payload (network error)");
    } else {
      Serial.println("[FW] Payload enqueued due to network error");
      // Single quick blink to indicate queued
      digitalWrite(LED_OK, HIGH); delay(150); digitalWrite(LED_OK, LOW);
    }
  }

  http.end();
  delete client;
}

// =====================================================================
// Sensor hardware init
// =====================================================================

void initSensors() {
  Serial.println("[FW] Initializing sensors...");

  // Start PMS UART
  pmsSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pmsSerial.setTimeout(50);
  Serial.println("[FW] PMS7003 UART ready (starting warm-up)");

  // Start I2C for SCD30
  Wire.begin();

  // --- Attempt to detect SCD30 within a timeout window ---
  unsigned long scdStart = millis();
  bool scdDetected = false;
  int scdAttempts = 0;

  while ((millis() - scdStart) < SCD30_DETECT_TIMEOUT_MS) {
    scdAttempts++;
    Serial.printf("[FW] SCD30 detection attempt %d\n", scdAttempts);
    if (airSensor.begin()) {
      scdDetected = true;
      Serial.println("[FW] SCD30 detected (begin returned true)");
      break;
    }   

    // Wait before retrying (non-blocking-ish)
    unsigned long waitUntil = millis() + SENSOR_DETECT_RETRY_INTERVAL_MS;
    while (millis() < waitUntil) {
      delay(50);
    }

    scdAttempts++;
    if (scdAttempts >= SENSOR_DETECT_MAX_ATTEMPTS && (millis() - scdStart) < SCD30_DETECT_TIMEOUT_MS) {
      // Keep looping until timeout but cap rapid-looping via attempts counter
      scdAttempts = 0;
    }
  }

  if (!scdDetected) {
    Serial.println("[FW] SCD30 not detected within timeout, continuing without CO2 readings (will retry periodically)");    
  } else {
    // Give sensor some stabilization time before trusting readings
    Serial.printf("[FW] Waiting %lu ms for SCD30 stabilization...\n", SCD30_STABILIZE_MS);
    unsigned long stabUntil = millis() + SCD30_STABILIZE_MS;
    while (millis() < stabUntil) { delay(200); }
    Serial.println("[FW] SCD30 ready");
  }

  // --- PMS7003 warmup: allow sensor to spin and produce valid frames ---
  Serial.printf("[FW] PMS7003 warmup: waiting %lu ms\n", PMS7003_WARMUP_MS);
  unsigned long pmsUntil = millis() + PMS7003_WARMUP_MS;
  while (millis() < pmsUntil) {
    // if bytes appear that look like PMS frame, we can break early
    if (pmsSerial.available() >= 32) break;
    // blink to show warmup
    digitalWrite(LED_OK, HIGH); delay(150);
    digitalWrite(LED_OK, LOW);  delay(150);
  }
  Serial.println("[FW] PMS7003 warm-up phase complete (or early data detected)");

  // Initialize reading buffers
  for (int i = 0; i < 3; i++) {
    readings_pm25[i] = readings_pm10[i] = -1;
    readings_temperature[i] = readings_humidity[i] = readings_co2[i] = -1;
    readings_co[i] = readings_no2[i] = readings_nh3[i] = -1;
  }

  // Note: we don't block forever if SCD30 not present; runtime will attempt reads periodically
}

// ================= Queue persistence (LittleFS) =====================
// Helpers for persisted queue count stored in NVS (Preferences)
int computeQueueCountFromFile() {
  int cnt = 0;
  if (!LittleFS.exists("/queue.log")) return 0;
  File f = LittleFS.open("/queue.log", "r");
  if (!f) return 0;
  while (f.available()) {
    String l = f.readStringUntil('\n');
    l.trim();
    if (l.length() == 0) continue;
    if (l.indexOf('{') >= 0 && l.indexOf('}') >= 0) cnt++;
  }
  f.close();
  return cnt;
}

int getQueueCount() {
  prefs.begin(PREF_NS, true);
  int c = prefs.getInt(KEY_QUEUE_COUNT, -1);
  prefs.end();
  if (c >= 0) return c;
  // fallback: compute from file and persist
  if (!LittleFS.begin()) return 0;
  int computed = computeQueueCountFromFile();
  prefs.begin(PREF_NS, false);
  prefs.putInt(KEY_QUEUE_COUNT, computed);
  prefs.end();
  return computed;
}

void setQueueCount(int v) {
  prefs.begin(PREF_NS, false);
  prefs.putInt(KEY_QUEUE_COUNT, v);
  prefs.end();
}

void incrementQueueCount() {
  int c = getQueueCount();
  c++;
  setQueueCount(c);
}

void decrementQueueCountBy(int n) {
  if (n <= 0) return;
  int c = getQueueCount();
  c -= n;
  if (c < 0) c = 0;
  setQueueCount(c);
}

bool enqueuePayload(const String &payload) {
  // Basic validation: don't enqueue empty or obviously-broken payloads
  String p = payload;
  p.trim();
  if (p.length() == 0) {
    Serial.println("[FW] enqueuePayload: rejecting empty payload (not saved)");
    return false;
  }
  // Expect a JSON object with at least braces
  if (p.indexOf('{') < 0 || p.indexOf('}') < 0) {
    Serial.println("[FW] enqueuePayload: rejecting non-json payload (not saved)");
    return false;
  }
  if (!LittleFS.exists("/")) {
    // LittleFS not mounted or unavailable
    if (!LittleFS.begin()) return false;
  }
  // Check local queue capacity before appending
  int qcount = getQueueCount();
  if (qcount >= MAX_LOCAL_RECORDS) {
    Serial.printf("[FW] enqueuePayload: queue at max capacity (%d) - skipping persist\n", qcount);
    return false;
  }

  File f = LittleFS.open("/queue.log", FILE_APPEND);
  if (!f) return false;
  bool ok = f.println(payload);
  f.close();
  if (ok) {
    incrementQueueCount();
  }
  return ok;
}

// Bulk drain parameters
const int BULK_TARGET = 200;             // initial target records per batch
const size_t BULK_MAX_BYTES = 60 * 1024; // max aggregated payload bytes (safety)
const size_t BULK_MIN_HEAP = 100 * 1024; // minimum free heap required to attempt batch assemble
const int BULK_MIN_BATCH = 10;           // minimum acceptable batch size

// Drain queue in bulk: build a JSON array of up to 'target' records and POST to /sensordata/bulk
void drainQueueBulk() {
  if (!LittleFS.exists("/queue.log")) {
    Serial.println("[FW][BULK] No /queue.log found, nothing to do");
    return;
  }

  Serial.printf("[FW][BULK] Starting bulk drain, freeHeap=%u\n", ESP.getFreeHeap());

  // Try decreasing batch sizes on failure (halve strategy)
  int attemptTarget = BULK_TARGET;
  while (attemptTarget >= BULK_MIN_BATCH) {
    Serial.printf("[FW][BULK] Attempting batch with target=%d\n", attemptTarget);

    File f = LittleFS.open("/queue.log", "r");
    if (!f) {
      Serial.println("[FW][BULK] Failed to open /queue.log for reading");
      return;
    }
    
    // Check if file is empty
    if (f.size() == 0) {
      Serial.println("[FW][BULK] Queue file is empty — exiting bulk drain");
      f.close();
      return;
    }

    // Build JSON array incrementally
    String batch = "[";
    size_t batchBytes = 1; // '['
    int linesIncluded = 0;
    unsigned long lineNo = 0;
    int consumedLines = 0; // physical lines read from file during this build

    while (f.available() && linesIncluded < attemptTarget) {
      String line = f.readStringUntil('\n');
      lineNo++;
      consumedLines++;
      String t = line;
      t.trim();
      if (t.length() == 0) {
        Serial.printf("[FW][BULK] Skipping empty/corrupt entry at line %lu\n", lineNo);
        continue;
      }
      if (t.indexOf('{') < 0 || t.indexOf('}') < 0) {
        Serial.printf("[FW][BULK] Skipping non-json entry at line %lu\n", lineNo);
        continue;
      }

      // If this isn't the first included, account for comma
      size_t added = t.length() + (linesIncluded > 0 ? 1 : 0);

      // Check byte limit
      if (batchBytes + added > BULK_MAX_BYTES) {
        Serial.printf("[FW][BULK] Reached BULK_MAX_BYTES after %d lines (bytes=%u)\n", linesIncluded, (unsigned)batchBytes);
        break;
      }

      // Check heap safety while building
      if (ESP.getFreeHeap() < BULK_MIN_HEAP) {
        Serial.printf("[FW][BULK] Low heap while building batch: freeHeap=%u, stopping at %d lines\n", ESP.getFreeHeap(), linesIncluded);
        break;
      }

      if (linesIncluded > 0) batch += ',';
      batch += t;
      batchBytes += added;
      linesIncluded++;
      if ((linesIncluded & 0x3F) == 0) {
        // Occasionally log progress for large batches
        Serial.printf("[FW][BULK] Building batch: lines=%d bytes=%u freeHeap=%u\n", linesIncluded, (unsigned)batchBytes, ESP.getFreeHeap());
      }
    }

    f.close();

    if (linesIncluded == 0) {
      Serial.println("[FW][BULK] No valid lines to include in batch for this target");
      // If nothing included at this target, halve and retry until min
      attemptTarget = max(BULK_MIN_BATCH, attemptTarget / 2);
      if (attemptTarget == BULK_MIN_BATCH) break;
      continue;
    }

    batch += "]";

    Serial.printf("[FW][BULK] Prepared batch lines=%d bytes=%u freeHeapBeforeSend=%u\n", linesIncluded, (unsigned)batch.length(), ESP.getFreeHeap());

    // Attempt HTTP POST to bulk endpoint
    String bulkUrl = String(SENSOR_DATA_URL) + "/bulk";
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient httpb;

    if (!httpb.begin(client, bulkUrl)) {
      Serial.println("[FW][BULK] http.begin failed for bulk endpoint - will not remove items");
      return; // keep queue intact
    }
    httpb.addHeader("Content-Type", "application/json");
    if (ensureKcToken()) httpb.addHeader("Authorization", "Bearer " + kcAccessToken);
    httpb.setTimeout(20000);

    int code = httpb.POST(batch);
    Serial.printf("[FW][BULK] Bulk POST -> %d\n", code);
    String resp = "";
    if (code > 0) resp = httpb.getString();
    if (code >= 200 && code < 300) {
      Serial.println("[FW][BULK] Bulk POST success — removing sent lines from queue");
      httpb.end();

      // Now remove the sent lines from /queue.log by writing the remaining to /queue.tmp
      File src = LittleFS.open("/queue.log", "r");
      if (!src) {
        Serial.println("[FW][BULK] ERROR: could not reopen /queue.log to trim");
        return;
      }
      File tmp = LittleFS.open("/queue.tmp", FILE_WRITE);
      if (!tmp) {
        Serial.println("[FW][BULK] ERROR: could not create /queue.tmp — abort trimming (queue left intact)");
        src.close();
        return;
      }

      int skipped = 0;
      Serial.printf("[FW][BULK] Trimming: consumedLines=%d linesIncluded=%d\n", consumedLines, linesIncluded);
      while (src.available()) {
        String l = src.readStringUntil('\n');
        if (skipped < consumedLines) {
          skipped++;
          continue;
        }
        tmp.println(l);
      }
      src.close();
      tmp.close();

      // Replace queue.log atomically
      LittleFS.remove("/queue.log");
      if (LittleFS.exists("/queue.tmp")) {
        LittleFS.rename("/queue.tmp", "/queue.log");
      }
      
      // Check if resulting queue.log is empty and clean it up
      bool queueRemains = false;
      if (LittleFS.exists("/queue.log")) {
        File qcheck = LittleFS.open("/queue.log", "r");
        if (qcheck) {
          size_t sz = qcheck.size();
          qcheck.close();
          if (sz > 0) {
            queueRemains = true;
          } else {
            Serial.println("[FW][BULK] Queue file exists but is empty — deleting it");
            LittleFS.remove("/queue.log");
          }
        }
      }
      
      Serial.printf("[FW][BULK] Trimmed queue: removed=%d remaining=%s\n", skipped, queueRemains ? "yes" : "no");
      // Update persisted queue counter
      if (skipped > 0) {
        decrementQueueCountBy(skipped);
      }
      Serial.printf("[FW][BULK] freeHeapAfterTrim=%u\n", ESP.getFreeHeap());

      // After successful send, attempt to send more if queue remains
      if (queueRemains) {
        Serial.println("[FW][BULK] More entries remain in queue — continuing bulk drain");
        // keep same target (attemptTarget) for next round
        continue;
      } else {
        Serial.println("[FW][BULK] Queue is now empty after bulk drain");
        return;
      }
    } else {
      Serial.printf("[FW][BULK] Bulk POST failed code=%d response='%s'\n", code, resp.c_str());
      httpb.end();
      // 410 Gone: device was archived ("moved") on backend -> return to provisioning
      if (code == 410) {
        Serial.println("[FW][BULK] Device archived (410 Gone) — clearing credentials and returning to portal");
        clearProvisionPrefsAndRestart();
        return; // unreachable, device restarts
      }
      // If server indicates payload too large (413) or similar client rejection, reduce target and retry
      if (code == 413 || code == 400) {
        int prev = attemptTarget;
        attemptTarget = max(BULK_MIN_BATCH, attemptTarget / 2);
        if (attemptTarget == prev) {
          Serial.println("[FW][BULK] Already at min target, aborting bulk drain attempt");
          return;
        }
        Serial.printf("[FW][BULK] Reducing target to %d and retrying\n", attemptTarget);
        // loop will retry with smaller attemptTarget
        continue;
      }

      // For 5xx or network errors, preserve queue and stop trying now
      Serial.println("[FW][BULK] Server/network error — preserving queue and aborting bulk drain");
      return;
    }
  }

  Serial.println("[FW][BULK] Exiting bulk drain (no further action)");
}

// Drain queue: stream entries from disk, send line-by-line and compact incrementally.
// This avoids loading the whole queue into RAM which can cause OOM during TLS operations.
void drainQueue() {
  if (!LittleFS.exists("/queue.log")) return;
  File f = LittleFS.open("/queue.log", "r");
  if (!f) return;

  Serial.printf("[FW] drainQueue start, freeHeap=%u\n", ESP.getFreeHeap());

  File out; // /queue.tmp when needed
  bool outOpened = false;
  unsigned long lineNo = 0;
  int sentCount = 0; // number of lines successfully sent and thus removed from queue

  while (f.available()) {
    String line = f.readStringUntil('\n');
    lineNo++;

    String t = line;
    t.trim();
    if (t.length() == 0) {
      Serial.printf("[FW] Drain skipping empty/corrupt entry at line %lu\n", lineNo);
      continue; // drop empty entry
    }
    if (t.indexOf('{') < 0 || t.indexOf('}') < 0) {
      Serial.printf("[FW] Drain skipping non-json entry at line %lu\n", lineNo);
      int maxDump = min((int)t.length(), 64);
      String hx = "";
      for (int _k = 0; _k < maxDump; _k++) {
        char c = t.charAt(_k);
        char buf[4];
        snprintf(buf, sizeof(buf), "%02X", (uint8_t)c);
        hx += buf;
        if ((_k & 0x0F) == 0x0F) hx += ' ';
      }
      Serial.println("[FW] Drain preview hex: " + hx);
      continue; // drop invalid entry
    }

    Serial.printf("[FW] Drain sending line %lu len=%u freeHeap=%u\n", lineNo, (unsigned)t.length(), ESP.getFreeHeap());

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient httpq;

    if (!httpq.begin(client, SENSOR_DATA_URL)) {
      Serial.println("[FW] Drain http.begin failed - preserving remaining entries");
      // open tmp and preserve current + remaining
      if (!outOpened) {
        out = LittleFS.open("/queue.tmp", FILE_WRITE);
        outOpened = (bool)out;
      }
      if (outOpened) out.println(line);
      // copy rest of file as-is
      while (f.available()) {
        String rem = f.readStringUntil('\n');
        if (outOpened) out.println(rem);
      }
      break;
    }

    httpq.addHeader("Content-Type", "application/json");
    if (ensureKcToken()) httpq.addHeader("Authorization", "Bearer " + kcAccessToken);
    httpq.setTimeout(10000);

    int code = httpq.POST(line);
    Serial.printf("[FW] Drain POST -> %d\n", code);
    if (code >= 200 && code < 300) {
      httpq.end();
      // sent OK, continue to next line
      sentCount++;
      continue;
    } else {
      if (code > 0) {
        String resp = httpq.getString();
        Serial.println("[FW] Drain server response: " + resp);
      } else {
        Serial.printf("[FW] Drain POST error: %d\n", code);
      }
      httpq.end();
      // on first failure, preserve this line and the rest to /queue.tmp
      if (!outOpened) {
        out = LittleFS.open("/queue.tmp", FILE_WRITE);
        outOpened = (bool)out;
      }
      if (outOpened) out.println(line);
      while (f.available()) {
        String rem = f.readStringUntil('\n');
        if (outOpened) out.println(rem);
      }
      break;
    }
  }

  f.close();

  if (outOpened) {
    out.close();
    // replace queue.log atomically with tmp
    LittleFS.remove("/queue.log");
    LittleFS.rename("/queue.tmp", "/queue.log");
    Serial.println("[FW] drainQueue: remaining entries preserved to /queue.log");
    if (sentCount > 0) decrementQueueCountBy(sentCount);
  } else {
    // no remaining entries, remove queue
    if (LittleFS.exists("/queue.log")) {
      LittleFS.remove("/queue.log");
    }
    Serial.println("[FW] drainQueue: all queued entries sent (queue cleared)");
    // reset persisted counter
    setQueueCount(0);
  }

  Serial.printf("[FW] drainQueue end, freeHeap=%u\n", ESP.getFreeHeap());
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
  server.on("/scan", HTTP_GET, handleScan);
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
  // Initialize LittleFS for local queue persistence
  if (!LittleFS.begin()) {
    Serial.println("[FW] LittleFS mount failed - attempting format (will erase existing files)");
    // Attempt one-time format to recover from corruption
    if (LittleFS.format()) {
      Serial.println("[FW] LittleFS formatted, retrying mount...");
      if (LittleFS.begin()) {
        Serial.println("[FW] LittleFS mounted after format");
      } else {
        Serial.println("[FW] LittleFS mount failed even after format");
      }
    } else {
      Serial.println("[FW] LittleFS format failed");
    }
  } else {
    Serial.println("[FW] LittleFS mounted");
  }
  Serial.println("========================================");
  Serial.printf("=== MOVE Sensor firmware v%s ===\n", FIRMWARE_VERSION);
  Serial.println("========================================\n");

  pinMode(LED_OK, OUTPUT);
  digitalWrite(LED_OK, LOW);
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