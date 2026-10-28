# anoventix-edge

Reverse proxy commun (nginx + certbot) devant les applications AnoventiX et Fleet.

```
nginx/conf.d/anoventix.conf   www.anoventix.com (app web) + anoventix.com (API)
nginx/conf.d/fleet.conf       fleet.anoventix.com → conteneur fleet-api
nginx/snippets/               en-têtes de proxy communs
nginx/dev.conf                config locale (HTTP, → anoventix-api)
legal/                        pages légales (/cgu, /confidentialite, /mentions-legales)
web/                          export web Expo (hors git, déposé par deploy-web.ps1)
downloads/                    APK Android (hors git)
```

## Prérequis (une seule fois par machine)

```
docker network create anoventix-network
```

Le volume `anoventix_uploads` est créé par `anoventix-api` : démarrer l'API **avant** l'edge
(nginx résout `anoventix-api` et `fleet-api` au démarrage et refuse de démarrer s'ils sont absents).

## Production

```
cd anoventix-api  && docker compose -f docker-compose.yml up -d
cd anoventix-edge && docker compose -f docker-compose.yml up -d

```

`fleet-api` doit rejoindre `anoventix-network` (réseau `external`) dans son propre compose.

## Développement local

```
docker network create anoventix-network
cd anoventix-api  && docker compose up -d
cd anoventix-edge && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Migration depuis l'ancienne disposition (nginx dans anoventix-api)

Sur le serveur, après `git pull` :

```
docker network create anoventix-network 2>/dev/null || true   # déjà existant : ignorer
cd ~/app/anoventix-api && docker compose -f docker-compose.yml down nginx certbot
mv web ../anoventix-edge/web; mv downloads/* ../anoventix-edge/downloads/ 2>/dev/null
docker compose -f docker-compose.yml up -d
cd ../anoventix-edge && docker compose -f docker-compose.yml up -d
```

L'ancien réseau était créé par le compose de l'API sous le même nom : le déclarer `external`
suppose qu'il existe déjà (c'est le cas tant que l'API n'a pas été `down` en entier).
