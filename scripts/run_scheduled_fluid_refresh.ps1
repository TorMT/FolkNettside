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
$envPath = Join-Path $root ".env.local"

function Write-Log {
    param([string]$Message)
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    $line | Tee-Object -FilePath $logPath -Append
}

function Get-EnvValue {
    param(
        [string]$Key,
        [string[]]$Lines
    )
    foreach ($line in $Lines) {
        if ($line -match '^\s*#') { continue }
        if ($line -notmatch '=') { continue }
        $parts = $line -split '=', 2
        if ($parts[0].Trim() -ne $Key) { continue }
        return $parts[1].Trim().Trim('"').Trim("'")
    }
    return ""
}

function Get-OpenRouterKeys {
    param([string]$EnvFilePath)

    $keys = New-Object System.Collections.Generic.List[string]
    $envLines = @()
    if (Test-Path -LiteralPath $EnvFilePath) {
        $envLines = Get-Content -LiteralPath $EnvFilePath
    }

    $candidateValues = @()
    $candidateValues += Get-EnvValue -Key "OPENROUTER_API_KEY" -Lines $envLines
    $candidateValues += Get-EnvValue -Key "OPENROUTER_API_KEYS" -Lines $envLines
    $candidateValues += Get-EnvValue -Key "OPENROUTER_API_KEY_2" -Lines $envLines
    $candidateValues += Get-EnvValue -Key "OPENROUTER_API_KEY_3" -Lines $envLines
    $candidateValues += $env:OPENROUTER_API_KEY
    $candidateValues += $env:OPENROUTER_API_KEYS
    $candidateValues += $env:OPENROUTER_API_KEY_2
    $candidateValues += $env:OPENROUTER_API_KEY_3

    $seen = @{}
    foreach ($value in $candidateValues) {
        foreach ($key in @($value -split ',')) {
            $trimmed = $key.Trim()
            if (-not $trimmed) { continue }
            if ($seen.ContainsKey($trimmed)) { continue }
            $seen[$trimmed] = $true
            [void]$keys.Add($trimmed)
        }
    }
    return $keys
}

function Invoke-EnricherBatch {
    param(
        [string]$Label,
        [string]$Url,
        [string]$OpenRouterApiKey
    )

    $arguments = @(
        $enricherScript,
        "--input", $inputPath,
        "--output", $tmpOutput,
        "--existing-json", $jsonPath,
        "--preserve-title-grouping",
        "--only-refresh-weak-fields",
        "--ai-provider", "openrouter",
        "--strict-ai",
        "--openrouter-api-key", $OpenRouterApiKey
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

    $selectedCount = 0
    if ($stdoutText -match '\[INFO\]\s+Valgte\s+(\d+)\s+av') {
        $selectedCount = [int]$matches[1]
    }

    if ($proc.ExitCode -ne 0) {
        $combined = (($stdoutText + "`n" + $stderrText).Trim())
        throw ("Batch feilet: " + $Label + " (exit " + $proc.ExitCode + "). " + $combined)
    }
    if ($selectedCount -le 0) {
        if (Test-Path -LiteralPath $tmpOutput) {
            Remove-Item -LiteralPath $tmpOutput -Force
        }
        Write-Log ("Ingen oppdatering nødvendig for batch: " + $Label)
        return [pscustomobject]@{
            SelectedCount = 0
            Updated = $false
        }
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
    return [pscustomobject]@{
        SelectedCount = $selectedCount
        Updated = $true
    }
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
if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Fant ikke env-fil: $envPath"
}
if (-not (Test-Path -LiteralPath $jsonPath)) {
    throw "Fant ikke eksisterende JSON: $jsonPath"
}

$queue = Get-Content -LiteralPath $queuePath -Raw | ConvertFrom-Json
$enabledBatches = @($queue.batches | Where-Object { $_.enabled -eq $true })
$openRouterKeys = @(Get-OpenRouterKeys -EnvFilePath $envPath)
$keyCount = $openRouterKeys.Count
$dailySuccessLimit = 0
$perKeyDailySuccessLimit = 0
if ($queue.PSObject.Properties.Name -contains "daily_success_limit") {
    $dailySuccessLimit = [int]$queue.daily_success_limit
}
if ($queue.PSObject.Properties.Name -contains "per_key_daily_success_limit") {
    $perKeyDailySuccessLimit = [int]$queue.per_key_daily_success_limit
}
$keySuccessCounts = @{}
$keyAvailable = @{}
for ($i = 0; $i -lt $keyCount; $i++) {
    $keySuccessCounts[$i] = 0
    $keyAvailable[$i] = $true
}
$env:YT_DLP_EXE = $ytDlpExe
$env:PATH = ((Split-Path $ytDlpExe -Parent) + ";" + $env:PATH)

if ($keyCount -le 0) {
    throw "Fant ingen OpenRouter-nokler i .env.local eller miljoet."
}

try {
    Write-Log ("Starter nattjobb for " + $queue.course + ". Aktive batcher: " + $enabledBatches.Count + ". Dagsgrense: " + $dailySuccessLimit + ". Nokler: " + $keyCount + ".")

    $successCount = 0
    $failureCount = 0
    $consecutiveFailures = 0
    $stopRequested = $false
    $stoppedByRateLimit = $false
    $allKeysUnavailable = $false

    for ($batchIndex = 0; $batchIndex -lt $enabledBatches.Count; $batchIndex++) {
        $batch = $enabledBatches[$batchIndex]
        $urls = @($batch.urls)
        $keyIndex = $batchIndex % $keyCount
        if (-not $keyAvailable[$keyIndex]) {
            Write-Log ("HOPPER OVER BATCH fordi nokkel er utilgjengelig: " + $batch.label + " [key " + ($keyIndex + 1) + "]")
            continue
        }
        if ($perKeyDailySuccessLimit -gt 0 -and $keySuccessCounts[$keyIndex] -ge $perKeyDailySuccessLimit) {
            Write-Log ("HOPPER OVER BATCH fordi nokkel har naadd dagsgrense: " + $batch.label + " [key " + ($keyIndex + 1) + "]")
            continue
        }

        for ($i = 0; $i -lt $urls.Count; $i++) {
            if (-not $keyAvailable[$keyIndex]) {
                break
            }
            if ($perKeyDailySuccessLimit -gt 0 -and $keySuccessCounts[$keyIndex] -ge $perKeyDailySuccessLimit) {
                Write-Log ("Stopper videre batcher pa key " + ($keyIndex + 1) + " fordi dagsgrensen er naadd.")
                break
            }

            $label = $batch.label + " [key " + ($keyIndex + 1) + "]"
            if ($urls.Count -gt 1) {
                $label = $label + " [" + ($i + 1) + "/" + $urls.Count + "]"
            }
            try {
                $result = Invoke-EnricherBatch -Label $label -Url $urls[$i] -OpenRouterApiKey $openRouterKeys[$keyIndex]
                if ($result.Updated) {
                    $successCount++
                    $keySuccessCounts[$keyIndex] = [int]$keySuccessCounts[$keyIndex] + 1
                }
                $consecutiveFailures = 0
                if ($dailySuccessLimit -gt 0 -and $successCount -ge $dailySuccessLimit) {
                    Write-Log ("Stopper videre kjoring fordi dagsgrensen pa " + $dailySuccessLimit + " oppdateringer er naadd.")
                    $stopRequested = $true
                    break
                }
            }
            catch {
                $failureCount++
                $consecutiveFailures++
                $message = $_.Exception.Message
                Write-Log ("HOPPER OVER: " + $label + " :: " + $message)
                $hardRateLimit = (
                    $message -match "free-models-per-day" -or
                    $message -match "free-models-per-min" -or
                    $message -match "X-RateLimit-Remaining.:.0" -or
                    $message -match "Rate limit exceeded"
                )
                if ($hardRateLimit) {
                    $keyAvailable[$keyIndex] = $false
                    Write-Log ("Markerer key " + ($keyIndex + 1) + " som tom for i dag pa grunn av rate limit.")
                    $availableCount = @($keyAvailable.GetEnumerator() | Where-Object { $_.Value }).Count
                    if ($availableCount -le 0) {
                        Write-Log "Stopper videre kjoring fordi alle nokler er tomme for i dag."
                        $stopRequested = $true
                        $stoppedByRateLimit = $true
                    }
                    break
                }
                if ($consecutiveFailures -ge 6) {
                    Write-Log "Stopper videre kjoring etter 6 feil pa rad."
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
