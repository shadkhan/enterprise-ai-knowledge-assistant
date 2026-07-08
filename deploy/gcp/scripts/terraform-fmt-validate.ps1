param(
  [string]$TerraformDir = "$PSScriptRoot\..\terraform"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $TerraformDir
try {
  terraform fmt -recursive
  terraform validate
}
finally {
  Pop-Location
}
