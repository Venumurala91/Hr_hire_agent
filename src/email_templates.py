# --- Centralized Email Templates for Candidate Status Updates ---

EMAIL_TEMPLATES = {
    "ATS Shortlisted": {
        "subject": "Update on your application for {job_title}",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>Thank you for your interest in the <strong>{job_title}</strong> position at our company.</p>
        <p>We are pleased to inform you that your profile has been shortlisted for further review. Our hiring team is currently evaluating all applications, and we will get in touch with you regarding the next steps if your profile is selected for an interview.</p>
        <p>We appreciate your patience.</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "L1 interview scheduled": {
        "subject": "Invitation to Interview for the {job_title} role",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>Congratulations! Following a review of your application, we would like to invite you for the first technical interview (L1) for the <strong>{job_title}</strong> position.</p>
        <p>Our HR team will be in contact with you shortly via a separate email to coordinate a suitable time for the interview.</p>
        <p>We look forward to speaking with you.</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "L1 Selected": {
        "subject": "Update on your {job_title} Interview Process",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>We have great news! Following your recent L1 interview, we are pleased to inform you that you have successfully cleared the round.</p>
        <p>Our team was impressed with your skills and experience. We will be in touch shortly to schedule the next round of interviews.</p>
        <p>Well done, and we'll speak soon!</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "L1 Rejected": {
        "subject": "Update on your application for {job_title}",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>Thank you for taking the time to interview with us for the <strong>{job_title}</strong> position.</p>
        <p>While we were impressed with your qualifications, the selection process was highly competitive. After careful consideration, we have decided to move forward with other candidates whose experience more closely matched the requirements for this specific role.</p>
        <p>We appreciate your interest and wish you the very best in your job search.</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "Offer Letter Issued": {
        "subject": "Job Offer for the {job_title} Position!",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>Congratulations! We are thrilled to formally offer you the position of <strong>{job_title}</strong>.</p>
        <p>We were very impressed during the interview process and believe you will be a valuable addition to our team. A detailed offer letter has been attached to this email, outlining the terms, salary, and benefits.</p>
        <p>Please review the offer and let us know if you have any questions. We look forward to you joining us!</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "Offer Accepted": {
        "subject": "Welcome to the Team!",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>We are absolutely delighted that you have accepted our offer for the <strong>{job_title}</strong> position. Welcome to the team!</p>
        <p>Our HR department will be in touch with you soon to guide you through the onboarding process and provide details for your first day.</p>
        <p>We are excited to have you on board!</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    },
    "Resume declined": {
        "subject": "Update on your application for {job_title}",
        "body": """
        <html><body>
        <p>Dear {candidate_name},</p>
        <p>Thank you for applying for the <strong>{job_title}</strong> position.</p>
        <p>We received a large number of applications, and after a careful review of your profile, we have decided not to move forward at this time. This decision is not a reflection of your qualifications, but rather the specific requirements of this role.</p>
        <p>We encourage you to visit our careers page for future openings and wish you the best in your job search.</p>
        <p>Best regards,<br>The Hiring Team</p>
        </body></html>
        """
    }
    # You can continue to add a template for every other status here
}