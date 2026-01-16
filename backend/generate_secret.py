#!/usr/bin/env python3
import secrets

print("=== GENERAR SECRET_KEY PARA RAILWAY ===\n")
secret_key = secrets.token_urlsafe(32)
print(f"SECRET_KEY generada:\n{secret_key}\n")
print("Copia este valor y úsalo en Railway como variable de entorno SECRET_KEY")
