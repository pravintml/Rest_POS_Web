# dev-start.ps1 — start (or restart) the API and Angular dev server

$ApiDir      = "$PSScriptRoot\backend\src\RestPos.Api"
$FrontendDir = "$PSScriptRoot\frontend"
$ApiPort     = 5111
$NgPort      = 4200

function Stop-ProcessOnPort([int]$port) {
    $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique)

    foreach ($pid in $pids) {
        if ($pid -match '^\d+$' -and $pid -ne '0') {
            Write-Host "  Stopping PID $pid on port $port..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n=== Stopping existing processes ===" -ForegroundColor Yellow
Stop-ProcessOnPort $ApiPort
Stop-ProcessOnPort $NgPort
Start-Sleep -Seconds 1

Write-Host "`n=== Starting API (port $ApiPort) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$ApiDir'; dotnet run --launch-profile http" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "=== Starting Angular dev server (port $NgPort) ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$FrontendDir'; npm start" `
    -WindowStyle Normal

Write-Host "`nBoth processes started." -ForegroundColor Green
Write-Host "  API    -> http://localhost:$ApiPort"
Write-Host "  App    -> http://localhost:$NgPort`n"
