# //lagt til av AI i etterkant//
if (-not ) {
   = '\\webedit.ntnu.no\\tormt','Z:\'
  foreach ( in ) { if (Test-Path ) {  = ; break } }
  if (-not ) {  = (Get-Location).Path }
}
 = 
# //lagt til av AI i etterkant//

Write-Host "[hooks] pre-push hook (PowerShell) disabled — to enable, restore scripts/git-hooks/pre-push.ps1 from VCS"
exit 0

