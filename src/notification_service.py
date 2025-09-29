import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config.config_loader import config
from logger.logger import logger
from src.email_templates import EMAIL_TEMPLATES # NEW import

class NotificationService:
    def __init__(self):
        self.config = config
        if not all([self.config.SMTP_SERVER, self.config.SMTP_SENDER_EMAIL, self.config.SMTP_PASSWORD]):
            logger.warning("SMTP settings are not fully configured. Email notifications will be disabled.")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("NotificationService initialized and enabled.")

    def send_email(self, to_email, subject, html_body):
        if not self.enabled:
            logger.info(f"Email notifications disabled. Suppressing email to {to_email}.")
            return

        msg = MIMEMultipart('alternative')
        msg['From'] = self.config.SMTP_SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

        try:
            with smtplib.SMTP(self.config.SMTP_SERVER, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD)
                server.send_message(msg)
                logger.info(f"Successfully sent email to {to_email} with subject '{subject}'")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)

    def send_candidate_status_update(self, candidate, new_status: str):
        """
        Looks up a template for the new status and sends a personalized email.
        """
        template = EMAIL_TEMPLATES.get(new_status)
        if not template:
            logger.warning(f"No email template found for status '{new_status}'. Skipping email.")
            return

        candidate_name = f"{candidate.first_name} {candidate.last_name}".strip()
        job_title = candidate.job_description.title if candidate.job_description else "the role"

        subject = template["subject"].format(job_title=job_title)
        body = template["body"].format(candidate_name=candidate_name, job_title=job_title)

        self.send_email(candidate.email, subject, body)

    def notify_new_candidate_shortlisted(self, candidate, job):
        """
        Sends an internal notification to the HR team.
        """
        if not self.config.HR_RECIPIENT_EMAIL:
            logger.warning("HR_RECIPIENT_EMAIL is not configured. Cannot send internal alert.")
            return

        subject = f"New Candidate Shortlisted: {candidate.first_name} {candidate.last_name} for {job.title}"
        html_body = f"""
        <html><body>
        <h2>New Candidate Alert</h2>
        <p>A new candidate has been automatically shortlisted by the HR Agent.</p>
        <ul>
            <li><b>Name:</b> {candidate.first_name} {candidate.last_name}</li>
            <li><b>Applied for:</b> {job.title}</li>
            <li><b>ATS Score:</b> {candidate.ats_score:.2f}%</li>
            <li><b>Email:</b> {candidate.email}</li>
        </ul>
        <p>Please log in to the HR Agent portal to review their profile.</p>
        </body></html>
        """
        self.send_email(self.config.HR_RECIPIENT_EMAIL, subject, html_body)