import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Application state
const appState = {
  startTime: Date.now(),
  requestCount: 0,
  status: 'running',
  uptime: 0,
  lastAction: null,
  logs: []
};

// Helper function to add logs
function addLog(action, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action} ${details}`;
  appState.logs.push(logEntry);
  if (appState.logs.length > 100) {
    appState.logs.shift();
  }
  console.log(logEntry);
}

// Update uptime
setInterval(() => {
  appState.uptime = Math.floor((Date.now() - appState.startTime) / 1000);
}, 1000);

// Request counter middleware
app.use((req, res, next) => {
  appState.requestCount++;
  next();
});

// ============================================
// OPERATIONAL API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: appState.uptime,
    requestCount: appState.requestCount,
    port: PORT
  });
});

// Get system status
app.get('/api/status', (req, res) => {
  res.json({
    status: appState.status,
    uptime: appState.uptime,
    requestCount: appState.requestCount,
    startTime: new Date(appState.startTime).toISOString(),
    lastAction: appState.lastAction,
    systemInfo: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memoryUsage: process.memoryUsage(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem()
    }
  });
});

// Get application logs
app.get('/api/logs', (req, res) => {
  res.json({
    logs: appState.logs,
    count: appState.logs.length
  });
});

// Clear logs
app.post('/api/logs/clear', (req, res) => {
  appState.logs = [];
  appState.lastAction = 'Logs cleared';
  addLog('Cleared logs');
  res.json({ message: 'Logs cleared successfully', timestamp: new Date().toISOString() });
});

// Restart application indicator
app.post('/api/restart', (req, res) => {
  appState.lastAction = 'Restart initiated';
  addLog('Restart requested');
  res.json({
    message: 'Application restart requested',
    timestamp: new Date().toISOString(),
    action: 'restart'
  });
});

// Get component status
app.get('/api/components', (req, res) => {
  res.json({
    components: {
      webApp: { status: 'running', path: '/', port: PORT },
      dashboard: { status: 'running', path: '/dashboard', port: PORT },
      overlay: { status: 'running', path: '/overlay', port: PORT },
      blog: { status: 'running', path: '/blog', port: PORT },
      api: { status: 'running', path: '/api', port: PORT }
    },
    timestamp: new Date().toISOString()
  });
});

// Toggle feature endpoint
app.post('/api/toggle/:feature', (req, res) => {
  const { feature } = req.params;
  const isEnabled = req.body.enabled !== false;
  appState.lastAction = `Feature ${feature} toggled: ${isEnabled}`;
  addLog(`Toggled ${feature}`, `enabled: ${isEnabled}`);
  res.json({
    feature,
    enabled: isEnabled,
    message: `${feature} is now ${isEnabled ? 'enabled' : 'disabled'}`,
    timestamp: new Date().toISOString()
  });
});

// AI World route - Interactive AI environment
app.get('/ai-world', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI World - NetworkBuster</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:linear-gradient(135deg,#1a202c,#2d3748);min-height:100vh;color:#e2e8f0;padding:20px}html,body{height:100%}.container{max-width:1400px;margin:0 auto}.header{text-align:center;margin-bottom:40px}.header h1{font-size:3.5em;margin-bottom:10px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.header p{font-size:1.2em;opacity:.8}.world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:25px;margin-bottom:40px}.world-card{background:rgba(45,55,72,.6);border:1px solid rgba(102,126,234,.3);border-radius:12px;padding:25px;backdrop-filter:blur(10px);transition:all .3s ease}.world-card:hover{border-color:#667eea;background:rgba(45,55,72,.8);transform:translateY(-5px)}.card-icon{font-size:3em;margin-bottom:15px}.card-title{font-size:1.3em;font-weight:700;margin-bottom:10px;color:#667eea}.card-desc{font-size:.95em;opacity:.8;line-height:1.6;margin-bottom:15px}.card-button{width:100%;padding:12px;background:#667eea;border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;transition:all .2s}.card-button:hover{background:#5568d3;transform:translateY(-2px)}.ai-features{background:rgba(45,55,72,.6);border:1px solid rgba(102,126,234,.3);border-radius:12px;padding:25px;margin-bottom:40px;backdrop-filter:blur(10px)}.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:20px}.feature-item{background:rgba(102,126,234,.1);padding:15px;border-radius:8px;border-left:3px solid #667eea}.feature-name{font-weight:600;color:#667eea;margin-bottom:5px}.feature-desc{font-size:.9em;opacity:.7}.ai-simulator{background:rgba(45,55,72,.6);border:1px solid rgba(102,126,234,.3);border-radius:12px;padding:25px;margin-bottom:40px;backdrop-filter:blur(10px)}.sim-input{width:100%;padding:12px;margin-bottom:15px;background:rgba(0,0,0,.3);border:1px solid rgba(102,126,234,.3);border-radius:6px;color:#e2e8f0;font-size:1em}.sim-output{background:#1a202c;padding:15px;border-radius:6px;max-height:300px;overflow-y:auto;font-family:monospace;margin-top:15px}.stat-box{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin:20px 0}.stat-card{background:rgba(102,126,234,.1);padding:15px;border-radius:8px;text-align:center;border-left:3px solid #667eea}.stat-number{font-size:2em;font-weight:700;color:#667eea}.stat-label{font-size:.9em;opacity:.7;margin-top:5px}.modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:1000;align-items:center;justify-content:center}.modal.active{display:flex}.modal-content{background:#2d3748;border:1px solid #667eea;border-radius:12px;padding:30px;max-width:600px;width:90%}.modal-close{float:right;font-size:2em;cursor:pointer;color:#667eea}.close-btn{background:#667eea;padding:10px 20px;border:none;border-radius:6px;color:#fff;cursor:pointer;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>🌍 AI World</h1><p>Artificial Intelligence Learning & Simulation Environment</p></div><div class="world-grid"><div class="world-card"><div class="card-icon">🧠</div><div class="card-title">Machine Learning</div><div class="card-desc">Explore neural networks, deep learning models, and algorithm training</div><button class="card-button" onclick="loadModule('ml')">Explore ML</button></div><div class="world-card"><div class="card-icon">🤖</div><div class="card-title">AI Agents</div><div class="card-desc">Interactive autonomous agents with decision-making capabilities</div><button class="card-button" onclick="loadModule('agents')">Explore Agents</button></div><div class="world-card"><div class="card-icon">📊</div><div class="card-title">Data Science</div><div class="card-desc">Analyze datasets, visualize patterns, and extract insights</div><button class="card-button" onclick="loadModule('data')">Explore Data</button></div><div class="world-card"><div class="card-icon">🔮</div><div class="card-title">Predictions</div><div class="card-desc">Forecasting tools and predictive models for trend analysis</div><button class="card-button" onclick="loadModule('predict')">Explore Predictions</button></div><div class="world-card"><div class="card-icon">🗣️</div><div class="card-title">NLP</div><div class="card-desc">Natural Language Processing - text analysis and generation</div><button class="card-button" onclick="loadModule('nlp')">Explore NLP</button></div><div class="world-card"><div class="card-icon">👁️</div><div class="card-title">Computer Vision</div><div class="card-desc">Image recognition, object detection, and visual understanding</div><button class="card-button" onclick="loadModule('vision')">Explore Vision</button></div></div><div class="ai-features"><h2>🚀 AI World Features</h2><div class="feature-grid"><div class="feature-item"><div class="feature-name">🧬 Neural Networks</div><div class="feature-desc">Perceptrons, RNNs, CNNs, Transformers</div></div><div class="feature-item"><div class="feature-name">📈 Training</div><div class="feature-desc">Optimization, backpropagation, tuning</div></div><div class="feature-item"><div class="feature-name">🎯 Classification</div><div class="feature-desc">Supervised learning algorithms</div></div><div class="feature-item"><div class="feature-name">🔗 Clustering</div><div class="feature-desc">Unsupervised pattern discovery</div></div><div class="feature-item"><div class="feature-name">🎮 Reinforcement</div><div class="feature-desc">Agent learning through rewards</div></div><div class="feature-item"><div class="feature-name">🌐 Deep Learning</div><div class="feature-desc">Advanced neural architectures</div></div></div></div><div class="ai-simulator"><h2>💬 AI Chat Simulator</h2><input type="text" class="sim-input" id="aiInput" placeholder="Ask the AI something..."><button class="card-button" onclick="askAI()">Send Query</button><div class="sim-output" id="aiOutput">AI responses will appear here...</div></div><div class="stat-box"><div class="stat-card"><div class="stat-number" id="modelCount">47</div><div class="stat-label">AI Models</div></div><div class="stat-card"><div class="stat-number" id="datasets">1,200</div><div class="stat-label">Datasets</div></div><div class="stat-card"><div class="stat-number" id="accuracy">96.8%</div><div class="stat-label">Avg Accuracy</div></div><div class="stat-card"><div class="stat-number" id="uptime">99.9%</div><div class="stat-label">World Uptime</div></div></div></div><div id="modal" class="modal"><div class="modal-content"><span class="modal-close" onclick="closeModal()">&times;</span><h2 id="modalTitle">Module</h2><p id="modalBody">Loading...</p><button class="close-btn" onclick="closeModal()">Close</button></div></div><script>function loadModule(m){const modules={ml:'Machine Learning - Deep neural networks, training optimization, and advanced algorithms for pattern recognition.',agents:'AI Agents - Autonomous entities with decision-making capabilities, behavioral trees, and multi-agent systems.',data:'Data Science - Statistical analysis, data visualization, feature engineering, and exploratory data analysis.',predict:'Predictions - Forecasting models, time-series analysis, trend detection, and future outcome estimation.',nlp:'Natural Language - Text processing, sentiment analysis, translation, question answering systems.',vision:'Computer Vision - Image classification, object detection, semantic segmentation, and visual recognition.'};document.getElementById('modalTitle').textContent='🌍 '+m.toUpperCase();document.getElementById('modalBody').textContent=modules[m]||'Module not found';document.getElementById('modal').classList.add('active')}function closeModal(){document.getElementById('modal').classList.remove('active')}function askAI(){const input=document.getElementById('aiInput');const output=document.getElementById('aiOutput');const q=input.value.trim();if(!q)return;const responses=['Processing query...','🤖 AI is thinking...','Analyzing patterns...','Computing response...'];const r=responses[Math.floor(Math.random()*responses.length)];output.innerHTML+=`<div><strong>You:</strong> ${q}</div><div style="opacity:.7"><strong>AI:</strong> ${r}</div>`;input.value='';output.scrollTop=output.scrollHeight}window.addEventListener('keypress',(e)=>{if(e.key==='Enter'&&document.getElementById('aiInput')===document.activeElement)askAI()})</script></body></html>`);
  addLog('AI World loaded');
});

// Home route with navigation buttons
app.get('/home', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NetworkBuster - Home</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;padding:20px}html,body{height:100%}.container{max-width:1200px;margin:0 auto;height:100%}.header{text-align:center;color:#fff;margin-bottom:40px}.header h1{font-size:3em;margin-bottom:10px;text-shadow:2px 2px 4px rgba(0,0,0,.3)}.header p{font-size:1.3em;opacity:.9}.nav-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:25px;margin-bottom:40px}.nav-card{background:rgba(255,255,255,.95);border-radius:12px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,.2);transition:all .3s ease;cursor:pointer;text-decoration:none;color:inherit;display:flex;flex-direction:column;align-items:center;text-align:center}.nav-card:hover{transform:translateY(-8px);box-shadow:0 20px 60px rgba(0,0,0,.3)}.nav-icon{font-size:3.5em;margin-bottom:15px}.nav-title{font-size:1.5em;font-weight:700;color:#333;margin-bottom:10px}.nav-desc{color:#666;line-height:1.5;margin-bottom:20px}.nav-button{background:#667eea;color:#fff;border:none;padding:12px 30px;border-radius:6px;font-weight:600;cursor:pointer;transition:all .2s;align-self:flex-end;width:100%}.nav-button:hover{background:#5568d3;transform:translateY(-2px)}.quick-actions{background:rgba(255,255,255,.95);border-radius:12px;padding:30px;margin-bottom:40px;box-shadow:0 10px 40px rgba(0,0,0,.2)}.quick-actions h2{color:#333;margin-bottom:20px}.action-buttons{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px}.action-btn{background:#667eea;color:#fff;border:none;padding:15px;border-radius:6px;font-weight:600;cursor:pointer;transition:all .3s;font-size:1em}.action-btn:hover{background:#5568d3;transform:translateY(-3px)}.action-btn.success{background:#48bb78}.action-btn.success:hover{background:#38a169}.action-btn.info{background:#4299e1}.action-btn.info:hover{background:#3182ce}.action-btn.warning{background:#ed8936}.action-btn.warning:hover{background:#dd6b20}.footer{text-align:center;color:rgba(255,255,255,.8);padding:20px;border-top:1px solid rgba(255,255,255,.2)}</style></head><body><div class="container"><div class="header"><h1>🚀 NetworkBuster</h1><p>Content & Operation Hub</p></div><div class="quick-actions"><h2>⚡ Quick Actions</h2><div class="action-buttons"><button class="action-btn success" onclick="fetch('/api/health').then(r=>r.json()).then(d=>alert('✓ Healthy! Uptime: '+formatUptime(d.uptime))).catch(e=>alert('Error'))">✓ Health Check</button><button class="action-btn info" onclick="location.href='/control-panel'">⚙️ Control Panel</button><button class="action-btn" onclick="fetch('/api/logs').then(r=>r.json()).then(d=>alert('Logs: '+d.count+' entries')).catch(e=>alert('Error'))">📜 View Logs</button><button class="action-btn warning" onclick="fetch('/api/status').then(r=>r.json()).then(d=>alert('Platform: '+d.systemInfo.platform+'\\nCPUs: '+d.systemInfo.cpus)).catch(e=>alert('Error'))">💻 System Status</button></div></div><div class="nav-grid"><a href="/dashboard" class="nav-card"><div class="nav-icon">📈</div><div class="nav-title">Dashboard</div><div class="nav-desc">View real-time analytics and performance metrics</div><button class="nav-button">Open Dashboard</button></a><a href="/overlay" class="nav-card"><div class="nav-icon">🎨</div><div class="nav-title">Overlay</div><div class="nav-desc">Real-time visualization and interactive overlay</div><button class="nav-button">Open Overlay</button></a><a href="/blog" class="nav-card"><div class="nav-icon">📝</div><div class="nav-title">Blog</div><div class="nav-desc">Read articles, guides, and announcements</div><button class="nav-button">Read Blog</button></a><a href="/ai-world" class="nav-card"><div class="nav-icon">🌍</div><div class="nav-title">AI World</div><div class="nav-desc">Artificial intelligence learning and simulation environment</div><button class="nav-button">Enter AI World</button></a><a href="/control-panel" class="nav-card"><div class="nav-icon">⚙️</div><div class="nav-title">Control Panel</div><div class="nav-desc">System controls, health checks, and logs</div><button class="nav-button">Open Controls</button></a><a href="/api/health" class="nav-card"><div class="nav-icon">🏥</div><div class="nav-title">API Health</div><div class="nav-desc">Check API status and system health metrics</div><button class="nav-button">View Status</button></a><a href="/api/status" class="nav-card"><div class="nav-icon">📊</div><div class="nav-title">API Status</div><div class="nav-desc">Detailed system information and performance data</div><button class="nav-button">View Details</button></a></div><div class="footer"><p>NetworkBuster Server | Click any card to navigate to relevant information</p></div></div><script>function formatUptime(s){const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);if(h>0)return h+'h '+m+'m';return m+'m'}</script></body></html>`);
});

// Control panel route (embedded HTML with operational buttons)
app.get('/control-panel', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NetworkBuster Control Panel</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;padding:20px}.container{max-width:1200px;margin:0 auto}.header{text-align:center;color:#fff;margin-bottom:30px}.header h1{font-size:2.5em;margin-bottom:10px}.status-bar{background:rgba(255,255,255,.95);padding:20px;border-radius:10px;margin-bottom:30px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}.status-item{padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #667eea}.status-label{font-size:.9em;color:#666;margin-bottom:5px;font-weight:600}.status-value{font-size:1.5em;color:#333;font-weight:bold}.controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-bottom:30px}.control-section{background:rgba(255,255,255,.95);padding:25px;border-radius:10px}.section-title{font-size:1.2em;font-weight:700;color:#333;margin-bottom:20px}.button-group{display:flex;flex-direction:column;gap:10px}button{padding:12px 20px;border:none;border-radius:6px;font-size:1em;font-weight:600;cursor:pointer;transition:all 0.3s;color:#fff}.btn-success{background:#48bb78}.btn-success:hover{background:#38a169;transform:translateY(-2px)}.btn-primary{background:#667eea}.btn-primary:hover{background:#5568d3;transform:translateY(-2px)}.btn-info{background:#4299e1}.btn-info:hover{background:#3182ce;transform:translateY(-2px)}.btn-warning{background:#ed8936}.btn-warning:hover{background:#dd6b20;transform:translateY(-2px)}.btn-danger{background:#f56565}.btn-danger:hover{background:#e53e3e;transform:translateY(-2px)}.alert{padding:12px 16px;border-radius:6px;margin-bottom:15px}.alert-success{background:#c6f6d5;color:#22543d}.alert-error{background:#fed7d7;color:#742a2a}.alert-info{background:#bee3f8;color:#2c5282}.logs-container{background:rgba(255,255,255,.95);padding:25px;border-radius:10px}.logs-list{background:#1a202c;color:#a0aec0;padding:15px;border-radius:6px;max-height:300px;overflow-y:auto;font-family:monospace;font-size:.9em;line-height:1.6}</style></head><body><div class="container"><div class="header"><h1>⚙️ NetworkBuster Control Panel</h1><p>Operational Dashboard & System Controls</p></div><div class="status-bar"><div class="status-item"><div class="status-label">Status</div><div class="status-value" id="statusValue">Running</div></div><div class="status-item"><div class="status-label">Uptime</div><div class="status-value" id="uptimeValue">0s</div></div><div class="status-item"><div class="status-label">Requests</div><div class="status-value" id="requestsValue">0</div></div><div class="status-item"><div class="status-label">Last Action</div><div class="status-value" id="lastActionValue">None</div></div></div><div id="alerts"></div><div class="controls"><div class="control-section"><div class="section-title">⚙️ Application Control</div><div class="button-group"><button class="btn-success" onclick="checkHealth()">✓ Health Check</button><button class="btn-info" onclick="getComponentStatus()">📊 Components</button><button class="btn-warning" onclick="getSystemStatus()">💻 System Info</button><button class="btn-danger" onclick="restartApp()">🔄 Restart</button></div></div><div class="control-section"><div class="section-title">🎯 Navigation</div><div class="button-group"><button class="btn-primary" onclick="openPath('/home')">🏠 Home Hub</button><button class="btn-primary" onclick="openPath('/dashboard')">📈 Dashboard</button><button class="btn-primary" onclick="openPath('/overlay')">🎨 Overlay</button><button class="btn-primary" onclick="openPath('/blog')">📝 Blog</button></div></div><div class="control-section"><div class="section-title">🔧 Features</div><div class="button-group"><button class="btn-primary" onclick="toggleFeature('analytics')">📊 Analytics</button><button class="btn-primary" onclick="toggleFeature('notifications')">🔔 Notifications</button><button class="btn-primary" onclick="toggleFeature('darkMode')">🌙 Dark Mode</button><button class="btn-primary" onclick="toggleFeature('debug')">🐛 Debug</button></div></div><div class="control-section"><div class="section-title">📋 Maintenance</div><div class="button-group"><button class="btn-info" onclick="viewLogs()">📜 View Logs</button><button class="btn-warning" onclick="clearLogs()">🗑️ Clear Logs</button><button class="btn-danger" onclick="clearCache()">💾 Cache</button><button class="btn-success" onclick="exportLogs()">📥 Export</button></div></div></div><div class="logs-container"><div style="display:flex;justify-content:space-between;margin-bottom:15px"><h3>📜 System Logs</h3><button class="btn-warning" onclick="viewLogs()" style="width:auto">Refresh</button></div><div class="logs-list" id="logsList">Loading logs...</div></div></div><script>function showAlert(m,t='info'){const a=document.getElementById('alerts');const e=document.createElement('div');e.className='alert alert-'+t;e.textContent=m;a.appendChild(e);setTimeout(()=>e.remove(),5000)}function updateStatus(){fetch('/api/status').then(r=>r.json()).then(d=>{document.getElementById('statusValue').textContent=d.status;document.getElementById('uptimeValue').textContent=formatUptime(d.uptime);document.getElementById('requestsValue').textContent=d.requestCount;document.getElementById('lastActionValue').textContent=d.lastAction||'None'}).catch(e=>console.error(e))}function formatUptime(s){const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;if(h>0)return h+'h '+m+'m';return m+'m '+sec+'s'}function checkHealth(){fetch('/api/health').then(r=>r.json()).then(d=>{showAlert('✓ Healthy! Uptime: '+formatUptime(d.uptime),'success');updateStatus()}).catch(e=>showAlert('Health check failed','error'))}function getSystemStatus(){fetch('/api/status').then(r=>r.json()).then(d=>{const mu=Math.round(d.systemInfo.memoryUsage.heapUsed/1024/1024);showAlert('Platform: '+d.systemInfo.platform+' | CPUs: '+d.systemInfo.cpus+' | Memory: '+mu+'MB','info')}).catch(e=>showAlert('Failed','error'))}function getComponentStatus(){fetch('/api/components').then(r=>r.json()).then(d=>{const c=Object.keys(d.components).join(', ');showAlert('✓ Online: '+c,'success')}).catch(e=>showAlert('Failed','error'))}function restartApp(){if(confirm('Restart application?')){fetch('/api/restart',{method:'POST'}).then(r=>r.json()).then(d=>showAlert('⚠️ '+d.message,'warning')).catch(e=>showAlert('Failed','error'))}}function toggleFeature(f){fetch('/api/toggle/'+f,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true})}).then(r=>r.json()).then(d=>showAlert(d.message,'success')).catch(e=>showAlert('Failed','error'))}function viewLogs(){fetch('/api/logs').then(r=>r.json()).then(d=>{const l=document.getElementById('logsList');if(d.logs.length===0){l.innerHTML='No logs'}else{l.innerHTML=d.logs.map(x=>'<div>'+x+'</div>').join('')}l.scrollTop=l.scrollHeight}).catch(e=>console.error(e))}function clearLogs(){if(confirm('Clear logs?')){fetch('/api/logs/clear',{method:'POST'}).then(r=>r.json()).then(d=>{showAlert('✓ Cleared','success');viewLogs()}).catch(e=>showAlert('Failed','error'))}}function clearCache(){localStorage.clear();showAlert('✓ Cache cleared','success')}function exportLogs(){fetch('/api/logs').then(r=>r.json()).then(d=>{const t=d.logs.join('\\n');const b=new Blob([t],{type:'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='logs.txt';a.click();showAlert('✓ Exported','success')}).catch(e=>showAlert('Failed','error'))}function openPath(p){location.href=p}setInterval(updateStatus,5000);updateStatus();viewLogs()</script></body></html>`);
});

// Root route - redirect to home hub
app.get('/', (req, res) => {
  res.redirect('/home');
});

// Serve static files
app.use('/blog', express.static(path.join(__dirname, 'blog')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard/dist')));        
app.use('/overlay', express.static(path.join(__dirname, 'challengerepo/real-time-overlay/dist')));
app.use('/static', express.static(path.join(__dirname, 'web-app')));

// SPA fallbacks
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/dist/index.html'));
});

app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'challengerepo/real-time-overlay/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`🏠 Home Hub: http://localhost:${PORT}/home`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🎨 Real-time overlay: http://localhost:${PORT}/overlay`);
  console.log(`📝 Blog: http://localhost:${PORT}/blog`);
  console.log(`⚙️ Control Panel: http://localhost:${PORT}/control-panel`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 API Status: http://localhost:${PORT}/api/status\n`);
  addLog('Server started', `Port: ${PORT}`);
});
