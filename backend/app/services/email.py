"""
Email Service - Resend Integration
"""
import os
import asyncio
import logging
import resend

from app.core.config import RESEND_API_KEY, MAIL_FROM


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using Resend API.
    Returns True if successful, False otherwise.
    """
    if not RESEND_API_KEY:
        logging.warning("No RESEND_API_KEY. Email not sent.")
        return False

    resend.api_key = RESEND_API_KEY

    try:
        loop = asyncio.get_event_loop()
        
        def _send():
            return resend.Emails.send({
                "from": MAIL_FROM,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })

        await loop.run_in_executor(None, _send)
        logging.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False


async def send_welcome_email(user_name: str, user_email: str):
    """Send welcome email to new user"""
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0F4C75;">¡Bienvenido a PetTrust, {user_name}!</h1>
        <p>Estamos felices de tenerte con nosotros.</p>
        <p>Encuentra al cuidador perfecto para tu mascota.</p>
        <br>
        <a href="https://pettrust.vercel.app/dashboard" 
           style="background-color: #28B463; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px;">
            Ir a mi Dashboard
        </a>
    </div>
    """
    return await send_email(user_email, "Bienvenido a PetTrust", html)


async def send_password_reset_email(user_email: str, reset_token: str):
    """Send password reset email"""
    reset_link = f"https://pettrust.vercel.app/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #0F4C75;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en PetTrust.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <br>
        <a href="{reset_link}" 
           style="background-color: #28B463; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px;">
            Restablecer Contraseña
        </a>
        <br><br>
        <p style="font-size: 12px; color: #777;">
            Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
    </div>
    """
    return await send_email(user_email, "Recuperación de Contraseña - PetTrust", html)


async def send_booking_confirmation_email(owner_email: str, owner_name: str, 
                                          booking_date: str, booking_time: str):
    """Send booking confirmation to owner"""
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #28B463;">¡Pago Aprobado y Reserva Confirmada!</h1>
        <p>Hola {owner_name}, tu pago ha sido verificado exitosamente.</p>
        <p>Tu reserva para el <strong>{booking_date}</strong> a las 
           <strong>{booking_time}</strong> está 100% confirmada.</p>
        <br>
        <a href="https://pettrust.vercel.app/dashboard" 
           style="background-color: #0F4C75; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px;">
            Ver Reserva
        </a>
    </div>
    """
    return await send_email(owner_email, "Reserva Confirmada en PetTrust", html)
