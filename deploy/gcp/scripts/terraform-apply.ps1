param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform",
  [string]$PlanFile = "tfplan"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  if (Test-Path $PlanFile) {
    terraform apply $PlanFile
  }
  else {
    terraform apply
  }
}
finally {
  Pop-Location
}
