$ErrorActionPreference = "Stop"

$root = "\\webedit.ntnu.no\tormt"
$pythonExe = "C:\Users\tormt\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe"
$ytDlpExe = "C:\Users\tormt\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\Scripts\yt-dlp.exe"
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
        [string]$Url
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
    $arguments += @("--process-url", $Url)

    $safeLabel = ($Label -replace '[^A-Za-z0-9._-]+', '_')
    $stdoutPath = Join-Path $tempDir ("scheduled_fluid_refresh_" + $safeLabel + "_stdout.txt")
    $stderrPath = Join-Path $tempDir ("scheduled_fluid_refresh_" + $safeLabel + "_stderr.txt")

    if (Test-Path -LiteralPath $stdoutPath) { Remove-Item -LiteralPath $stdoutPath -Force }
    if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }

    Write-Log ("Starter batch: " + $Label)
    $proc = Start-Process -FilePath $pythonExe -ArgumentList $arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

    $stdoutText = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
    $stderrText = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }

    if ($stdoutText) {
        $stdoutText | Tee-Object -FilePath $logPath -Append | Out-Null
    }
    if ($stderrText) {
        $stderrText | Tee-Object -FilePath $logPath -Append | Out-Null
    }

    if ($proc.ExitCode -ne 0) {
        $combined = (($stdoutText + "`n" + $stderrText).Trim())
        throw ("Batch feilet: " + $Label + " (exit " + $proc.ExitCode + "). " + $combined)
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
if (-not (Test-Path -LiteralPath $ytDlpExe)) {
    throw "Fant ikke yt-dlp: $ytDlpExe"
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
$env:YT_DLP_EXE = $ytDlpExe
$env:PATH = ((Split-Path $ytDlpExe -Parent) + ";" + $env:PATH)

try {
    Write-Log ("Starter nattjobb for " + $queue.course + ". Aktive batcher: " + $enabledBatches.Count)

    $successCount = 0
    $failureCount = 0
    $consecutiveFailures = 0
    $stopRequested = $false
    $stoppedByRateLimit = $false

    foreach ($batch in $enabledBatches) {
        $urls = @($batch.urls)
        for ($i = 0; $i -lt $urls.Count; $i++) {
            $label = $batch.label
            if ($urls.Count -gt 1) {
                $label = $label + " [" + ($i + 1) + "/" + $urls.Count + "]"
            }
            try {
                Invoke-EnricherBatch -Label $label -Url $urls[$i]
                $successCount++
                $consecutiveFailures = 0
            }
            catch {
                $failureCount++
                $consecutiveFailures++
                $message = $_.Exception.Message
                Write-Log ("HOPPER OVER: " + $label + " :: " + $message)
                if ($message -match "HTTP 429|Rate limit|free-models-per-day") {
                    Write-Log "Stopper videre kjoring pa grunn av rate limit."
                    $stopRequested = $true
                    $stoppedByRateLimit = $true
                    break
                }
                if ($consecutiveFailures -ge 3) {
                    Write-Log "Stopper videre kjoring etter 3 feil pa rad."
                    $stopRequested = $true
                    break
                }
            }
            Start-Sleep -Seconds 5
        }
        if ($stopRequested) {
            break
        }
    }

    Write-Log ("Nattjobb fullfort. Vellykkede: " + $successCount + ". Feil/skippet: " + $failureCount + ".")
    if ($stoppedByRateLimit) {
        Write-Log "Avslutter uten feilkode fordi stoppaarsaken var rate limit."
        exit 0
    }
    if ($successCount -eq 0 -and $failureCount -gt 0) {
        exit 1
    }
}
catch {
    Write-Log ("FEIL: " + $_.Exception.Message)
    throw
}
