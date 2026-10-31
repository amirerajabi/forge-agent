$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path (Join-Path $root 'ui\node_modules'))) { npm --prefix (Join-Path $root 'ui') install }
if (-not (Test-Path (Join-Path $root 'desktop\node_modules'))) { npm --prefix (Join-Path $root 'desktop') install }

npm --prefix (Join-Path $root 'ui') run build
npm --prefix (Join-Path $root 'desktop') run build

