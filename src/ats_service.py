# =============================================================================
# HR-HIRE-AGENT/src/ats_service.py
# =============================================================================
import google.generativeai as genai
import json
from config.config_loader import config
from logger.logger import logger
from exception.custom_exception import ATSProcessingError
from promt.promt_library import Prompts

class ATSService:
    def __init__(self):
        self.gemini_api_key = config.GEMINI_API_KEY
        if not self.gemini_api_key:
            logger.error("GEMINI_API_KEY is not set.")
            raise ValueError("Google Gemini API key not configured.")
        genai.configure(api_key=self.gemini_api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        self.ats_weights = config.ats_weights # Weights from config.yaml

    def generate_ats_score(self, resume_text: str, structured_resume_data: dict, jd_text: str, experience_requirement: str) -> dict:
        if not resume_text or not jd_text:
            raise ATSProcessingError("Resume text or Job Description text cannot be empty for ATS scoring.")

        # Note: structured_resume_data and ats_weights are no longer used in the new prompt, but we'll leave them for now.
        prompt = Prompts.ats_scoring_prompt(resume_text, jd_text, experience_requirement)
        
        generation_config = genai.GenerationConfig(
            response_mime_type="application/json"
        )
        
        try:
            logger.info("Sending ATS scoring request to Google Gemini (forcing JSON)...")
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            raw_response_text = response.text
            ats_result = json.loads(raw_response_text)
            logger.info(f"ATS scoring successful. Extracted name: {ats_result.get('candidate_name')}, Email: {ats_result.get('email')}")
            return ats_result

        except ValueError as e:
            logger.error(f"Failed to parse Gemini ATS JSON response: {e}\nRaw response: {raw_response_text[:500]}...")
            raise ATSProcessingError(f"Invalid JSON response from LLM: {e}")
        except Exception as e:
            logger.error(f"Error calling Google Gemini for ATS scoring: {e}")
            raise ATSProcessingError(f"LLM service error during ATS scoring: {e}")