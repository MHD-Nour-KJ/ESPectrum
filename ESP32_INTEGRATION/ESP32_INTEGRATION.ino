/**
 * ESPectrum - Arduino/ESP32 Integration Example
 * Complete working example for ESP32 WebSocket server
 */
#include <ESPmDNS.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "NourKH";
const char* password = "NOURKH0933508762";

// Web server on port 80, WebSocket on port 81
WebServer server(80);
WebSocketsServer webSocket(81);

// Timing
unsigned long lastSensorUpdate = 0;
const unsigned long sensorInterval = 500; // 500ms

void setup() {
  Serial.begin(115200);
  MDNS.begin("espectrum");
  // Initialize SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed");
    return;
  }
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Configure web server routes
  setupWebServer();
  
  // Start servers
  server.begin();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("ESPectrum ready!");
  Serial.println("Open browser: http://" + WiFi.localIP().toString());
}

void loop() {
  webSocket.loop();
  server.handleClient();
  
  // Send sensor data at interval
  if (millis() - lastSensorUpdate >= sensorInterval) {
    lastSensorUpdate = millis();
    sendSensorData();
  }
}

/**
 * Setup web server routes
 */
void setupWebServer() {
  // Serve index.html
  server.on("/", HTTP_GET, []() {
    serveFile("/index.html", "text/html");
  });
  
  // Serve CSS files
  server.on("/styles-global.css", HTTP_GET, []() {
    serveFile("/styles-global.css", "text/css");
  });
  
  server.on("/styles-animations.css", HTTP_GET, []() {
    serveFile("/styles-animations.css", "text/css");
  });
  
  server.on("/styles-responsive.css", HTTP_GET, []() {
    serveFile("/styles-responsive.css", "text/css");
  });
  
  // Serve JavaScript files
  server.on("/app-main.js", HTTP_GET, []() {
    serveFile("/app-main.js", "application/javascript");
  });
  
  server.on("/app-router.js", HTTP_GET, []() {
    serveFile("/app-router.js", "application/javascript");
  });
  
  server.on("/app-store.js", HTTP_GET, []() {
    serveFile("/app-store.js", "application/javascript");
  });
  
  // Add routes for all other JS files...
  // (service-*, ui-*, page-*, chart-*, widget-*, utils-*)
  
  // Catch-all for JS files
  server.onNotFound([]() {
    String path = server.uri();
    if (path.endsWith(".js")) {
      serveFile(path, "application/javascript");
    } else {
      server.send(404, "text/plain", "Not Found");
    }
  });
}

/**
 * Serve file from SPIFFS
 */
void serveFile(String path, String contentType) {
  File file = SPIFFS.open(path, "r");
  
  if (!file) {
    server.send(404, "text/plain", "File Not Found: " + path);
    return;
  }
  
  server.streamFile(file, contentType);
  file.close();
}

/**
 * WebSocket event handler
 */
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected\n", num);
      break;
      
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %s\n", num, ip.toString().c_str());
      break;
    }
      
    case WStype_TEXT: {
      Serial.printf("[%u] Received: %s\n", num, payload);
      handleCommand(num, (char*)payload);
      break;
    }
  }
}

/**
 * Handle commands from browser
 */
void handleCommand(uint8_t clientNum, char* payload) {
  // Parse JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.println("JSON parse failed");
    return;
  }
  
  const char* type = doc["type"];
  const char* action = doc["action"];
  
  // Handle deep sleep command
  if (strcmp(type, "command") == 0 && strcmp(action, "deep_sleep") == 0) {
    int duration = doc["params"]["duration"];
    
    Serial.printf("Going to deep sleep for %d seconds\n", duration);
    
    // Send acknowledgment
    sendSystemEvent("sleep", duration);
    
    delay(100); // Let message send
    
    // Enter deep sleep
    esp_sleep_enable_timer_wakeup(duration * 1000000ULL); // Convert to microseconds
    esp_deep_sleep_start();
  }
}

/**
 * Send sensor data to all connected clients
 */
void sendSensorData() {
  StaticJsonDocument<512> doc;
  
  doc["type"] = "sensor_data";
  doc["timestamp"] = millis() / 1000;
  
  // Touch pins (10 channels)
  JsonArray touch = doc["data"].createNestedArray("touch");
  for (int i = 0; i < 10; i++) {
    // Read touch pin if available (T0-T9 map to GPIO4, 0, 2, 15, 13, 12, 14, 27, 33, 32)
    uint8_t touchPins[] = {4, 0, 2, 15, 13, 12, 14, 27, 33, 32};
    if (i < sizeof(touchPins)) {
      touch.add(touchRead(touchPins[i]));
    } else {
      touch.add(0);
    }
  }
  
  // Hall sensor
  doc["data"]["hall"] = hallRead();
  
  // Internal temperature (if supported)
  #ifdef SOC_TEMP_SENSOR_SUPPORTED
    doc["data"]["temp"] = temperatureRead();
  #else
    doc["data"]["temp"] = random(35, 50); // Simulated for boards without temp sensor
  #endif
  
  // Uptime
  doc["data"]["uptime"] = millis() / 1000;
  
  // Serialize and send
  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

/**
 * Send system event
 */
void sendSystemEvent(const char* event, int value) {
  StaticJsonDocument<256> doc;
  
  doc["type"] = "system_event";
  doc["event"] = event;
  doc["data"]["value"] = value;
  
  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

/**
 * Optional: Handle wake-up from deep sleep
 */
void setup_wakeup_handler() {
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  
  if (wakeup_reason != ESP_SLEEP_WAKEUP_UNDEFINED) {
    // Send wake-up event after reconnecting
    delay(2000); // Wait for WiFi
    
    StaticJsonDocument<256> doc;
    doc["type"] = "system_event";
    doc["event"] = "wakeup";
    doc["data"]["sleep_duration"] = 30; // You'd need to store this before sleeping
    doc["data"]["wakeup_reason"] = "timer";
    
    String output;
    serializeJson(doc, output);
    webSocket.broadcastTXT(output);
  }
}
