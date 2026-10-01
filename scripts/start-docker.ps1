# Menyalakan Docker Desktop dan menunggu engine siap.
$exe = 'C:\Users\ega\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe'
if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
  Start-Process $exe
  Write-Output 'Docker Desktop dijalankan.'
} else {
  Write-Output 'Docker Desktop sudah berjalan.'
}
$siap = $false
for ($i = 1; $i -le 60; $i++) {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $siap = $true; Write-Output "Engine siap setelah $i kali cek."; break }
  Start-Sleep -Seconds 5
}
if (-not $siap) { Write-Output 'GAGAL: engine tidak siap dalam 5 menit.' }
