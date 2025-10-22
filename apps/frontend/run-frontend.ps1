<#
Run frontend: install node deps (npm), then start expo.

Usage:
  .\run-frontend.ps1      # installs deps (if missing) and starts expo
  .\run-frontend.ps1 -SkipInstall  # skip npm install
#>

param(
  [switch]$SkipInstall
)

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $scriptDir

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is not found. Please install Node.js (18+) and ensure npm is on PATH."
  exit 1
}

if (-not $SkipInstall) {
  Write-Host "Running npm install..."
  npm install
} else {
  Write-Host "Skipping npm install (SkipInstall passed)."
}

Write-Host "Starting Expo (npm start)..."
npm start
