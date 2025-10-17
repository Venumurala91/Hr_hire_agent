import os
import yaml
from dotenv import load_dotenv
import logging

load_dotenv() # Load environment variables from .env file

class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
            cls._instance._load_config()
        return cls._instance

    def _load_config(self):
        config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
        try:
            with open(config_path, 'r') as f:
                self._config = yaml.safe_load(f)
        except FileNotFoundError:
            logging.warning(f"Warning: config.yaml not found at {config_path}. Using environment variables only.")
            self._config = {}
        except Exception as e:
            logging.error(f"Error loading config.yaml: {e}")
            self._config = {}

        # Database and API Keys
        self.DATABASE_URL = os.getenv("DATABASE_URL", self._config.get("database_url"))
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", self._config.get("gemini_api_key"))
        self.TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", self._config.get("twilio_account_sid"))
        self.TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", self._config.get("twilio_auth_token"))
        self.TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", self._config.get("twilio_whatsapp_number"))

        # General App Settings
        self.APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", self._config.get("app_secret_key", "super_secret_key_dev"))
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", self._config.get("log_level", "INFO"))
        
        # File Upload Settings
        self.RESUME_UPLOAD_FOLDER = self._config.get("resume_upload_folder", "uploads/resumes")
        self.JD_UPLOAD_FOLDER = self._config.get("jd_upload_folder", "uploads/jds")
        self.TEMP_BULK_UPLOAD_FOLDER = self._config.get("temp_bulk_upload_folder", "uploads/temp_bulk")

        # ATS Settings
        self.ats_weights = self._config.get("ats_weights", {})
        self.ATS_SHORTLIST_THRESHOLD = float(os.getenv("ATS_SHORTLIST_THRESHOLD", self._config.get("ats_shortlist_threshold", 70.0)))
        
        # Concurrency Settings
        self.MAX_WORKERS_RESUME_PROCESSING = int(os.getenv("MAX_WORKERS_RESUME_PROCESSING", self._config.get("max_workers_resume_processing", 8)))
        self.MAX_WORKERS_WHATSAPP_SENDING = int(os.getenv("MAX_WORKERS_WHATSAPP_SENDING", self._config.get("max_workers_whatsapp_sending", 5)))

        # --- NEW: Email Notification (SMTP) Settings ---
        self.SMTP_SERVER = os.getenv("SMTP_SERVER", self._config.get("smtp_server"))
        self.SMTP_PORT = int(os.getenv("SMTP_PORT", self._config.get("smtp_port", 587)))
        self.SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", self._config.get("smtp_sender_email"))
        self.SMTP_USERNAME = os.getenv("SMTP_USERNAME", self._config.get("smtp_username"))
        self.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", self._config.get("smtp_password"))
        self.HR_RECIPIENT_EMAIL = os.getenv("HR_RECIPIENT_EMAIL", self._config.get("hr_recipient_email"))

config = Config()