# -*- coding: utf-8 -*-
"""带令牌推送：.\push.ps1 -Token github_pat_xxx  （或用环境变量 GITHUB_TOKEN）"""
param(
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$Remote = "https://github.com/hangzhoujunyao-sudo/falo.git",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not $Token) {
    Write-Host "缺少令牌：-Token github_pat_xxx 或先设 `$env:GITHUB_TOKEN" -ForegroundColor Yellow
    exit 2
}

# 走本机代理（直连 github 不通）
git config http.proxy "http://127.0.0.1:10808" | Out-Null

$url = $Remote -replace '^https://', "https://x-access-token:$Token@"
git remote remove origin 2>$null | Out-Null
git remote add origin $url

Write-Host "推送 $Branch …"
git push -u origin $Branch
$code = $LASTEXITCODE

# 推完把令牌从 remote 里摘掉
git remote set-url origin $Remote | Out-Null
if ($code -eq 0) {
    Write-Host "完成：$Remote ($Branch)" -ForegroundColor Green
} else {
    Write-Host "失败（exit $code），检查令牌权限是否含 Contents: write" -ForegroundColor Red
}
exit $code
