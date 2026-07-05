param(
    [ValidateSet("docker", "backend", "frontend")]
    [string]$Mode = "docker"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Mode -eq "docker") {
    Write-Host "Starting full stack with Docker Compose..."
    Write-Host "Frontend: http://localhost:3000"
    Write-Host "Backend API docs: http://localhost:8000/docs"
    Push-Location "$Root\infra"
    docker compose up --build
    Pop-Location
    exit
}

if ($Mode -eq "backend") {
    Write-Host "Starting backend only with local SQLite persistence..."
    Write-Host "Backend API docs: http://localhost:8000/docs"
    Push-Location "$Root\backend"
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        Write-Host "uv was not found. Install it from https://docs.astral.sh/uv/ or run full stack with Docker: .\run.ps1"
        exit 1
    }
    uv --system-certs sync
    uv run uvicorn app.main:app --reload
    Pop-Location
    exit
}

if ($Mode -eq "frontend") {
    Write-Host "Starting frontend with pnpm..."
    Write-Host "Frontend: http://localhost:3000"
    Push-Location "$Root\frontend"
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
            Write-Host "pnpm was not found. Install pnpm or Node Corepack, or run full stack with Docker: .\run.ps1"
            exit 1
        }
        corepack enable
    }
    pnpm install
    pnpm dev
    Pop-Location
}
