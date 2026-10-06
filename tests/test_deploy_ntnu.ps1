# Exercise production-copy safety only in a newly created local temp sandbox.
param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$sandbox = Join-Path $tempRoot ('folkntnu-deploy-test-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($sandbox) | Out-Null
$sentinel = Join-Path $sandbox 'archive.pdf'
[IO.File]::WriteAllText($sentinel, 'External production archive must survive')
$hash = (Get-FileHash -LiteralPath $sentinel).Hash
$deployScript = Join-Path $repoRoot 'scripts\deploy_ntnu.ps1'
try {
    $dry = & $deployScript -Destination $sandbox -AllowLocalDestination -Python $Python -DryRun
    if (@(Get-ChildItem -LiteralPath $sandbox -Force).Count -ne 1) { throw 'Dry-run wrote destination files' }
    if (($dry -join ' ') -notmatch 'copied=0') { throw 'Dry-run did not report zero copies' }
    $first = & $deployScript -Destination $sandbox -AllowLocalDestination -Python $Python
    if (-not (Test-Path -LiteralPath (Join-Path $sandbox 'index.html'))) { throw 'Website was not copied' }
    $second = & $deployScript -Destination $sandbox -AllowLocalDestination -Python $Python
    if (($second -join ' ') -notmatch 'copied=0') { throw 'Unchanged deployment copied files' }
    [IO.File]::WriteAllText((Join-Path $sandbox 'index.html'), 'Changed destination')
    $beforeWhatIf = (Get-FileHash -LiteralPath (Join-Path $sandbox 'index.html')).Hash
    & $deployScript -Destination $sandbox -AllowLocalDestination -Python $Python -WhatIf | Out-Null
    if ((Get-FileHash -LiteralPath (Join-Path $sandbox 'index.html')).Hash -ne $beforeWhatIf) { throw 'WhatIf changed destination' }
    $repair = & $deployScript -Destination $sandbox -AllowLocalDestination -Python $Python
    if (($repair -join ' ') -notmatch 'copied=1 ') { throw 'Changed file was not the sole copied file' }
    if ((Get-FileHash -LiteralPath $sentinel).Hash -ne $hash) { throw 'External archive changed' }
    $rejected = $false
    try { & $deployScript -Destination $repoRoot -AllowLocalDestination -DryRun | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Overlapping destination was accepted' }
    $rejected = $false
    try { & $deployScript -Destination (Join-Path $sandbox 'not-mounted') -DryRun | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Missing destination was accepted' }
    Write-Output 'PASS deployment: dry-run, changed/unchanged copy, WhatIf, archive preservation, overlap and unreachable guards'
} finally {
    $resolvedSandbox = [IO.Path]::GetFullPath($sandbox)
    if (-not $resolvedSandbox.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolvedSandbox) -notlike 'folkntnu-deploy-test-*') {
        throw 'Refusing unsafe sandbox cleanup'
    }
    Remove-Item -LiteralPath $resolvedSandbox -Recurse -Force
}
