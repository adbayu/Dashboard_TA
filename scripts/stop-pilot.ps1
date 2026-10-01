# Mematikan lingkungan pilot: simulator, API, dev server, pratinjau, kontainer.
# Data di database TIDAK dihapus (pakai -HapusData kalau memang ingin).
param([switch]$HapusData)
$root = 'C:\JagoFarm_TA\Dashboard_TA'
Set-Location $root

Write-Output '1) Simulator, API, dev server, pratinjau'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*server/simulator.ts*' -or $_.CommandLine -like '*server/index.ts*' -or $_.CommandLine -like '*vite*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Output "  dihentikan PID $($_.ProcessId)" }

Write-Output '2) Kontainer'
if ($HapusData) {
  docker compose -f compose.yaml -f compose.local.yaml down -v
  Write-Output '  kontainer dan DATA pilot dihapus.'
} else {
  docker compose -f compose.yaml -f compose.local.yaml down
  Write-Output '  kontainer dihentikan, data pilot tetap tersimpan.'
}

Write-Output ''
Write-Output 'PORT'
foreach ($p in 5433, 1025, 8025, 3001, 5173, 4173) {
  $hidup = [bool](Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue)
  Write-Output ("  {0,-5} {1}" -f $p, $(if ($hidup) { 'MASIH HIDUP' } else { 'mati' }))
}
