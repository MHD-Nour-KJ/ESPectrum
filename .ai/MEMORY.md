# Project Memory: ESPectrum JS

## Overview
ESPectrum is a vanilla JS command center for ESP32 hardware, visualization, and hacking tools. It uses a custom SPA architecture (hash-based routing) and MQTT for real-time communication.

## Architecture

### Core Components
- **`app-main.js`**: Bootstrap. inits UI (Header, Drawer, Footer, Background), Router, and MQTT.
- **`app-store.js`**: Central State Management (Pub/Sub).
  - **State**: `connected`, `sensorData` (touch, hall, temp, rssi), `systemStatus`, `preferences` (theme), `ui` (drawerOpen).
  - **Pattern**: `store.dispatch(action, updates)` -> updates state -> notifies subscribers.
- **`service-socket.js`**: MQTT Service (Flespi Broker).
  - **Topics**: `espectrum/data`, `espectrum/telemetry`, `espectrum/chat`, `espectrum/command`.
  - **Mock Mode**: Auto-enables on connection failure, generates fake sensor data.
- **`app-router.js`**: Hash-based router (`/#/path`). Handles page lifecycle (`render`, `cleanup`).

### File Structure Map
- **`.`**: Core logic (`app-*.js`, `service-*.js`) and Pages (`page-*.js`).
- **`ui-*.js`**: Global UI components (Header, Drawer, Background).
- **`widget-*.js`**: Reusable widgets (Charts, Sensors).
- **`js/`**: (Legacy/Static) data files.

## Key Pages & Routes
- **`/`**: Home (Landing).
- **`/dashboard`**: Main visualizer.
- **`/terminal`**: Serial/MQTT command interface.
- **`/wifi-*`**: WiFi Tools (Scanner, Sonar, Traffic).
- **`/attack-*`**: Hacker Tools (RickRoll, EvilTwin, SourApple).
- **`/files`**, **`/editor`**: File system tools.
- **`/ble-*`**, **`/ir-remote`**: Hardware tools.

## Development & Debug
- **Global Objects**: `window.store`, `window.router`, `window.wsService`, `window.App`.
- **Debug Flag**: Set `window.ESPECTRUM_DEBUG = true` for verbose logs.
- **Conventions**:
  - **CSS**: Plain CSS variables in `styles-global.css`.
  - **Icons**: Phosphor Icons (`ph-*`).
  - **Classes**: `glass-card`, `btn-primary`, `flex-between`.

## Rules
- **No Build Step**: Pure ES modules. Browser native.
- **Absolute Paths**: Always use absolute paths for tool calls.
