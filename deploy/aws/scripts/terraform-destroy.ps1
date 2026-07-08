param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform",
  [string]$VarFile = "terraform.tfvars"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  terraform destroy -var-file $VarFile
}
finally {
  Pop-Location
}
