[CmdletBinding()]
param(
    [string]$ScanRoot,
    [string]$OutputFolder,
    [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScanRoot) { $ScanRoot = $scriptDir }
if (-not $OutputFolder) { $OutputFolder = Join-Path $scriptDir 'collected' }
$uiFile = Join-Path $scriptDir 'index.html'
$template = Join-Path $scriptDir 'index.template.html'
$skipDirs = @(
    '$Recycle.Bin', 'Windows', 'System Volume Information',
    'ProgramData\Microsoft', 'AppData\Local\Microsoft', 'AppData\Local\Packages'
)
$results = [System.Collections.Generic.List[object]]::new()
$skipped = 0

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ("  HTML Fetch Tool - Scanning {0}" -f $ScanRoot) -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''

$files = Get-ChildItem -Path $ScanRoot -Filter '*.html' -Recurse -ErrorAction SilentlyContinue |
    Where-Object {
        $excluded = $false
        foreach ($directory in $skipDirs) {
            if ($_.FullName -like "*\$directory\*") {
                $excluded = $true
                break
            }
        }
        -not $excluded
    }

foreach ($file in $files) {
    try {
        $results.Add([pscustomobject]@{
            name = $file.Name
            path = $file.FullName
            dir = $file.DirectoryName
            size = $file.Length
            modified = $file.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
        })
    }
    catch {
        $skipped++
    }
}

Write-Host ("  Found {0} .html file(s); {1} skipped" -f $results.Count, $skipped) -ForegroundColor Green
New-Item -ItemType Directory -Path $OutputFolder -Force -ErrorAction SilentlyContinue | Out-Null

$json = if ($results.Count -eq 0) {
    '[]'
}
else {
    $items = @($results | ConvertTo-Json -Depth 3 -Compress)
    if ($results.Count -eq 1) { "[$($items[0])]" } else { $items | Out-String | ForEach-Object { $_.Trim() } }
}
$json = $json -replace '/', '\/' -replace '<', '\u003c' -replace '>', '\u003e' -replace '&', '\u0026'

$sourceFile = if (Test-Path -LiteralPath $template) { $template } else { $uiFile }
$html = Get-Content -LiteralPath $sourceFile -Raw -Encoding UTF8
$replacement = "// __SCAN_DATA_INJECT_START__`r`n    allFiles = $json;`r`n    // __SCAN_DATA_INJECT_END__"
$html = $html -replace '(?s)// __SCAN_DATA_INJECT_START__.*?// __SCAN_DATA_INJECT_END__', $replacement
$html | Set-Content -LiteralPath $uiFile -Encoding UTF8

Write-Host "  UI updated: $uiFile" -ForegroundColor Yellow
if (-not $NoOpen) {
    Write-Host '  Launching browser...' -ForegroundColor Yellow
    Start-Process $uiFile
}
Write-Host ''
