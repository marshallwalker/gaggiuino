<#
.SYNOPSIS
    Converts a Nextion-compiled .tft to a TJC-compatible .tft.

.DESCRIPTION
    Wraps the andrew-harness fork of TFTTool
    (https://github.com/andrew-harness/TFTTool) to rewrite the device-ID
    metadata in a Nextion-compiled .tft so it loads on a TJC screen.

    The fork is used instead of upstream UNUF/TFTTool because upstream
    stops at Nextion Editor version 1.65.1, and current Gaggiuino .HMI
    files are saved by editor 1.68.1. The fork adds instruction sets
    for 1.67.1 and 1.68.1.

    Conversion is only valid for the T0/Basic and K0/Enhanced series -
    the same hardware Gaggiuino's TJC builds target.

    Compile your .HMI in Nextion Editor for the matching Nextion model
    (NX4832T035 for 3.5 inch basic), then run this script to produce
    the TJC TFT.

    On first run, the script clones TFTTool into <repo-root>/.tools/TFTTool.
    Source and target .tft paths are resolved relative to the repo root
    (two levels above this script — it lives in nextion/tools/).

.PARAMETER Source
    Input .tft (Nextion-compiled), relative to repo root.
    Default: nextion/nextion-basic-lcd.tft

.PARAMETER Target
    Output .tft (TJC), relative to repo root.
    Default: nextion/tjc-basic-lcd.tft

.PARAMETER Model
    TJC device model string. Default: TJC4832T035 (3.5 inch basic).

.PARAMETER EditorVersion
    Optional override for the editor-version field embedded in the TFT,
    forwarded to TFTTool's -e flag. Use if the converted TFT is rejected
    by your TJC firmware as a version mismatch.

.EXAMPLE
    .\nextion\tools\convert-to-tjc.ps1
    # nextion/nextion-basic-lcd.tft -> nextion/tjc-basic-lcd.tft (TJC4832T035)

.EXAMPLE
    .\nextion\tools\convert-to-tjc.ps1 -Source nextion/nextion-discovery-lcd.tft -Target nextion/tjc-discovery-lcd.tft -Model TJC4832K035
    # K0/Enhanced (Discovery) variant
#>

[CmdletBinding()]
param(
    [string]$Source = "nextion/nextion-basic-lcd.tft",
    [string]$Target = "nextion/tjc-basic-lcd.tft",
    [string]$Model = "TJC4832T035",
    [string]$EditorVersion
)

$ErrorActionPreference = "Stop"
# Script lives at <repo-root>/nextion/tools/convert-to-tjc.ps1, so the repo
# root is two levels up.
$RepoRoot  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ToolDir   = Join-Path $RepoRoot ".tools\TFTTool"
$ToolEntry = Join-Path $ToolDir  "TFTTool.py"

function Require-Command {
    param([string]$Name, [string]$InstallHint)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Error "$Name is required but not found on PATH. $InstallHint"
        exit 1
    }
}

Require-Command -Name "python" -InstallHint "Install Python 3.9+ from https://www.python.org/downloads/ and re-run."
Require-Command -Name "git"    -InstallHint "Install Git from https://git-scm.com/download/win and re-run."

# Sanity check: Python >= 3.9
$pyVer = & python -c "import sys; print('{0}.{1}'.format(sys.version_info.major, sys.version_info.minor))"
$verParts = $pyVer.Trim().Split(".")
if ([int]$verParts[0] -lt 3 -or ([int]$verParts[0] -eq 3 -and [int]$verParts[1] -lt 9)) {
    Write-Error "Python 3.9+ required, found $pyVer."
    exit 1
}

# Bootstrap TFTTool (andrew-harness fork - adds instruction sets for editor 1.67.1 / 1.68.1)
if (-not (Test-Path $ToolEntry)) {
    Write-Host "TFTTool not found at $ToolDir - cloning..."
    New-Item -ItemType Directory -Force -Path (Split-Path $ToolDir) | Out-Null
    git clone --depth 1 https://github.com/andrew-harness/TFTTool $ToolDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ToolEntry)) {
        Write-Error "Failed to clone TFTTool from GitHub."
        exit 1
    }
}

# Resolve source/target paths against repo root
$SourcePath = Join-Path $RepoRoot $Source
$TargetPath = Join-Path $RepoRoot $Target

if (-not (Test-Path $SourcePath)) {
    Write-Error "Source TFT not found: $SourcePath`nCompile your .HMI in Nextion Editor first (target NX4832T035 for 3.5 inch basic)."
    exit 1
}

# Build TFTTool args
$ttArgs = @("-i", $SourcePath, "-t", $Model, "-o", $TargetPath)
if ($PSBoundParameters.ContainsKey("EditorVersion")) {
    $ttArgs += @("-e", $EditorVersion)
}

Write-Host "Converting:"
Write-Host "  source : $Source"
Write-Host "  target : $Target"
Write-Host "  model  : $Model"
if ($EditorVersion) { Write-Host "  editor : $EditorVersion" }
Write-Host ""

& python $ToolEntry @ttArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "TFTTool exited with code $LASTEXITCODE."
    exit $LASTEXITCODE
}

if (-not (Test-Path $TargetPath)) {
    Write-Warning "TFTTool reported success but output file is missing: $TargetPath"
    Write-Warning "Check TFTTool's stdout above; it may have written to a different path."
    exit 1
}

$srcSize = (Get-Item $SourcePath).Length
$dstSize = (Get-Item $TargetPath).Length
Write-Host ""
Write-Host "Success."
Write-Host ("  {0,-18} {1,12:N0} bytes" -f $Source, $srcSize)
Write-Host ("  {0,-18} {1,12:N0} bytes" -f $Target, $dstSize)
Write-Host ""
Write-Host "Drop $Target on a microSD (FAT32, file at root), insert into the TJC screen, power-cycle to flash."
