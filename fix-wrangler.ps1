# ============================================================
#  FIX WRANGLER - consolida config no wrangler.jsonc
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
    Write-Error "Rode este script DENTRO da pasta 'financas'."
    exit 1
}

# ---- [1/4] Detectar database_id ----
Write-Host "`n>>> [1/4] Obtendo database_id..." -ForegroundColor Cyan
$DatabaseId = $null
$listRaw = & npx wrangler d1 list --json 2>&1 | Out-String
$jsonStart = $listRaw.IndexOf('[')
if ($jsonStart -ge 0) {
    try {
        $dbs = $listRaw.Substring($jsonStart) | ConvertFrom-Json
        $match = $dbs | Where-Object { $_.name -eq 'financas-db' }
        if ($match) { $DatabaseId = $match.uuid }
    } catch {}
}
if (-not $DatabaseId) { $DatabaseId = "a9f67ddb-774c-4955-b3f3-c3910f0c096e" }
Write-Host "Database ID: $DatabaseId" -ForegroundColor Green

# ---- [2/4] Sobrescrever wrangler.jsonc ----
Write-Host "`n>>> [2/4] Gravando wrangler.jsonc..." -ForegroundColor Cyan
$jsonc = @"
{
  //:schema" "./node_modules/wrangler/config-schema.json",
  "name": "financas",
  "compatibility_date": "2026-01-01",
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "financas-db",
      "database_id": "$DatabaseId"
    }
  ]
}
"@
$jsoncPath = [System.IO.Path]::Combine((Get-Location).Path, "wrangler.jsonc")
[System.IO.File]::WriteAllText($jsoncPath, $jsonc, [System.Text.UTF8Encoding]::new($false))
Write-Host "wrangler.jsonc gravado." -ForegroundColor Green
Get-Content $jsoncPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# ---- [3/4] Renomear wrangler.toml para evitar conflito ----
Write-Host "`n>>> [3/4] Renomeando wrangler.toml (para evitar conflito)..." -ForegroundColor Cyan
if (Test-Path "wrangler.toml") {
    Rename-Item -Path "wrangler.toml" -NewName "wrangler.toml.bak" -Force
    Write-Host "wrangler.toml -> wrangler.toml.bak" -ForegroundColor Yellow
} else {
    Write-Host "Nao existe wrangler.toml. OK." -ForegroundColor Green
}

# ---- [4/4] Aplicar schema no D1 LOCAL ----
Write-Host "`n>>> [4/4] Aplicando schema no D1 LOCAL..." -ForegroundColor Cyan
if (-not (Test-Path "schema.sql")) {
    Write-Error "schema.sql nao encontrado."
    exit 1
}
& npx wrangler d1 execute financas-db --local --file=./schema.sql

Write-Host "`n>>> FIX CONCLUIDO!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:" -ForegroundColor Yellow
Write-Host "  npx wrangler pages dev ./dist --live-reload" -ForegroundColor White
Write-Host ""
Write-Host "E confirme que 'env.DB (local-DB)' aparece na lista de bindings." -ForegroundColor Yellow