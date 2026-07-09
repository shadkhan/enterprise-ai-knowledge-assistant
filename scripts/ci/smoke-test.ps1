param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [string]$UserId = "u-admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod "$BaseUrl/health"
if ($health.status -ne "ok") {
  throw "Health check failed"
}

$ready = Invoke-RestMethod "$BaseUrl/ready"
if ($ready.status -ne "ready") {
  throw "Readiness check failed"
}

$body = @{ question = "How many days can employees work remotely?" } | ConvertTo-Json
$chat = Invoke-RestMethod "$BaseUrl/chat" -Method Post -ContentType "application/json" -Headers @{ "X-User-Id" = $UserId } -Body $body
if (-not $chat.answer) {
  throw "Chat smoke test failed"
}

Write-Host "Smoke tests passed for $BaseUrl"
