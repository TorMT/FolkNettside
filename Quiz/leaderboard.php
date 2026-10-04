<?php
// leaderboard.php – enkel delt toppliste for FolkQuiz
// Krav: PHP med SQLite (PDO)
// Lagrer kun: quiz_id, device_id, name, score, total, ms, ts
// Personvern: ingen IP-lagring. device_id er klientgenerert UUID.


header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


try {
$dbPath = __DIR__ . '/leaderboard.sqlite';
$pdo = new PDO('sqlite:' . $dbPath, null, null, [
PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);


$pdo->exec("CREATE TABLE IF NOT EXISTS leaderboard (
quiz_id TEXT NOT NULL,
device_id TEXT NOT NULL,
name TEXT,
score INTEGER NOT NULL,
total INTEGER NOT NULL,
ms INTEGER NOT NULL,
ts INTEGER NOT NULL,
PRIMARY KEY (quiz_id, device_id)
)");


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
$body = file_get_contents('php://input');
$data = json_decode($body, true);
if (!is_array($data)) throw new Exception('Ugyldig JSON');


$quiz_id = substr(trim($data['quiz_id'] ?? ''), 0, 100);
$device_id = substr(trim($data['device_id'] ?? ''), 0, 100);
$name = substr(trim($data['name'] ?? ''), 0, 100);
$score = intval($data['score'] ?? 0);
$total = max(1, intval($data['total'] ?? 1));
$ms = max(0, intval($data['ms'] ?? 0));
$ts = intval($data['ts'] ?? time()*1000);


if ($quiz_id === '' || $device_id === '') throw new Exception('Mangler quiz_id/device_id');


// Finn eksisterende rad for (quiz_id, device_id)
$stmt = $pdo->prepare('SELECT score,total,ms,ts,name FROM leaderboard WHERE quiz_id=? AND device_id=?');
$stmt->execute([$quiz_id, $device_id]);
$row = $stmt->fetch();


$better = false;
if (!$row) {
$better = true; // ingen tidligere registrering
} else {
$prevScore = intval($row['score']);
$prevTotal = intval($row['total']);
$prevMs = intval($row['ms']);
// bedre hvis høyere score, eller lik score men raskere tid
$better = ($score > $prevScore) || ($score === $prevScore && $ms < $prevMs);
}


if ($better) {
$stmt = $pdo->prepare('REPLACE INTO leaderboard (quiz_id, device_id, name, score, total, ms, ts) VALUES (?,?,?,?,?,?,?)');
}