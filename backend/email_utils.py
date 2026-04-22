import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Email Configuration (use environment variables or defaults)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "safeway.noreply@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "")

def send_staff_credentials_email(recipient_email: str, password: str) -> bool:
    """
    Send staff account credentials via email.
    
    Args:
        recipient_email: The staff member's email address
        password: The temporary password (staffdefault123)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create the email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Safeway AI Assistant Staff Account Created"
        msg["From"] = SENDER_EMAIL
        msg["To"] = recipient_email

        # Create plain text and HTML versions of the email
        text = f"""\
Dear Staff Member,

Please be informed that your staff account for Safeway AI Assistant has been created.

Below are your login credentials:
Username: {recipient_email}
Password: {password}

Please login and change the password immediately for security purposes.

Thank you,
Safeway AI Assistant Team
"""

        html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #1e40af;">Welcome to Safeway AI Assistant</h2>
      
      <p>Dear Staff Member,</p>
      
      <p>Please be informed that your staff account for <strong>Safeway AI Assistant</strong> has been created.</p>
      
      <p><strong>Below are your login credentials:</strong></p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
        <p><strong>Username:</strong> {recipient_email}</p>
        <p><strong>Password:</strong> {password}</p>
      </div>
      
      <p><strong>Important:</strong> Please login and change the password immediately for security purposes.</p>
      
      <p>You can login at: <a href="http://localhost:5173" style="color: #1e40af;">Safeway AI Assistant Portal</a></p>
      
      <p>Thank you,<br/>
      <strong>Safeway AI Assistant Team</strong></p>
    </div>
  </body>
</html>
"""

        # Attach both plain text and HTML versions
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        # Connect to the SMTP server and send the email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Secure the connection
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email sent successfully to {recipient_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print(f"❌ SMTP Authentication Error: Check email and password in environment variables")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Email Error: {str(e)}")
        return False
