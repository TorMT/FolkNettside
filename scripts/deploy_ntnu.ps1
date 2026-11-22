# Build locally, compare content, copy changed website files. Never delete.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$Python = 'python',
    [string]$BasePath = '',
    [switch]$DryRun,
    # Explicitly permits a local sandbox for testing the copy algorithm.
    [switch]$AllowLocalDestination
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repoDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($repoRoot).TrimEnd('\').TrimEnd(':')) -ErrorAction SilentlyContinue
if ($repoRoot.StartsWith('\\') -or ($repoDrive -and $repoDrive.DisplayRoot)) {
    throw 'Run deployment from a local Git checkout, never the NTNU network directory.'
}
if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
    throw "Destination is not mounted/reachable: $Destination"
}
$destRoot = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Destination).ProviderPath).TrimEnd('\')
if ($destRoot -eq $repoRoot -or $destRoot.StartsWith($repoRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or $repoRoot.StartsWith($destRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destination and local checkout must be separate directory trees.'
}
$destDriveName = [IO.Path]::GetPathRoot($destRoot).TrimEnd('\').TrimEnd(':')
$destDrive = Get-PSDrive -Name $destDriveName -ErrorAction SilentlyContinue
$networkRoot = if ($destRoot.StartsWith('\\')) { $destRoot } elseif ($destDrive) { $destDrive.DisplayRoot } else { '' }
if (-not $AllowLocalDestination -and $networkRoot -notmatch '^\\\\webedit\.ntnu\.no\\[^\\]+') {
    throw 'Destination must be the mounted webedit.ntnu.no directory. Local tests need -AllowLocalDestination.'
}
& $Python -B (Join-Path $PSScriptRoot 'export_repo.py') --target ntnu "--base-path=$BasePath"
if ($LASTEXITCODE -ne 0) { throw 'NTNU build failed; nothing copied.' }
$exportRoot = Join-Path $repoRoot 'export-ntnu'
$manifest = Get-Content -LiteralPath (Join-Path $exportRoot 'deployment\build.json') -Raw | ConvertFrom-Json
if ($manifest.target -ne 'ntnu') { throw 'Refusing a non-NTNU export.' }
$copied = 0
$skipped = 0
$planned = 0
foreach ($relative in @($manifest.files) + @('deployment/build.json')) {
    $sourcePath = [IO.Path]::GetFullPath((Join-Path $exportRoot $relative))
    $targetPath = [IO.Path]::GetFullPath((Join-Path $destRoot $relative))
    if (-not $sourcePath.StartsWith($exportRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or -not $targetPath.StartsWith($destRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe path in build manifest: $relative"
    }
    # Reject directory/file reparse points, including ancestors, so a junction
    # cannot route a copy outside the verified destination.
    $ancestor = $targetPath
    while ($ancestor -and $ancestor.StartsWith($destRoot, [StringComparison]::OrdinalIgnoreCase)) {
        if (Test-Path -LiteralPath $ancestor) {
            $item = Get-Item -LiteralPath $ancestor -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Destination contains a reparse point: $ancestor" }
        }
        if ($ancestor -eq $destRoot) { break }
        $ancestor = Split-Path -Parent $ancestor
    }
    if ((Test-Path -LiteralPath $targetPath -PathType Leaf) -and (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash) {
        Write-Output "SKIP unchanged: $relative"
        $skipped++
        continue
    }
    $planned++
    if ($DryRun) {
        Write-Output "WOULD COPY: $relative"
    } elseif ($PSCmdlet.ShouldProcess($targetPath, 'Copy changed website file')) {
        $parentDir = Split-Path -Parent $targetPath
        [IO.Directory]::CreateDirectory($parentDir) | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
        Write-Output "COPIED: $relative"
        $copied++
    }
}
Write-Output "Complete: copied=$copied unchanged=$skipped changed=$planned dryRun=$DryRun. No files deleted."
