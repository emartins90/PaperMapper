import requests
import os
from typing import Optional

class MailgunEmailService:
    def __init__(self):
        self.api_key = os.getenv("MAILGUN_API_KEY")
        self.domain = os.getenv("MAILGUN_DOMAIN")
        self.base_url = f"https://api.mailgun.net/v3/{self.domain}"
        
    def send_password_reset_email(self, to_email: str, reset_code: str) -> bool:
        """Send password reset email via Mailgun"""
        if not self.api_key or not self.domain:
            print(f"[EMAIL] Mailgun not configured, printing to console: {reset_code}")
            return False
            
        try:
            response = requests.post(
                self.base_url + "/messages",
                auth=("api", self.api_key),
                data={
                    "from": f"PaperThread <noreply@{self.domain}>",
                    "to": to_email,
                    "subject": "Reset Your PaperThread Password",
                    "text": f"""
Hello!

You requested a password reset for your PaperThread account.

Your reset code is: {reset_code}

This code will expire in 10 minutes.

If you didn't request this reset, please ignore this email.

Best regards,
The PaperThread Team
                    """.strip(),
                    "html": f"""
<html>
<body>
<h2>Reset Your PaperThread Password</h2>
<p>Hello!</p>
<p>You requested a password reset for your PaperThread account.</p>
<p><strong>Your reset code is: {reset_code}</strong></p>
<p>This code will expire in 10 minutes.</p>
<p>If you didn't request this reset, please ignore this email.</p>
<br>
<p>Best regards,<br>The PaperThread Team</p>
</body>
</html>
                    """.strip()
                }
            )
            
            if response.status_code == 200:
                print(f"[EMAIL] Password reset email sent to {to_email}")
                return True
            else:
                print(f"[EMAIL] Failed to send email: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"[EMAIL] Error sending email: {e}")
            return False 