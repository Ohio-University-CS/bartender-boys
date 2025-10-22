<#
Run both backend and frontend helper scripts in new PowerShell windows.

Usage:
  .\run-all.ps1
#>

$root = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

$backendPath = Join-Path $root 'apps\backend\run-backend.ps1'
$frontendPath = Join-Path $root 'apps\frontend\run-frontend.ps1'

if (-not (Test-Path $backendPath)) { Write-Error "Backend script not found: $backendPath"; exit 1 }
if (-not (Test-Path $frontendPath)) { Write-Error "Frontend script not found: $frontendPath"; exit 1 }

Write-Host "Starting backend in new PowerShell window..."
Start-Process -FilePath powershell.exe -ArgumentList "-NoExit","-Command","& '$backendPath'" -WindowStyle Normal

Write-Host "Starting frontend in new PowerShell window..."
Start-Process -FilePath powershell.exe -ArgumentList "-NoExit","-Command","& '$frontendPath'" -WindowStyle Normal

Write-Host "Launched both processes. Check the new windows for logs and prompts."
