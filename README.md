# ESPectrum - ESP32 Hardware Visualizer

**A stunning, glassmorphism-themed Single Page Application designed to run directly on ESP32 microcontroller filesystem.**

## 🌟 Overview

ESPectrum is a high-performance web interface that showcases ESP32's hardware capabilities through beautiful real-time visualizations. Built with vanilla JavaScript, it runs entirely in the browser without any build tools, making it perfect for embedded deployment.

## ✨ Features

### 🎨 Premium UI/UX
- **Glassmorphism Design**: Modern glass-morphic cards with blur effects and gradients
- **Animated Background**: Slowly moving gradient orbs created with Canvas
- **Responsive Layout**: Mobile-first design that adapts from 320px to 4K displays
- **Smooth Animations**: Micro-interactions, transitions, and loading states
- **Haptic Feedback**: Vibration support for mobile devices

### 📊 Hardware Visualizations

#### 1. Touch Pin Sensors (10 channels)
- Real-time vertical bar chart for all 10 capacitive touch pins
- Glowing effect when a pin detects touch
- Value range: 0-1023

#### 2. Hall Effect Sensor
- Live line chart showing magnetic field strength
- Range: -128 to 127
- 50-point rolling history

#### 3. Internal Temperature
- Radial gauge displaying chip temperature in Celsius
- Color-coded zones (green/orange/red)
- Dynamic updates

#### 4. Deep Sleep Controller
- Send ESP32 to deep sleep with configurable duration
- WebSocket disconnection detection
- Wake-up report with sleep duration and reason

### 🔧 Developer Tools

#### WebSocket Terminal
- Real-time JSON message viewer
- Syntax highlighting (keys, strings, numbers, booleans)
- Pause/Clear/Copy functionality
- Auto-scroll with message history

## 📁 File Structure

All files reside in a **flat directory structure** (no subfolders) for ESP32 SPIFFS/LittleFS compatibility:

```
ESPectrum_js/
├── index.html                    # Entry point
│
├── styles-global.css             # Design system & glassmorphism
├── styles-animations.css         # Keyframe animations
├── styles-responsive.css         # Media queries
│
├── app-main.js                   # Application bootstrap
├── app-router.js                 # Vanilla JS SPA router
├── app-store.js                  # Pub/Sub state management
│
├── service-socket.js             # WebSocket + Mock mode
├── service-storage.js            # localStorage abstraction
│
├── ui-header.js                  # Floating glass header
├── ui-drawer.js                  # Off-canvas navigation
├── ui-skeleton.js                # Loading placeholders
├── ui-card.js                    # Reusable card component
├── ui-background.js              # Animated canvas background
│
├── page-home.js                  # Landing page
├── page-dashboard.js             # Hardware dashboard
├── page-terminal.js              # Developer console
│
├── chart-line.js                 # Chart.js line wrapper
├── chart-radial.js               # Chart.js radial gauge
│
├── widget-touchpins.js           # Touch sensor visualizer
├── widget-hallsensor.js          # Hall sensor chart
├── widget-temperature.js         # Temperature gauge
├── widget-sleep.js               # Deep sleep controller
│
└── utils-helpers.js              # Utility functions
```

**Total: 24 files**

## 🔌 WebSocket Protocol

### ESP32 → Browser (Sensor Data)

```json
{
  "type": "sensor_data",
  "timestamp": 1704380291,
  "data": {
    "touch": [120, 45, 890, 12, 0, 0, 0, 0, 0, 0],
    "hall": -23,
    "temp": 42.5,
    "uptime": 3600
  }
}
```

### ESP32 → Browser (System Event)

```json
{
  "type": "system_event",
  "event": "wakeup",
  "data": {
    "sleep_duration": 30,
    "wakeup_reason": "timer"
  }
}
```

### Browser → ESP32 (Command)

```json
{
  "type": "command",
  "action": "deep_sleep",
  "params": {
    "duration": 30
  }
}
```

### WebSocket Configuration

- **Endpoint**: `ws://<ESP32_IP>:81/ws`
- **Auto-reconnection**: Up to 5 attempts with exponential backoff
- **Mock Mode**: Automatically enables if connection fails (for offline testing)

## 🚀 Quick Start

### Option 1: Test Locally (Mock Mode)

1. Open `index.html` directly in a modern browser
2. Mock mode will activate automatically, generating simulated sensor data
3. No server required!

### Option 2: Deploy to ESP32

#### Prerequisites
- ESP32 board (any variant)
- Arduino IDE with ESP32 board support
- SPIFFS or LittleFS filesystem

#### Steps

1. **Upload Files to ESP32**:
   ```cpp
   // Use Arduino IDE's "ESP32 Sketch Data Upload" tool
   // Or use PlatformIO's filesystem upload
   ```

2. **Configure WebSocket Server** (Arduino sketch):
   ```cpp
   #include <WebServer.h>
   #include <WebSocketsServer.h>
   
   WebServer server(80);
   WebSocketsServer webSocket(81);
   
   void setup() {
     // Initialize SPIFFS
     SPIFFS.begin();
     
     // Serve index.html
     server.on("/", []() {
       File file = SPIFFS.open("/index.html", "r");
       server.streamFile(file, "text/html");
       file.close();
     });
     
     // Start servers
     server.begin();
     webSocket.begin();
   }
   
   void loop() {
     webSocket.loop();
     server.handleClient();
     
     // Send sensor data every 500ms
     if (millis() % 500 == 0) {
       String json = createSensorJSON();
       webSocket.broadcastTXT(json);
     }
   }
   ```

3. **Access the Interface**:
   - Find ESP32's IP address (check Serial Monitor)
   - Open browser: `http://<ESP32_IP>/`

## 🎓 Educational Value

ESPectrum is designed for learning:

- **WebSocket Communication**: See real-time data flow in the terminal
- **State Management**: Understand pub/sub patterns without frameworks
- **Vanilla JS Modules**: ES6 module system without build tools
- **Responsive Design**: Mobile-first CSS with glassmorphism
- **Hardware Integration**: Connect browser to microcontroller

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure |
| **CSS3** | Glassmorphism, Grid, Flexbox, Animations |
| **JavaScript ES6+** | Modules, Classes, Async/Await |
| **Chart.js** | Data visualization |
| **Phosphor Icons** | Icon library |
| **Anime.js** | Advanced animations (optional) |
| **WebSockets** | Real-time bidirectional communication |

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 (not supported - requires ES6 modules)

## 🎨 Design System

### Color Palette
```css
--color-primary: #684AFF
--color-secondary: #FFE14A
--color-accent: #FF864A
```

### Typography
- **Body/UI**: Inter (Google Fonts)
- **Code/Data**: JetBrains Mono (Google Fonts)

### Breakpoints
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

## 🐛 Debugging

Enable debug mode in browser console:

```javascript
window.ESPECTRUM_DEBUG = true;

// Useful commands
window.store.getState();              // View state
window.router.navigate('/dashboard'); // Navigate
window.wsService.send({ ... });       // Send WebSocket message
```

## 📝 Customization

### Change Colors

Edit `styles-global.css`:

```css
:root {
  --color-primary: #YOUR_COLOR;
  --color-secondary: #YOUR_COLOR;
}
```

### Adjust Chart History Length

Edit `app-store.js`:

```javascript
chartHistoryLength: 100,  // Default is 50
```

### Add New Sensor

1. Create widget in `widget-newsensor.js`
2. Import in `page-dashboard.js`
3. Add to JSON protocol specification

## 🔒 Performance

- **Bundle Size**: ~120KB (including all files)
- **Memory Usage**: <10MB RAM
- **FPS**: 60fps animations (throttled to 30fps for charts)
- **Network**: ~2KB/s WebSocket data (at 500ms intervals)

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🙏 Credits

Built with ❤️ for the ESP32 community.

- Design inspired by modern glassmorphism trends
- Icons by Phosphor Icons
- Charts by Chart.js

---

**Ready to unleash your ESP32?** 🚀

For questions or contributions, check the code comments - they're extensive!
