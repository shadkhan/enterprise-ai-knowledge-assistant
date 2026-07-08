param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  terraform init
}
finally {
  Pop-Location
}
