param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform",
  [string]$AwsRegion = "us-east-1",
  [string]$Tag = "dev",
  [string]$RepoRoot = "$PSScriptRoot\..\..\..",
  [string]$FrontendApiBaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  $BackendRepo = terraform output -raw backend_ecr_repository_url
  $FrontendRepo = terraform output -raw frontend_ecr_repository_url
}
finally {
  Pop-Location
}

$AccountId = ($BackendRepo -split "\.")[0]
$Registry = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"
$BackendImage = "${BackendRepo}:$Tag"
$FrontendImage = "${FrontendRepo}:$Tag"

Write-Host "Logging into ECR: $Registry"
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $Registry

Write-Host "Building backend image: $BackendImage"
docker build `
  --build-arg INSTALL_LLM=true `
  --build-arg INSTALL_AWS=true `
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
