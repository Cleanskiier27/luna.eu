[CmdletBinding()]
param(
    [string]$Source = "$HOME\OneDrive\Desktop\Documents\fsnotifier-wsl\lldb\helpers\mixed_mode\src\helper.cpp",
    [string]$Zig = 'zig.exe'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "Helper source not found: $Source. Specify its path with -Source."
}

$compiler = Get-Command $Zig -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $compiler -and $Zig -eq 'zig.exe') {
    $previousBuild = "$env:LOCALAPPDATA\E-drive-builds\mixed-mode-ecbca72a"
    $compiler = Get-Command "$previousBuild\.venv\Lib\site-packages\ziglang\zig.exe" -ErrorAction SilentlyContinue
}
if (-not $compiler) {
    throw "Zig compiler not found. Specify its executable with -Zig."
}

$build = Join-Path $env:LOCALAPPDATA 'luna.eu\mixed-mode'
[void][System.IO.Directory]::CreateDirectory($build)
$binary = Join-Path $build 'helper.exe'
& $compiler.Source c++ -std=c++17 -g $Source -o $binary
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $binary
exit $LASTEXITCODE
