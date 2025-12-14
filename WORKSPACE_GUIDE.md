# NetworkBuster Workspace Guide

Welcome to NetworkBuster! This guide helps you navigate and understand the workspace structure.

## 📁 Project Structure

```
networkbuster.net/
├── 📂 api/                          # Backend API services
├── 📂 web-app/                      # Main web application (React/Vue)
├── 📂 dashboard/                    # Analytics dashboard
├── 📂 blog/                         # Blog content and pages
├── 📂 docs/                         # Project documentation
├── 📂 data/                         # Data files and databases
├── 📂 infra/                        # Infrastructure & deployment configs
├── 📂 packages/                     # Package manager configurations
│   ├── chocolatey/                  # Windows Chocolatey package
│   ├── deb/                         # Debian/Ubuntu package
│   ├── rpm/                         # Red Hat/CentOS package
│   ├── homebrew/                    # macOS Homebrew
│   ├── aur/                         # Arch Linux AUR
│   ├── snap/                        # Universal Snap package
│   ├── flatpak/                     # Linux Flatpak
│   ├── appimage/                    # Linux AppImage
│   ├── freebsd/                     # FreeBSD port
│   ├── winget/                      # Windows Package Manager
│   └── docker/                      # Docker configuration
├── 📂 challengerepo/                # Challenge/overlay projects
├── 📂 .github/                      # GitHub Actions & workflows
├── 📂 .azure/                       # Azure deployment configs
├── 📂 .vercel/                      # Vercel deployment configs
├── 🐳 Dockerfile                    # Docker container definition
├── 🐙 docker-compose.yml            # Multi-service Docker setup
├── 📦 package.json                  # Node.js dependencies (Express 5.2.1)
├── 🔒 package-lock.json             # Locked dependency versions
├── 📘 README.md                     # Project overview
└── 📋 DEPENDENCIES.md               # Dependency documentation
```

## 🚀 Quick Start

### Start Development Server
```bash
npm install      # Install dependencies
npm start        # Start server on port 3000
npm run dev      # Start with auto-reload
```

### Access Application
- **Main App**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Overlay**: http://localhost:3000/overlay
- **Blog**: http://localhost:3000/blog
- **Control Panel**: http://localhost:3000/control-panel

## 📚 Key Files & What They Do

| File | Purpose |
|------|---------|
| `server.js` | Main Express.js server with operational API endpoints |
| `package.json` | Project metadata, scripts, and dependencies |
| `Dockerfile` | Container image definition |
| `docker-compose.yml` | Multi-service orchestration |
| `README.md` | Project overview and getting started |
| `DEPENDENCIES.md` | Complete dependency documentation |
| `UPDATE_REPORT.md` | Software version updates |

## 🎯 Common Tasks

### 1. Add New Dependencies
```bash
npm install <package-name>
```

### 2. Start Control Panel
Navigate to: `http://localhost:3000/control-panel`
- Health checks
- System monitoring
- Component status
- Log management

### 3. Deploy with Docker
```bash
docker build -t networkbuster:latest .
docker run -p 3000:3000 networkbuster:latest
```

### 4. Deploy with Docker Compose
```bash
docker-compose up -d
```

### 5. Git Operations
```bash
git status                          # Check status
git add .                           # Stage changes
git commit -m "message"             # Commit
git push origin DATACENTRAL         # Push to branch
```

## 🔧 Development Tools

### Installed Tools
- **Node.js**: v24.12.0
- **npm**: v11.7.0
- **Express.js**: v5.2.1

### Recommended Global Packages
```bash
npm install -g nodemon              # Auto-reload for development
npm install -g pm2                  # Production process manager
npm install -g typescript           # TypeScript support
```

## 📊 API Endpoints

### System Endpoints
- `GET /api/health` - Health check
- `GET /api/status` - System status & uptime
- `GET /api/logs` - View logs
- `POST /api/logs/clear` - Clear logs
- `GET /api/components` - Component status
- `POST /api/toggle/:feature` - Toggle features
- `POST /api/restart` - Restart application

### Static Routes
- `/` - Main web app
- `/dashboard` - Analytics dashboard
- `/overlay` - Real-time overlay
- `/blog` - Blog content
- `/control-panel` - Operational dashboard

## 🌿 Git Branches

```
main                                # Production branch
├─ bigtree                          # Default development branch
└─ DATACENTRAL                      # Feature branch (current)
```

### Push Changes
```bash
git push -u origin DATACENTRAL      # First time
git push                            # Subsequent pushes
```

## 🚢 Deployment Options

| Platform | Location | Command |
|----------|----------|---------|
| **Docker** | Any | `docker run -p 3000:3000 networkbuster` |
| **Node.js** | Local/Server | `npm start` |
| **PM2** | Linux/macOS | `pm2 start server.js` |
| **Systemd** | Linux | `systemctl start networkbuster` |
| **Windows Service** | Windows | `nssm install networkbuster` |
| **Vercel** | Cloud | Push to main branch |
| **Azure App Service** | Cloud | `.azure/deploy-azure.ps1` |

## 📖 Documentation

- [AI Training & Data Personalization](docs/AI_TRAINING_AND_DATA_PERSONALIZATION.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [Dependencies](DEPENDENCIES.md)
- [Package Managers](packages/README.md)
- [Data Storage](DATA_STORAGE_AND_VISITOR_TRACKING.md)

## 🆘 Troubleshooting

### Port 3000 already in use
```bash
PORT=3001 npm start
```

### Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Check server logs
```bash
# Via Control Panel: http://localhost:3000/control-panel
# Or terminal: tail -f /var/log/networkbuster.log
```

## 📞 Support

- **Issues**: https://github.com/NetworkBuster/networkbuster.net/issues
- **Discussions**: https://github.com/NetworkBuster/networkbuster.net/discussions
- **Documentation**: https://docs.networkbuster.net

## ✅ Checklist for New Developers

- [ ] Read this guide
- [ ] Install Node.js 24.x
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Visit http://localhost:3000/control-panel
- [ ] Check API endpoints work
- [ ] Review project structure
- [ ] Read relevant documentation

---

**Last Updated**: December 14, 2025
**Version**: 1.0
**Workspace**: Ready for development ✅
