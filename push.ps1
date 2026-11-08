# -*- coding: utf-8 -*-
"""推到 GitHub 的两种方式

用法：
  .\push.ps1                      # SSH（已在 .ssh/config 配好 github 走代理，需先把公钥加进 Deploy key）
  .\push.ps1 -Token github_pat_x  # HTTPS + 个人访问令牌（需 Contents: write）
"""
param(
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$Remote = "https://github.com/hangzhoujunyao-sudo/falo.git",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$git = "E:\DMiniconda3\1.2\Git\cmd\git.exe"
$sshKey = "$env:USERPROFILE\.ssh\falo_ed25519"
$sshCfg = "$env:USERPROFILE\.ssh\config"

if ($Token) {
    & $git config http.proxy "http://127.0.0.1:10808" | Out-Null
    $url = $Remote -replace '^https://', "https://x-access-token:$Token@"
    & $git remote remove origin 2>$null | Out-Null
    & $git remote add origin $url
    Write-Host "HTTPS 推送（令牌）…"
    & $git push -u origin $Branch
    $code = $LASTEXITCODE
    & $git remote set-url origin $Remote | Out-Null
} else {
    if (-not (Test-Path $sshKey)) {
        Write-Host "还没有 SSH 私钥：$sshKey" -ForegroundColor Yellow
        exit 2
    }
    $env:GIT_SSH_COMMAND = "ssh -F `"$sshCfg`" -o StrictHostKeyChecking=accept-new"
    & $git remote remove origin 2>$null | Out-Null
    & $git remote add origin "git@github.com:hangzhoujunyao-sudo/falo.git"
    Write-Host "SSH 推送（Deploy key）…"
    & $git push -u origin $Branch
    $code = $LASTEXITCODE
}

if ($code -eq 0) {
    Write-Host "完成：$Remote ($Branch)" -ForegroundColor Green
} else {
    Write-Host "失败（exit $code）。令牌方式查 Contents: write；SSH 方式确认公钥已加为 Deploy key 且勾了 Allow write。" -ForegroundColor Red
}
exit $code
