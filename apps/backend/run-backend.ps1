<#
Run backend: create venv, install deps, copy .env.example -> .env, open .env for editing, and run uvicorn.

Usage:
  .\run-backend.ps1            # creates venv, installs deps, opens .env, starts server
  .\run-backend.ps1 -SkipInstall  # skip installing Python packages
#>

param(
  [switch]$SkipInstall
)

# Ensure script runs from its directory
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $scriptDir

if (!(Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Error "Python is not found. Please install Python 3.13+ and ensure 'python' is on PATH."
  exit 1
}

# Create venv if missing
if (-not (Test-Path ".venv")) {
  Write-Host "Creating virtual environment .venv..."
  python -m venv .venv
}

# Bypass execution policy for this session and activate venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
. .\.venv\Scripts\Activate.ps1

Write-Host "Using Python: $(python --version)"

if (-not $SkipInstall) {
  Write-Host "Installing / upgrading backend dependencies..."
  python -m pip install --upgrade pip
  python -m pip install "fastapi>=0.104.1" "uvicorn[standard]>=0.24.0" "pymongo>=4.15.1" "openai>=1.0.0" "python-dotenv>=1.0.0"
} else {
  Write-Host "Skipping dependency installation (SkipInstall passed)."
}

# Copy .env.example -> .env if needed
if ((Test-Path ".env.example") -and -not (Test-Path ".env")) {
  Copy-Item .env.example .env
  Write-Host "Copied .env.example -> .env. Please edit .env to add OPENAI_API_KEY if required."
  notepad .env
} elseif (Test-Path ".env") {
  Write-Host ".env exists. Opening .env in notepad."
  notepad .env
} else {
  Write-Host "No .env or .env.example found. If the backend uses OpenAI, create an .env file with OPENAI_API_KEY=sk-..."
}

Write-Host "Starting backend (uvicorn main:app) on http://0.0.0.0:8000"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
