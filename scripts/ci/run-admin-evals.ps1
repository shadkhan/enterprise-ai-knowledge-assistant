param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [string]$UserId = "u-admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$result = Invoke-RestMethod "$BaseUrl/admin/evaluations/run" -Method Post -Headers @{ "X-User-Id" = $UserId }

Write-Host "Evaluation run: $($result.run_id)"
Write-Host "Passed: $($result.passed_cases) / $($result.total_cases)"

if ($result.failed_cases -gt 0) {
  throw "Golden evaluations failed"
}
