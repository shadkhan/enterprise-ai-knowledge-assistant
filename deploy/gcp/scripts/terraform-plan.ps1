param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform",
  [string]$VarFile = "terraform.tfvars",
  [string]$OutFile = "tfplan"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  terraform plan -var-file $VarFile -out $OutFile
}
finally {
  Pop-Location
}
