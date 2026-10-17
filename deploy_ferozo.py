#!/usr/bin/env python3
"""
Script de despliegue directo a Hosting Ferozo / DonWeb vía FTPS / FTP (Puerto 21)
Detecta automáticamente si el servidor requiere PROT P, PROT C o FTP estándar.
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

class ExplicitFTP_TLS(ftplib.FTP_TLS):
    def ntransfercmd(self, cmd, rest=None):
        conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            session = getattr(self.sock, "session", None)
            conn = self.context.wrap_socket(conn,
                                             server_hostname=self.host,
                                             session=session)
        return conn, size

def connect_ftp():
    print(f"🎾 Conectando a {SERVER}:{PORT} como '{USERNAME}'...")
    
    # 1. Intentar FTPS (TLS)
    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        ftps = ExplicitFTP_TLS(context=context)
        ftps.connect(SERVER, PORT, timeout=30)
        
        # Enviar AUTH TLS si es soportado
        try:
            ftps.auth()
        except Exception:
            pass
            
        ftps.login(USERNAME, PASSWORD)
        
        # Intentar PROT P, si el servidor da 504 cambiar a PROT C
        try:
            ftps.prot_p()
            print("✅ Conectado vía FTPS (Datos Cifrados PROT P).")
        except Exception:
            try:
                ftps.prot_c()
                print("✅ Conectado vía FTPS (Canal Seguro PROT C).")
            except Exception:
                print("✅ Conectado vía FTPS.")
        return ftps
    except Exception as tls_err:
        print(f"⚠️  FTPS no disponible ({tls_err}). Intentando FTP estándar...")
        try:
            ftp = ftplib.FTP()
            ftp.connect(SERVER, PORT, timeout=30)
            ftp.login(USERNAME, PASSWORD)
            print("✅ Conectado vía FTP estándar.")
            return ftp
        except Exception as ftp_err:
            print(f"❌ Error conectando a Ferozo: {ftp_err}")
            sys.exit(1)

def ensure_remote_dir(ftps, path):
    parts = [p for p in path.strip("/").split("/") if p]
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            ftps.cwd(cur)
        except Exception:
            try:
                ftps.mkd(cur)
                ftps.cwd(cur)
            except Exception:
                try:
                    ftps.cwd(p)
                except Exception:
                    pass

def main():
    ftps = connect_ftp()
    print(f"🚀 Sincronizando archivos desde '{dist_dir}' hacia '{REMOTE_DIR}'...")
    ensure_remote_dir(ftps, REMOTE_DIR)

    uploaded = 0
    for root, _, files in os.walk(dist_dir):
        rel_dir = os.path.relpath(root, dist_dir)
        target_remote = REMOTE_DIR if rel_dir == "." else f"{REMOTE_DIR.rstrip('/')}/{rel_dir}"
        ensure_remote_dir(ftps, target_remote)
        ftps.cwd(target_remote)

        for file in sorted(files):
            local_file = Path(root) / file
            local_size = local_file.stat().st_size
            try:
                remote_size = ftps.size(file)
                if remote_size == local_size:
                    print(f"  ⏭️  {file} (sin cambios, omitido)")
                    continue
            except Exception:
                pass

            with open(local_file, "rb") as fp:
                ftps.storbinary(f"STOR {file}", fp)
                uploaded += 1
                print(f"  ✓ {file}")

    try:
        ftps.quit()
    except Exception:
        ftps.close()

    print(f"\n🎉 ¡Despliegue completado con éxito! {uploaded} archivos subidos a {SERVER}.")
    print("🔗 Revisa en tu navegador: https://padelmanager.cl")

if __name__ == "__main__":
    main()
