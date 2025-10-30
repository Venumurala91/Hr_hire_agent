# =============================================================================
# HR-HIRE-AGENT/promt/promt_library.py (Updated)
# =============================================================================

import json

class Prompts:
    # Replace the ats_scoring_prompt function with this new version.

    # @staticmethod
    # def ats_scoring_prompt(resume_text: str, jd_text: str, experience_requirement: str) -> str:
        
    #     # Create a formatted requirement string, or an empty string if not provided
    #     exp_req_section = f"**Overall Experience Requirement:**\n---\n{experience_requirement} years\n---\n\n" if experience_requirement and experience_requirement != '0' else ""

    #     return f"""
    #     Analyze the provided resume against all the job requirements below. Return a JSON object. Do not include any text or markdown formatting outside the JSON object.

    #     {exp_req_section}**Detailed Job Description:**
    #     ---
    #     {jd_text}
    #     ---

    #     **Resume Text:**
    #     ---
    #     {resume_text}
    #     ---

    #     **Task:**
    #     Based on ALL the information above, evaluate the resume. Pay close attention to both the overall experience requirement (if provided) and the specifics in the detailed job description. Provide your response in the following JSON format:
    #     {{
    #         "candidate_name": "Extract the candidate's full name from the resume text.",
    #         "email": "Extract the candidate's primary email address.",
    #         "phone_number": "Extract the candidate's primary phone number.",
    #         "overall_ats_score": "Calculate a final ATS score from 0-100. The score should be a float.",
    #         "summary_reason": "Provide a concise, 2-3 sentence summary explaining WHY the candidate is a good or poor fit, mentioning key strengths or weaknesses.",
    #         "matched_skills": ["List up to 10 of the most relevant skills from the resume that match the job description."],
    #         "certifications": ["List any professional certifications found in the resume. If none, return an empty list []."],
    #         "education_summary": "Briefly summarize the candidate's highest level of education (e.g., 'B.Tech in Computer Science').",
    #         "years_of_experience": "Estimate the total years of relevant work experience as an integer."
    #     }}

    #     Return ONLY the raw JSON object.
    #     """


    
    @staticmethod
    def ats_scoring_prompt(resume_text: str, jd_text: str, experience_requirement: str) -> str:
        
        # Optional experience requirement section
        exp_req_section = f"**Overall Experience Requirement:**\n---\n{experience_requirement} years\n---\n\n" if experience_requirement and experience_requirement != '0' else ""

        return f"""
        Analyze the provided resume against all the job requirements below. Return a JSON object. Do not include any text or markdown formatting outside the JSON object.

        {exp_req_section}**Detailed Job Description:**
        ---
        {jd_text}
        ---

        **Resume Text:**
        ---
        {resume_text}
        ---

        **Task:**
        Based on ALL the information above, evaluate the resume and calculate an ATS score that reflects how well the candidate matches the job description.

        **Scoring Guidelines:**
        - **Experience (30%)**: 
        - If the candidate's total relevant experience is below the required experience, reduce the score proportionally.
            Example: if 4 years are required and the candidate has 3 years, deduct 25% of the experience component.
        - Experience equal to or greater than required should not be penalized.
        - **Skills Match (30%)**: 
        - Compare the candidate's skills with the skills required in the job description.
        - Give higher weight to skills mentioned explicitly in both resume and JD.
        - **Projects Related to JD Skills (20%)**: 
        - Check if the resume lists any projects that directly use or demonstrate the required skills.
        - Award higher points if multiple projects are relevant or recent.
        - **Certifications Related to JD Skills (10%)**:
        - Give higher weight if the candidate has completed certifications directly related to the job skills (e.g., AWS cert for a cloud engineer role).
        - **Education & Other Factors (10%)**:
        - Consider relevance of educational background or degree to the job field.

        **Scoring Rule:**
        - Final ATS score = weighted combination of all the above criteria.
        - The score should be between 0 and 100 (float).
        - The summary should clearly mention strong or weak areas (e.g., good projects but lacks certifications or experience).

        **Response Format:**
        {{
            "candidate_name": "Extract the candidate's full name from the resume text.",
            "email": "Extract the candidate's primary email address.",
            "phone_number": "Extract the candidate's primary phone number.",
            "overall_ats_score": "Calculate a final ATS score from 0-100 based on the above criteria.",
            "summary_reason": "Provide a concise 2-3 sentence summary explaining WHY the candidate is a good or poor fit, referencing experience, skills, projects, and certifications.",
            "matched_skills": ["List up to 10 of the most relevant skills from the resume that match the job description."],
            "relevant_projects": ["List up to 5 projects that are directly related to the required JD skills."],
            "relevant_certifications": ["List any professional certifications found in the resume. If none, return an empty list []."],
            "education_summary": "Briefly summarize the candidate's highest and most relevant education (e.g., 'B.Tech in Computer Science').",
            "years_of_experience": "Estimate the total years of relevant work experience as a float or integer."
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