import psycopg2
import sys
import urllib.parse

# ---------------- CONFIGURACIÓN ----------------
# Reemplaza con tus datos REALES
DB_HOST = "35.225.129.24"  # IP Pública de tu Cloud SQL
DB_NAME = "caso01_db"
DB_USER = "postgres"
DB_PASS = "Q0gqo52R@RtO@G" # Pon tu contraseña real aquí
# -----------------------------------------------

print(f"🔄 Intentando conectar a {DB_HOST} con usuario {DB_USER}...")

# Codificar contraseña por si tiene caracteres especiales
encoded_pass = urllib.parse.quote_plus(DB_PASS)

try:
    # Intentamos conexión directa forzando SSL
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        sslmode='require' # CRÍTICO: Esto fuerza la encriptación
    )
    print("✅ ¡CONEXIÓN EXITOSA!")
    print("La contraseña y la red están correctas.")
    conn.close()
    
    # Si funciona, te imprimo la URL exacta para que la copies
    print("\n👇 COPIA Y EJECUTA ESTE COMANDO EXACTO EN TU TERMINAL:")
    print("-" * 60)
    print(f'export DATABASE_URL="postgresql+psycopg2://{DB_USER}:{encoded_pass}@{DB_HOST}/{DB_NAME}?sslmode=require"')
    print("-" * 60)

except psycopg2.OperationalError as e:
    print("\n❌ FALLO LA CONEXIÓN:")
    print(e)
    if "password authentication failed" in str(e):
        print("\n⚠️ PISTA: La contraseña es incorrecta.")
    if "no encryption" in str(e) or "pg_hba.conf" in str(e):
        print("\n⚠️ PISTA: El servidor rechazó la conexión no segura o la IP no está autorizada.")