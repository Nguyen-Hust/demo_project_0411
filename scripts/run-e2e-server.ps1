param(
    [int]$Port = 5160,
    [string]$TestCommand = "npx playwright test mvp-core.spec.ts --headed"
)

# Ephemeral E2E supervisor: postgres (Docker) -> migrations -> web server -> test -> teardown.
# Được gọi từ pipeline; không commit mật khẩu thật (dev-only trong docker-compose.yml).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Tool([string]$cmd) {
    Write-Host "[supervisor] $cmd"
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

try {
    # 0. Connection string cho migration + web (trước khi chạy dotnet ef)
    $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=smartkms;Username=postgres;Password=smartkms_dev"

    # 1. Docker DB
    $dockerUp = "docker compose -f `"$root\docker-compose.yml`" up -d db"
    Invoke-Tool $dockerUp
    Write-Host "[supervisor] waiting for db health..."
    $deadline = (Get-Date).AddSeconds(60)
    do {
        $status = & docker inspect --format '{{.State.Health.Status}}' (docker compose -f "$root\docker-compose.yml" ps -q db)
        if ($status -eq "healthy") { break }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    if ($status -ne "healthy") { throw "Postgres container did not become healthy" }

    # 2. Migrations
    Invoke-Tool "dotnet ef database update --project `"$root\src\SmartKMS.Infrastructure`" --startup-project `"$root\src\SmartKMS.Web`""

    # 3. Web server (ephemeral background)
    $web = Start-Process -FilePath "dotnet" -ArgumentList "run --project `"$root\src\SmartKMS.Web`" --no-build --urls http://localhost:$Port" -PassThru -WindowStyle Hidden
    Write-Host "[supervisor] web started pid=$($web.Id) on :$Port"
    $ready = $false
    $deadline = (Get-Date).AddSeconds(60)
    do {
        Start-Sleep -Seconds 2
        try { $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ready = $true } } catch {}
    } while ((Get-Date) -lt $deadline -and -not $ready)
    if (-not $ready) { throw "Web server did not become ready" }

    # 4. Test (headed)
    Push-Location "$root\e2e"
    try { Invoke-Tool $TestCommand } finally { Pop-Location }
}
finally {
    # 5. Teardown: stop web, then docker compose down
    if ($web -and -not $web.HasExited) { Stop-Process -Id $web.Id -Force -ErrorAction SilentlyContinue }
    & docker compose -f "$root\docker-compose.yml" down --volumes 2>$null
    Write-Host "[supervisor] teardown complete"
}
