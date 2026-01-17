/**
 * ESPectrum - Home/Landing Page
 * The "Guided Tour" Dashboard
 */

import { hapticFeedback } from './utils-helpers.js';

export default {
   async render(container) {
      container.innerHTML = `
      <div class="home-page">
        
        <!-- 1. HERO SECTION: The Mission -->
        <section class="hero-section text-center fade-in-up">
           <h1 class="hero-title" style="margin-top: 2rem;">ESPectrum</h1>
           <p class="hero-quote">
             "To explore the invisible world of signals, discover how devices talk, <br>
             and learn amazing things about the technology around us."
           </p>
           
           <div class="flex-center mt-lg">
             <a href="#/dashboard" class="btn btn-primary pulse" style="transform: scale(1.3); padding: 1rem 2.5rem; border-radius: 50px;">
               <i class="ph ph-rocket-launch"></i> Start Exploring
             </a>
           </div>
        </section>

        <!-- 2. GUIDED SECTIONS -->
        
        <!-- SECTION A: FILE SYSTEM (The Foundation) -->
        <section class="tour-section fade-in-up" style="animation-delay: 0.1s;">
            <div class="section-header">
                <div class="icon-badge"><i class="ph ph-hard-drives"></i></div>
                <div>
                   <h2>1. The Foundation</h2>
                   <p>Every computer needs storage. Manage your ESP32's files and code.</p>
                </div>
            </div>
            <div class="grid-dashboard">
                <a href="#/files" class="dashboard-card glass-card">
                   <i class="ph ph-folder-open card-icon text-primary"></i>
                   <div class="card-info">
                     <h3>File Explorer</h3>
                     <p>Upload & Download</p>
                   </div>
                </a>
                <a href="#/editor" class="dashboard-card glass-card">
                   <i class="ph ph-code card-icon text-primary"></i>
                   <div class="card-info">
                     <h3>Code Editor</h3>
                     <p>Config.json</p>
                   </div>
                </a>
            </div>
        </section>

        <!-- SECTION B: NETWORK ANALYSIS (Seeing the Invisible) -->
        <section class="tour-section fade-in-up" style="animation-delay: 0.2s;">
            <div class="section-header">
                <div class="icon-badge" style="color: var(--color-secondary);"><i class="ph ph-waves"></i></div>
                <div>
                   <h2>2. Network Analysis</h2>
                   <p>Visualize the WiFi signals filling the air around you.</p>
                </div>
            </div>
            <div class="grid-dashboard">
                <a href="#/wifi-scanner" class="dashboard-card glass-card">
                   <i class="ph ph-radar card-icon text-secondary"></i>
                   <div class="card-info">
                     <h3>WiFi Scanner</h3>
                     <p>Polar Radar View</p>
                   </div>
                </a>
                <a href="#/wifi-sonar" class="dashboard-card glass-card">
                   <i class="ph ph-ruler card-icon text-secondary"></i>
                   <div class="card-info">
                     <h3>Sonar Distance</h3>
                     <p>Signal Strength Ranging</p>
                   </div>
                </a>
                <a href="#/wifi-traffic" class="dashboard-card glass-card">
                   <i class="ph ph-traffic-signal card-icon text-secondary"></i>
                   <div class="card-info">
                     <h3>Traffic Matrix</h3>
                     <p>Packet Sniffer</p>
                   </div>
                </a>
                <a href="#/wall-of-sheep" class="dashboard-card glass-card">
                   <i class="ph ph-sheep card-icon text-secondary"></i>
                   <div class="card-info">
                     <h3>Wall of Sheep</h3>
                     <p>HTTP Monitor</p>
                   </div>
                </a>
            </div>
        </section>
        
        <!-- SECTION C: HARDWARE INTERFACE (Physical World) -->
        <section class="tour-section fade-in-up" style="animation-delay: 0.3s;">
             <div class="section-header">
                <div class="icon-badge" style="color: #4ade80;"><i class="ph ph-bluetooth"></i></div>
                <div>
                   <h2>3. Hardware Interface</h2>
                   <p>Interact with Bluetooth devices and Infrared receivers.</p>
                </div>
            </div>
            <div class="grid-dashboard">
                <a href="#/ble-scanner" class="dashboard-card glass-card">
                   <i class="ph ph-magnifying-glass card-icon" style="color: #4ade80;"></i>
                   <div class="card-info">
                     <h3>BLE Scanner</h3>
                     <p>Find Beacons</p>
                   </div>
                </a>
                <a href="#/ir-remote" class="dashboard-card glass-card">
                   <i class="ph ph-television card-icon"></i>
                   <div class="card-info">
                     <h3>TV-B-Gone</h3>
                     <p>IR Blaster</p>
                   </div>
                </a>
                <a href="#/ble-hid" class="dashboard-card glass-card">
                   <i class="ph ph-keyboard card-icon"></i>
                   <div class="card-info">
                     <h3>Ghost Keyboard</h3>
                     <p>HID Injection</p>
                   </div>
                </a>
            </div>
        </section>

        <!-- SECTION D: SECURITY LAB (Red/Blue Team) -->
        <section class="tour-section fade-in-up" style="animation-delay: 0.4s;">
            <div class="section-header">
                <div class="icon-badge" style="color: #ef4444;"><i class="ph ph-shield-warning"></i></div>
                <div>
                   <h2>4. Security Lab</h2>
                   <p>Understand vulnerabilities by demonstrating attacks (Ethical Use Only).</p>
                </div>
            </div>
            <div class="grid-dashboard">
                <a href="#/attack-rickroll" class="dashboard-card glass-card hack-card">
                   <i class="ph ph-music-notes card-icon text-danger"></i>
                   <div class="card-info">
                     <h3>Rick-Roll</h3>
                     <p>Beacon Flood</p>
                   </div>
                </a>
                <a href="#/attack-eviltwin" class="dashboard-card glass-card hack-card">
                   <i class="ph ph-mask-happy card-icon text-danger"></i>
                   <div class="card-info">
                     <h3>Evil Twin</h3>
                     <p>Phishing Portal</p>
                   </div>
                </a>
                <a href="#/attack-sour-apple" class="dashboard-card glass-card hack-card">
                   <i class="ph ph-apple-logo card-icon text-danger"></i>
                   <div class="card-info">
                     <h3>Sour Apple</h3>
                     <p>BLE Spammer</p>
                   </div>
                </a>
                 <a href="#/defense" class="dashboard-card glass-card defense-card">
                   <i class="ph ph-shield-check card-icon" style="color: #22c55e;"></i>
                   <div class="card-info">
                     <h3>Defense System</h3>
                     <p>Deauth Detector</p>
                   </div>
                </a>
            </div>
        </section>

        <!-- SECTION E: TOOLS & COMMUNITY (The Cloud) -->
        <section class="tour-section fade-in-up" style="animation-delay: 0.5s;">
             <div class="section-header">
                <div class="icon-badge" style="color: var(--color-primary);"><i class="ph ph-globe"></i></div>
                <div>
                   <h2>5. Intelligence & Tools</h2>
                   <p>Connected features for reporting and real-time communication.</p>
                </div>
            </div>
            <div class="grid-dashboard">
                <a href="#/chat" class="dashboard-card glass-card">
                   <i class="ph ph-chat-circle-dots card-icon" style="color: var(--color-primary);"></i>
                   <div class="card-info">
                     <h3>Hacker Chat</h3>
                     <p>Global Messaging</p>
                   </div>
                </a>
                <a href="#/reports" class="dashboard-card glass-card">
                   <i class="ph ph-file-pdf card-icon" style="color: #EF4444;"></i>
                   <div class="card-info">
                     <h3>Cloud Reports</h3>
                     <p>Audit & Export</p>
                   </div>
                </a>
                <a href="#/terminal" class="dashboard-card glass-card">
                   <i class="ph ph-terminal-window card-icon" style="color: #10B981;"></i>
                   <div class="card-info">
                     <h3>Serial Terminal</h3>
                     <p>Low-level Shell</p>
                   </div>
                </a>
            </div>
        </section>

      </div>
    `;

      this.addStyles();

      // Cleanup
      return () => { };
   },

   addStyles() {
      if (document.getElementById('home-v2-styles')) return;
      const style = document.createElement('style');
      style.id = 'home-v2-styles';
      style.textContent = `
      .hero-section {
         padding: 4rem 1rem;
         background: radial-gradient(circle at top, rgba(104, 74, 255, 0.15), transparent 70%);
         margin-bottom: 2rem;
      }
      .hero-logo { width: 120px; height: 120px; margin-bottom: 1rem; }
      .hero-title { font-size: 3.5rem; letter-spacing: -2px; margin-bottom: 1rem; }
      .hero-quote { font-style: italic; font-size: 1.2rem; line-height: 1.6; opacity: 0.8; }
      
      .tour-section {
         margin-bottom: 4rem;
      }
      .section-header {
         display: flex;
         gap: 1rem;
         align-items: center;
         margin-bottom: 1.5rem;
         border-bottom: 1px solid rgba(255,255,255,0.1);
         padding-bottom: 1rem;
      }
      .section-header h2 { font-size: 1.5rem; margin: 0; }
      .section-header p { margin: 0; font-size: 0.9rem; opacity: 0.6; }
      
      .grid-dashboard {
         display: grid;
         grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
         gap: 1.5rem;
      }
      
      .dashboard-card {
         padding: 1.5rem;
         text-align: center;
         display: flex;
         flex-direction: column;
         align-items: center;
         gap: 1rem;
         text-decoration: none;
         transition: transform 0.2s, background 0.2s;
      }
      .dashboard-card:hover { 
         transform: translateY(-5px); 
         background: rgba(255,255,255,0.1);
      }
      .card-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
      .text-primary { color: var(--color-primary-light); }
      .text-secondary { color: var(--color-secondary); }
      .text-danger { color: #ef4444; }
      .card-info h3 { font-size: 1rem; margin: 0; color: white; }
      .card-info p { font-size: 0.8rem; margin: 0; opacity: 0.7; }
    `;
      document.head.appendChild(style);
   }
};
