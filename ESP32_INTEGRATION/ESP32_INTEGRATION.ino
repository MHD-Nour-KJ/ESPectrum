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

// ================= CONFIGURATION =================
const char* ssid     = "NourKH";
const char* password = "NOURKH0933508762";

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
unsigned long lastPacketSent = 0;
const int packetInterval = 100; // Send max 1 packet per 100ms via MQTT

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

  if (error || String(topic) == topic_chat) return;

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
    WiFi.softAP("Generic Free WiFi");
    dnsServer.start(53, "*", WiFi.softAPIP());
    webServer.begin();
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
  Serial.println("Scanning BLE...");
  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->clearResults();
  
  // Non-blocking start? No, we need results. 
  // We reuse 'start' blocking for 3 seconds (brief)
  pScan->start(3, false);
  
  NimBLEScanResults results = pScan->getResults();
  
  DynamicJsonDocument doc(4096);
  doc["type"] = "scan_result_ble";
  JsonArray array = doc.createNestedArray("devices");
  
  int count = results.getCount();
  if (count > 20) count = 20;

  for(int i=0; i<count; i++) {
    NimBLEAdvertisedDevice device = results.getDevice(i);
    JsonObject dev = array.createNestedObject();
    dev["name"] = device.getName().c_str();
    dev["addr"] = device.getAddress().toString().c_str();
    dev["rssi"] = device.getRSSI();
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

void performAttackLoop() {
  if (attackType == "rickroll") {
     // Simulate Rick Roll Beacon Flood
     // In real world: Construct raw beacon frames
     delay(10); 
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
  
  // Touch
  JsonArray touch = doc.createNestedArray("touch");
  int touchPins[] = {4, 0, 2, 15, 13, 12, 14, 27, 33, 32};
  for (int i = 0; i < 10; i++) {
    touch.add(touchRead(touchPins[i]));
  }
  
  // Hall (Classic ESP32 only check)
  #if defined(ESP32) && !defined(ARDUINO_ESP32S2_DEV) && !defined(ARDUINO_ESP32S3_DEV) && !defined(ARDUINO_ESP32C3_DEV)
    doc["hall"] = hallRead();
  #else
    doc["hall"] = 0;
  #endif

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

// ================= HELPER =================
void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESPectrum-" + String(random(0xffff), HEX);
    // Connect with Flespi Token as username
    if (client.connect(clientId.c_str(), mqtt_token, "")) {
      Serial.println("MQTT Connected");
      client.subscribe(topic_cmd);
      client.publish("espectrum/status", "{\"status\":\"online\"}");
    } else {
      delay(5000);
    }
  }
}
