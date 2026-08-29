param(
  [string]$Repo = "japan-trip-2026-2027",
  [switch]$Public
)

$ErrorActionPreference = "Stop"

function Fail($message) {
  Write-Host ""
  Write-Host $message -ForegroundColor Red
  exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "GitHub CLI no esta instalado. Instala con: winget install --id GitHub.cli -e"
}

try {
  gh auth status | Out-Null
} catch {
  Fail "GitHub CLI no esta autenticado. Ejecuta: gh auth login"
}

if (-not (Test-Path ".git")) {
  git init
}

$branch = (git branch --show-current)
if (-not $branch) {
  $branch = "main"
  git checkout -b main
} elseif ($branch -ne "main") {
  git branch -M main
}

$files = @(
  ".env.example",
  ".firebaserc.example",
  ".github/workflows/deploy-github-pages.yml",
  ".gitignore",
  ".npmrc",
  "README.md",
  "firebase.json",
  "firestore.rules",
  "index.html",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "public",
  "scripts",
  "src",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts"
)

git add -- $files

if (-not (git diff --cached --quiet)) {
  git commit -m "Build Japan Trip PWA"
}

if (-not (git remote get-url origin 2>$null)) {
  $visibility = if ($Public) { "--public" } else { "--private" }
  gh repo create $Repo $visibility --source . --remote origin --push
} else {
  git push -u origin main
}

if (Test-Path ".env") {
  $secretNames = @(
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID"
  )
  foreach ($name in $secretNames) {
    $line = Select-String -Path ".env" -Pattern "^$name=(.*)$" -ErrorAction SilentlyContinue
    if ($line) {
      $value = $line.Matches[0].Groups[1].Value
      if ($value) {
        $value | gh secret set $name
      }
    }
  }
}

Write-Host ""
Write-Host "Listo. Ahora revisa GitHub > Settings > Pages > Source: GitHub Actions." -ForegroundColor Green
Write-Host "Cuando el workflow termine, comparte la URL de Pages con tu esposa." -ForegroundColor Green
