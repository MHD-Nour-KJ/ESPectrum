export const technicalData = {
    '/wifi-scanner': {
        title: 'WiFi Packet Reconnaissance',
        icon: 'ph-radar',
        content: `
            <p><strong>Physics of WiFi:</strong> WiFi operates using radio waves, typically at 2.4 GHz (12.5cm wavelength) and 5 GHz (6cm wavelength). These electromagnetic waves carry data using modulation techniques like OFDM (Orthogonal Frequency-Division Multiplexing).</p>
            <h4>How Scanning Works:</h4>
            <ul>
                <li><strong>Passive Scanning:</strong> The ESP32 radio listens on each channel (1-13) for <em>Beacon Frames</em> broadcasted by Access Points (APs) approximately every 102.4ms.</li>
                <li><strong>Active Scanning:</strong> The device sends a <em>Probe Request</em> frame and waits for <em>Probe Responses</em> from nearby APs, revealing hidden networks.</li>
                <li><strong>RSSI (Received Signal Strength Indicator):</strong> Measured in dBm (decibel-milliwatts). It follows the inverse-square law, where signal intensity decreases as distance squared increases, though multipath interference (reflections) complicates this in indoor environments.</li>
            </ul>
        `
    },
    '/wifi-sonar': {
        title: 'Signal Strength Ranging (Sonar)',
        icon: 'ph-ruler',
        content: `
            <p><strong>Theory:</strong> Estimating distance using RSSI is based on the <em>Log-Normal Shadowing Model</em> path loss equation:</p>
            <div class="code-block">RSSI = -10 * n * log10(d) + A</div>
            <ul>
                <li><strong>d:</strong> Distance</li>
                <li><strong>n:</strong> Path loss exponent (2.0 for free space, 3-4 for indoors)</li>
                <li><strong>A:</strong> Reference RSSI at 1 meter</li>
            </ul>
            <p><strong>Reality:</strong> Because WiFi indoors is subject to reflection, diffraction, and scattering, RSSI fluctuates wildly. This tool visualizes these fluctuations as a 'sonar' ping, helping you locate a signal source by "hot/cold" search patterns rather than precise measurement.</p>
        `
    },
    '/wifi-traffic': {
        title: 'Traffic Analysis (Promiscuous Mode)',
        icon: 'ph-traffic-signal',
        content: `
            <p><strong>Promiscuous Mode:</strong> In this mode, the ESP32 radio controller passes <em>all</em> received frames to the CPU, not just those addressed to it. This allows us to see the raw flow of data in the air.</p>
            <h4>Frame Types:</h4>
            <ul>
                <li><strong>Management:</strong> Beacons, Probes, Auth/Deauth (Maintains the network structure).</li>
                <li><strong>Control:</strong> RTS/CTS, ACK (Manages access to the air medium).</li>
                <li><strong>Data:</strong> The actual payload (encrypted WPA2 packets).</li>
            </ul>
            <p><strong>Privacy:</strong> We only see the headers (MAC addresses, types). The data payloads are encrypted and unreadable without the key.</p>
        `
    },
    '/attack-rickroll': {
        title: 'Beacon Frame Injection',
        icon: 'ph-music-notes',
        content: `
            <p><strong>Mechanism:</strong> This tool exploits the 802.11 management frame structure. APs announce their presence by broadcasting <em>Beacon Frames</em> containing the SSID (Network Name).</p>
            <p><strong>The Trick:</strong> The ESP32 does not need to be a real router to send these frames. It can construct and transmit raw 802.11 frames with arbitrary SSIDs. By cycling through a list of SSIDs (lyrics), devices scanning for networks see them as available WiFi points.</p>
            <p><strong>Physics:</strong> It's purely a layer-2 broadcast. No connection is established, and no data is transferred.</p>
        `
    },
    '/attack-eviltwin': {
        title: 'Captive Portal & DNS Spoofing',
        icon: 'ph-mask-happy',
        content: `
            <p><strong>The "Evil Twin":</strong> The ESP32 creates an Access Point with the same SSID as a target network but on a different channel.</p>
            <h4>How it works:</h4>
            <ol>
                <li><strong>DHCP Server:</strong> Assigns IP addresses to victims who connect.</li>
                <li><strong>DNS Spoofing:</strong> A custom DNS server answers <em>all</em> domain queries (e.g., google.com) with the ESP32's own IP address.</li>
                <li><strong>Captive Portal:</strong> Because of the DNS spoof, any website the victim tries to visit loads the ESP32's hosted HTML page (the phishing page) instead.</li>
            </ol>
        `
    },
    '/ble-scanner': {
        title: 'Bluetooth Low Energy (BLE)',
        icon: 'ph-bluetooth',
        content: `
            <p><strong>BLE vs Classic:</strong> BLE is designed for periodic small data bursts, unlike streaming audio (Classic). It uses 40 channels in the 2.4GHz spectrum (separate from WiFi channels).</p>
            <h4>Advertising Packets:</h4>
            <p>BLE peripherals (watches, tags) broadcast <em>Advertising Packets</em> on channels 37, 38, and 39 to say "I'm here!".</p>
            <p><strong>Discovery:</strong> The ESP32 radio hops between these 3 channels listening for advertisements. The "RSSI" indicates proximity. We can decode the payload to find device names, manufacturer data (e.g., Apple AirDrop hashes or Microsoft cues), and service UUIDs.</p>
        `
    },
    '/ir-remote': {
        title: 'Infrared (IR) Protocol',
        icon: 'ph-television',
        content: `
            <p><strong>Physics:</strong> IR controls use pulses of non-visible light (typically 940nm wavelength) modulation. To distinguish the signal from sunlight background noise, the light is pulsed at a carrier frequency (usually 38kHz).</p>
            <h4>Modulation:</h4>
            <p>The "On" state isn't steady light; it's a 38kHz square wave. The receiver filters out steady light and only sees the 38kHz bursts.</p>
            <p><strong>TV-B-Gone:</strong> This tool iterates through a database of "Power Off" codes for hundreds of manufacturers (Sony, NEC, RC5 protocols), blasting each one in sequence.</p>
        `
    }
};
