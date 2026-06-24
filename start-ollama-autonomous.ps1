<#
.SYNOPSIS
    One-click launcher for CyberHound autonomous mode using Ollama (local LLM).

.DESCRIPTION
    This script:
    - Checks that Ollama is installed and running
    - Pulls a recommended model (llama3.2 by default, or qwen2.5 for better agents)
    - Ensures .env is configured for Ollama
    - Starts the full autonomous loop (or task runner)

.USAGE
    .\start-ollama-autonomous.ps1
    .\start-ollama-autonomous.ps1 -Model qwen2.5:14b
    .\start-ollama-autonomous.ps1 -Mode task-runner
#>

param(
    [string]$Model = "llama3.2",
    [ValidateSet("full", "task-runner")]
    [string]$Mode = "full",
    [switch]$SkipPull,
    [switch]$Test
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "🐺 CyberHound - Ollama Autonomous Launcher" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

function Write-Status($msg, $color = "White") {
    Write-Host $msg -ForegroundColor $color
}

# 1. Check Ollama
$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaCmd) {
    Write-Error "❌ Ollama is not installed or not in PATH.`nPlease install from https://ollama.com and restart this terminal."
    exit 1
}
Write-Status "✓ Ollama CLI found" "Green"

# 2. Ensure Ollama server is running (try API first, then start)
try {
    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Status "✓ Ollama server is already running" "Green"
} catch {
    Write-Status "Starting Ollama server..." "Yellow"
    
    # Try to start the Ollama desktop app if available (Windows)
    $ollamaApp = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama app.exe"
    if (Test-Path $ollamaApp) {
        Start-Process -FilePath $ollamaApp -WindowStyle Minimized
        Start-Sleep -Seconds 6
    } else {
        # Fallback to serve
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5
    }
    
    # Verify
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Status "✓ Ollama server started" "Green"
    } catch {
        Write-Error "❌ Failed to start Ollama server. Please start Ollama manually and re-run this script."
        exit 1
    }
}

# 3. Pull model if needed
if (-not $SkipPull) {
    Write-Status "Checking model '$Model'..." "Yellow"
    try {
        $tags = ollama list 2>$null | Out-String
        if ($tags -notmatch $Model) {
            Write-Status "Pulling $Model (this may take a while on first run)..." "Yellow"
            ollama pull $Model
            if ($LASTEXITCODE -ne 0) {
                throw "Pull failed"
            }
        } else {
            Write-Status "✓ Model $Model already available" "Green"
        }
    } catch {
        Write-Error "❌ Failed to pull model '$Model'. Check your internet or Ollama logs."
        exit 1
    }
}

# 4. Configure .env for Ollama + autonomous mode
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $envFile -Force
        Write-Status "Created .env from .env.example" "Yellow"
    } else {
        New-Item $envFile -ItemType File | Out-Null
        Write-Status "Created empty .env" "Yellow"
    }
}

$envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
if (-not $envContent) { $envContent = "" }

$needsUpdate = $false
if ($envContent -notmatch "AI_PROVIDER=ollama") {
    $needsUpdate = $true
}
if ($envContent -notmatch "OLLAMA_MODEL=") {
    $needsUpdate = $true
}
if ($envContent -notmatch "AUTONOMOUS_MODE=true") {
    $needsUpdate = $true
}

if ($needsUpdate) {
    Write-Status "Updating .env for Ollama autonomous mode..." "Yellow"
    Add-Content $envFile "`n# === Added/updated by start-ollama-autonomous.ps1 ===" -Force
    Add-Content $envFile "AI_PROVIDER=ollama" -Force
    Add-Content $envFile "OLLAMA_MODEL=$Model" -Force
    Add-Content $envFile "AUTONOMOUS_MODE=true" -Force
    Write-Status "✓ .env updated" "Green"
} else {
    Write-Status "✓ .env already configured for Ollama" "Green"
}

# 5. Find Python (handles common Windows cases)
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $pythonCmd = $cmd
        break
    }
}
if (-not $pythonCmd) {
    Write-Error "❌ Python not found.`nPlease install Python 3.10+ from python.org (not Microsoft Store) and add it to PATH."
    exit 1
}
Write-Status "✓ Using Python: $pythonCmd" "Green"

# 6. Quick sanity check for key files
if (-not (Test-Path "cyberhound\run.py")) {
    Write-Error "❌ cyberhound\run.py not found. Are you in the Cyberhound project root?"
    exit 1
}

# 7. Test mode (diagnostics without starting the loop)
if ($Test) {
    Write-Host "`n🧪 Running Ollama + CyberHound diagnostics..." -ForegroundColor Cyan
    
    Write-Host "`n[1] Testing Ollama connection..." -ForegroundColor Yellow
    try {
        $models = ollama list 2>&1
        Write-Host $models
        Write-Host "✓ Ollama responding" -ForegroundColor Green
    } catch {
        Write-Host "✗ Ollama test failed" -ForegroundColor Red
    }
    
    Write-Host "`n[2] Testing Python + unified LLM (Ollama path)..." -ForegroundColor Yellow
    & $pythonCmd -c "
from cyberhound.llm import ask
print('Testing simple prompt via unified client...')
resp = ask('Say hello in one short sentence.', system='You are a test assistant.')
print('Response sample:', resp[:120] if resp else 'empty')
print('✓ LLM client works')
" 2>&1 | Out-String
    
    Write-Host "`n[3] Checking key files..." -ForegroundColor Yellow
    $files = @("cyberhound\run.py", "cyberhound\task_runner.py", "cyberhound\llm.py", ".env")
    foreach ($f in $files) {
        if (Test-Path $f) { Write-Host "✓ $f" -ForegroundColor Green } else { Write-Host "✗ $f missing" -ForegroundColor Red }
    }
    
    Write-Host "`nDiagnostics complete. Run without -Test to start autonomous mode." -ForegroundColor Cyan
    exit 0
}

# 8. Start the autonomous system
Write-Host ""
Write-Host "🚀 Starting CyberHound autonomous mode with Ollama ($Model)..." -ForegroundColor Green
Write-Host "Mode: $Mode" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

try {
    if ($Mode -eq "full") {
        & $pythonCmd cyberhound/run.py autonomous --loop
    } else {
        & $pythonCmd -m cyberhound.task_runner --loop
    }
} catch {
    Write-Host "`n❌ Autonomous process exited with error." -ForegroundColor Red
    Write-Host "Check the output above. Common issues:" -ForegroundColor Yellow
    Write-Host "  - Missing Supabase keys in .env" -ForegroundColor Yellow
    Write-Host "  - Ollama model not fully downloaded" -ForegroundColor Yellow
    Write-Host "  - Python dependencies not installed (run: pip install -r requirements.txt)" -ForegroundColor Yellow
    exit 1
}