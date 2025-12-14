# 🗡️ ANDREW - Automated Network Deployment Engine (Azure Ready!)
# Master orchestration script for NetworkBuster infrastructure
# Inspired by Andrew's Trials: Tower of Code, Labyrinth of Data, Dragon of Scale, Mirror of Innovation

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("deploy-storage", "deploy-all", "status", "backup", "sync")]
    [string]$Task = "status",
    
    [Parameter(Mandatory = $false)]
    [string]$Environment = "production"
)

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error   = "Red"
    Info    = "Cyan"
    Trial   = "Magenta"
}

function Write-Trial {
    param([string]$Message, [string]$Trial)
    Write-Host "[$Trial] $Message" -ForegroundColor $Colors.Trial
}

function Write-Status {
    param([string]$Message, [string]$Status = "Info")
    Write-Host $Message -ForegroundColor $Colors[$Status]
}

# ============================================================================
# ANDREW'S TRIALS - Infrastructure Deployment Tasks
# ============================================================================

function Invoke-StorageDeployment {
    Write-Trial "⚡ Trial One: Tower of Code - Building the Foundation" "ANDREW"
    
    $scriptPath = ".\deploy-storage-azure.ps1"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Status "❌ Deploy script not found at $scriptPath" "Error"
        return $false
    }
    
    Write-Status "🔧 Executing Azure Storage deployment..." "Info"
    & $scriptPath
    
    Write-Status "✅ Tower of Code construction complete!" "Success"
    return $true
}

function Invoke-FullDeployment {
    Write-Trial "🗡️ ANDREW'S FULL QUEST: All Trials Activated" "ANDREW"
    
    # Trial 1: Storage
    Write-Trial "🌟 Trial One: Tower of Code" "ANDREW"
    Invoke-StorageDeployment
    
    # Trial 2: Sync
    Write-Trial "🌊 Trial Two: Labyrinth of Data - Synchronizing" "ANDREW"
    Write-Status "Syncing repositories..." "Info"
    git status
    
    # Trial 3: Backup
    Write-Trial "🐉 Trial Three: Dragon of Scale - Creating Backups" "ANDREW"
    Invoke-BackupProcedure
    
    # Trial 4: Status
    Write-Trial "🪞 Trial Four: Mirror of Innovation - Status Check" "ANDREW"
    Get-InfrastructureStatus
    
    Write-Status "🏆 ANDREW'S QUEST COMPLETE!" "Success"
}

function Invoke-BackupProcedure {
    Write-Status "Creating backup of current state..." "Info"
    
    $backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "D:\networkbuster_backup_$backupDate"
    
    if (-not (Test-Path "D:\")) {
        Write-Status "⚠️ D: drive not accessible, skipping backup" "Warning"
        return
    }
    
    try {
        Copy-Item -Path "." -Destination $backupPath -Recurse -Force
        Write-Status "✅ Backup created: $backupPath" "Success"
    }
    catch {
        Write-Status "❌ Backup failed: $_" "Error"
    }
}

function Get-InfrastructureStatus {
    Write-Status "════════════════════════════════════════" "Info"
    Write-Status "🔍 ANDREW'S INFRASTRUCTURE STATUS" "Info"
    Write-Status "════════════════════════════════════════" "Info"
    
    # Git status
    Write-Status "`n📦 Repository Status:" "Info"
    git branch -v
    git status --short
    
    # Storage check
    Write-Status "`n💾 Storage Infrastructure:" "Info"
    if (Test-Path ".\infra\storage.bicep") {
        Write-Status "✅ Bicep template found" "Success"
        Get-Item ".\infra\storage.bicep" | Select-Object Name, Length, LastWriteTime | Format-Table
    }
    else {
        Write-Status "❌ Bicep template missing" "Error"
    }
    
    # Script check
    Write-Status "`n🚀 Deployment Scripts:" "Info"
    $scripts = @("deploy-storage-azure.ps1", "deploy-storage-azure.sh", "ANDREW.ps1")
    foreach ($script in $scripts) {
        if (Test-Path ".\$script") {
            Write-Status "✅ $script" "Success"
        }
        else {
            Write-Status "❌ $script" "Error"
        }
    }
    
    # Azure CLI check
    Write-Status "`n☁️ Azure Connectivity:" "Info"
    try {
        $azVersion = az --version | Select-Object -First 1
        Write-Status "✅ Azure CLI: $azVersion" "Success"
    }
    catch {
        Write-Status "⚠️ Azure CLI not available (optional)" "Warning"
    }
    
    Write-Status "`n════════════════════════════════════════" "Info"
}

function Sync-Repositories {
    Write-Trial "🔄 Synchronizing all branches with DATACENTRAL" "ANDREW"
    
    try {
        Write-Status "📡 Checking current branch..." "Info"
        $currentBranch = (git rev-parse --abbrev-ref HEAD)
        Write-Status "Current: $currentBranch" "Info"
        
        Write-Status "`n📊 All branches:" "Info"
        git branch -a
        
        Write-Status "`n🔀 Fetching from remote..." "Info"
        git fetch origin
        
        Write-Status "✅ Repository sync complete" "Success"
    }
    catch {
        Write-Status "❌ Sync failed: $_" "Error"
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Host "`n" -ForegroundColor Black
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     🗡️  ANDREW - Network Deployment Engine  🗡️          ║" -ForegroundColor Magenta
Write-Host "║   Automated Deployment for NetworkBuster Infrastructure ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host "`n"

Write-Status "⏱️ Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Info"
Write-Status "🌍 Environment: $Environment" "Info"
Write-Status "📍 Location: $(Get-Location)" "Info"
Write-Status "🎯 Task: $Task" "Info"
Write-Host "`n"

switch ($Task) {
    "deploy-storage" { 
        Invoke-StorageDeployment 
    }
    "deploy-all" { 
        Invoke-FullDeployment 
    }
    "backup" { 
        Invoke-BackupProcedure 
    }
    "sync" { 
        Sync-Repositories 
    }
    "status" { 
        Get-InfrastructureStatus 
    }
    default { 
        Get-InfrastructureStatus 
    }
}

Write-Host "`n"
Write-Status "🏁 ANDREW execution complete" "Success"
Write-Host "`n"

# Usage examples
Write-Host "📖 ANDREW Usage Examples:" -ForegroundColor Cyan
Write-Host "  .\ANDREW.ps1                              # Show infrastructure status" -ForegroundColor Gray
Write-Host "  .\ANDREW.ps1 -Task deploy-storage         # Deploy Azure Storage only" -ForegroundColor Gray
Write-Host "  .\ANDREW.ps1 -Task deploy-all             # Full deployment (all trials)" -ForegroundColor Gray
Write-Host "  .\ANDREW.ps1 -Task backup                 # Create backup to D: drive" -ForegroundColor Gray
Write-Host "  .\ANDREW.ps1 -Task sync                   # Synchronize with remote" -ForegroundColor Gray
Write-Host "`n"
