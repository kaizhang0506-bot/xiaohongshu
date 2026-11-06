$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
$defaultPort = 5000
$port = if ($env:DEPLOY_RUN_PORT) { $env:DEPLOY_RUN_PORT } elseif ($env:PORT) { $env:PORT } else { $defaultPort }
Set-Location $workspace
& node scripts/check-deployment.mjs start
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting HTTP service on port $port for deploy..."
$env:PORT = "$port"
$env:NODE_ENV = "production"
$env:COZE_PROJECT_ENV = "PROD"
& node dist/server.js
exit $LASTEXITCODE
