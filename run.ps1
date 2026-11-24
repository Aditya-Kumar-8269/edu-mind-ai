# EduMind AI - Startup Script for Windows
# Starts FastAPI backend and frontend servers

$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}

# If executed from inside the backend directory, locate project root
if ((Split-Path -Leaf $ScriptDir) -eq "backend" -or (Test-Path (Join-Path $ScriptDir "app"))) {
    $ScriptDir = Split-Path -Parent $ScriptDir
}

# Define paths
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"
$BackendVenv = Join-Path $BackendDir ".venv"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EduMind AI - Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Host "Error: Backend directory not found at $BackendDir" -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (-not (Test-Path $FrontendDir)) {
    Write-Host "Error: Frontend directory not found at $FrontendDir" -ForegroundColor Red
    exit 1
}

# Check if backend virtual environment exists
if (-not (Test-Path $BackendVenv)) {
    Write-Host "Error: Backend virtual environment not found at $BackendVenv" -ForegroundColor Red
    Write-Host "Please create it first by running:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\activate" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Clean up any orphaned processes on port 8000 or 3000
$existingPorts = Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue
if ($existingPorts) {
    Write-Host "Releasing ports 8000/3000 from previous sessions..." -ForegroundColor Yellow
    foreach ($conn in $existingPorts) {
        if ($conn.OwningProcess -and $conn.OwningProcess -gt 0) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host "Starting FastAPI backend on port 8000..." -ForegroundColor Green
$PythonExe = Join-Path $BackendVenv "Scripts\python.exe"
$BackendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; & '$PythonExe' -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -PassThru -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 2

Write-Host "Starting frontend HTTP server on port 3000..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; & '$PythonExe' -m http.server 3000" -PassThru -WindowStyle Normal

# Wait for servers to be ready
Start-Sleep -Seconds 3

Write-Host "" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servers started successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Open browser
Write-Host "Opening browser to http://localhost:3000..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Press Ctrl+C in this window to stop both servers" -ForegroundColor Yellow
Write-Host "Or close the individual server windows to stop them separately" -ForegroundColor Yellow
Write-Host ""

# Keep this script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Cleanup processes when script is stopped
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    if ($BackendProcess -and !$BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force
    }
    if ($FrontendProcess -and !$FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force
    }
    Write-Host "Servers stopped." -ForegroundColor Green
}
