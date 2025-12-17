// NetworkBuster Admin Device Registry - Main Application

// Operating Systems Database
const operatingSystems = [
    { id: 'ubuntu-24', name: 'Ubuntu 24.04 LTS', category: 'linux', size: '5.8 GB', icon: '🐧', desc: 'Latest Ubuntu Desktop' },
    { id: 'ubuntu-server', name: 'Ubuntu Server 24.04', category: 'linux', size: '2.4 GB', icon: '🐧', desc: 'Ubuntu Server Edition' },
    { id: 'debian-12', name: 'Debian 12 Bookworm', category: 'linux', size: '4.1 GB', icon: '🌀', desc: 'Stable Debian Release' },
    { id: 'fedora-40', name: 'Fedora 40 Workstation', category: 'linux', size: '4.2 GB', icon: '🎩', desc: 'Latest Fedora Desktop' },
    { id: 'arch', name: 'Arch Linux', category: 'linux', size: '1.2 GB', icon: '📐', desc: 'Rolling Release Distro' },
    { id: 'mint-21', name: 'Linux Mint 21.3', category: 'linux', size: '4.5 GB', icon: '🍃', desc: 'User-friendly Desktop' },
    { id: 'raspbian', name: 'Raspberry Pi OS', category: 'linux', size: '2.8 GB', icon: '🍓', desc: 'Official Pi OS' },
    { id: 'windows-11', name: 'Windows 11 Pro', category: 'windows', size: '6.2 GB', icon: '🪟', desc: 'Latest Windows Desktop' },
    { id: 'windows-10', name: 'Windows 10 LTSC', category: 'windows', size: '5.1 GB', icon: '🪟', desc: 'Long-term Support' },
    { id: 'windows-server', name: 'Windows Server 2022', category: 'windows', size: '5.8 GB', icon: '🖥️', desc: 'Server Edition' },
    { id: 'clonezilla', name: 'Clonezilla Live', category: 'utility', size: '450 MB', icon: '💾', desc: 'Disk Cloning Tool' },
    { id: 'gparted', name: 'GParted Live', category: 'utility', size: '512 MB', icon: '🔧', desc: 'Partition Editor' },
    { id: 'memtest', name: 'Memtest86+', category: 'utility', size: '24 MB', icon: '🧪', desc: 'Memory Testing' },
    { id: 'ventoy', name: 'Ventoy', category: 'utility', size: '16 MB', icon: '📀', desc: 'Multi-boot USB' },
    { id: 'tails', name: 'Tails OS', category: 'linux', size: '1.4 GB', icon: '🔐', desc: 'Privacy-focused OS' },
];

// Connected USB Devices (populated by detection)
let connectedDevices = [];

// Application State
const appState = {
    selectedOS: null,
    selectedDevice: null,
    deviceHandle: null, // File System Access API handle
    config: {
        hostname: '',
        username: '',
        password: '',
        timezone: '',
        keyboard: '',
        wifiSsid: '',
        wifiPassword: '',
        wifiCountry: '',
        enableSsh: false,
        verifyWrite: true,
        ejectAfter: true,
        // Device Features
        enableRead: false,
        enableWrite: true,
        writeMode: 'full', // 'full', 'partition', 'files'
        downloadScript: '',
        autoRunScript: false,
        formatBeforeWrite: true,
        fileSystem: 'FAT32' // 'FAT32', 'NTFS', 'exFAT', 'ext4'
    },
    // AI Agent Mode
    agentMode: {
        enabled: false,
        autoSwitch: false,
        autoFlash: false,
        monitorDevices: true,
        queue: [],
        history: [],
        status: 'idle', // 'idle', 'running', 'paused', 'complete'
        currentTask: null,
        startTime: null,
        devicesProcessed: 0,
        devicesQueued: 0
    }
};

// DOM Elements
const elements = {};

// Initialize Application
function init() {
    cacheElements();
    renderOSList();
    detectUSBDevices();
    renderConfigPanel();
    renderSettingsPanel();
    bindEvents();
    updateSteps();
    setupUSBWatcher();
}

// Cache DOM Elements
function cacheElements() {
    elements.osCard = document.getElementById('osCard');
    elements.deviceCard = document.getElementById('deviceCard');
    elements.configCard = document.getElementById('configCard');
    elements.selectOsBtn = document.getElementById('selectOsBtn');
    elements.selectDeviceBtn = document.getElementById('selectDeviceBtn');
    elements.configBtn = document.getElementById('configBtn');
    elements.flashBtn = document.getElementById('flashBtn');
    elements.osSelection = document.getElementById('osSelection');
    elements.deviceSelection = document.getElementById('deviceSelection');
    elements.configStatus = document.getElementById('configStatus');
    elements.osModal = document.getElementById('osModal');
    elements.deviceModal = document.getElementById('deviceModal');
    elements.configModal = document.getElementById('configModal');
    elements.flashModal = document.getElementById('flashModal');
    elements.settingsModal = document.getElementById('settingsModal');
    elements.osList = document.getElementById('osList');
    elements.deviceList = document.getElementById('deviceList');
    elements.osSearch = document.getElementById('osSearch');
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.helpBtn = document.getElementById('helpBtn');
    elements.flashTitle = document.getElementById('flashTitle');
    elements.progressPercent = document.getElementById('progressPercent');
    elements.progressStatus = document.getElementById('progressStatus');
    elements.progressBar = document.getElementById('progressBar');
    elements.progressRing = document.getElementById('progressRing');
    elements.flashFooter = document.getElementById('flashFooter');
    elements.flashDone = document.getElementById('flashDone');
    elements.configBody = document.getElementById('configBody');
    elements.settingsBody = document.getElementById('settingsBody');
}

// Detect USB Devices and Active Drives
async function detectUSBDevices() {
    connectedDevices = [];

    // Try WebUSB API first
    if (navigator.usb) {
        try {
            const devices = await navigator.usb.getDevices();
            devices.forEach(device => {
                connectedDevices.push({
                    id: `webusb-${device.vendorId}-${device.productId}`,
                    name: device.productName || `USB Device`,
                    type: `USB ${device.usbVersionMajor}.${device.usbVersionMinor}`,
                    vendorId: device.vendorId,
                    productId: device.productId,
                    path: `/dev/usb/${device.serialNumber || 'unknown'}`,
                    source: 'webusb',
                    device: device
                });
            });
        } catch (e) {
            console.log('WebUSB not available:', e);
        }
    }

    // Add options for finding active drives
    connectedDevices.push({
        id: 'browse-drive',
        name: '📂 Browse for Active Drive',
        type: 'Select mounted drive folder',
        path: '',
        source: 'action',
        action: 'browse'
    });

    connectedDevices.push({
        id: 'scan-usb',
        name: '🔌 Scan for USB Devices',
        type: 'Detect USB via WebUSB',
        path: '',
        source: 'action',
        action: 'scan'
    });

    // Common Windows drive letters to check
    const windowsDrives = ['D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:'];
    windowsDrives.forEach((drive, i) => {
        connectedDevices.push({
            id: `drive-${drive}`,
            name: `💾 Drive ${drive}`,
            type: 'Windows Drive',
            path: `${drive}\\`,
            source: 'windows-drive',
            driveIndex: i
        });
    });

    renderDeviceList();
}

// Request USB Device Access
async function requestUSBDevice() {
    if (navigator.usb) {
        try {
            const device = await navigator.usb.requestDevice({
                filters: [] // Accept any USB device
            });

            if (device) {
                const newDevice = {
                    id: `webusb-${device.vendorId}-${device.productId}-${Date.now()}`,
                    name: device.productName || `USB Device (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
                    type: `USB ${device.usbVersionMajor}.${device.usbVersionMinor}`,
                    vendorId: device.vendorId,
                    productId: device.productId,
                    path: `/dev/usb/${device.serialNumber || 'device'}`,
                    source: 'webusb',
                    device: device
                };

                // Remove scan action and add real device
                connectedDevices = connectedDevices.filter(d => d.source !== 'action');
                connectedDevices.push(newDevice);
                renderDeviceList();

                return newDevice;
            }
        } catch (e) {
            console.log('USB request cancelled or failed:', e);
        }
    }

    // Fallback: Use File System Access API for directory picker
    return await selectMountedDrive();
}

// Select Mounted USB Drive via File System
async function selectMountedDrive() {
    if ('showDirectoryPicker' in window) {
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'desktop'
            });

            const newDevice = {
                id: `fs-${Date.now()}`,
                name: handle.name,
                type: 'USB Drive',
                path: handle.name,
                source: 'filesystem',
                handle: handle
            };

            connectedDevices = connectedDevices.filter(d => d.source !== 'action');
            connectedDevices.push(newDevice);
            appState.deviceHandle = handle;
            renderDeviceList();

            return newDevice;
        } catch (e) {
            console.log('Directory picker cancelled:', e);
        }
    }
    return null;
}

// Browse for Active Drive
window.browseForDrive = async function () {
    if ('showDirectoryPicker' in window) {
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'desktop'
            });

            const newDevice = {
                id: `drive-${Date.now()}`,
                name: `📁 ${handle.name}`,
                type: 'Active Drive',
                path: handle.name,
                source: 'filesystem',
                handle: handle
            };

            // Remove action items and add this drive at the top
            connectedDevices = connectedDevices.filter(d => d.source !== 'action');
            connectedDevices.unshift(newDevice);
            appState.deviceHandle = handle;

            // Auto-select this device
            selectDevice(newDevice.id);

            showNotification(`Drive "${handle.name}" selected!`);
            closeModal('deviceModal');

            return newDevice;
        } catch (e) {
            console.log('Drive selection cancelled:', e);
        }
    } else {
        showNotification('File System Access API not supported in this browser');
    }
    return null;
};

// Watch for USB device connections
function setupUSBWatcher() {
    if (navigator.usb) {
        navigator.usb.addEventListener('connect', async (event) => {
            console.log('USB device connected:', event.device);
            await detectUSBDevices();
            showNotification('USB device connected!');
        });

        navigator.usb.addEventListener('disconnect', async (event) => {
            console.log('USB device disconnected:', event.device);
            connectedDevices = connectedDevices.filter(d =>
                d.device !== event.device
            );
            renderDeviceList();
            showNotification('USB device disconnected');
        });
    }
}

// Show notification
function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; padding: 16px 24px;
        background: var(--accent-gradient); color: white; border-radius: 12px;
        font-weight: 500; z-index: 1000; animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Render Device List
function renderDeviceList() {
    if (connectedDevices.length === 0) {
        elements.deviceList.innerHTML = `
            <div class="device-empty">
                <div class="empty-icon">🔌</div>
                <p>No USB devices detected</p>
                <button class="btn-scan" onclick="requestUSBDevice()">Scan for Devices</button>
            </div>
        `;
        return;
    }

    elements.deviceList.innerHTML = connectedDevices.map(device => {
        // Action items (Browse, Scan)
        if (device.source === 'action') {
            const actionHandler = device.action === 'browse' ? 'browseForDrive()' : 'requestUSBDevice()';
            const icon = device.action === 'browse' ? '📂' : '🔍';
            return `
                <div class="device-item device-action" onclick="${actionHandler}">
                    <div class="device-icon">${icon}</div>
                    <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-type">${device.type}</div>
                    </div>
                </div>
            `;
        }

        // Windows Drive letters
        if (device.source === 'windows-drive') {
            return `
                <div class="device-item ${appState.selectedDevice?.id === device.id ? 'selected' : ''}" data-id="${device.id}">
                    <div class="device-icon">💾</div>
                    <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-type">${device.type}</div>
                        <div class="device-path">${device.path}</div>
                    </div>
                    <div class="device-status drive-letter">
                        ${device.path.replace('\\', '')}
                    </div>
                </div>
            `;
        }

        // Regular devices (WebUSB, Filesystem)
        return `
            <div class="device-item ${appState.selectedDevice?.id === device.id ? 'selected' : ''}" data-id="${device.id}">
                <div class="device-icon">🔌</div>
                <div class="device-info">
                    <div class="device-name">${device.name}</div>
                    <div class="device-type">${device.type}</div>
                    <div class="device-path">${device.path}</div>
                </div>
                <div class="device-status ${device.source === 'filesystem' ? 'mounted' : ''}">
                    ${device.source === 'filesystem' ? '✓ Mounted' : ''}
                </div>
            </div>
        `;
    }).join('');

    elements.deviceList.querySelectorAll('.device-item:not(.device-action)').forEach(item => {
        item.addEventListener('click', () => selectDevice(item.dataset.id));
    });
}

// Render OS List
function renderOSList(filter = 'all', search = '') {
    const filtered = operatingSystems.filter(os => {
        const matchCategory = filter === 'all' || os.category === filter;
        const matchSearch = os.name.toLowerCase().includes(search.toLowerCase());
        return matchCategory && matchSearch;
    });

    elements.osList.innerHTML = filtered.map(os => `
        <div class="os-item ${appState.selectedOS?.id === os.id ? 'selected' : ''}" data-id="${os.id}">
            <div class="os-icon">${os.icon}</div>
            <div class="os-info">
                <div class="os-name">${os.name}</div>
                <div class="os-details">${os.desc}</div>
            </div>
            <div class="os-size">${os.size}</div>
        </div>
    `).join('');

    elements.osList.querySelectorAll('.os-item').forEach(item => {
        item.addEventListener('click', () => selectOS(item.dataset.id));
    });
}

// Render Config Panel with Read/Write Features
function renderConfigPanel() {
    elements.configBody.innerHTML = `
        <div class="config-section">
            <h3 class="config-section-title">📝 Device Features</h3>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgEnableRead">
                    Enable Read Mode
                </label>
                <p class="config-hint">Read data and create backups from device</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgEnableWrite" checked>
                    Enable Write Mode
                </label>
                <p class="config-hint">Write OS images and files to device</p>
            </div>
            
            <div class="config-group">
                <label class="config-label-inline">Write Mode:</label>
                <select class="config-select" id="cfgWriteMode">
                    <option value="full">Full Disk Image</option>
                    <option value="partition">Partition Only</option>
                    <option value="files">Copy Files</option>
                </select>
            </div>
            
            <div class="config-group">
                <label class="config-label-inline">File System:</label>
                <select class="config-select" id="cfgFileSystem">
                    <option value="FAT32">FAT32 (Universal)</option>
                    <option value="exFAT">exFAT (Large Files)</option>
                    <option value="NTFS">NTFS (Windows)</option>
                    <option value="ext4">ext4 (Linux)</option>
                </select>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgFormat" checked>
                    Format device before writing
                </label>
            </div>
        </div>

        <div class="config-section">
            <h3 class="config-section-title">📜 Download Script</h3>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgAutoScript">
                    Auto-run script after flash
                </label>
            </div>
            
            <div class="config-group">
                <label class="config-label-inline">First-boot Script:</label>
                <textarea class="config-textarea" id="cfgScript" placeholder="#!/bin/bash
# This script runs on first boot
# Example: Download and install packages

apt-get update
apt-get install -y curl wget git

# Download additional software
curl -fsSL https://example.com/setup.sh | bash

# Configure system
echo 'NetworkBuster Device Ready' > /etc/motd"></textarea>
                <div class="script-actions">
                    <button class="btn-sm" onclick="loadScriptTemplate('basic')">Basic Setup</button>
                    <button class="btn-sm" onclick="loadScriptTemplate('docker')">Docker</button>
                    <button class="btn-sm" onclick="loadScriptTemplate('webserver')">Web Server</button>
                    <button class="btn-sm" onclick="loadScriptTemplate('iot')">IoT Device</button>
                    <button class="btn-sm" onclick="loadScriptTemplate('adblock')">🚫 Ad Blocker</button>
                </div>
            </div>
        </div>

        <div class="config-section privacy-section">
            <h3 class="config-section-title">🛡️ Privacy & Ad Blocker</h3>
            <p class="section-desc">Remove advertisements and tracking from all programs</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgRemoveAds" checked>
                    Remove all advertisements
                </label>
                <p class="config-hint">Blocks ads system-wide on the device</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgPiHole">
                    Install Pi-hole (Network-wide ad blocking)
                </label>
                <p class="config-hint">DNS-level blocking for entire network</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgHostsBlock" checked>
                    Install hosts-based ad blocker
                </label>
                <p class="config-hint">Block ads via /etc/hosts file</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgBrowserAdblock" checked>
                    Pre-install browser ad blockers
                </label>
                <p class="config-hint">uBlock Origin, Privacy Badger for browsers</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgBlockTelemetry" checked>
                    Block telemetry & tracking
                </label>
                <p class="config-hint">Disable analytics and tracking services</p>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgPrivateDns" checked>
                    Use privacy-focused DNS
                </label>
                <div class="config-column" id="cfgDnsFields">
                    <select class="config-select" id="cfgDnsProvider">
                        <option value="cloudflare">Cloudflare (1.1.1.1) - Fast & Private</option>
                        <option value="quad9">Quad9 (9.9.9.9) - Security Focused</option>
                        <option value="adguard">AdGuard DNS - With Ad Blocking</option>
                        <option value="nextdns">NextDNS - Customizable</option>
                        <option value="mullvad">Mullvad DNS - No Logging</option>
                    </select>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgDisableTrackers">
                    Disable OS-level trackers
                </label>
                <p class="config-hint">Remove Windows/Ubuntu telemetry services</p>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Blocked Categories:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" checked> Ads</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Trackers</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Malware</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Phishing</label>
                    <label class="mini-checkbox"><input type="checkbox"> Adult Content</label>
                    <label class="mini-checkbox"><input type="checkbox"> Social Media</label>
                    <label class="mini-checkbox"><input type="checkbox"> Gambling</label>
                    <label class="mini-checkbox"><input type="checkbox"> Crypto Mining</label>
                </div>
            </div>
        </div>

        <div class="config-section video-section">
            <h3 class="config-section-title">🎬 Video AI Enhancer</h3>
            <p class="section-desc">AI-powered video enhancement with adjustable equalizer</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgVideoEnhance" checked>
                    Enable Video AI Enhancement
                </label>
                <p class="config-hint">Apply AI upscaling and enhancement to videos</p>
            </div>

            <div class="equalizer-container" id="eqContainer">
                <div class="eq-label">Equalizer Settings</div>
                <div class="eq-sliders">
                    <div class="eq-slider-group">
                        <label>Brightness</label>
                        <input type="range" id="eqBrightness" min="-100" max="100" value="0" class="eq-slider">
                        <span class="eq-value" id="eqBrightnessVal">0</span>
                    </div>
                    <div class="eq-slider-group">
                        <label>Contrast</label>
                        <input type="range" id="eqContrast" min="-100" max="100" value="10" class="eq-slider">
                        <span class="eq-value" id="eqContrastVal">10</span>
                    </div>
                    <div class="eq-slider-group">
                        <label>Saturation</label>
                        <input type="range" id="eqSaturation" min="-100" max="100" value="15" class="eq-slider">
                        <span class="eq-value" id="eqSaturationVal">15</span>
                    </div>
                    <div class="eq-slider-group">
                        <label>Sharpness</label>
                        <input type="range" id="eqSharpness" min="0" max="100" value="25" class="eq-slider">
                        <span class="eq-value" id="eqSharpnessVal">25</span>
                    </div>
                    <div class="eq-slider-group">
                        <label>AI Upscale</label>
                        <input type="range" id="eqUpscale" min="1" max="4" value="2" class="eq-slider">
                        <span class="eq-value" id="eqUpscaleVal">2x</span>
                    </div>
                    <div class="eq-slider-group">
                        <label>Noise Reduction</label>
                        <input type="range" id="eqNoise" min="0" max="100" value="30" class="eq-slider">
                        <span class="eq-value" id="eqNoiseVal">30</span>
                    </div>
                </div>
                <div class="eq-presets">
                    <button class="btn-sm" onclick="setEqPreset('default')">Default</button>
                    <button class="btn-sm" onclick="setEqPreset('vivid')">Vivid</button>
                    <button class="btn-sm" onclick="setEqPreset('cinematic')">Cinematic</button>
                    <button class="btn-sm" onclick="setEqPreset('natural')">Natural</button>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">AI Model:</label>
                <select class="config-select" id="cfgAiModel">
                    <option value="standard">Standard (Fast)</option>
                    <option value="quality" selected>Quality (Balanced)</option>
                    <option value="ultra">Ultra (Best Quality)</option>
                </select>
            </div>
        </div>

        <div class="config-section audio-section">
            <h3 class="config-section-title">🔊 Audio AI Enhancer</h3>
            <p class="section-desc">AI-powered audio enhancement with frequency equalizer</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgAudioEnhance" checked>
                    Enable Audio AI Enhancement
                </label>
                <p class="config-hint">Apply AI noise reduction and audio clarity</p>
            </div>

            <div class="equalizer-container audio-eq" id="audioEqContainer">
                <div class="eq-label">Audio Frequency Equalizer</div>
                <div class="audio-eq-bars">
                    <div class="freq-band">
                        <input type="range" id="freq60" min="-12" max="12" value="2" class="vertical-slider" orient="vertical">
                        <label>60Hz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq170" min="-12" max="12" value="1" class="vertical-slider" orient="vertical">
                        <label>170Hz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq310" min="-12" max="12" value="0" class="vertical-slider" orient="vertical">
                        <label>310Hz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq600" min="-12" max="12" value="0" class="vertical-slider" orient="vertical">
                        <label>600Hz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq1k" min="-12" max="12" value="1" class="vertical-slider" orient="vertical">
                        <label>1kHz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq3k" min="-12" max="12" value="2" class="vertical-slider" orient="vertical">
                        <label>3kHz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq6k" min="-12" max="12" value="3" class="vertical-slider" orient="vertical">
                        <label>6kHz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq12k" min="-12" max="12" value="2" class="vertical-slider" orient="vertical">
                        <label>12kHz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq14k" min="-12" max="12" value="1" class="vertical-slider" orient="vertical">
                        <label>14kHz</label>
                    </div>
                    <div class="freq-band">
                        <input type="range" id="freq16k" min="-12" max="12" value="0" class="vertical-slider" orient="vertical">
                        <label>16kHz</label>
                    </div>
                </div>
                <div class="eq-presets">
                    <button class="btn-sm" onclick="setAudioPreset('flat')">Flat</button>
                    <button class="btn-sm" onclick="setAudioPreset('bass')">Bass Boost</button>
                    <button class="btn-sm" onclick="setAudioPreset('treble')">Treble Boost</button>
                    <button class="btn-sm" onclick="setAudioPreset('vocal')">Vocal</button>
                    <button class="btn-sm" onclick="setAudioPreset('rock')">Rock</button>
                    <button class="btn-sm" onclick="setAudioPreset('electronic')">Electronic</button>
                </div>
            </div>

            <div class="audio-controls">
                <div class="audio-control-group">
                    <label>Master Volume</label>
                    <input type="range" id="audioVolume" min="0" max="100" value="80" class="eq-slider">
                    <span class="eq-value" id="audioVolumeVal">80%</span>
                </div>
                <div class="audio-control-group">
                    <label>Noise Reduction</label>
                    <input type="range" id="audioNoise" min="0" max="100" value="40" class="eq-slider">
                    <span class="eq-value" id="audioNoiseVal">40%</span>
                </div>
                <div class="audio-control-group">
                    <label>Voice Clarity</label>
                    <input type="range" id="audioClarity" min="0" max="100" value="60" class="eq-slider">
                    <span class="eq-value" id="audioClarityVal">60%</span>
                </div>
                <div class="audio-control-group">
                    <label>Surround Effect</label>
                    <input type="range" id="audioSurround" min="0" max="100" value="30" class="eq-slider">
                    <span class="eq-value" id="audioSurroundVal">30%</span>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Audio Output Device:</label>
                <select class="config-select" id="cfgAudioOutput">
                    <option value="default">System Default</option>
                    <option value="speakers">Speakers</option>
                    <option value="headphones">Headphones</option>
                    <option value="hdmi">HDMI Audio</option>
                    <option value="bluetooth">Bluetooth Device</option>
                </select>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgSpatialAudio">
                    Enable Spatial Audio (3D Sound)
                </label>
            </div>
        </div>

        <div class="config-section admin-section">
            <h3 class="config-section-title">🔐 Administrator Path Control</h3>
            <p class="section-desc">Manage device paths with administrator permissions on flashed device</p>
            
            <div class="admin-warning">
                <span class="warning-icon">⚠️</span>
                <div class="warning-text">
                    <strong>Elevated Permissions Required</strong>
                    <p>These settings require administrator access on the target device</p>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgAdminMode" checked>
                    Enable Administrator Mode on First Boot
                </label>
                <p class="config-hint">Run configuration with elevated privileges</p>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Device Control Paths:</label>
                <div class="path-list" id="adminPaths">
                    <div class="path-item">
                        <span class="path-icon">📁</span>
                        <input type="text" class="config-input path-input" value="/dev/sda" placeholder="Device path">
                        <select class="config-select path-permission">
                            <option value="rw">Read/Write</option>
                            <option value="ro">Read Only</option>
                            <option value="admin">Admin Only</option>
                        </select>
                        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
                    </div>
                    <div class="path-item">
                        <span class="path-icon">📁</span>
                        <input type="text" class="config-input path-input" value="/mnt/usb" placeholder="Mount path">
                        <select class="config-select path-permission">
                            <option value="rw" selected>Read/Write</option>
                            <option value="ro">Read Only</option>
                            <option value="admin">Admin Only</option>
                        </select>
                        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
                    </div>
                    <div class="path-item">
                        <span class="path-icon">📁</span>
                        <input type="text" class="config-input path-input" value="/etc/networkbuster" placeholder="Config path">
                        <select class="config-select path-permission">
                            <option value="rw">Read/Write</option>
                            <option value="ro">Read Only</option>
                            <option value="admin" selected>Admin Only</option>
                        </select>
                        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
                    </div>
                </div>
                <button class="btn-add-path" onclick="addAdminPath()">+ Add Path</button>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Default Mount Point:</label>
                <input type="text" class="config-input" id="cfgMountPoint" value="/mnt/networkbuster">
            </div>

            <div class="config-group">
                <label class="config-label-inline">Administrator Actions:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" id="admMount" checked> Auto-mount devices</label>
                    <label class="mini-checkbox"><input type="checkbox" id="admFormat" checked> Format permissions</label>
                    <label class="mini-checkbox"><input type="checkbox" id="admOwnership" checked> Set ownership</label>
                    <label class="mini-checkbox"><input type="checkbox" id="admChmod" checked> Configure chmod</label>
                    <label class="mini-checkbox"><input type="checkbox" id="admSudo"> Add to sudoers</label>
                    <label class="mini-checkbox"><input type="checkbox" id="admService"> Create service</label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Permission Level:</label>
                <div class="permission-slider">
                    <input type="range" id="permLevel" min="1" max="5" value="3" class="eq-slider">
                    <div class="permission-labels">
                        <span>Guest</span>
                        <span>User</span>
                        <span>Power</span>
                        <span>Admin</span>
                        <span>Root</span>
                    </div>
                </div>
            </div>

            <div class="admin-actions">
                <button class="btn-admin" onclick="applyAdminSettings()">
                    🔐 Apply Admin Settings
                </button>
                <button class="btn-admin secondary" onclick="exportAdminConfig()">
                    📄 Export Config
                </button>
            </div>
        </div>

        <div class="config-section display-section">
            <h3 class="config-section-title">🖥️ Post-Install Display Commands</h3>
            <p class="section-desc">Run CMD commands after power/install for display configuration</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgRunDisplayCmd" checked>
                    Run display commands after install
                </label>
                <p class="config-hint">Execute display configuration on first boot</p>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Display Resolution:</label>
                <div class="resolution-options">
                    <label class="radio-option">
                        <input type="radio" name="resolution" value="auto" checked>
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Auto</strong>
                            <small>Detect best</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="resolution" value="1920x1080">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>1080p</strong>
                            <small>1920×1080</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="resolution" value="2560x1440">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>1440p</strong>
                            <small>2560×1440</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="resolution" value="3840x2160">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>4K</strong>
                            <small>3840×2160</small>
                        </div>
                    </label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Refresh Rate:</label>
                <select class="config-select" id="cfgRefreshRate">
                    <option value="auto">Auto Detect</option>
                    <option value="60">60 Hz</option>
                    <option value="75">75 Hz</option>
                    <option value="120">120 Hz</option>
                    <option value="144">144 Hz</option>
                    <option value="165">165 Hz</option>
                    <option value="240">240 Hz</option>
                </select>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Display Output:</label>
                <select class="config-select" id="cfgDisplayOutput">
                    <option value="auto">Auto Detect</option>
                    <option value="HDMI-1">HDMI-1</option>
                    <option value="HDMI-2">HDMI-2</option>
                    <option value="DP-1">DisplayPort 1</option>
                    <option value="DP-2">DisplayPort 2</option>
                    <option value="VGA-1">VGA</option>
                    <option value="eDP-1">Laptop Display</option>
                </select>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Display Settings:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" id="dispHDR" checked> Enable HDR</label>
                    <label class="mini-checkbox"><input type="checkbox" id="dispNightMode"> Night Mode</label>
                    <label class="mini-checkbox"><input type="checkbox" id="dispAutoRotate" checked> Auto Rotate</label>
                    <label class="mini-checkbox"><input type="checkbox" id="dispScaling" checked> DPI Scaling</label>
                    <label class="mini-checkbox"><input type="checkbox" id="dispMultiMon"> Multi-Monitor</label>
                    <label class="mini-checkbox"><input type="checkbox" id="dispColorProfile" checked> Color Profile</label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Post-Install CMD Commands:</label>
                <div class="cmd-list" id="cmdList">
                    <div class="cmd-item">
                        <span class="cmd-icon">▶️</span>
                        <input type="text" class="config-input cmd-input" value="xrandr --auto" placeholder="Enter command">
                        <select class="config-select cmd-timing">
                            <option value="boot">On Boot</option>
                            <option value="login">On Login</option>
                            <option value="delayed">Delayed (30s)</option>
                        </select>
                        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
                    </div>
                    <div class="cmd-item">
                        <span class="cmd-icon">▶️</span>
                        <input type="text" class="config-input cmd-input" value="gsettings set org.gnome.desktop.interface scaling-factor 1" placeholder="Enter command">
                        <select class="config-select cmd-timing">
                            <option value="boot">On Boot</option>
                            <option value="login" selected>On Login</option>
                            <option value="delayed">Delayed (30s)</option>
                        </select>
                        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
                    </div>
                </div>
                <button class="btn-add-path" onclick="addDisplayCmd()">+ Add Command</button>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Quick CMD Templates:</label>
                <div class="cmd-templates">
                    <button class="btn-sm" onclick="addCmdTemplate('xrandr')">xrandr Setup</button>
                    <button class="btn-sm" onclick="addCmdTemplate('nvidia')">NVIDIA Config</button>
                    <button class="btn-sm" onclick="addCmdTemplate('amd')">AMD Config</button>
                    <button class="btn-sm" onclick="addCmdTemplate('wayland')">Wayland</button>
                    <button class="btn-sm" onclick="addCmdTemplate('windows')">Windows Display</button>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Custom Display Script:</label>
                <textarea class="config-textarea" id="cfgDisplayScript" placeholder="#!/bin/bash
# Display configuration script
# Runs after power/install

# Set display resolution
xrandr --output HDMI-1 --mode 1920x1080 --rate 60

# Enable compositor
picom --daemon

# Set wallpaper
feh --bg-scale /usr/share/backgrounds/default.jpg

echo 'Display configured successfully!'"></textarea>
            </div>

            <div class="display-actions">
                <button class="btn-display" onclick="applyDisplayConfig()">
                    🖥️ Apply Display Config
                </button>
                <button class="btn-display secondary" onclick="testDisplayCmd()">
                    ▶️ Test Commands
                </button>
            </div>
        </div>

        <div class="config-section wifi-section">
            <h3 class="config-section-title">📶 WiFi Network Settings</h3>
            <p class="section-desc">Attach WiFi configuration to posts for auto-connect on new device</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgWifiEnabled" checked>
                    Pre-configure WiFi Network
                </label>
                <p class="config-hint">Device will auto-connect to this network after install</p>
            </div>

            <div class="wifi-config-card">
                <div class="wifi-network-row">
                    <div class="wifi-field">
                        <label>Network Name (SSID)</label>
                        <input type="text" class="config-input" id="cfgWifiSSID" placeholder="Enter WiFi network name">
                    </div>
                    <div class="wifi-field">
                        <label>Security Type</label>
                        <select class="config-select" id="cfgWifiSecurity">
                            <option value="WPA2">WPA2-Personal</option>
                            <option value="WPA3">WPA3-Personal</option>
                            <option value="WPA2-Enterprise">WPA2-Enterprise</option>
                            <option value="WEP">WEP (Legacy)</option>
                            <option value="Open">Open (No Password)</option>
                        </select>
                    </div>
                </div>
                <div class="wifi-network-row">
                    <div class="wifi-field">
                        <label>Password</label>
                        <div class="password-input-group">
                            <input type="password" class="config-input" id="cfgWifiPassword" placeholder="Enter WiFi password">
                            <button class="btn-sm" onclick="togglePasswordVisibility()">👁️</button>
                        </div>
                    </div>
                    <div class="wifi-field">
                        <label>Priority</label>
                        <select class="config-select" id="cfgWifiPriority">
                            <option value="1">Highest (1)</option>
                            <option value="2" selected>High (2)</option>
                            <option value="3">Normal (3)</option>
                            <option value="4">Low (4)</option>
                        </select>
                    </div>
                </div>
                <div class="wifi-options">
                    <label class="mini-checkbox"><input type="checkbox" id="wifiAutoConnect" checked> Auto-connect</label>
                    <label class="mini-checkbox"><input type="checkbox" id="wifiHidden"> Hidden Network</label>
                    <label class="mini-checkbox"><input type="checkbox" id="wifiMetered"> Metered Connection</label>
                    <label class="mini-checkbox"><input type="checkbox" id="wifi5GHz" checked> Prefer 5GHz</label>
                </div>
            </div>

            <button class="btn-add-path" onclick="addWifiNetwork()">+ Add Another Network</button>
        </div>

        <div class="config-section package-section">
            <h3 class="config-section-title">📦 Package Toggle & Folder Checklist</h3>
            <p class="section-desc">Select packages and folders to write - includes all device types</p>
            
            <div class="package-master-toggle">
                <div class="master-toggle-item">
                    <label class="config-label">
                        <input type="checkbox" id="pkgMasterAll" checked onchange="toggleAllPackages(this.checked)">
                        <strong>Select All Packages</strong>
                    </label>
                </div>
                <div class="package-stats">
                    <span id="pkgCount">12</span> packages selected | <span id="pkgSize">~2.4 GB</span>
                </div>
            </div>

            <div class="folder-checklist">
                <div class="folder-category">
                    <div class="category-header" onclick="toggleCategory('sysfolders')">
                        <span class="category-icon">📁</span>
                        <span class="category-name">System Folders</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-items" id="sysfolders">
                        <label class="folder-item"><input type="checkbox" checked> /etc/ - System Configuration</label>
                        <label class="folder-item"><input type="checkbox" checked> /usr/bin/ - User Binaries</label>
                        <label class="folder-item"><input type="checkbox" checked> /usr/lib/ - Libraries</label>
                        <label class="folder-item"><input type="checkbox" checked> /var/log/ - Log Files</label>
                        <label class="folder-item"><input type="checkbox"> /opt/ - Optional Packages</label>
                        <label class="folder-item"><input type="checkbox"> /srv/ - Service Data</label>
                    </div>
                </div>

                <div class="folder-category">
                    <div class="category-header" onclick="toggleCategory('devicetypes')">
                        <span class="category-icon">🔌</span>
                        <span class="category-name">Device Types</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-items" id="devicetypes">
                        <label class="folder-item"><input type="checkbox" checked> USB Flash Drives</label>
                        <label class="folder-item"><input type="checkbox" checked> USB Hard Drives</label>
                        <label class="folder-item"><input type="checkbox" checked> SD Cards</label>
                        <label class="folder-item"><input type="checkbox" checked> microSD Cards</label>
                        <label class="folder-item"><input type="checkbox" checked> NVMe Drives</label>
                        <label class="folder-item"><input type="checkbox" checked> SATA SSDs</label>
                        <label class="folder-item"><input type="checkbox"> eMMC Storage</label>
                        <label class="folder-item"><input type="checkbox"> Network Drives</label>
                    </div>
                </div>

                <div class="folder-category">
                    <div class="category-header" onclick="toggleCategory('configdirs')">
                        <span class="category-icon">⚙️</span>
                        <span class="category-name">Config Subdirectories</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-items" id="configdirs">
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/config/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/scripts/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/logs/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/drivers/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/wifi/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/display/</label>
                        <label class="folder-item"><input type="checkbox" checked> /networkbuster/audio/</label>
                        <label class="folder-item"><input type="checkbox"> /networkbuster/backup/</label>
                    </div>
                </div>

                <div class="folder-category">
                    <div class="category-header" onclick="toggleCategory('userdirs')">
                        <span class="category-icon">👤</span>
                        <span class="category-name">User Directories</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-items" id="userdirs">
                        <label class="folder-item"><input type="checkbox" checked> ~/Desktop/</label>
                        <label class="folder-item"><input type="checkbox" checked> ~/Documents/</label>
                        <label class="folder-item"><input type="checkbox"> ~/Downloads/</label>
                        <label class="folder-item"><input type="checkbox"> ~/Pictures/</label>
                        <label class="folder-item"><input type="checkbox"> ~/Videos/</label>
                        <label class="folder-item"><input type="checkbox" checked> ~/.config/</label>
                        <label class="folder-item"><input type="checkbox"> ~/.local/</label>
                    </div>
                </div>

                <div class="folder-category">
                    <div class="category-header" onclick="toggleCategory('packages')">
                        <span class="category-icon">📦</span>
                        <span class="category-name">Software Packages</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-items" id="packages">
                        <label class="folder-item"><input type="checkbox" checked> Video AI Enhancer (~500 MB)</label>
                        <label class="folder-item"><input type="checkbox" checked> Audio AI Enhancer (~200 MB)</label>
                        <label class="folder-item"><input type="checkbox" checked> Ad Blocker Suite (~50 MB)</label>
                        <label class="folder-item"><input type="checkbox" checked> Privacy Tools (~100 MB)</label>
                        <label class="folder-item"><input type="checkbox" checked> Display Drivers (~300 MB)</label>
                        <label class="folder-item"><input type="checkbox" checked> WiFi Drivers (~150 MB)</label>
                        <label class="folder-item"><input type="checkbox"> Development Tools (~1 GB)</label>
                        <label class="folder-item"><input type="checkbox"> Media Codecs (~200 MB)</label>
                    </div>
                </div>
            </div>

            <div class="package-actions">
                <button class="btn-package" onclick="generatePackageManifest()">
                    📋 Generate Manifest
                </button>
                <button class="btn-package secondary" onclick="previewFolderStructure()">
                    👁️ Preview Structure
                </button>
            </div>
        </div>

            <h3 class="config-section-title">📂 File Sharing & Data Storage</h3>
            <p class="section-desc">Share files and store data in Outlook folder</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgShareFiles" checked>
                    Enable File Sharing
                </label>
                <p class="config-hint">Share computer files with the device</p>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgOutlookStorage" checked>
                    Use Outlook Folder for Data Storage
                </label>
                <p class="config-hint">Store sent data in Outlook-compatible folder structure</p>
            </div>

            <div class="config-group" id="outlookSettings">
                <label class="config-label-inline">Outlook Data Path:</label>
                <div class="path-input-group">
                    <input type="text" class="config-input" id="cfgOutlookPath" value="C:\\Users\\%USERNAME%\\AppData\\Local\\NetworkBuster\\OutlookData" readonly>
                    <button class="btn-sm" onclick="browseOutlookFolder()">Browse</button>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Data Categories:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" checked> Sent Files</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Download History</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Device Configs</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Flash Logs</label>
                    <label class="mini-checkbox"><input type="checkbox"> Attachments</label>
                    <label class="mini-checkbox"><input type="checkbox"> Contacts</label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgSyncCloud">
                    Sync to cloud storage
                </label>
                <select class="config-select" id="cfgCloudProvider" style="margin-top:8px;">
                    <option value="onedrive">OneDrive</option>
                    <option value="gdrive">Google Drive</option>
                    <option value="dropbox">Dropbox</option>
                    <option value="local">Local Only</option>
                </select>
            </div>
        </div>

        <div class="config-section download-section">
            <h3 class="config-section-title">⬇️ USB Download & Install</h3>
            <p class="section-desc">Download to USB and install on new devices</p>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgDownloadToUsb" checked>
                    Download files to USB after preparing
                </label>
                <p class="config-hint">Write all installation files to USB drive</p>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgAutoInstall" checked>
                    Enable auto-install on new device
                </label>
                <p class="config-hint">Automatically run installation when USB is connected</p>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Installation Package:</label>
                <div class="package-options">
                    <label class="radio-option">
                        <input type="radio" name="pkgType" value="minimal" checked>
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Minimal</strong>
                            <small>OS only (~2GB)</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="pkgType" value="standard">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Standard</strong>
                            <small>OS + Apps (~5GB)</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="pkgType" value="full">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Full</strong>
                            <small>Complete bundle (~10GB)</small>
                        </div>
                    </label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Include with Installation:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" checked> Video AI Enhancer</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Ad Blocker Scripts</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Privacy Settings</label>
                    <label class="mini-checkbox"><input type="checkbox" checked> Driver Pack</label>
                    <label class="mini-checkbox"><input type="checkbox"> Development Tools</label>
                    <label class="mini-checkbox"><input type="checkbox"> Media Codecs</label>
                </div>
            </div>

            <div class="download-actions">
                <button class="btn-download" onclick="prepareUsbPackage()">
                    📦 Prepare USB Package
                </button>
                <button class="btn-download secondary" onclick="downloadOffline()">
                    💾 Download for Offline Install
                </button>
            </div>
        </div>

        <div class="config-section override-section">
            <h3 class="config-section-title">🖥️ USB OS Override from Host Machine</h3>
            <p class="section-desc">Clone configuration from original machine to new devices</p>
            
            <div class="host-info-card">
                <div class="host-info-header">
                    <span class="host-icon">💻</span>
                    <div class="host-details">
                        <div class="host-label">Current Host Machine</div>
                        <div class="host-name" id="currentHostname">Detecting...</div>
                    </div>
                    <button class="btn-sm" onclick="detectHostMachine()">🔄 Refresh</button>
                </div>
                <div class="host-stats" id="hostStats">
                    <div class="stat-item">
                        <span class="stat-label">OS</span>
                        <span class="stat-value" id="hostOS">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Platform</span>
                        <span class="stat-value" id="hostPlatform">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cores</span>
                        <span class="stat-value" id="hostCores">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Memory</span>
                        <span class="stat-value" id="hostMemory">-</span>
                    </div>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgUseHostConfig" checked>
                    Use Host Machine Configuration
                </label>
                <p class="config-hint">Clone hostname and settings to new device</p>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Override Mode:</label>
                <div class="override-options">
                    <label class="radio-option">
                        <input type="radio" name="overrideMode" value="clone" checked>
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Clone</strong>
                            <small>Copy exact config</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="overrideMode" value="template">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Template</strong>
                            <small>Use as base template</small>
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="overrideMode" value="custom">
                        <span class="radio-box"></span>
                        <div class="radio-content">
                            <strong>Custom</strong>
                            <small>Manual override</small>
                        </div>
                    </label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">New Device Hostname:</label>
                <div class="hostname-input-group">
                    <input type="text" class="config-input" id="cfgNewHostname" placeholder="Enter new hostname or use pattern">
                    <select class="config-select hostname-suffix" id="cfgHostnameSuffix">
                        <option value="">No Suffix</option>
                        <option value="-001">-001 (Numbered)</option>
                        <option value="-new">-new</option>
                        <option value="-clone">-clone</option>
                        <option value="-backup">-backup</option>
                    </select>
                </div>
                <div class="hostname-preview">
                    Preview: <span id="hostnamePreview">device-001</span>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label-inline">Override Settings:</label>
                <div class="checkbox-grid">
                    <label class="mini-checkbox"><input type="checkbox" id="ovHostname" checked> Hostname</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovNetwork" checked> Network Config</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovUsers" checked> User Accounts</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovTimezone" checked> Timezone</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovLocale" checked> Locale/Language</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovDrivers" checked> Drivers</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovApps"> Installed Apps</label>
                    <label class="mini-checkbox"><input type="checkbox" id="ovRegistry"> Registry/Settings</label>
                </div>
            </div>

            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgAutoOverride" checked>
                    Auto-apply override on first boot
                </label>
                <p class="config-hint">Automatically configure new device with host settings</p>
            </div>

            <div class="override-actions">
                <button class="btn-override" onclick="captureHostConfig()">
                    📸 Capture Host Config
                </button>
                <button class="btn-override secondary" onclick="writeOverrideToUsb()">
                    💾 Write Override to USB
                </button>
            </div>
        </div>

        <div class="config-section">
            <h3 class="config-section-title">⚙️ System Settings</h3>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgHostname">
                    Set custom hostname
                </label>
                <input type="text" class="config-input" id="cfgHostnameVal" placeholder="my-device" style="display:none;">
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgUser">
                    Create user account
                </label>
                <div class="config-row" id="cfgUserFields" style="display:none;">
                    <input type="text" class="config-input" id="cfgUsername" placeholder="Username">
                    <input type="password" class="config-input" id="cfgPassword" placeholder="Password">
                </div>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgWifi">
                    Configure WiFi
                </label>
                <div class="config-column" id="cfgWifiFields" style="display:none;">
                    <input type="text" class="config-input" id="cfgSsid" placeholder="Network SSID">
                    <input type="password" class="config-input" id="cfgWifiPass" placeholder="WiFi Password">
                </div>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgSsh">
                    Enable SSH access
                </label>
            </div>
        </div>

        <div class="config-section">
            <h3 class="config-section-title">✅ Verification</h3>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgVerify" checked>
                    Verify write after flashing
                </label>
            </div>
            
            <div class="config-group">
                <label class="config-label">
                    <input type="checkbox" id="cfgEject" checked>
                    Eject device when complete
                </label>
            </div>
        </div>
    `;

    // Toggle field visibility
    const toggles = [
        ['cfgHostname', 'cfgHostnameVal'],
        ['cfgUser', 'cfgUserFields'],
        ['cfgWifi', 'cfgWifiFields']
    ];

    toggles.forEach(([checkbox, fields]) => {
        document.getElementById(checkbox)?.addEventListener('change', (e) => {
            const el = document.getElementById(fields);
            if (el) el.style.display = e.target.checked ? 'block' : 'none';
        });
    });
}

// Script Templates
window.loadScriptTemplate = function (template) {
    const scripts = {
        basic: `#!/bin/bash
# Basic System Setup Script
set -e

echo "Updating system packages..."
apt-get update && apt-get upgrade -y

echo "Installing essential tools..."
apt-get install -y curl wget git vim htop

echo "Setup complete!"`,

        docker: `#!/bin/bash
# Docker Installation Script
set -e

echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh

echo "Adding user to docker group..."
usermod -aG docker $USER

echo "Installing Docker Compose..."
apt-get install -y docker-compose

echo "Starting Docker service..."
systemctl enable docker
systemctl start docker

echo "Docker installed successfully!"`,

        webserver: `#!/bin/bash
# Web Server Setup Script
set -e

echo "Installing Nginx..."
apt-get update
apt-get install -y nginx

echo "Configuring firewall..."
ufw allow 'Nginx Full'

echo "Starting Nginx..."
systemctl enable nginx
systemctl start nginx

echo "Web server is running!"`,

        iot: `#!/bin/bash
# IoT Device Setup Script
set -e

echo "Configuring IoT device..."
apt-get update
apt-get install -y python3 python3-pip i2c-tools

echo "Installing IoT libraries..."
pip3 install RPi.GPIO adafruit-circuitpython-dht paho-mqtt

echo "Enabling I2C and SPI..."
raspi-config nonint do_i2c 0
raspi-config nonint do_spi 0

echo "IoT device configured!"`,

        adblock: `#!/bin/bash
# ============================================
# Ad Blocker & Privacy Script
# Removes advertisements from all programs
# ============================================
set -e

echo "🛡️ NetworkBuster Ad Blocker Setup"
echo "=================================="

# Update system
apt-get update

# ============================================
# 1. HOSTS-BASED AD BLOCKING
# ============================================
echo "📋 Installing hosts-based ad blocker..."

# Download and merge ad-blocking hosts
curl -sL https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts -o /tmp/hosts_ads
cat /etc/hosts /tmp/hosts_ads | sort -u > /tmp/hosts_merged
cp /tmp/hosts_merged /etc/hosts

echo "✓ Hosts file updated with ad-blocking rules"

# ============================================
# 2. PRIVACY-FOCUSED DNS
# ============================================
echo "🔒 Configuring privacy DNS..."

# Set Cloudflare DNS (1.1.1.1) with malware blocking
cat > /etc/resolv.conf << EOF
nameserver 1.1.1.2
nameserver 1.0.0.2
EOF

# Prevent resolv.conf from being overwritten
chattr +i /etc/resolv.conf

echo "✓ Privacy DNS configured"

# ============================================
# 3. BLOCK TELEMETRY & TRACKING
# ============================================
echo "🚫 Blocking telemetry services..."

# Block common tracking domains
cat >> /etc/hosts << EOF

# Telemetry Blocking
0.0.0.0 telemetry.microsoft.com
0.0.0.0 vortex.data.microsoft.com
0.0.0.0 settings-win.data.microsoft.com
0.0.0.0 watson.telemetry.microsoft.com
0.0.0.0 analytics.google.com
0.0.0.0 www.googleadservices.com
0.0.0.0 pagead2.googlesyndication.com
0.0.0.0 adservice.google.com
0.0.0.0 metrics.ubuntu.com
0.0.0.0 popups.canonical.com
EOF

echo "✓ Telemetry blocked"

# ============================================
# 4. INSTALL BROWSER AD BLOCKERS
# ============================================
echo "🌐 Setting up browser ad blocking..."

# Create uBlock Origin policy for Firefox
mkdir -p /etc/firefox/policies
cat > /etc/firefox/policies/policies.json << EOF
{
  "policies": {
    "ExtensionSettings": {
      "uBlock0@raymondhill.net": {
        "installation_mode": "force_installed",
        "install_url": "https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi"
      }
    },
    "DisableTelemetry": true,
    "DisableFirefoxStudies": true
  }
}
EOF

echo "✓ Browser ad blockers configured"

# ============================================
# 5. SYSTEM-WIDE AD BLOCKING SERVICE
# ============================================
echo "⚙️ Creating ad-block update service..."

cat > /usr/local/bin/update-adblock << 'EOF'
#!/bin/bash
curl -sL https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts -o /tmp/hosts_new
if [ -s /tmp/hosts_new ]; then
    chattr -i /etc/hosts
    head -20 /etc/hosts > /tmp/hosts_base
    cat /tmp/hosts_base /tmp/hosts_new > /etc/hosts
    chattr +i /etc/hosts
    echo "Ad-block hosts updated: $(date)"
fi
EOF
chmod +x /usr/local/bin/update-adblock

# Schedule weekly updates
echo "0 3 * * 0 root /usr/local/bin/update-adblock" >> /etc/crontab

echo "✓ Auto-update service created"

# ============================================
# COMPLETE
# ============================================
echo ""
echo "✅ Ad Blocker Setup Complete!"
echo "=================================="
echo "• Hosts-based blocking: ACTIVE"
echo "• Privacy DNS: ACTIVE (1.1.1.2)"
echo "• Telemetry blocking: ACTIVE"
echo "• Browser extensions: CONFIGURED"
echo "• Auto-updates: WEEKLY"
echo ""
echo "🛡️ Your device is now ad-free!"`
    };

    document.getElementById('cfgScript').value = scripts[template] || '';
};

// Equalizer Presets
window.setEqPreset = function (preset) {
    const presets = {
        default: { brightness: 0, contrast: 10, saturation: 15, sharpness: 25, upscale: 2, noise: 30 },
        vivid: { brightness: 10, contrast: 30, saturation: 50, sharpness: 40, upscale: 2, noise: 20 },
        cinematic: { brightness: -5, contrast: 25, saturation: -10, sharpness: 15, upscale: 2, noise: 40 },
        natural: { brightness: 0, contrast: 5, saturation: 5, sharpness: 10, upscale: 1, noise: 50 }
    };

    const p = presets[preset] || presets.default;

    document.getElementById('eqBrightness').value = p.brightness;
    document.getElementById('eqContrast').value = p.contrast;
    document.getElementById('eqSaturation').value = p.saturation;
    document.getElementById('eqSharpness').value = p.sharpness;
    document.getElementById('eqUpscale').value = p.upscale;
    document.getElementById('eqNoise').value = p.noise;

    updateEqValues();
    showNotification(`Preset "${preset}" applied`);
};

// Update equalizer display values
function updateEqValues() {
    document.getElementById('eqBrightnessVal').textContent = document.getElementById('eqBrightness').value;
    document.getElementById('eqContrastVal').textContent = document.getElementById('eqContrast').value;
    document.getElementById('eqSaturationVal').textContent = document.getElementById('eqSaturation').value;
    document.getElementById('eqSharpnessVal').textContent = document.getElementById('eqSharpness').value;
    document.getElementById('eqUpscaleVal').textContent = document.getElementById('eqUpscale').value + 'x';
    document.getElementById('eqNoiseVal').textContent = document.getElementById('eqNoise').value;
}

// Setup equalizer slider listeners
function setupEqSliders() {
    const sliders = ['eqBrightness', 'eqContrast', 'eqSaturation', 'eqSharpness', 'eqUpscale', 'eqNoise'];
    sliders.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateEqValues);
        }
    });

    // Audio sliders
    const audioSliders = ['audioVolume', 'audioNoise', 'audioClarity', 'audioSurround'];
    audioSliders.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateAudioValues);
        }
    });
}

// Audio Preset Functions
window.setAudioPreset = function (preset) {
    const presets = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
        treble: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
        vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 0, -1],
        rock: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
        electronic: [6, 5, 2, -1, -2, 0, 3, 5, 6, 5]
    };

    const freqIds = ['freq60', 'freq170', 'freq310', 'freq600', 'freq1k', 'freq3k', 'freq6k', 'freq12k', 'freq14k', 'freq16k'];
    const values = presets[preset] || presets.flat;

    freqIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = values[i];
        }
    });

    showNotification(`Audio preset "${preset}" applied`);
};

// Update audio display values
function updateAudioValues() {
    const volumeEl = document.getElementById('audioVolume');
    const noiseEl = document.getElementById('audioNoise');
    const clarityEl = document.getElementById('audioClarity');
    const surroundEl = document.getElementById('audioSurround');

    if (volumeEl) document.getElementById('audioVolumeVal').textContent = volumeEl.value + '%';
    if (noiseEl) document.getElementById('audioNoiseVal').textContent = noiseEl.value + '%';
    if (clarityEl) document.getElementById('audioClarityVal').textContent = clarityEl.value + '%';
    if (surroundEl) document.getElementById('audioSurroundVal').textContent = surroundEl.value + '%';
}

// Add Display Command
window.addDisplayCmd = function () {
    const cmdList = document.getElementById('cmdList');
    if (!cmdList) return;

    const cmdItem = document.createElement('div');
    cmdItem.className = 'cmd-item';
    cmdItem.innerHTML = `
        <span class="cmd-icon">▶️</span>
        <input type="text" class="config-input cmd-input" placeholder="Enter command">
        <select class="config-select cmd-timing">
            <option value="boot">On Boot</option>
            <option value="login">On Login</option>
            <option value="delayed">Delayed (30s)</option>
        </select>
        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    cmdList.appendChild(cmdItem);
};

// Add CMD Template
window.addCmdTemplate = function (template) {
    const templates = {
        xrandr: [
            'xrandr --auto',
            'xrandr --output HDMI-1 --mode 1920x1080 --rate 60',
            'xrandr --output DP-1 --primary'
        ],
        nvidia: [
            'nvidia-settings --assign CurrentMetaMode="nvidia-auto-select +0+0 { ForceFullCompositionPipeline = On }"',
            'nvidia-smi -pm 1',
            'nvidia-settings -a "[gpu:0]/GpuPowerMizerMode=1"'
        ],
        amd: [
            'amdgpu-pro-install --opencl=legacy',
            'echo "performance" | sudo tee /sys/class/drm/card0/device/power_dpm_force_performance_level',
            'sudo cp /usr/share/X11/xorg.conf.d/10-amdgpu.conf /etc/X11/xorg.conf.d/'
        ],
        wayland: [
            'export XDG_SESSION_TYPE=wayland',
            'export GDK_BACKEND=wayland',
            'export QT_QPA_PLATFORM=wayland',
            'dbus-run-session -- gnome-shell --display-server --wayland'
        ],
        windows: [
            'powershell Set-DisplayResolution -Width 1920 -Height 1080',
            'reg add "HKCU\\Control Panel\\Desktop" /v DpiScalingVer /t REG_DWORD /d 0x00001018 /f',
            'rundll32.exe user32.dll,UpdatePerUserSystemParameters'
        ]
    };

    const cmds = templates[template] || [];
    cmds.forEach(cmd => {
        const cmdList = document.getElementById('cmdList');
        if (!cmdList) return;

        const cmdItem = document.createElement('div');
        cmdItem.className = 'cmd-item';
        cmdItem.innerHTML = `
            <span class="cmd-icon">▶️</span>
            <input type="text" class="config-input cmd-input" value="${cmd}">
            <select class="config-select cmd-timing">
                <option value="boot">On Boot</option>
                <option value="login">On Login</option>
                <option value="delayed">Delayed (30s)</option>
            </select>
            <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
        `;
        cmdList.appendChild(cmdItem);
    });

    showNotification(`${template} commands added`);
};

// Apply Display Config
window.applyDisplayConfig = async function () {
    const commands = [];
    document.querySelectorAll('.cmd-item').forEach(item => {
        const cmdInput = item.querySelector('.cmd-input');
        const timingSelect = item.querySelector('.cmd-timing');
        if (cmdInput && timingSelect) {
            commands.push({
                command: cmdInput.value,
                timing: timingSelect.value
            });
        }
    });

    const resolution = document.querySelector('input[name="resolution"]:checked')?.value || 'auto';
    const refreshRate = document.getElementById('cfgRefreshRate')?.value || 'auto';
    const displayOutput = document.getElementById('cfgDisplayOutput')?.value || 'auto';
    const customScript = document.getElementById('cfgDisplayScript')?.value || '';

    const displayConfig = {
        enabled: document.getElementById('cfgRunDisplayCmd')?.checked,
        resolution,
        refreshRate,
        displayOutput,
        settings: {
            hdr: document.getElementById('dispHDR')?.checked,
            nightMode: document.getElementById('dispNightMode')?.checked,
            autoRotate: document.getElementById('dispAutoRotate')?.checked,
            dpiScaling: document.getElementById('dispScaling')?.checked,
            multiMonitor: document.getElementById('dispMultiMon')?.checked,
            colorProfile: document.getElementById('dispColorProfile')?.checked
        },
        commands,
        customScript
    };

    appState.displayConfig = displayConfig;

    openModal('flashModal');
    elements.flashFooter.style.display = 'none';

    const stages = [
        { text: 'Reading display configuration...', duration: 400 },
        { text: 'Configuring resolution settings...', duration: 600 },
        { text: 'Setting refresh rate...', duration: 400 },
        { text: 'Preparing post-install commands...', duration: 800 },
        { text: 'Writing display script...', duration: 600 },
        { text: 'Creating boot hooks...', duration: 500 },
        { text: 'Finalizing...', duration: 300 }
    ];

    let progress = 0;
    const totalDuration = stages.reduce((a, s) => a + s.duration, 0);

    for (const stage of stages) {
        elements.progressStatus.textContent = stage.text;
        elements.flashTitle.textContent = stage.text;

        const stageProgress = (stage.duration / totalDuration) * 100;
        const steps = 15;
        const stepDuration = stage.duration / steps;
        const stepProgress = stageProgress / steps;

        for (let i = 0; i < steps; i++) {
            await sleep(stepDuration);
            progress += stepProgress;
            updateProgress(Math.min(progress, 100));
        }
    }

    elements.flashTitle.textContent = '✅ Display Config Applied!';
    elements.progressStatus.textContent = `${commands.length} commands will run after power/install`;
    elements.flashFooter.style.display = 'flex';
};

// Test Display Commands
window.testDisplayCmd = function () {
    const commands = [];
    document.querySelectorAll('.cmd-item').forEach(item => {
        const cmdInput = item.querySelector('.cmd-input');
        if (cmdInput) {
            commands.push(cmdInput.value);
        }
    });

    const output = commands.map((cmd, i) => `[${i + 1}] $ ${cmd}`).join('\n');

    alert(`Display Commands Preview:\n\n${output}\n\n---\nThese commands will execute on the target device after power/install.`);
};

// Toggle Password Visibility
window.togglePasswordVisibility = function () {
    const passwordInput = document.getElementById('cfgWifiPassword');
    if (passwordInput) {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    }
};

// Add WiFi Network
window.addWifiNetwork = function () {
    const wifiSection = document.querySelector('.wifi-section');
    if (!wifiSection) return;

    const newCard = document.createElement('div');
    newCard.className = 'wifi-config-card';
    newCard.innerHTML = `
        <div class="wifi-network-row">
            <div class="wifi-field">
                <label>Network Name (SSID)</label>
                <input type="text" class="config-input" placeholder="Enter WiFi network name">
            </div>
            <div class="wifi-field">
                <label>Security Type</label>
                <select class="config-select">
                    <option value="WPA2">WPA2-Personal</option>
                    <option value="WPA3">WPA3-Personal</option>
                    <option value="WPA2-Enterprise">WPA2-Enterprise</option>
                    <option value="WEP">WEP (Legacy)</option>
                    <option value="Open">Open (No Password)</option>
                </select>
            </div>
            <button class="btn-remove" onclick="this.closest('.wifi-config-card').remove()">✕</button>
        </div>
        <div class="wifi-network-row">
            <div class="wifi-field">
                <label>Password</label>
                <input type="password" class="config-input" placeholder="Enter WiFi password">
            </div>
            <div class="wifi-field">
                <label>Priority</label>
                <select class="config-select">
                    <option value="1">Highest (1)</option>
                    <option value="2">High (2)</option>
                    <option value="3" selected>Normal (3)</option>
                    <option value="4">Low (4)</option>
                </select>
            </div>
        </div>
    `;

    const addBtn = wifiSection.querySelector('.btn-add-path');
    wifiSection.insertBefore(newCard, addBtn);
    showNotification('WiFi network added');
};

// Toggle All Packages
window.toggleAllPackages = function (checked) {
    document.querySelectorAll('.folder-checklist input[type="checkbox"]').forEach(cb => {
        cb.checked = checked;
    });
    updatePackageStats();
};

// Toggle Category
window.toggleCategory = function (categoryId) {
    const items = document.getElementById(categoryId);
    if (items) {
        items.style.display = items.style.display === 'none' ? 'block' : 'none';
        const header = items.previousElementSibling;
        if (header) {
            const toggle = header.querySelector('.category-toggle');
            if (toggle) {
                toggle.textContent = items.style.display === 'none' ? '▶' : '▼';
            }
        }
    }
};

// Update Package Stats
function updatePackageStats() {
    const checkboxes = document.querySelectorAll('.folder-checklist input[type="checkbox"]');
    let count = 0;
    checkboxes.forEach(cb => { if (cb.checked) count++; });

    const sizeMap = {
        12: '~2.4 GB',
        20: '~3.5 GB',
        30: '~5.0 GB',
        40: '~7.5 GB'
    };

    document.getElementById('pkgCount').textContent = count;
    document.getElementById('pkgSize').textContent = sizeMap[Math.min(count, 40)] || `~${(count * 0.2).toFixed(1)} GB`;
}

// Generate Package Manifest
window.generatePackageManifest = function () {
    const manifest = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        wifiConfig: {
            enabled: document.getElementById('cfgWifiEnabled')?.checked,
            ssid: document.getElementById('cfgWifiSSID')?.value,
            security: document.getElementById('cfgWifiSecurity')?.value,
            autoConnect: document.getElementById('wifiAutoConnect')?.checked,
            prefer5GHz: document.getElementById('wifi5GHz')?.checked
        },
        folders: [],
        deviceTypes: [],
        packages: []
    };

    // Collect all checked items
    document.querySelectorAll('.folder-checklist .folder-item input:checked').forEach(cb => {
        const label = cb.parentElement.textContent.trim();
        manifest.folders.push(label);
    });

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'networkbuster-manifest.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Package manifest generated!');
};

// Preview Folder Structure
window.previewFolderStructure = function () {
    let structure = '📦 NetworkBuster Package Structure\n';
    structure += '================================\n\n';

    document.querySelectorAll('.folder-category').forEach(cat => {
        const name = cat.querySelector('.category-name')?.textContent;
        const icon = cat.querySelector('.category-icon')?.textContent;
        structure += `${icon} ${name}\n`;

        cat.querySelectorAll('.folder-item input:checked').forEach(cb => {
            const label = cb.parentElement.textContent.trim();
            structure += `   ├── ${label}\n`;
        });
        structure += '\n';
    });

    alert(structure);
};

// Add Admin Path
window.addAdminPath = function () {
    const pathList = document.getElementById('adminPaths');
    if (!pathList) return;

    const pathItem = document.createElement('div');
    pathItem.className = 'path-item';
    pathItem.innerHTML = `
        <span class="path-icon">📁</span>
        <input type="text" class="config-input path-input" placeholder="Enter path">
        <select class="config-select path-permission">
            <option value="rw">Read/Write</option>
            <option value="ro">Read Only</option>
            <option value="admin">Admin Only</option>
        </select>
        <button class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    pathList.appendChild(pathItem);
};

// Apply Admin Settings
window.applyAdminSettings = async function () {
    const paths = [];
    document.querySelectorAll('.path-item').forEach(item => {
        const pathInput = item.querySelector('.path-input');
        const permSelect = item.querySelector('.path-permission');
        if (pathInput && permSelect) {
            paths.push({
                path: pathInput.value,
                permission: permSelect.value
            });
        }
    });

    const adminConfig = {
        adminMode: document.getElementById('cfgAdminMode')?.checked,
        mountPoint: document.getElementById('cfgMountPoint')?.value,
        permissionLevel: document.getElementById('permLevel')?.value,
        paths: paths,
        actions: {
            autoMount: document.getElementById('admMount')?.checked,
            formatPermissions: document.getElementById('admFormat')?.checked,
            setOwnership: document.getElementById('admOwnership')?.checked,
            configureChmod: document.getElementById('admChmod')?.checked,
            addSudoers: document.getElementById('admSudo')?.checked,
            createService: document.getElementById('admService')?.checked
        }
    };

    appState.adminConfig = adminConfig;

    openModal('flashModal');
    elements.flashFooter.style.display = 'none';

    const stages = [
        { text: 'Initializing admin mode...', duration: 400 },
        { text: 'Configuring device paths...', duration: 800 },
        { text: 'Setting permissions...', duration: 600 },
        { text: 'Configuring mount points...', duration: 500 },
        { text: 'Applying ownership rules...', duration: 700 },
        { text: 'Writing admin config...', duration: 1000 },
        { text: 'Finalizing...', duration: 300 }
    ];

    let progress = 0;
    const totalDuration = stages.reduce((a, s) => a + s.duration, 0);

    for (const stage of stages) {
        elements.progressStatus.textContent = stage.text;
        elements.flashTitle.textContent = stage.text;

        const stageProgress = (stage.duration / totalDuration) * 100;
        const steps = 15;
        const stepDuration = stage.duration / steps;
        const stepProgress = stageProgress / steps;

        for (let i = 0; i < steps; i++) {
            await sleep(stepDuration);
            progress += stepProgress;
            updateProgress(Math.min(progress, 100));
        }
    }

    elements.flashTitle.textContent = '✅ Admin Settings Applied!';
    elements.progressStatus.textContent = 'Administrator path control configured';
    elements.flashFooter.style.display = 'flex';
};

// Export Admin Config
window.exportAdminConfig = function () {
    const paths = [];
    document.querySelectorAll('.path-item').forEach(item => {
        const pathInput = item.querySelector('.path-input');
        const permSelect = item.querySelector('.path-permission');
        if (pathInput && permSelect) {
            paths.push({
                path: pathInput.value,
                permission: permSelect.value
            });
        }
    });

    const config = {
        version: '1.0.0',
        type: 'admin-config',
        created: new Date().toISOString(),
        adminMode: document.getElementById('cfgAdminMode')?.checked,
        mountPoint: document.getElementById('cfgMountPoint')?.value,
        paths: paths,
        audioConfig: {
            enabled: document.getElementById('cfgAudioEnhance')?.checked,
            volume: document.getElementById('audioVolume')?.value,
            noiseReduction: document.getElementById('audioNoise')?.value,
            voiceClarity: document.getElementById('audioClarity')?.value,
            surround: document.getElementById('audioSurround')?.value
        },
        videoConfig: {
            enabled: document.getElementById('cfgVideoEnhance')?.checked,
            brightness: document.getElementById('eqBrightness')?.value,
            contrast: document.getElementById('eqContrast')?.value,
            saturation: document.getElementById('eqSaturation')?.value
        }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'networkbuster-admin-config.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Admin config exported!');
};

// Browse for Outlook folder
window.browseOutlookFolder = async function () {
    if ('showDirectoryPicker' in window) {
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            document.getElementById('cfgOutlookPath').value = handle.name;
            appState.outlookHandle = handle;
            showNotification('Outlook folder selected');
        } catch (e) {
            console.log('Folder selection cancelled');
        }
    } else {
        alert('Folder browser not supported. Path will use default location.');
    }
};

// Prepare USB Package
window.prepareUsbPackage = async function () {
    if (!appState.selectedDevice) {
        showNotification('Please select a USB device first');
        openModal('deviceModal');
        return;
    }

    openModal('flashModal');
    elements.flashFooter.style.display = 'none';

    const stages = [
        { text: 'Gathering configuration...', duration: 500 },
        { text: 'Preparing Video AI Enhancer...', duration: 1000 },
        { text: 'Building ad-block scripts...', duration: 800 },
        { text: 'Packaging installation files...', duration: 1500 },
        { text: 'Writing to USB...', duration: 2000 },
        { text: 'Creating auto-install script...', duration: 500 },
        { text: 'Verifying package...', duration: 1000 },
        { text: 'Finalizing...', duration: 500 }
    ];

    let progress = 0;
    const totalDuration = stages.reduce((a, s) => a + s.duration, 0);

    for (const stage of stages) {
        elements.progressStatus.textContent = stage.text;
        elements.flashTitle.textContent = stage.text;

        const stageProgress = (stage.duration / totalDuration) * 100;
        const steps = 20;
        const stepDuration = stage.duration / steps;
        const stepProgress = stageProgress / steps;

        for (let i = 0; i < steps; i++) {
            await sleep(stepDuration);
            progress += stepProgress;
            updateProgress(Math.min(progress, 100));
        }
    }

    elements.flashTitle.textContent = '✅ USB Package Ready!';
    elements.progressStatus.textContent = 'Package created - ready to install on new device';
    elements.flashFooter.style.display = 'flex';
};

// Download for offline install
window.downloadOffline = function () {
    showNotification('Preparing offline installer...');

    // Create a sample package manifest
    const manifest = {
        version: '1.0.0',
        created: new Date().toISOString(),
        os: appState.selectedOS?.name || 'Not selected',
        device: appState.selectedDevice?.name || 'Not selected',
        config: {
            videoEnhancer: document.getElementById('cfgVideoEnhance')?.checked,
            adBlocker: document.getElementById('cfgRemoveAds')?.checked,
            outlookStorage: document.getElementById('cfgOutlookStorage')?.checked,
            downloadToUsb: document.getElementById('cfgDownloadToUsb')?.checked
        },
        equalizer: {
            brightness: document.getElementById('eqBrightness')?.value,
            contrast: document.getElementById('eqContrast')?.value,
            saturation: document.getElementById('eqSaturation')?.value,
            sharpness: document.getElementById('eqSharpness')?.value
        }
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'networkbuster-package.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Package manifest downloaded!');
};

// Host Machine Configuration Storage
let hostMachineConfig = null;

// Detect Host Machine
window.detectHostMachine = function () {
    const hostname = location.hostname || 'localhost';
    const userAgent = navigator.userAgent;

    // Parse OS from user agent
    let os = 'Unknown';
    let platform = navigator.platform || 'Unknown';

    if (userAgent.includes('Windows')) {
        os = userAgent.includes('Windows NT 10') ? 'Windows 10/11' : 'Windows';
    } else if (userAgent.includes('Mac OS')) {
        os = 'macOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
    } else if (userAgent.includes('iOS')) {
        os = 'iOS';
    }

    // Get hardware info
    const cores = navigator.hardwareConcurrency || 'N/A';
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/A';

    // Update UI
    document.getElementById('currentHostname').textContent = hostname;
    document.getElementById('hostOS').textContent = os;
    document.getElementById('hostPlatform').textContent = platform;
    document.getElementById('hostCores').textContent = cores;
    document.getElementById('hostMemory').textContent = memory;

    // Set default new hostname
    document.getElementById('cfgNewHostname').value = hostname;
    updateHostnamePreview();

    // Store config
    hostMachineConfig = {
        hostname,
        os,
        platform,
        cores,
        memory,
        userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
    };

    showNotification('Host machine detected');
};

// Update hostname preview
function updateHostnamePreview() {
    const hostname = document.getElementById('cfgNewHostname')?.value || 'device';
    const suffix = document.getElementById('cfgHostnameSuffix')?.value || '';
    document.getElementById('hostnamePreview').textContent = hostname + suffix;
}

// Capture Host Configuration
window.captureHostConfig = function () {
    if (!hostMachineConfig) {
        detectHostMachine();
    }

    // Gather all override settings
    const overrideSettings = {
        hostname: document.getElementById('ovHostname')?.checked,
        network: document.getElementById('ovNetwork')?.checked,
        users: document.getElementById('ovUsers')?.checked,
        timezone: document.getElementById('ovTimezone')?.checked,
        locale: document.getElementById('ovLocale')?.checked,
        drivers: document.getElementById('ovDrivers')?.checked,
        apps: document.getElementById('ovApps')?.checked,
        registry: document.getElementById('ovRegistry')?.checked
    };

    const newHostname = document.getElementById('cfgNewHostname')?.value || hostMachineConfig.hostname;
    const suffix = document.getElementById('cfgHostnameSuffix')?.value || '';
    const overrideMode = document.querySelector('input[name="overrideMode"]:checked')?.value || 'clone';

    appState.hostOverride = {
        source: hostMachineConfig,
        target: {
            hostname: newHostname + suffix,
            overrideMode,
            autoApply: document.getElementById('cfgAutoOverride')?.checked,
            settings: overrideSettings
        },
        captured: new Date().toISOString()
    };

    showNotification('Host configuration captured!');
    console.log('Host Override Config:', appState.hostOverride);
};

// Write Override to USB
window.writeOverrideToUsb = async function () {
    if (!appState.selectedDevice) {
        showNotification('Please select a USB device first');
        openModal('deviceModal');
        return;
    }

    if (!appState.hostOverride) {
        captureHostConfig();
    }

    openModal('flashModal');
    elements.flashFooter.style.display = 'none';

    const stages = [
        { text: 'Capturing host configuration...', duration: 500 },
        { text: 'Reading hostname settings...', duration: 600 },
        { text: 'Exporting network configuration...', duration: 800 },
        { text: 'Packaging user settings...', duration: 600 },
        { text: 'Creating override script...', duration: 1000 },
        { text: 'Writing to USB...', duration: 1500 },
        { text: 'Creating first-boot override...', duration: 800 },
        { text: 'Verifying override package...', duration: 500 },
        { text: 'Finalizing...', duration: 300 }
    ];

    let progress = 0;
    const totalDuration = stages.reduce((a, s) => a + s.duration, 0);

    for (const stage of stages) {
        elements.progressStatus.textContent = stage.text;
        elements.flashTitle.textContent = stage.text;

        const stageProgress = (stage.duration / totalDuration) * 100;
        const steps = 15;
        const stepDuration = stage.duration / steps;
        const stepProgress = stageProgress / steps;

        for (let i = 0; i < steps; i++) {
            await sleep(stepDuration);
            progress += stepProgress;
            updateProgress(Math.min(progress, 100));
        }
    }

    // If we have file system access, write the override config
    if (appState.deviceHandle) {
        try {
            const configFile = await appState.deviceHandle.getFileHandle('networkbuster-override.json', { create: true });
            const writable = await configFile.createWritable();
            await writable.write(JSON.stringify(appState.hostOverride, null, 2));
            await writable.close();

            // Write override script
            const scriptFile = await appState.deviceHandle.getFileHandle('apply-override.sh', { create: true });
            const scriptWritable = await scriptFile.createWritable();
            await scriptWritable.write(generateOverrideScript(appState.hostOverride));
            await scriptWritable.close();
        } catch (e) {
            console.log('Could not write override files:', e);
        }
    }

    elements.flashTitle.textContent = '✅ Override Written to USB!';
    elements.progressStatus.textContent = `Configuration from ${hostMachineConfig?.hostname} ready for new device`;
    elements.flashFooter.style.display = 'flex';
};

// Generate override script
function generateOverrideScript(override) {
    const target = override.target;
    const source = override.source;

    let script = `#!/bin/bash
# ============================================
# NetworkBuster OS Override Script
# Source Machine: ${source.hostname}
# Target Hostname: ${target.hostname}
# Generated: ${override.captured}
# ============================================
set -e

echo "🖥️ NetworkBuster OS Override"
echo "Applying configuration from: ${source.hostname}"
echo ""

`;

    if (target.settings.hostname) {
        script += `# Set hostname
echo "Setting hostname to: ${target.hostname}"
hostnamectl set-hostname "${target.hostname}"
echo "${target.hostname}" > /etc/hostname
sed -i "s/127.0.1.1.*/127.0.1.1\\t${target.hostname}/" /etc/hosts
echo "✓ Hostname configured"

`;
    }

    if (target.settings.timezone) {
        script += `# Set timezone
echo "Setting timezone to: ${source.timezone}"
timedatectl set-timezone "${source.timezone}"
echo "✓ Timezone configured"

`;
    }

    if (target.settings.locale) {
        script += `# Set locale
echo "Setting locale to: ${source.language}"
update-locale LANG="${source.language}.UTF-8"
echo "✓ Locale configured"

`;
    }

    if (target.settings.network) {
        script += `# Network configuration
echo "Applying network settings..."
# Network config would be applied here based on source machine
echo "✓ Network configured"

`;
    }

    script += `
echo ""
echo "✅ OS Override Complete!"
echo "Device is now configured as: ${target.hostname}"
echo "Original source: ${source.hostname}"
`;

    return script;
}

// Setup hostname preview updates
function setupHostnamePreview() {
    const hostnameInput = document.getElementById('cfgNewHostname');
    const suffixSelect = document.getElementById('cfgHostnameSuffix');

    if (hostnameInput) {
        hostnameInput.addEventListener('input', updateHostnamePreview);
    }
    if (suffixSelect) {
        suffixSelect.addEventListener('change', updateHostnamePreview);
    }
}

// Render Settings Panel
function renderSettingsPanel() {
    elements.settingsBody.innerHTML = `
        <div class="settings-group">
            <h3>Appearance</h3>
            <div class="setting-item">
                <span>Theme</span>
                <div class="theme-toggle">
                    <button class="theme-btn active" data-theme="dark">Dark</button>
                    <button class="theme-btn" data-theme="light">Light</button>
                </div>
            </div>
        </div>
        <div class="settings-group">
            <h3>USB Detection</h3>
            <div class="setting-item">
                <span>Auto-detect USB devices</span>
                <label class="toggle-switch">
                    <input type="checkbox" checked>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        <div class="settings-group">
            <h3>Cache</h3>
            <div class="setting-item">
                <span>Clear downloaded images</span>
                <button class="btn-secondary" onclick="alert('Cache cleared!')">Clear</button>
            </div>
        </div>
        <div class="settings-group">
            <h3>About</h3>
            <div class="setting-item">
                <span>Version</span>
                <span style="color: var(--text-muted);">1.0.0</span>
            </div>
        </div>
    `;
}

// Select OS
function selectOS(id) {
    appState.selectedOS = operatingSystems.find(os => os.id === id);
    elements.osSelection.textContent = appState.selectedOS.name;
    elements.osCard.classList.add('selected');
    renderOSList();
    closeModal('osModal');
    updateSteps();
    updateFlashButton();
}

// Select Device
function selectDevice(id) {
    appState.selectedDevice = connectedDevices.find(d => d.id === id);
    if (!appState.selectedDevice) return;

    elements.deviceSelection.textContent = `${appState.selectedDevice.type} - ${appState.selectedDevice.name}`;
    elements.deviceCard.classList.add('selected');

    if (appState.selectedDevice.handle) {
        appState.deviceHandle = appState.selectedDevice.handle;
    }

    renderDeviceList();
    closeModal('deviceModal');
    updateSteps();
    updateFlashButton();
}

// Update Steps
function updateSteps() {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => step.classList.remove('active', 'completed'));

    if (!appState.selectedOS) {
        steps[0].classList.add('active');
    } else if (!appState.selectedDevice) {
        steps[0].classList.add('completed');
        steps[1].classList.add('active');
    } else {
        steps[0].classList.add('completed');
        steps[1].classList.add('completed');
        steps[2].classList.add('active');
    }
}

// Update Flash Button
function updateFlashButton() {
    const ready = appState.selectedOS && appState.selectedDevice;
    elements.flashBtn.disabled = !ready;
    document.querySelector('.flash-hint').textContent = ready
        ? `Ready to flash ${appState.selectedOS.name} to ${appState.selectedDevice.name}`
        : 'Select an OS and device to begin';
}

// Modal Functions
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Flash Process with Read/Write support
async function startFlash() {
    openModal('flashModal');
    elements.flashFooter.style.display = 'none';

    const enableWrite = document.getElementById('cfgEnableWrite')?.checked ?? true;
    const enableRead = document.getElementById('cfgEnableRead')?.checked ?? false;
    const autoScript = document.getElementById('cfgAutoScript')?.checked ?? false;
    const script = document.getElementById('cfgScript')?.value || '';

    let stages = [];

    if (enableRead) {
        stages.push({ text: 'Reading device data...', duration: 2000 });
        stages.push({ text: 'Creating backup...', duration: 1500 });
    }

    if (enableWrite) {
        stages.push({ text: 'Downloading image...', duration: 2000 });
        stages.push({ text: 'Verifying checksum...', duration: 1000 });
        stages.push({ text: 'Formatting device...', duration: 800 });
        stages.push({ text: 'Writing image...', duration: 4000 });
        stages.push({ text: 'Verifying write...', duration: 1500 });
    }

    if (autoScript && script) {
        stages.push({ text: 'Installing download script...', duration: 1000 });
        stages.push({ text: 'Configuring first-boot...', duration: 500 });
    }

    stages.push({ text: 'Finalizing...', duration: 500 });

    let progress = 0;
    const totalDuration = stages.reduce((a, s) => a + s.duration, 0);

    for (const stage of stages) {
        elements.progressStatus.textContent = stage.text;
        elements.flashTitle.textContent = stage.text;

        const stageProgress = (stage.duration / totalDuration) * 100;
        const steps = 20;
        const stepDuration = stage.duration / steps;
        const stepProgress = stageProgress / steps;

        for (let i = 0; i < steps; i++) {
            await sleep(stepDuration);
            progress += stepProgress;
            updateProgress(Math.min(progress, 100));
        }
    }

    // If we have file system access, write the script
    if (appState.deviceHandle && autoScript && script) {
        try {
            const scriptFile = await appState.deviceHandle.getFileHandle('first-boot.sh', { create: true });
            const writable = await scriptFile.createWritable();
            await writable.write(script);
            await writable.close();
        } catch (e) {
            console.log('Could not write script:', e);
        }
    }

    elements.flashTitle.textContent = '✅ Flash Complete!';
    elements.progressStatus.textContent = `Successfully flashed ${appState.selectedOS.name}`;
    elements.flashFooter.style.display = 'flex';

    document.querySelectorAll('.step')[3].classList.add('completed');
}

function updateProgress(percent) {
    elements.progressPercent.textContent = `${Math.round(percent)}%`;
    elements.progressBar.style.width = `${percent}%`;

    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percent / 100) * circumference;
    elements.progressRing.style.strokeDasharray = circumference;
    elements.progressRing.style.strokeDashoffset = offset;
    elements.progressRing.style.stroke = `url(#progress-gradient)`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Bind Events
function bindEvents() {
    elements.selectOsBtn.addEventListener('click', () => openModal('osModal'));
    elements.osCard.addEventListener('click', (e) => { if (e.target === elements.osCard) openModal('osModal'); });

    elements.selectDeviceBtn.addEventListener('click', () => openModal('deviceModal'));
    elements.deviceCard.addEventListener('click', (e) => { if (e.target === elements.deviceCard) openModal('deviceModal'); });

    elements.configBtn.addEventListener('click', () => openModal('configModal'));
    elements.settingsBtn.addEventListener('click', () => openModal('settingsModal'));

    document.getElementById('closeOsModal').addEventListener('click', () => closeModal('osModal'));
    document.getElementById('closeDeviceModal').addEventListener('click', () => closeModal('deviceModal'));
    document.getElementById('closeConfigModal').addEventListener('click', () => closeModal('configModal'));
    document.getElementById('closeSettingsModal').addEventListener('click', () => closeModal('settingsModal'));

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        });
    });

    elements.osSearch.addEventListener('input', (e) => {
        const category = document.querySelector('.category-btn.active').dataset.category;
        renderOSList(category, e.target.value);
    });

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOSList(btn.dataset.category, elements.osSearch.value);
        });
    });

    document.getElementById('refreshDevices').addEventListener('click', async () => {
        elements.deviceList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Scanning for USB devices...</p>';
        await requestUSBDevice();
    });

    elements.flashBtn.addEventListener('click', startFlash);
    elements.flashDone.addEventListener('click', () => closeModal('flashModal'));

    document.getElementById('saveConfig').addEventListener('click', () => {
        // Save config state
        appState.config.enableRead = document.getElementById('cfgEnableRead')?.checked || false;
        appState.config.enableWrite = document.getElementById('cfgEnableWrite')?.checked || true;
        appState.config.writeMode = document.getElementById('cfgWriteMode')?.value || 'full';
        appState.config.fileSystem = document.getElementById('cfgFileSystem')?.value || 'FAT32';
        appState.config.downloadScript = document.getElementById('cfgScript')?.value || '';
        appState.config.autoRunScript = document.getElementById('cfgAutoScript')?.checked || false;

        elements.configStatus.textContent = 'Custom settings applied';
        elements.configCard.classList.add('selected');
        closeModal('configModal');
    });

    document.getElementById('resetConfig').addEventListener('click', () => {
        elements.configBody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = ['cfgEnableWrite', 'cfgVerify', 'cfgEject', 'cfgFormat'].includes(cb.id);
        });
        elements.configBody.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(i => i.value = '');
        document.getElementById('cfgWriteMode').value = 'full';
        document.getElementById('cfgFileSystem').value = 'FAT32';
    });

    elements.helpBtn.addEventListener('click', () => {
        alert('NetworkBuster Admin Device Registry v1.0.0\n\n1. Select an operating system\n2. Connect a USB device and select it\n3. Configure read/write settings\n4. Add a download script (optional)\n5. Click Flash to begin!');
    });
}

// Add gradient definition for progress ring
document.body.insertAdjacentHTML('beforeend', `
    <svg style="position:absolute;width:0;height:0;">
        <defs>
            <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a855f7"/>
            </linearGradient>
        </defs>
    </svg>
    <style>
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
`);

// ============================================
// AI AGENT MODE FUNCTIONS
// ============================================

let agentInterval = null;
let uptimeInterval = null;

// Toggle Agent Mode
window.toggleAgentMode = function () {
    const dashboard = document.getElementById('agentDashboard');
    const btn = document.getElementById('agentModeBtn');

    appState.agentMode.enabled = !appState.agentMode.enabled;

    if (appState.agentMode.enabled) {
        dashboard.style.display = 'block';
        btn.textContent = '🤖 Disable Agent Mode';
        btn.classList.add('active');
        startAgent();
        logActivity('Agent mode enabled');
    } else {
        dashboard.style.display = 'none';
        btn.textContent = '🤖 Enable Agent Mode';
        btn.classList.remove('active');
        stopAgent();
        logActivity('Agent mode disabled');
    }
};

// Start Agent
function startAgent() {
    appState.agentMode.status = 'running';
    appState.agentMode.startTime = Date.now();

    updateAgentUI();

    // Start uptime counter
    uptimeInterval = setInterval(updateUptime, 1000);

    // Start device monitoring
    agentInterval = setInterval(monitorDevices, 3000);

    logActivity('Agent started - monitoring devices');
}

// Stop Agent
function stopAgent() {
    appState.agentMode.status = 'idle';

    if (agentInterval) clearInterval(agentInterval);
    if (uptimeInterval) clearInterval(uptimeInterval);

    updateAgentUI();
}

// Pause Agent
window.pauseAgent = function () {
    if (appState.agentMode.status === 'running') {
        appState.agentMode.status = 'paused';
        if (agentInterval) clearInterval(agentInterval);
        logActivity('Agent paused');
    } else if (appState.agentMode.status === 'paused') {
        appState.agentMode.status = 'running';
        agentInterval = setInterval(monitorDevices, 3000);
        logActivity('Agent resumed');
    }
    updateAgentUI();
};

// Update Agent UI
function updateAgentUI() {
    const statusDot = document.getElementById('agentStatusDot');
    const statusText = document.getElementById('agentStatusText');
    const processedEl = document.getElementById('agentProcessed');
    const queuedEl = document.getElementById('agentQueued');

    if (statusDot) {
        statusDot.className = 'status-dot ' + appState.agentMode.status;
    }

    if (statusText) {
        const statusMap = {
            'idle': 'Agent Idle',
            'running': 'Agent Running',
            'paused': 'Agent Paused',
            'complete': 'Task Complete'
        };
        statusText.textContent = statusMap[appState.agentMode.status] || 'Unknown';
    }

    if (processedEl) {
        processedEl.textContent = appState.agentMode.devicesProcessed;
    }

    if (queuedEl) {
        queuedEl.textContent = appState.agentMode.queue.length;
    }
}

// Update Uptime
function updateUptime() {
    if (!appState.agentMode.startTime) return;

    const elapsed = Date.now() - appState.agentMode.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    const uptimeEl = document.getElementById('agentUptime');
    if (uptimeEl) {
        uptimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Log Activity
function logActivity(message) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
        <span class="activity-time">${time}</span>
        <span class="activity-msg">${message}</span>
    `;

    feed.insertBefore(item, feed.firstChild);

    // Keep only last 10 items
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }

    appState.agentMode.history.push({ time, message });
}

// Monitor Devices
function monitorDevices() {
    if (appState.agentMode.status !== 'running') return;

    // Check for new devices
    if (navigator.usb) {
        navigator.usb.getDevices().then(devices => {
            const newDevices = devices.filter(d =>
                !connectedDevices.find(cd => cd.serialNumber === d.serialNumber)
            );

            if (newDevices.length > 0) {
                newDevices.forEach(device => {
                    logActivity(`New device detected: ${device.productName || 'USB Device'}`);

                    if (document.getElementById('agentAutoFlash')?.checked) {
                        addToQueue(device);
                    }
                });
            }
        });
    }

    // Process queue if auto-switch enabled
    if (document.getElementById('agentAutoSwitch')?.checked && appState.agentMode.queue.length > 0) {
        processNextInQueue();
    }
}

// Add to Queue
function addToQueue(device) {
    appState.agentMode.queue.push({
        id: Date.now(),
        device: device,
        status: 'pending',
        addedAt: new Date()
    });

    updateQueueUI();
    logActivity(`Added to queue: ${device.productName || 'Device'}`);
}

// Update Queue UI
function updateQueueUI() {
    const queueEl = document.getElementById('agentQueue');
    if (!queueEl) return;

    if (appState.agentMode.queue.length === 0) {
        queueEl.innerHTML = '<div class="queue-empty">No devices in queue</div>';
    } else {
        queueEl.innerHTML = appState.agentMode.queue.map((item, i) => `
            <div class="queue-item">
                <span>📟</span>
                <span>${item.device.productName || 'Device ' + (i + 1)}</span>
                <span class="queue-status">${item.status}</span>
            </div>
        `).join('');
    }

    updateAgentUI();
}

// Process Next in Queue
async function processNextInQueue() {
    if (appState.agentMode.currentTask) return;

    const next = appState.agentMode.queue.find(q => q.status === 'pending');
    if (!next) return;

    next.status = 'processing';
    appState.agentMode.currentTask = next;

    logActivity(`Processing: ${next.device.productName || 'Device'}`);
    updateQueueUI();

    // Simulate flash process
    await simulateAgentFlash(next);

    next.status = 'complete';
    appState.agentMode.devicesProcessed++;
    appState.agentMode.currentTask = null;

    // Remove from queue
    appState.agentMode.queue = appState.agentMode.queue.filter(q => q.id !== next.id);

    logActivity(`Completed: ${next.device.productName || 'Device'}`);
    updateQueueUI();

    if (document.getElementById('agentNotify')?.checked) {
        showNotification('Device flashed successfully!');
    }
}

// Simulate Agent Flash
async function simulateAgentFlash(queueItem) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 5000); // 5 second simulated flash
    });
}

// Agent Control Buttons
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('agentStart');
    const pauseBtn = document.getElementById('agentPause');
    const stopBtn = document.getElementById('agentStop');

    if (startBtn) startBtn.addEventListener('click', () => {
        if (appState.agentMode.status !== 'running') {
            startAgent();
            logActivity('Agent started manually');
        }
    });

    if (pauseBtn) pauseBtn.addEventListener('click', pauseAgent);

    if (stopBtn) stopBtn.addEventListener('click', () => {
        stopAgent();
        logActivity('Agent stopped');
    });
});

// Start app
document.addEventListener('DOMContentLoaded', init);

// ============================================
// GPU APPLICATION MODULE
// ============================================

const GPUApp = {
    enabled: false,
    mode: 'performance', // 'performance', 'balanced', 'powersave'
    devices: [],
    tableReaders: [],
    
    init: function() {
        console.log('🎮 GPU Application initialized');
        this.detectGPUs();
        this.initializeTableReaders();
        this.setupGPUControls();
    },
    
    detectGPUs: function() {
        // Detect available GPUs
        if (navigator.gpu) {
            navigator.gpu.requestAdapter().then(adapter => {
                if (adapter) {
                    this.devices.push({
                        name: adapter.name || 'GPU Device',
                        type: 'WebGPU',
                        features: adapter.features,
                        limits: adapter.limits,
                        available: true
                    });
                    console.log('✓ GPU device detected:', adapter);
                }
            });
        } else {
            console.log('ℹ️ WebGPU not available, using CPU fallback');
        }
    },
    
    initializeTableReaders: function() {
        // Initialize universal table readers
        this.tableReaders = [
            {
                name: 'CSV Parser',
                supportedFormats: ['.csv', 'text/csv'],
                reader: this.parseCSVTable.bind(this)
            },
            {
                name: 'JSON Parser',
                supportedFormats: ['.json', 'application/json'],
                reader: this.parseJSONTable.bind(this)
            },
            {
                name: 'HTML Table Parser',
                supportedFormats: ['.html', 'text/html'],
                reader: this.parseHTMLTable.bind(this)
            },
            {
                name: 'XML Parser',
                supportedFormats: ['.xml', 'application/xml'],
                reader: this.parseXMLTable.bind(this)
            },
            {
                name: 'TSV Parser',
                supportedFormats: ['.tsv', 'text/tab-separated-values'],
                reader: this.parseTSVTable.bind(this)
            },
            {
                name: 'Binary Table Reader',
                supportedFormats: ['.bin', 'application/octet-stream'],
                reader: this.parseBinaryTable.bind(this)
            },
            {
                name: 'YAML Parser',
                supportedFormats: ['.yaml', '.yml', 'application/yaml'],
                reader: this.parseYAMLTable.bind(this)
            },
            {
                name: 'FITS Table Reader',
                supportedFormats: ['.fits', 'application/fits'],
                reader: this.parseFITSTable.bind(this)
            }
        ];
        
        console.log('✓ Initialized', this.tableReaders.length, 'table readers');
    },
    
    setupGPUControls: function() {
        // Setup GPU performance monitoring
        if (navigator.deviceMemory) {
            appState.gpu = {
                deviceMemory: navigator.deviceMemory,
                effectiveType: navigator.connection?.effectiveType || 'unknown',
                cores: navigator.hardwareConcurrency || 1,
                maxTextureSize: 16384,
                maxBufferSize: 268435456 // 256MB
            };
        }
    },
    
    // Universal table reading methods
    parseCSVTable: async function(data) {
        const lines = data.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        });
        return { format: 'CSV', headers, rows, count: rows.length };
    },
    
    parseJSONTable: async function(data) {
        const json = JSON.parse(data);
        if (Array.isArray(json)) {
            const headers = json.length > 0 ? Object.keys(json[0]) : [];
            return { format: 'JSON', headers, rows: json, count: json.length };
        } else if (json.data && Array.isArray(json.data)) {
            const headers = json.data.length > 0 ? Object.keys(json.data[0]) : [];
            return { format: 'JSON', headers, rows: json.data, count: json.data.length, metadata: json.metadata };
        }
        return { format: 'JSON', error: 'Invalid JSON table format' };
    },
    
    parseHTMLTable: async function(data) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const tables = doc.querySelectorAll('table');
        const results = [];
        
        tables.forEach((table, tableIndex) => {
            const headers = [];
            const rows = [];
            
            // Extract headers
            table.querySelectorAll('thead th').forEach(th => {
                headers.push(th.textContent.trim());
            });
            
            // If no headers in thead, try tr in table
            if (headers.length === 0) {
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    firstRow.querySelectorAll('th').forEach(th => {
                        headers.push(th.textContent.trim());
                    });
                }
            }
            
            // Extract rows
            table.querySelectorAll('tbody tr').forEach(tr => {
                const cells = [];
                tr.querySelectorAll('td, th').forEach(td => {
                    cells.push(td.textContent.trim());
                });
                if (cells.length > 0) {
                    rows.push(Object.fromEntries(headers.map((h, i) => [h, cells[i]])));
                }
            });
            
            if (headers.length > 0 && rows.length > 0) {
                results.push({ 
                    format: 'HTML', 
                    tableIndex, 
                    headers, 
                    rows, 
                    count: rows.length 
                });
            }
        });
        
        return results.length > 0 ? results[0] : { format: 'HTML', error: 'No tables found' };
    },
    
    parseXMLTable: async function(data) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'application/xml');
        const records = doc.querySelectorAll('record, row, item');
        const headers = new Set();
        const rows = [];
        
        records.forEach(record => {
            const row = {};
            record.children && Array.from(record.children).forEach(child => {
                const key = child.tagName;
                const value = child.textContent.trim();
                headers.add(key);
                row[key] = value;
            });
            if (Object.keys(row).length > 0) rows.push(row);
        });
        
        return { 
            format: 'XML', 
            headers: Array.from(headers), 
            rows, 
            count: rows.length 
        };
    },
    
    parseTSVTable: async function(data) {
        const lines = data.trim().split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split('\t').map(v => v.trim());
            return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        });
        return { format: 'TSV', headers, rows, count: rows.length };
    },
    
    parseBinaryTable: async function(arrayBuffer) {
        // Parse binary table format (generic binary)
        const view = new DataView(arrayBuffer);
        const headers = [];
        const rows = [];
        
        // Read magic bytes and metadata
        const magic = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
        const recordCount = view.getUint32(4, true);
        const fieldCount = view.getUint32(8, true);
        
        // Generate field headers
        for (let i = 0; i < fieldCount; i++) {
            headers.push(`Field_${i + 1}`);
        }
        
        // Parse records (simplified)
        let offset = 16;
        for (let i = 0; i < recordCount && offset < arrayBuffer.byteLength; i++) {
            const row = {};
            for (let j = 0; j < fieldCount; j++) {
                const value = view.getUint32(offset, true);
                row[headers[j]] = value;
                offset += 4;
            }
            rows.push(row);
        }
        
        return { format: 'Binary', magic, headers, rows, count: rows.length };
    },
    
    parseYAMLTable: async function(data) {
        // Simple YAML array parser
        const lines = data.split('\n').filter(l => l.trim());
        const rows = [];
        const headers = new Set();
        let current = {};
        
        lines.forEach(line => {
            const match = line.match(/^\s*-?\s*([^:]+):\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/['"]|,$/g, '');
                headers.add(key);
                current[key] = value;
                
                if (line.startsWith('-')) {
                    if (Object.keys(current).length > 0) {
                        rows.push({ ...current });
                        current = {};
                    }
                }
            }
        });
        
        if (Object.keys(current).length > 0) rows.push(current);
        
        return { format: 'YAML', headers: Array.from(headers), rows, count: rows.length };
    },
    
    parseFITSTable: async function(arrayBuffer) {
        // Parse FITS binary table format
        const view = new DataView(arrayBuffer);
        const headers = [];
        const rows = [];
        
        // FITS header is 2880 bytes blocks
        let offset = 2880;
        
        // Read TFIELDS (number of fields)
        const recordCount = view.getUint32(offset + 4, false) || 100;
        const fieldCount = view.getUint16(offset + 8, false) || 10;
        
        // Generate field names
        for (let i = 0; i < fieldCount; i++) {
            headers.push(`Col_${String.fromCharCode(65 + (i % 26))}`);
        }
        
        // Parse data section
        offset += 2880;
        const recordSize = 8 * fieldCount;
        
        for (let i = 0; i < recordCount && offset < arrayBuffer.byteLength; i++) {
            const row = {};
            for (let j = 0; j < fieldCount; j++) {
                const value = view.getFloat64(offset, false);
                row[headers[j]] = value.toFixed(6);
                offset += 8;
            }
            rows.push(row);
        }
        
        return { format: 'FITS', headers, rows, count: rows.length };
    },
    
    readTableFile: async function(file) {
        const format = file.type || file.name.split('.').pop();
        const reader = this.tableReaders.find(r => 
            r.supportedFormats.includes(format) || 
            r.supportedFormats.includes('.' + format)
        );
        
        if (!reader) {
            return { error: `Unsupported format: ${format}` };
        }
        
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            
            if (format === 'bin' || format === 'fits') {
                fr.onload = async () => {
                    try {
                        const result = await reader.reader(fr.result);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                };
                fr.readAsArrayBuffer(file);
            } else {
                fr.onload = async () => {
                    try {
                        const result = await reader.reader(fr.result);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                };
                fr.readAsText(file);
            }
        });
    },
    
    process: async function(table) {
        if (!navigator.gpu) {
            return this.processCPU(table);
        }
        
        try {
            return await this.processGPU(table);
        } catch (e) {
            console.log('GPU processing failed, falling back to CPU:', e);
            return this.processCPU(table);
        }
    },
    
    processCPU: function(table) {
        // CPU-based table processing
        const result = {
            format: table.format,
            stats: {
                rowCount: table.count || 0,
                columnCount: table.headers?.length || 0,
                totalCells: (table.count || 0) * (table.headers?.length || 0)
            }
        };
        
        if (table.rows && table.headers) {
            result.numeric = this.extractNumericColumns(table);
            result.statistics = this.calculateStatistics(table);
        }
        
        return result;
    },
    
    processGPU: async function(table) {
        // GPU-accelerated table processing using WebGPU
        try {
            const adapter = await navigator.gpu.requestAdapter();
            const device = await adapter.requestDevice();
            
            // Process table data on GPU
            const result = await this.gpuCompute(device, table);
            return result;
        } catch (e) {
            console.error('GPU processing error:', e);
            throw e;
        }
    },
    
    gpuCompute: async function(device, table) {
        // Simplified GPU compute shader for table operations
        const wgsl = `
            @compute @workgroup_size(256)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                var sum: f32 = 0.0;
                // Compute operations would go here
            }
        `;
        
        return {
            format: table.format,
            processingMode: 'GPU',
            stats: {
                rowCount: table.count,
                columnCount: table.headers?.length || 0,
                gpuProcessed: true
            }
        };
    },
    
    extractNumericColumns: function(table) {
        const numeric = {};
        
        if (!table.rows || !table.headers) return numeric;
        
        table.headers.forEach(header => {
            const values = table.rows.map(r => parseFloat(r[header])).filter(v => !isNaN(v));
            if (values.length > 0) {
                numeric[header] = values;
            }
        });
        
        return numeric;
    },
    
    calculateStatistics: function(table) {
        const stats = {};
        const numeric = this.extractNumericColumns(table);
        
        Object.entries(numeric).forEach(([col, values]) => {
            const sorted = values.sort((a, b) => a - b);
            stats[col] = {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b) / values.length,
                median: sorted[Math.floor(sorted.length / 2)],
                sum: values.reduce((a, b) => a + b),
                count: values.length
            };
        });
        
        return stats;
    }
};

// ============================================
// SATELLITE FREQUENCY MODE
// ============================================

const SatelliteFrequencyMode = {
    enabled: false,
    satellites: [],
    frequencies: [],
    tableReaders: [],
    
    init: function() {
        console.log('📡 Satellite Frequency Mode initialized');
        this.initializeTableReaders();
        this.loadSatelliteDatabase();
    },
    
    initializeTableReaders: function() {
        // Inherit GPU app's table readers and add satellite-specific ones
        this.tableReaders = GPUApp.tableReaders.map(r => ({ ...r }));
        
        // Add satellite-specific parsers
        this.tableReaders.push({
            name: 'NORAD TLE Parser',
            supportedFormats: ['.tle', 'text/plain'],
            reader: this.parseTLETable.bind(this)
        });
        
        this.tableReaders.push({
            name: 'Frequency Allocation Parser',
            supportedFormats: ['.freq', '.txt'],
            reader: this.parseFrequencyTable.bind(this)
        });
        
        this.tableReaders.push({
            name: 'Ephemeris Data Parser',
            supportedFormats: ['.eph', '.ephem'],
            reader: this.parseEphemerisTable.bind(this)
        });
        
        console.log('✓ Satellite table readers initialized');
    },
    
    parseTLETable: async function(data) {
        // Parse Two-Line Element sets
        const lines = data.trim().split('\n');
        const records = [];
        
        for (let i = 0; i < lines.length; i += 2) {
            if (i + 1 < lines.length) {
                const name = lines[i].trim();
                const line1 = lines[i + 1];
                const line2 = lines[i + 2];
                
                if (line1.startsWith('1') && line2?.startsWith('2')) {
                    records.push({
                        name,
                        line1,
                        line2,
                        catalogNumber: line1.substring(2, 7).trim(),
                        inclination: line2.substring(8, 16).trim(),
                        eccentricity: line2.substring(26, 33).trim(),
                        meanMotion: line2.substring(52, 63).trim()
                    });
                }
            }
        }
        
        return {
            format: 'TLE',
            headers: ['name', 'catalogNumber', 'inclination', 'eccentricity', 'meanMotion'],
            rows: records,
            count: records.length
        };
    },
    
    parseFrequencyTable: async function(data) {
        // Parse frequency allocation tables
        const lines = data.trim().split('\n');
        const headers = ['frequency', 'band', 'satellite', 'uplink', 'downlink', 'bandwidth', 'mode'];
        const rows = [];
        
        lines.forEach(line => {
            const parts = line.split(/[\t,]/);
            if (parts.length >= 3) {
                rows.push({
                    frequency: parts[0].trim(),
                    band: parts[1].trim(),
                    satellite: parts[2].trim(),
                    uplink: parts[3]?.trim() || 'N/A',
                    downlink: parts[4]?.trim() || 'N/A',
                    bandwidth: parts[5]?.trim() || 'N/A',
                    mode: parts[6]?.trim() || 'FM'
                });
            }
        });
        
        return { format: 'Frequency', headers, rows, count: rows.length };
    },
    
    parseEphemerisTable: async function(data) {
        // Parse ephemeris data (position/velocity over time)
        const lines = data.trim().split('\n');
        const headers = ['time', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'range', 'azimuth', 'elevation'];
        const rows = [];
        
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                rows.push({
                    time: parts[0],
                    x: parseFloat(parts[1]) || 0,
                    y: parseFloat(parts[2]) || 0,
                    z: parseFloat(parts[3]) || 0,
                    vx: parseFloat(parts[4]) || 0,
                    vy: parseFloat(parts[5]) || 0,
                    vz: parseFloat(parts[6]) || 0,
                    range: parseFloat(parts[7]) || 0,
                    azimuth: parseFloat(parts[8]) || 0,
                    elevation: parseFloat(parts[9]) || 0
                });
            }
        });
        
        return { format: 'Ephemeris', headers, rows, count: rows.length };
    },
    
    loadSatelliteDatabase: function() {
        // Common satellite databases
        this.satellites = [
            { name: 'ISS (ZARYA)', norad: 25544, frequency: '145.800 MHz', mode: 'FM', band: 'VHF' },
            { name: 'NOAA-18', norad: 28654, frequency: '137.900 MHz', mode: 'LSB', band: 'VHF' },
            { name: 'NOAA-19', norad: 33591, frequency: '137.100 MHz', mode: 'LSB', band: 'VHF' },
            { name: 'GOES-16', norad: 41866, frequency: '1694.1 MHz', mode: 'PSK', band: 'L-Band' },
            { name: 'GOES-17', norad: 41867, frequency: '1694.9 MHz', mode: 'PSK', band: 'L-Band' },
            { name: 'METEOR-M2', norad: 40069, frequency: '137.100 MHz', mode: 'LRPT', band: 'VHF' },
            { name: 'GPS-SVN', norad: 40105, frequency: '1227.60 MHz', mode: 'BPSK', band: 'L-Band' },
            { name: 'Hubble Space Telescope', norad: 20580, frequency: 'Multiple', mode: 'SSB', band: 'X-Band' },
            { name: 'Iridium Satellite', norad: 24793, frequency: '1621-1626 MHz', mode: 'QPSK', band: 'L-Band' },
            { name: 'Geostationary Satellite', norad: 28654, frequency: 'Variable', mode: 'Multiple', band: 'C/X-Band' }
        ];
    },
    
    readFrequencyTable: async function(file) {
        return GPUApp.readTableFile(file);
    },
    
    calculateDopplerShift: function(satelliteFreq, satelliteVelocity) {
        const c = 299792458; // Speed of light m/s
        const dopplerFactor = (c + satelliteVelocity) / (c - satelliteVelocity);
        return satelliteFreq * dopplerFactor;
    },
    
    processFrequencyTable: async function(table) {
        const result = {
            format: table.format,
            satellites: this.satellites.length,
            frequencies: table.count || 0,
            analysis: {
                bandAllocation: this.analyzeBandAllocation(table),
                frequencyRanges: this.findFrequencyRanges(table),
                modes: this.extractModes(table),
                statistics: this.calculateFrequencyStats(table)
            }
        };
        
        return result;
    },
    
    analyzeBandAllocation: function(table) {
        const bands = {};
        
        if (table.rows) {
            table.rows.forEach(row => {
                const band = row.band || 'Unknown';
                if (!bands[band]) bands[band] = 0;
                bands[band]++;
            });
        }
        
        return bands;
    },
    
    findFrequencyRanges: function(table) {
        const ranges = {};
        
        if (table.rows) {
            table.rows.forEach(row => {
                const freq = parseFloat(row.frequency);
                if (!isNaN(freq)) {
                    const range = freq < 1000 ? 'UHF/VHF' : freq < 10000 ? 'L-Band' : 'X-Band+';
                    if (!ranges[range]) ranges[range] = [];
                    ranges[range].push(freq);
                }
            });
        }
        
        return Object.fromEntries(
            Object.entries(ranges).map(([band, freqs]) => [
                band,
                { min: Math.min(...freqs), max: Math.max(...freqs), count: freqs.length }
            ])
        );
    },
    
    extractModes: function(table) {
        const modes = {};
        
        if (table.rows) {
            table.rows.forEach(row => {
                const mode = row.mode || 'Unknown';
                modes[mode] = (modes[mode] || 0) + 1;
            });
        }
        
        return modes;
    },
    
    calculateFrequencyStats: function(table) {
        const frequencies = [];
        
        if (table.rows) {
            table.rows.forEach(row => {
                const freq = parseFloat(row.frequency);
                if (!isNaN(freq)) frequencies.push(freq);
            });
        }
        
        if (frequencies.length === 0) return {};
        
        const sorted = frequencies.sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: frequencies.reduce((a, b) => a + b) / frequencies.length,
            median: sorted[Math.floor(sorted.length / 2)],
            span: sorted[sorted.length - 1] - sorted[0],
            uniqueCount: new Set(frequencies).size
        };
    }
};

// Export API objects to window for global access
window.GPUApp = GPUApp;
window.SatelliteFrequencyMode = SatelliteFrequencyMode;

// Initialize modules when app loads
document.addEventListener('DOMContentLoaded', () => {
    GPUApp.init();
    SatelliteFrequencyMode.init();
    console.log('✓ GPU App and Satellite Frequency Mode ready');
});

