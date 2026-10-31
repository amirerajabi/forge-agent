$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path (Join-Path $root 'ui\node_modules'))) { npm --prefix (Join-Path $root 'ui') install }
if (-not (Test-Path (Join-Path $root 'desktop\node_modules'))) { npm --prefix (Join-Path $root 'desktop') install }

npm --prefix (Join-Path $root 'desktop') run build
$ui = Start-Process npm -ArgumentList '--prefix', (Join-Path $root 'ui'), 'run', 'dev' -PassThru -WindowStyle Hidden
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 1 | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw 'The UI dev server did not start.' }
  $env:FORGE_DEV_URL = 'http://127.0.0.1:5173'
  npm --prefix (Join-Path $root 'desktop') start
} finally {
  if ($ui -and -not $ui.HasExited) { Stop-Process -Id $ui.Id -Force }
}

