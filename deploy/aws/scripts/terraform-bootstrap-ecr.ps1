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
    -target aws_ecr_repository.backend `
    -target aws_ecr_repository.frontend
}
finally {
  Pop-Location
}
