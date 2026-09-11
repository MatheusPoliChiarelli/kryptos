$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venv = Join-Path $root ".venv"
$activate = Join-Path $venv "Scripts\Activate.ps1"
$python = Join-Path $venv "Scripts\python.exe"

function Write-Step($text) {
    Write-Host ""
    Write-Host "  $text" -ForegroundColor Yellow
}

function Write-Ok($text) {
    Write-Host "  $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "  $text" -ForegroundColor Red
}

Write-Host ""
Write-Host "  KRYPTOS" -ForegroundColor DarkYellow
Write-Host "  Instalacao" -ForegroundColor DarkGray

# ---------------------------------------------------------------
# Pre-requisitos
# ---------------------------------------------------------------

Write-Step "Verificando pre-requisitos"

$missing = @()

foreach ($tool in @("python", "node", "npm", "psql")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        $missing += $tool
    }
}

if ($missing.Count -gt 0) {
    Write-Fail "Nao encontrado no PATH: $($missing -join ', ')"
    Write-Host ""
    Write-Host "  Instale antes de continuar:" -ForegroundColor DarkGray
    Write-Host "  Python   https://www.python.org/downloads/" -ForegroundColor DarkGray
    Write-Host "  Node.js  https://nodejs.org/" -ForegroundColor DarkGray
    Write-Host "  Postgres https://www.postgresql.org/download/" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  O psql costuma ficar em C:\Program Files\PostgreSQL\<versao>\bin" -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "  Pressione Enter para sair"
    exit 1
}

Write-Ok "Python, Node e PostgreSQL encontrados"

# ---------------------------------------------------------------
# Banco de dados
# ---------------------------------------------------------------

Write-Step "Configuracao do banco de dados"

Write-Host ""
Write-Host "  Sera criado o banco 'kryptos' e o usuario 'kryptos_user'" -ForegroundColor DarkGray
Write-Host "  Escolha uma senha para esse usuario do banco" -ForegroundColor DarkGray
Write-Host "  Nao e a senha mestra do cofre, e apenas a do PostgreSQL" -ForegroundColor DarkGray
Write-Host ""

$dbPassword = Read-Host "  Senha do usuario kryptos_user" -AsSecureString
$dbPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

if ([string]::IsNullOrWhiteSpace($dbPlain)) {
    Write-Fail "A senha nao pode ficar vazia"
    Read-Host "  Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "  Agora informe a senha do superusuario 'postgres'" -ForegroundColor DarkGray
Write-Host "  E a senha definida durante a instalacao do PostgreSQL" -ForegroundColor DarkGray
Write-Host ""

$pgPassword = Read-Host "  Senha do usuario postgres" -AsSecureString
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
)

$escaped = $dbPlain.Replace("'", "''")

$sqlCreate = @"
DO
`$`$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kryptos_user') THEN
      CREATE ROLE kryptos_user LOGIN PASSWORD '$escaped';
   ELSE
      ALTER ROLE kryptos_user WITH PASSWORD '$escaped';
   END IF;
END
`$`$;
"@

$tempSql = Join-Path $env:TEMP "kryptos_setup.sql"

try {
    Set-Content -Path $tempSql -Value $sqlCreate -Encoding UTF8
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f $tempSql | Out-Null

    $exists = psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'kryptos'"

    if ($exists -ne "1") {
        psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE kryptos OWNER kryptos_user" | Out-Null
    }

    psql -U postgres -d kryptos -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO kryptos_user" | Out-Null

    Write-Ok "Banco 'kryptos' pronto"
} catch {
    Write-Fail "Falha ao configurar o banco"
    Write-Host "  $_" -ForegroundColor DarkGray
    Read-Host "  Pressione Enter para sair"
    exit 1
} finally {
    Remove-Item $tempSql -ErrorAction SilentlyContinue
    $env:PGPASSWORD = $null
}

# ---------------------------------------------------------------
# Ambiente virtual
# ---------------------------------------------------------------

Write-Step "Preparando o ambiente Python"

if (-not (Test-Path $activate)) {
    python -m venv $venv
    Write-Ok "Ambiente virtual criado"
} else {
    Write-Ok "Ambiente virtual ja existia"
}

Write-Step "Instalando dependencias do backend"
Write-Host "  Isso baixa cerca de 300 MB e pode demorar alguns minutos" -ForegroundColor DarkGray

$requirements = Join-Path $backend "requirements.txt"

if (Test-Path $requirements) {
    & $python -m pip install --upgrade pip --quiet
    & $python -m pip install -r $requirements --quiet
} else {
    & $python -m pip install --upgrade pip --quiet
    & $python -m pip install --quiet `
        fastapi "uvicorn[standard]" sqlalchemy "psycopg[binary]" `
        argon2-cffi cryptography pydantic-settings python-dotenv `
        insightface onnxruntime opencv-python mediapipe numpy
}

Write-Ok "Dependencias instaladas"

# ---------------------------------------------------------------
# Modelo de gestos
# ---------------------------------------------------------------

Write-Step "Baixando o modelo de deteccao de maos"

$model = Join-Path $backend "hand_landmarker.task"

if (Test-Path $model) {
    Write-Ok "Modelo ja estava presente"
} else {
    $url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    Invoke-WebRequest -Uri $url -OutFile $model -UseBasicParsing
    Write-Ok "Modelo baixado"
}

# ---------------------------------------------------------------
# Arquivos de ambiente
# ---------------------------------------------------------------

Write-Step "Gerando arquivos de configuracao"

$envBackend = Join-Path $backend ".env"

if (Test-Path $envBackend) {
    Write-Ok "backend/.env ja existia, mantido como esta"
} else {
    @"
DATABASE_URL=postgresql+psycopg://kryptos_user:$dbPlain@localhost:5432/kryptos
SESSION_TIMEOUT_MINUTES=15
"@ | Set-Content -Path $envBackend -Encoding UTF8
    Write-Ok "backend/.env criado"
}

$envFrontend = Join-Path $frontend ".env.local"

if (Test-Path $envFrontend) {
    Write-Ok "frontend/.env.local ja existia, mantido como esta"
} else {
    "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" |
        Set-Content -Path $envFrontend -Encoding UTF8
    Write-Ok "frontend/.env.local criado"
}

$dbPlain = $null

# ---------------------------------------------------------------
# Tabelas
# ---------------------------------------------------------------

Write-Step "Criando as tabelas"

Push-Location $backend
try {
    & $python init_db.py
    Write-Ok "Tabelas prontas"
} catch {
    Write-Fail "Falha ao criar as tabelas"
    Write-Host "  $_" -ForegroundColor DarkGray
    Pop-Location
    Read-Host "  Pressione Enter para sair"
    exit 1
}
Pop-Location

# ---------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------

Write-Step "Instalando dependencias do frontend"

Push-Location $frontend
try {
    npm install --silent
    Write-Ok "Pacotes instalados"

    Write-Step "Compilando o frontend"
    npm run build
    Write-Ok "Build concluido"
} catch {
    Write-Fail "Falha no frontend"
    Write-Host "  $_" -ForegroundColor DarkGray
    Pop-Location
    Read-Host "  Pressione Enter para sair"
    exit 1
}
Pop-Location

# ---------------------------------------------------------------
# Fim
# ---------------------------------------------------------------

Write-Host ""
Write-Host "  Instalacao concluida" -ForegroundColor Green
Write-Host ""
Write-Host "  Para abrir o Kryptos, execute Kryptos.bat" -ForegroundColor DarkGray
Write-Host "  Na primeira execucao o modelo facial sera baixado" -ForegroundColor DarkGray
Write-Host "  cerca de 300 MB, entao o inicio demora mais" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Ao abrir, escolha a senha mestra do cofre" -ForegroundColor DarkGray
Write-Host "  Ela nao fica salva em lugar nenhum e nao pode ser recuperada" -ForegroundColor DarkGray
Write-Host ""

Read-Host "  Pressione Enter para sair"