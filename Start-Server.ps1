#!/usr/bin/env pwsh
#
# NetworkBuster Server Startup Script for PowerShell
# Starts backend on port 8080
#

Write-Host "`n" -ForegroundColor Green
Write-Host "🚀 NetworkBuster Development Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "`n"

$projectPath = "c:\Users\daypi\OneDrive\Documents\WindowsPowerShell\networkbuster.net"
Push-Location $projectPath

Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "🔧 Checking Node.js installation..." -ForegroundColor Yellow

$nodeVersion = & node --version 2>&1
$npmVersion = & npm --version 2>&1

Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "   npm: $npmVersion" -ForegroundColor Green

Write-Host "`n🚀 Starting backend server on port 8080..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$env:PORT = 8080
& node server.js

Write-Host "`n❌ Server stopped" -ForegroundColor Red
Pop-Location
