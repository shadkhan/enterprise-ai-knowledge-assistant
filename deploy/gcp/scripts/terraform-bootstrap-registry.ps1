param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform",
  [string]$VarFile = "terraform.tfvars"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  terraform apply `
    -var-file $VarFile `
    -target google_project_service.apis `
    -target google_artifact_registry_repository.app
}
finally {
  Pop-Location
}
