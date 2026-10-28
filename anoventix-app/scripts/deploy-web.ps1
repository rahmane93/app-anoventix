# ─── Déploiement de la version web sur www.anoventix.com ──────────────────────
# Construit l'export statique Expo, l'envoie sur le VPS et bascule le site d'un coup.
#
#   .\scripts\deploy-web.ps1                 # déployer
#   .\scripts\deploy-web.ps1 -Rollback       # revenir à la version précédente
#
# Sur le serveur (~/app/anoventix-edge/web, monté dans nginx) :
#   releases/<date>/   une version par déploiement (les 3 dernières sont gardées)
#   current            lien vers la version en ligne, basculé de façon atomique
# Aucun redémarrage de nginx : il suit le lien `current`.

param(
    [string]$Server = "deploy@51.178.49.231",
    [string]$RemoteDir = "app/anoventix-edge/web",   # relatif au dossier personnel
    [string]$ApiUrl = "https://anoventix.com",
    [int]$Keep = 3,
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"

function Invoke-Remote([string]$script) {
    # LF uniquement : bash refuse les fins de ligne Windows.
    $script = $script -replace "`r", ""
    $script | ssh $Server "bash -s"
    if ($LASTEXITCODE -ne 0) { throw "Échec de la commande sur le serveur." }
}

if ($Rollback) {
    Invoke-Remote @"
set -e
cd ~/$RemoteDir
actuelle=`$(readlink current)
# Version juste avant celle en ligne (et non la plus récente) : plusieurs retours arrière d'affilée reculent.
precedente=`$(ls -1d releases/* | sort | awk -v cur="`$actuelle" '`$0 == cur { print prev; exit } { prev = `$0 }')
[ -n "`$precedente" ] || { echo "Aucune version precedente."; exit 1; }
ln -sfn "`$precedente" current.tmp && mv -Tf current.tmp current
echo "En ligne : `$precedente (au lieu de `$actuelle)"
"@
    exit 0
}

$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
    $release = Get-Date -Format "yyyyMMdd-HHmmss"
    $dist = Join-Path $root "dist"
    $archive = Join-Path $env:TEMP "anoventix-web-$release.tgz"

    Write-Host "1/4 Build web (API : $ApiUrl)…"
    if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
    $env:EXPO_PUBLIC_API_URL = $ApiUrl
    npx expo export -p web --output-dir dist
    if ($LASTEXITCODE -ne 0) { throw "Échec du build web." }

    Write-Host "2/4 Archive…"
    tar -czf $archive -C $dist .
    if ($LASTEXITCODE -ne 0) { throw "Échec de l'archivage." }

    Write-Host "3/4 Envoi sur $Server…"
    scp $archive "${Server}:/tmp/anoventix-web-$release.tgz"
    if ($LASTEXITCODE -ne 0) { throw "Échec de l'envoi." }

    Write-Host "4/4 Mise en ligne…"
    Invoke-Remote @"
set -e
mkdir -p ~/$RemoteDir/releases
cd ~/$RemoteDir
mkdir releases/$release
tar -xzf /tmp/anoventix-web-$release.tgz -C releases/$release
rm -f /tmp/anoventix-web-$release.tgz
ln -sfn releases/$release current.tmp && mv -Tf current.tmp current
ls -1d releases/* | sort | head -n -$Keep | xargs -r rm -rf
echo "En ligne : releases/$release"
"@

    Remove-Item $archive -ErrorAction SilentlyContinue
    Write-Host "Déployé : https://www.anoventix.com (version $release)"
}
finally {
    Pop-Location
}
