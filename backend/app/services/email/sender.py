"""
Email sending service with template support.

Handles email composition and delivery with support
for HTML templates and attachments.
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from pathlib import Path
from typing import Optional, List, Union
from string import Template

logger = logging.getLogger(__name__)


class EmailSender:
    """
    Email sender with template support.

    Provides email sending with SMTP, HTML templates,
    and attachment handling.
    """

    def __init__(
        self,
        smtp_host: str = "localhost",
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        from_email: str = "noreply@example.com",
        from_name: str = "RAG App",
        use_tls: bool = True,
    ):
        """
        Initialize email sender.

        Args:
            smtp_host: SMTP server host
            smtp_port: SMTP server port
            smtp_user: SMTP username
            smtp_password: SMTP password
            from_email: From email address
            from_name: From name
            use_tls: Use TLS encryption
        """
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email
        self.from_name = from_name
        self.use_tls = use_tls

        self.template_dir = Path(__file__).parent / "templates"

        logger.info(f"Initialized EmailSender (host={smtp_host})")

    def send(
        self,
        to: Union[str, List[str]],
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[str]] = None,
    ) -> bool:
        """
        Send email.

        Args:
            to: Recipient email(s)
            subject: Email subject
            body: Email body
            html: Whether body is HTML
            cc: CC recipients
            bcc: BCC recipients
            attachments: File paths to attach

        Returns:
            bool: True if sent successfully
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to if isinstance(to, str) else ", ".join(to)
            msg["Subject"] = subject

            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)

            # Attach body
            body_type = "html" if html else "plain"
            msg.attach(MIMEText(body, body_type))

            # Attach files
            if attachments:
                for file_path in attachments:
                    self._attach_file(msg, file_path)

            # Send email
            self._send_message(msg, to, cc, bcc)

            logger.info(f"Email sent to {to}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False

    def send_template(
        self,
        to: Union[str, List[str]],
        template_name: str,
        context: dict,
        subject: str,
        **kwargs
    ) -> bool:
        """
        Send email using template.

        Args:
            to: Recipient email(s)
            template_name: Template filename (without .html)
            context: Template context variables
            subject: Email subject
            **kwargs: Additional send() arguments

        Returns:
            bool: True if sent successfully
        """
        try:
            # Load and render template
            body = self._render_template(template_name, context)

            # Send email
            return self.send(to, subject, body, html=True, **kwargs)

        except Exception as e:
            logger.error(f"Failed to send template email: {e}")
            return False

    def send_verification_email(
        self,
        to: str,
        verification_token: str,
        user_name: str
    ) -> bool:
        """
        Send email verification.

        Args:
            to: Recipient email
            verification_token: Verification token
            user_name: User's name

        Returns:
            bool: True if sent successfully
        """
        context = {
            "user_name": user_name,
            "verification_link": f"https://example.com/verify?token={verification_token}",
        }

        return self.send_template(
            to=to,
            template_name="verification",
            context=context,
            subject="Verify Your Email Address"
        )

    def send_weekly_report(
        self,
        to: str,
        report_data: dict,
        user_name: str
    ) -> bool:
        """
        Send weekly report email.

        Args:
            to: Recipient email
            report_data: Report data
            user_name: User's name

        Returns:
            bool: True if sent successfully
        """
        context = {
            "user_name": user_name,
            "report_data": report_data,
            "period": "last week",
        }

        return self.send_template(
            to=to,
            template_name="weekly_report",
            context=context,
            subject="Your Weekly Activity Report"
        )

    def _render_template(self, template_name: str, context: dict) -> str:
        """
        Render email template.

        Args:
            template_name: Template name
            context: Template context

        Returns:
            str: Rendered HTML
        """
        template_path = self.template_dir / f"{template_name}.html"

        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_name}")

        template_str = template_path.read_text()
        template = Template(template_str)

        return template.safe_substitute(context)

    def _attach_file(self, msg: MIMEMultipart, file_path: str) -> None:
        """
        Attach file to message.

        Args:
            msg: Email message
            file_path: Path to file
        """
        path = Path(file_path)

        if not path.exists():
            logger.warning(f"Attachment not found: {file_path}")
            return

        with open(path, "rb") as f:
            part = MIMEApplication(f.read(), Name=path.name)

        part["Content-Disposition"] = f'attachment; filename="{path.name}"'
        msg.attach(part)

    def _send_message(
        self,
        msg: MIMEMultipart,
        to: Union[str, List[str]],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> None:
        """
        Send message via SMTP.

        Args:
            msg: Email message
            to: Recipients
            cc: CC recipients
            bcc: BCC recipients
        """
        # Collect all recipients
        recipients = [to] if isinstance(to, str) else to
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)

        # Connect and send
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            if self.use_tls:
                server.starttls()

            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)

            server.send_message(msg, to_addrs=recipients)
