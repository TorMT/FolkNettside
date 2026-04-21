$ErrorActionPreference = "Stop"

$root = "\\webedit.ntnu.no\tormt"
$env:VIDEO_REFRESH_QUEUE_PATH = Join-Path $root "scripts\scheduled_fysikalsk_refresh_queue.json"
$env:VIDEO_REFRESH_INPUT_PATH = Join-Path $root "semestre\4\FysikalskKjemi\filer\Forelesning.txt"
$env:VIDEO_REFRESH_JSON_PATH = Join-Path $root "semestre\4\FysikalskKjemi\filer\Forelesning.json"
$env:VIDEO_REFRESH_PRESERVE_TITLE_GROUPING = "false"

& (Join-Path $root "scripts\run_scheduled_fluid_refresh.ps1")
