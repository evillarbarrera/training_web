#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Local para Padelblox Web (Ferozo / DonWeb)
# Uso: npm run deploy:prod
# ==============================================================================

set -e

ENV_FILE=".env.deploy"

echo "🎾 [Padelblox] Iniciando proceso de despliegue..."

# 1. Cargar variables si existe archivo local .env.deploy
if [ -f "$ENV_FILE" ]; then
    echo "📋 Cargando credenciales desde $ENV_FILE..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

SFTP_SERVER=${SFTP_SERVER:-"c2632100.ferozo.com"}
SFTP_USERNAME=${SFTP_USERNAME:-"c2632100"}
SFTP_PORT=${SFTP_PORT:-21}
SFTP_REMOTE_DIR=${SFTP_REMOTE_DIR:-"/public_html/"}

# 2. Verificar contraseña
if [ -z "$SFTP_PASSWORD" ]; then
    echo "⚠️  Contraseña no encontrada en variable SFTP_PASSWORD ni en .env.deploy"
    echo ""
    echo "Puedes crear un archivo 'web/.env.deploy' con:"
    echo "----------------------------------------"
    echo "SFTP_SERVER=$SFTP_SERVER"
    echo "SFTP_USERNAME=$SFTP_USERNAME"
    echo "SFTP_PASSWORD=tu-contraseña"
    echo "SFTP_PORT=$SFTP_PORT"
    echo "SFTP_REMOTE_DIR=$SFTP_REMOTE_DIR"
    echo "----------------------------------------"
    echo "O simplemente sube tu rama 'prod' a GitHub para que GitHub Actions despliegue automáticamente:"
    echo "  git checkout prod"
    echo "  git merge dev"
    echo "  git push origin prod"
    exit 1
fi

# 3. Compilar Angular en Producción
echo "🔨 Compilando Angular Web en modo producción..."
npm run build:prod

# 4. Sincronizar carpeta dist
echo "🚀 Sincronizando dist/ a $SFTP_SERVER:$SFTP_REMOTE_DIR por FTPS (Puerto $SFTP_PORT)..."

if command -v lftp &> /dev/null; then
    echo "Usando lftp con soporte TLS..."
    lftp -u "$SFTP_USERNAME","$SFTP_PASSWORD" -p "$SFTP_PORT" "ftp://$SFTP_SERVER" <<EOF
set ftp:ssl-force yes
set ftp:ssl-protect-data yes
set ssl:verify-certificate no
mirror -R --delete --verbose ./dist "$SFTP_REMOTE_DIR"
quit
EOF
else
    echo "💡 lftp no está instalado localmente. Para instalarlo: brew install lftp"
    echo "El despliegue automático por GitHub Actions está listo y configurado."
fi

echo "✅ Proceso finalizado."
