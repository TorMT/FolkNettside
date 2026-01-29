Write-Host "[git] Adding .gitignore"
git add .gitignore

$paths = @('export','semestre','kontakt','om','temp')
foreach ($p in $paths) {
    git ls-files --error-unmatch $p 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[git] Untracking $p"
        git rm -r --cached $p
    } else {
        Write-Host "[git] Not tracked or missing: $p"
    }
}

try {
    git commit -m "chore: ignore local/personal folders (export, semestre, kontakt, om, temp)"
    Write-Host "[git] Commit done"
} catch {
    Write-Host "[git] Nothing to commit or commit failed"
}

try {
    git push
    Write-Host "[git] Push done"
} catch {
    Write-Host "[git] Push failed"
}
