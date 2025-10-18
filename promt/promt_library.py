# =============================================================================
# HR-HIRE-AGENT/promt/promt_library.py (Updated)
# =============================================================================

import json

class Prompts:
    # Replace the ats_scoring_prompt function with this new version.

    @staticmethod
    def ats_scoring_prompt(resume_text: str, jd_text: str, structured_resume_data: dict, ats_weights: dict) -> str:
        
        # ... (no change to structured_info)

        return f"""
        Analyze the provided resume against the job description and return a JSON object. Do not include any text or markdown formatting outside the JSON object.

        **Job Description:**
        ---
        {jd_text}
        ---

        **Resume Text:**
        ---
        {resume_text}
        ---

        **Task:**
        Based on all the provided information, evaluate the resume and provide your response in the following JSON format:
        {{
            "candidate_name": "Extract the candidate's full name from the resume text.",
            "email": "Extract the candidate's primary email address.",
            "phone_number": "Extract the candidate's primary phone number.",
            "overall_ats_score": "Calculate a final ATS score from 0-100. The score should be a float.",
            "summary_reason": "Provide a concise, 2-3 sentence summary explaining WHY the candidate is a good or poor fit, mentioning key strengths or weaknesses.",
            "matched_skills": ["List up to 10 of the most relevant skills from the resume that match the job description."],
            "education_summary": "Briefly summarize the candidate's highest level of education (e.g., 'B.Tech in Computer Science').",
            "years_of_experience": "Estimate the total years of relevant work experience as an integer."
        }}

        Return ONLY the raw JSON object.
        """
    # --- Other prompts are preserved as they were ---

    @staticmethod
    def interview_feedback_summary_prompt(feedback_text: str, round_number: int, interviewer_name: str) -> str:
        """
        Generates a prompt to summarize interview feedback.
        """
        return f"""
        Summarize the following interview feedback for Round {round_number} given by {interviewer_name}.
        Extract key positives, concerns, and a general recommendation (e.g., "Proceed to next round", "Reject", "Hold").

        **Interview Feedback:**
        ```
        {feedback_text}
        ```

        Provide the summary in a concise JSON format:
        {{
            "summary": "{{string, overall summary}}",
            "positives": [{{string}}],
            "concerns": [{{string}}],
            "recommendation": "{{string, e.g., 'Proceed', 'Reject', 'Hold'}}"
        }}
        """

    @staticmethod
    def resume_parsing_prompt(resume_text: str) -> str:
        """
        Generates a prompt to extract structured data from a resume.
        Useful if raw text is fed and specific fields need to be extracted before ATS.
        """
        return f"""
        Extract the following information from the resume text below and provide it in JSON format.
        If a field is not found, use null.

        **Resume Text:**
        ```
        {resume_text}
        ```

        Expected JSON structure:
        {{
            "name": "{{string}}",
            "email": "{{string}}",
            "phone_number": "{{string}}",
            "linkedin_profile": "{{string, optional}}",
            "total_experience_years": {{int, optional}},
            "key_skills": [{{string}}],
            "education": [
                {{
                    "degree": "{{string}}",
                    "university": "{{string}}",
                    "year": {{int}}
                }}
            ],
            "work_experience": [
                {{
                    "title": "{{string}}",
                    "company": "{{string}}",
                    "start_date": "{{string, YYYY-MM}}",
                    "end_date": "{{string, YYYY-MM or 'Present'}}",
                    "responsibilities": [{{string}}]
                }}
            ]
        }}
        """