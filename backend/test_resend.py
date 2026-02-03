import os
import resend
from dotenv import load_dotenv

# Load .env explicitly
load_dotenv('.env')

api_key = os.environ.get("RESEND_API_KEY")
if not api_key:
    print("ERROR: RESEND_API_KEY not found in .env")
    exit(1)

print(f"API Key found: {api_key[:5]}...")

resend.api_key = api_key

params = {
    "from": "onboarding@resend.dev",
    "to": ["pettrust9@gmail.com"],
    "subject": "Prueba de Integración PetTrust",
    "html": "<p><strong>Funciona!</strong> El sistema de correos de PetTrust ahora usa Resend.</p>",
}

try:
    print("Attempting to send email...")
    email = resend.Emails.send(params)
    print("Email sent successfully!")
    print(email)
except Exception as e:
    print(f"Error sending email: {e}")
