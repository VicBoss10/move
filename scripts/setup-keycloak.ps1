# Setup Keycloak - Genera move-realm-import.json desde .env y move-realm.example.json
# Para Windows PowerShell

$ErrorActionPreference = "Stop"

Write-Host "=== Configuracion de Keycloak ===" -ForegroundColor Yellow

# Verificar que .env existe
if (-not (Test-Path ".env")) {
    Write-Host "Error: Archivo .env no encontrado" -ForegroundColor Red
    Write-Host "Crea el archivo .env primero: cp .env.example .env"
    exit 1
}

# Verificar que move-realm.example.json existe
if (-not (Test-Path "keycloak/move-realm.example.json")) {
    Write-Host "Error: keycloak/move-realm.example.json no encontrado" -ForegroundColor Red
    exit 1
}

# Leer .env
Write-Host "Leyendo configuracion de .env..." -ForegroundColor Yellow
$envFile = Get-Content ".env" | Where-Object { $_ -match '=' -and -not $_.StartsWith('#') }
foreach ($line in $envFile) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value)
    }
}

# Obtener variables
$VEHICLE_CLIENT_SECRET = [System.Environment]::GetEnvironmentVariable("VEHICLE_CLIENT_SECRET")
$GOOGLE_CLIENT_SECRET = [System.Environment]::GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")

# Validar secretos
if ([string]::IsNullOrWhiteSpace($VEHICLE_CLIENT_SECRET)) {
    Write-Host "Error: VEHICLE_CLIENT_SECRET no esta definido en .env" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($GOOGLE_CLIENT_SECRET)) {
    Write-Host "Advertencia: GOOGLE_CLIENT_SECRET no esta definido en .env" -ForegroundColor Yellow
    $GOOGLE_CLIENT_SECRET = "REPLACE_WITH_OAUTH_SECRET"
}

Write-Host "Secretos encontrados" -ForegroundColor Green

# Generar move-realm-import.json
Write-Host "Generando move-realm-import.json..." -ForegroundColor Yellow
Copy-Item "keycloak/move-realm.example.json" "keycloak/move-realm-import.json"

# Leer el contenido y reemplazar
$content = Get-Content "keycloak/move-realm-import.json" -Raw
$content = $content -replace "REPLACE_WITH_YOUR_CLIENT_SECRET", $VEHICLE_CLIENT_SECRET
$content = $content -replace "REPLACE_WITH_OAUTH_SECRET", $GOOGLE_CLIENT_SECRET
$content | Set-Content "keycloak/move-realm-import.json"

Write-Host "move-realm-import.json generado exitosamente" -ForegroundColor Green

# Verificar placeholders
if ($content -match "REPLACE_WITH") {
    Write-Host "Advertencia: Aun hay placeholders sin reemplazar" -ForegroundColor Yellow
    Write-Host "Revisa manualmente: keycloak/move-realm-import.json"
} else {
    Write-Host "Todos los placeholders fueron reemplazados" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Completado ===" -ForegroundColor Green
Write-Host "Proximos pasos:"
Write-Host "  1. Levanta Keycloak: docker compose up -d keycloak"
Write-Host "  2. El realm se importara automaticamente"
Write-Host "  3. Accede a: http://localhost:8081/admin"
