# Menyalakan simulator pilot: memakai kredensial tersimpan, membuang buffer basi,
# dan memastikan hanya satu simulator yang berjalan.
$root = 'C:\JagoFarm_TA\Dashboard_TA'
$tmp  = "$env:LOCALAPPDATA\Temp"
Set-Location $root

$berkas = "$tmp\audit-device.json"
if (-not (Test-Path $berkas)) {
  Write-Output "GAGAL: $berkas tidak ada."
  Write-Output 'Alokasikan unit dulu dari /pilot/admin, lalu simpan deviceId + credential ke berkas itu.'
  exit 1
}

# 1) Hentikan simulator yang masih jalan supaya tidak dobel kirim.
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*server/simulator.ts*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# 2) Buang buffer basi: kiriman lama yang tertolak akan menghambat kiriman baru
#    (server menjawab 409 untuk pengukuran tanpa kepemilikan pada waktu itu).
foreach ($b in @("$root\.pilot-buffer.json", "$tmp\.pilot-buffer.json")) {
  if (Test-Path $b) { Remove-Item $b -Force; Write-Output "Buffer basi dihapus: $b" }
}

$d = Get-Content $berkas -Raw | ConvertFrom-Json
$env:DEVICE_ID = $d.deviceId
$env:DEVICE_CREDENTIAL = $d.credential
$env:DEVICE_MODEL = 'water-v1'
$env:API_URL = 'http://127.0.0.1:3001'

$p = Start-Process -WindowStyle Hidden -PassThru -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList '--env-file-if-exists=.env','--import','tsx','server/simulator.ts' `
  -WorkingDirectory $root `
  -RedirectStandardOutput "$tmp\sim-out.log" -RedirectStandardError "$tmp\sim-err.log"

Write-Output "Simulator berjalan. PID=$($p.Id)"
Write-Output "  unit    : $($d.deviceId)"
Write-Output "  pemilik : $($d.email)"
Write-Output "  log     : $tmp\sim-out.log"
Write-Output 'Data baru muncul paling lambat 30 detik. Hentikan dengan scripts\stop-pilot.ps1'
