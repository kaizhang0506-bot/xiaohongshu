$ErrorActionPreference = "Stop"

$workspace = if ($env:COZE_WORKSPACE_PATH) { $env:COZE_WORKSPACE_PATH } else { (Get-Location).Path }
Set-Location $workspace
& node scripts/check-deployment.mjs build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing dependencies..."
& pnpm install --frozen-lockfile --prefer-offline --reporter=append-only
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building the Next.js project..."
& pnpm next build --webpack
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Bundling server with tsup..."
& pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node scripts/check-deployment.mjs record
exit $LASTEXITCODE
