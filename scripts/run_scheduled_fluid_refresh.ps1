$ErrorActionPreference = "Stop"

$root = "\\webedit.ntnu.no\tormt"
$pythonExe = "C:\Users\tormt\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe"
$enricherScript = Join-Path $root "scripts\video_topic_enricher.py"
$queuePath = Join-Path $root "scripts\scheduled_fluid_refresh_queue.json"
$inputPath = Join-Path $root "semestre\3\Fluid\filer\Forelesning.txt"
$jsonPath = Join-Path $root "semestre\3\Fluid\filer\Forelesning.json"
$tempDir = Join-Path $root "temp"

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $tempDir ("scheduled_fluid_refresh_" + $stamp + ".log")
$tmpOutput = Join-Path $tempDir "scheduled_fluid_refresh_work.json"
$backupPath = Join-Path $tempDir ("Forelesning.before_scheduled_refresh_" + $stamp + ".json")
$backupCreated = $false

function Write-Log {
    param([string]$Message)
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    $line | Tee-Object -FilePath $logPath -Append
}

function Invoke-EnricherBatch {
    param(
        [string]$Label,
        [string[]]$Urls
    )

    $arguments = @(
        $enricherScript,
        "--input", $inputPath,
        "--output", $tmpOutput,
        "--existing-json", $jsonPath,
        "--preserve-title-grouping",
        "--only-refresh-weak-fields",
        "--ai-provider", "openrouter",
        "--strict-ai"
    )

    foreach ($url in $Urls) {
        $arguments += @("--process-url", $url)
    }

    Write-Log ("Starter batch: " + $Label)
    & $pythonExe @arguments 2>&1 | Tee-Object -FilePath $logPath -Append
    if ($LASTEXITCODE -ne 0) {
        throw "Batch feilet: $Label (exit $LASTEXITCODE)"
    }
    if (-not (Test-Path -LiteralPath $tmpOutput)) {
        throw "Mangler temp-output etter batch: $Label"
    }

    if (-not $backupCreated) {
        Copy-Item -LiteralPath $jsonPath -Destination $backupPath -Force
        $script:backupCreated = $true
        Write-Log ("Backup laget: " + $backupPath)
    }

    Move-Item -LiteralPath $tmpOutput -Destination $jsonPath -Force
    Write-Log ("Oppdatert produksjonsfil for batch: " + $Label)
}

if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Fant ikke python: $pythonExe"
}
if (-not (Test-Path -LiteralPath $enricherScript)) {
    throw "Fant ikke script: $enricherScript"
}
if (-not (Test-Path -LiteralPath $queuePath)) {
    throw "Fant ikke queue-fil: $queuePath"
}
if (-not (Test-Path -LiteralPath $jsonPath)) {
    throw "Fant ikke eksisterende JSON: $jsonPath"
}

$queue = Get-Content -LiteralPath $queuePath -Raw | ConvertFrom-Json
$enabledBatches = @($queue.batches | Where-Object { $_.enabled -eq $true })

Write-Log ("Starter nattjobb for " + $queue.course + ". Aktive batcher: " + $enabledBatches.Count)

foreach ($batch in $enabledBatches) {
    Invoke-EnricherBatch -Label $batch.label -Urls @($batch.urls)
    Start-Sleep -Seconds 5
}

Write-Log "Nattjobb fullfort."
