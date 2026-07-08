param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$Repository = "eaka",
  [string]$Tag = "dev",
  [string]$RepoRoot = "$PSScriptRoot\..\..\..",
  [string]$BackendImageName = "backend",
  [string]$FrontendImageName = "frontend",
  [string]$FrontendApiBaseUrl = "http://localhost:8000"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Registry = "$Region-docker.pkg.dev/$ProjectId/$Repository"
$BackendImage = "$Registry/${BackendImageName}:$Tag"
$FrontendImage = "$Registry/${FrontendImageName}:$Tag"

Write-Host "Configuring Docker auth for $Region-docker.pkg.dev"
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

Write-Host "Building backend image: $BackendImage"
docker build `
  --build-arg INSTALL_LLM=true `
  --build-arg INSTALL_GCP=true `
  --build-arg INSTALL_EMBEDDINGS=false `
  -t $BackendImage `
  "$RepoRoot\backend"

Write-Host "Building frontend image: $FrontendImage"
docker build `
  --build-arg NEXT_PUBLIC_API_BASE_URL=$FrontendApiBaseUrl `
  -t $FrontendImage `
  "$RepoRoot\frontend"

Write-Host "Pushing backend image"
docker push $BackendImage

Write-Host "Pushing frontend image"
docker push $FrontendImage

Write-Host ""
Write-Host "Use these values in terraform.tfvars:"
Write-Host "backend_image  = `"$BackendImage`""
Write-Host "worker_image   = `"$BackendImage`""
Write-Host "frontend_image = `"$FrontendImage`""
