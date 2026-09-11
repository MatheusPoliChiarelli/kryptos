$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venv = Join-Path $root ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $venv)) {
    Write-Host "Ambiente virtual nao encontrado em $venv" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

$api = Start-Process powershell -ArgumentList @(
    "-WindowStyle", "Hidden",
    "-Command",
    "Set-Location '$backend'; & '$venv'; uvicorn app.main:app --host 127.0.0.1 --port 8000"
) -WindowStyle Hidden -PassThru

$web = Start-Process powershell -ArgumentList @(
    "-WindowStyle", "Hidden",
    "-Command",
    "Set-Location '$frontend'; npm run start"
) -WindowStyle Hidden -PassThru

$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true
        break
    } catch {
        # ainda subindo
    }
}

if (-not $ready) {
    Write-Host "O backend demorou demais para responder" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Start-Sleep -Seconds 2

$profileDir = Join-Path $env:LOCALAPPDATA "Kryptos\ChromeProfile"

$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    $browser = Start-Process $chrome -ArgumentList @(
        "--app=http://localhost:3000",
        "--user-data-dir=`"$profileDir`"",
        "--no-first-run",
        "--no-default-browser-check"
    ) -PassThru

    $browser.WaitForExit()
} else {
    Start-Process "http://localhost:3000"
    Read-Host "Pressione Enter para encerrar o Kryptos"
}

foreach ($proc in @($api, $web)) {
    try {
        Stop-Process -Id $proc.Id -Force -ErrorAction Stop
    } catch {
        # ja encerrado
    }
}

Get-NetTCPConnection -LocalPort 8000, 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        try {
            Stop-Process -Id $_ -Force -ErrorAction Stop
        } catch {
            # ja encerrado
        }
    }