#!/usr/bin/env bash
# =============================================================================
#  Sauvegarde quotidienne AnoventiX : base PostgreSQL + fichiers uploadés.
# =============================================================================
#  À lancer SUR LE SERVEUR, depuis le dossier du docker-compose (lit .env).
#  Installation (cron de l'utilisateur deploy, tous les jours à 2 h) :
#     crontab -e
#     0 2 * * * cd /chemin/vers/anoventix-api && ./scripts/backup.sh >> /var/log/anoventix-backup.log 2>&1
#
#  Restauration :
#     docker exec -i postgres-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < db-AAAA-MM-JJ.dump
#     docker run --rm -v anoventix_uploads:/data -v "$PWD":/backup alpine sh -c 'cd /data && tar xzf /backup/uploads-AAAA-MM-JJ.tar.gz'
#
#  ATTENTION : les sauvegardes restent sur le même serveur. Copiez-les aussi
#  ailleurs (autre machine, stockage objet) : un disque perdu = tout perdu.
#  Elles contiennent des données personnelles (pièces d'identité) : accès restreint.
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/anoventix}"
RETENTION_JOURS="${RETENTION_JOURS:-14}"
DATE="$(date +%F)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date -Is)] Sauvegarde de la base…"
# Variables lues dans l'environnement du conteneur : pas de mot de passe en clair ici.
docker exec postgres-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
    > "$BACKUP_DIR/db-$DATE.dump.tmp"
mv "$BACKUP_DIR/db-$DATE.dump.tmp" "$BACKUP_DIR/db-$DATE.dump"

echo "[$(date -Is)] Sauvegarde des fichiers (volume anoventix_uploads)…"
docker run --rm \
    -v anoventix_uploads:/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine sh -c "cd /data && tar czf /backup/uploads-$DATE.tar.gz ."

chmod 600 "$BACKUP_DIR"/db-"$DATE".dump "$BACKUP_DIR"/uploads-"$DATE".tar.gz

echo "[$(date -Is)] Suppression des sauvegardes de plus de $RETENTION_JOURS jours…"
find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$RETENTION_JOURS" -delete

echo "[$(date -Is)] Terminé : $(du -sh "$BACKUP_DIR" | cut -f1) au total dans $BACKUP_DIR"
