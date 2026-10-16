#!/usr/bin/env python3
"""
Script de despliegue directo a Hosting Ferozo / DonWeb vía FTPS (Puerto 21)
No requiere dependencias externas (usa librería estándar ftplib de Python 3).
"""

import os
import sys
import ftplib
import ssl
from pathlib import Path

# Cargar variables desde .env.deploy si existe
env_path = Path(__file__).parent / ".env.deploy"
env_vars = {}

if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

SERVER = os.environ.get("SFTP_SERVER", env_vars.get("SFTP_SERVER", "c2632100.ferozo.com"))
USERNAME = os.environ.get("SFTP_USERNAME", env_vars.get("SFTP_USERNAME", "c2632100"))
PASSWORD = os.environ.get("SFTP_PASSWORD", env_vars.get("SFTP_PASSWORD", "Ssvld2G9rit@IJA"))
PORT = int(os.environ.get("SFTP_PORT", env_vars.get("SFTP_PORT", 21)))
REMOTE_DIR = os.environ.get("SFTP_REMOTE_DIR", env_vars.get("SFTP_REMOTE_DIR", "/public_html/"))

dist_dir = Path(__file__).parent / "dist"
if not dist_dir.exists():
    print("❌ Error: La carpeta 'dist' no existe. Compila primero con 'npm run build:prod'.")
    sys.exit(1)

# Soporte de reutilización de sesión TLS para servidores ProFTPD / Ferozo
class ExplicitFTP_TLS(ftplib.FTP_TLS):
    def ntransfercmd(self, cmd, rest=None):
        conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            session = getattr(self.sock, "session", None)
            conn = self.context.wrap_socket(conn,
                                             server_hostname=self.host,
                                             session=session)
        return conn, size

print(f"🎾 Conectando a {SERVER}:{PORT} vía FTPS (TLS) como '{USERNAME}'...")

try:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    ftps = ExplicitFTP_TLS(context=context)
    ftps.connect(SERVER, PORT, timeout=30)
    ftps.auth()
    ftps.login(USERNAME, PASSWORD)
    ftps.prot_p()
    print("✅ Conexión TLS establecida exitosamente.")
except Exception as e:
    print(f"❌ Error conectando a Ferozo: {e}")
    sys.exit(1)

def ensure_remote_dir(path):
    parts = path.strip("/").split("/")
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            ftps.cwd(cur)
        except Exception:
            try:
                ftps.mkd(cur)
            except Exception:
                pass

print(f"🚀 Sincronizando archivos desde '{dist_dir}' hacia '{REMOTE_DIR}'...")
ensure_remote_dir(REMOTE_DIR)

uploaded = 0
for root, _, files in os.walk(dist_dir):
    rel_dir = os.path.relpath(root, dist_dir)
    target_remote = REMOTE_DIR if rel_dir == "." else f"{REMOTE_DIR.rstrip('/')}/{rel_dir}"
    ensure_remote_dir(target_remote)
    ftps.cwd(target_remote)

    for file in sorted(files):
        local_file = Path(root) / file
        with open(local_file, "rb") as fp:
            ftps.storbinary(f"STOR {file}", fp)
            uploaded += 1
            print(f"  ✓ {file}")

ftps.quit()
print(f"\n🎉 ¡Despliegue completado con éxito! {uploaded} archivos subidos a {SERVER}.")
print("🔗 Revisa en tu navegador: https://padelmanager.cl")
