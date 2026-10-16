#!/usr/bin/env python3
import os
import sys
import ssl
import subprocess
from ftplib import FTP_TLS

SERVER = os.getenv("SFTP_SERVER", "c2632100.ferozo.com")
USERNAME = os.getenv("SFTP_USERNAME", "c2632100")
PASSWORD = os.getenv("SFTP_PASSWORD", "Ssvld2G9rit@IJA")
PORT = int(os.getenv("SFTP_PORT", 21))
REMOTE_DIR = os.getenv("SFTP_REMOTE_DIR", "/public_html")

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class ExplicitFTP_TLS(FTP_TLS):
    def connect(self, host='', port=21, timeout=-1):
        super().connect(host, port, timeout)
        self.auth()
        self.prot_p()

def sync_directory(ftps, local_path, remote_path):
    print(f"📁 Sincronizando carpeta: {remote_path}")
    try:
        ftps.cwd(remote_path)
    except Exception:
        parts = remote_path.strip("/").split("/")
        curr = ""
        for part in parts:
            curr += "/" + part
            try:
                ftps.cwd(curr)
            except Exception:
                try:
                    ftps.mkd(curr)
                    ftps.cwd(curr)
                except Exception:
                    pass

    for item in sorted(os.listdir(local_path)):
        item_local = os.path.join(local_path, item)
        item_remote = remote_path.rstrip("/") + "/" + item

        if os.path.isdir(item_local):
            sync_directory(ftps, item_local, item_remote)
            ftps.cwd(remote_path)
        else:
            if item.startswith(".") and item != ".htaccess":
                continue
            print(f"  ⬆️  Subiendo {item}...")
            with open(item_local, "rb") as f:
                ftps.storbinary(f"STOR {item}", f)

def main():
    skip_build = "--no-build" in sys.argv
    if not skip_build:
        print("🔨 Compilando Angular en modo Producción...")
        res = subprocess.run(["npm", "run", "build:prod"], cwd=os.path.dirname(os.path.abspath(__file__)))
        if res.returncode != 0:
            print("❌ Error en la compilación de Angular.")
            sys.exit(1)

    if not os.path.isdir(DIST_DIR):
        print(f"❌ Carpeta {DIST_DIR} no encontrada.")
        sys.exit(1)

    # Revisar si dist tiene una subcarpeta (ej dist/browser o dist/training_web) o si contiene directamente los archivos
    upload_dir = DIST_DIR
    subdirs = [d for d in os.listdir(DIST_DIR) if os.path.isdir(os.path.join(DIST_DIR, d))]
    if len(subdirs) == 1 and not any(os.path.isfile(os.path.join(DIST_DIR, f)) for f in os.listdir(DIST_DIR) if f.endswith(".html")):
        upload_dir = os.path.join(DIST_DIR, subdirs[0])

    print(f"\n🎾 [Padelblox Web] Conectando a {SERVER}:{PORT} vía FTPS...")
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    ftps = ExplicitFTP_TLS(context=context)
    ftps.connect(SERVER, PORT)
    ftps.login(USERNAME, PASSWORD)
    ftps.prot_p()
    print(f"✅ Conexión establecida como {USERNAME}.")
    print(f"🚀 Iniciando sincronización de {upload_dir} a {REMOTE_DIR}\n")

    sync_directory(ftps, upload_dir, REMOTE_DIR)

    ftps.quit()
    print(f"\n🎉 ¡Despliegue Web a {REMOTE_DIR} completado con éxito!")
    print("🔗 Verifica en: https://padelmanager.cl")

if __name__ == "__main__":
    main()
