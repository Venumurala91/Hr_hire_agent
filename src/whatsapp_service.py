# =============================================================================
# HR-HIRE-AGENT/src/whatsapp_service.py
# =============================================================================
from twilio.rest import Client
from config.config_loader import config
from logger.logger import logger
from exception.custom_exception import WhatsAppMessagingError

class WhatsAppService:
    def __init__(self):
        self.account_sid = config.TWILIO_ACCOUNT_SID
        self.auth_token = config.TWILIO_AUTH_TOKEN
        self.twilio_whatsapp_number = config.TWILIO_WHATSAPP_NUMBER

        if not all([self.account_sid, self.auth_token, self.twilio_whatsapp_number]):
            logger.error("Twilio credentials or WhatsApp number not configured.")
            raise ValueError("Twilio API credentials or WhatsApp number missing.")
        
        if not self.twilio_whatsapp_number.startswith("whatsapp:+"):
            logger.error(f"TWILIO_WHATSAPP_NUMBER in .env is not in 'whatsapp:+<E.164>' format: {self.twilio_whatsapp_number}")
            raise ValueError("TWILIO_WHATSAPP_NUMBER must be in 'whatsapp:+<E.164>' format.")


        self.client = Client(self.account_sid, self.auth_token)
        logger.info("Twilio WhatsAppService initialized.")

    def send_whatsapp_message(self, to_number: str, message: str):
        """
        Sends a WhatsApp message to the specified recipient.
        The `to_number` MUST be in 'whatsapp:+<country_code><number>' format upon entry.
        """
        if not to_number or not to_number.startswith("whatsapp:+"):
            logger.error(f"Attempted to send WhatsApp to an incorrectly formatted number: {to_number}. Expected 'whatsapp:+<E.164>'.")
            raise WhatsAppMessagingError(f"Target WhatsApp number is not in 'whatsapp:+<E.164>' format: {to_number}")

        try:
            message_obj = self.client.messages.create(
                from_=self.twilio_whatsapp_number,
                body=message,
                to=to_number
            )
            logger.info(f"WhatsApp message sent to {to_number}: SID={message_obj.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message to {to_number}: {e}")
            raise WhatsAppMessagingError(f"Failed to send WhatsApp message: {e}")

    # The template generation methods below are now primarily for reference, 
    # as the logic will be mirrored and customized on the frontend.
    def generate_ats_score_message(self, candidate_name: str, score: float) -> str:
        """Generates a message for ATS score when shortlisted."""
        return (f"🎉 Hi {candidate_name}, your resume has been successfully submitted and screened! "
                f"Your initial ATS score is {score:.1f}/100. You've been shortlisted for further review! "
                f"We'll be in touch soon regarding the next steps.")

    def generate_interview_schedule_message(self, candidate_name: str, round_name: str, job_title: str) -> str:
        """Generates a message for interview schedule."""
        return (f"🗓️ Hi {candidate_name}, congratulations on being shortlisted for the {job_title} role! "
                f"Your profile has been selected for the {round_name}. Our HR team will contact you shortly to schedule it. "
                f"Please be prepared.")

    def generate_offer_letter_message(self, candidate_name: str, position: str) -> str:
        """Generates a message for an offer letter."""
        return (f"🥳 Congratulations {candidate_name}! We are excited to offer you the position of {position}. "
                f"An official offer letter has been sent to your email. Please check your inbox!")

    def generate_rejection_message(self, candidate_name: str, job_title: str) -> str:
        """Generates a message for rejection (post-interview/offer)."""
        return (f"Hi {candidate_name}, thank you for your interest in the {job_title} role and for taking the time to interview with us. "
                f"After careful consideration, we have decided not to move forward with your application at this time. "
                f"We wish you the best in your job search!")
    
    def generate_onboarding_message(self, candidate_name: str, position: str) -> str:
        """Generates a message for onboarding initiation."""
        return (f"🚀 Welcome aboard, {candidate_name}! We're thrilled to have you join us as a {position}. "
                f"Your onboarding process has officially begun. You'll receive further instructions via email shortly.")