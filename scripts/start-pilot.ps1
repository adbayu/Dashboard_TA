# Menyalakan seluruh lingkungan pilot: database, Mailpit, API, dev server, pratinjau.
# Aman dijalankan berulang; proses yang sudah hidup tidak digandakan.
$root = 'C:\JagoFarm_TA\Dashboard_TA'
$node = 'C:\Program Files\nodejs\node.exe'
$tmp  = "$env:LOCALAPPDATA\Temp"
Set-Location $root

function Test-Port([int]$port) {
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  return [bool]$c
}
function Start-Node([string[]]$argList, [string]$nama, [string]$keluar, [string]$galat) {
  Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList $argList `
    -WorkingDirectory $root -RedirectStandardOutput "$tmp\$keluar" -RedirectStandardError "$tmp\$galat"
  Write-Output "  $nama dijalankan (log: $tmp\$galat)"
}

Write-Output '1) Docker Desktop + engine'
& "$root\scripts\start-docker.ps1"

Write-Output '2) Kontainer database + Mailpit'
docker compose -f compose.yaml -f compose.local.yaml up -d 2>&1 | ForEach-Object { "  $_" }

Write-Output '3) Menunggu database sehat'
for ($i = 1; $i -le 40; $i++) {
  $status = docker inspect --format '{{.State.Health.Status}}' dashboard_ta-database-1 2>$null
  if ($status -eq 'healthy') { Write-Output "  database healthy setelah $i kali cek."; break }
  Start-Sleep -Seconds 3
}

Write-Output '4) API pilot (3001)'
if (Test-Port 3001) { Write-Output '  sudah hidup, dilewati.' }
else { Start-Node @('--env-file-if-exists=.env','--import','tsx','server/index.ts') 'API' 'api-out.log' 'api-err.log'; Start-Sleep -Seconds 6 }

Write-Output '5) Dev server UI pilot (5173, wajib port ini)'
if (Test-Port 5173) { Write-Output '  sudah hidup, dilewati.' }
else { Start-Node @('node_modules/vite/bin/vite.js','--port','5173','--strictPort') 'Vite dev' 'vite-out.log' 'vite-err.log'; Start-Sleep -Seconds 6 }

Write-Output '6) Pratinjau hasil build (4173)'
if (Test-Port 4173) { Write-Output '  sudah hidup, dilewati.' }
else { Start-Node @('node_modules/vite/bin/vite.js','preview','--port','4173','--strictPort','--host') 'Vite preview' 'prev-out.log' 'prev-err.log'; Start-Sleep -Seconds 5 }

Write-Output ''
Write-Output 'HASIL PEMERIKSAAN'
foreach ($p in 5433, 1025, 8025, 3001, 5173, 4173) {
  $hidup = Test-Port $p
  Write-Output ("  {0,-5} {1}" -f $p, $(if ($hidup) { 'HIDUP' } else { 'MATI' }))
}
try {
  $h = (Invoke-WebRequest http://127.0.0.1:3001/api/health -UseBasicParsing -TimeoutSec 10).Content
  Write-Output "  API /api/health -> $h"
} catch { Write-Output "  API /api/health -> GAGAL: $($_.Exception.Message)" }
