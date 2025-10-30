# =============================================================================
# HR-HIRE-AGENT/src/email_templates.py
# =============================================================================

# ✅ CHANGE #1: Import the textwrap library
import textwrap

# Centralized Email Templates for Candidate Status Updates
# The keys here should match the status descriptions in model/status_constants.py

# ✅ CHANGE #2: Wrap every 'body' string with textwrap.dedent()
EMAIL_TEMPLATES = {
    "ATS Shortlisted": {
        "subject": "Update on your application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you for your interest in the <strong>{job_title}</strong> position at our company.</p>
            <p>We are pleased to inform you that your profile has been shortlisted for further review. Our hiring team is currently evaluating all applications, and we will get in touch with you regarding the next steps if your profile is selected for an interview.</p>
            <p>We appreciate your patience.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Resume declined": {
        "subject": "Update on your application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you for applying for the <strong>{job_title}</strong> position.</p>
            <p>We received a large number of applications, and after a careful review of your profile, we have decided not to move forward at this time. This decision is not a reflection of your qualifications, but rather the specific requirements of this role.</p>
            <p>We encourage you to visit our careers page for future openings and wish you the best in your job search.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L1 interview scheduled": {
        "subject": "Invitation to Interview for the {job_title} role",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Congratulations! Following a review of your application, we would like to invite you for the first technical interview (L1) for the <strong>{job_title}</strong> position.</p>
            <p>Our HR team will be in contact with you shortly via a separate email to coordinate a suitable time for the interview.</p>
            <p>We look forward to speaking with you.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L1 Re-scheduled": {
        "subject": "Interview Re-scheduling for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>This is to confirm that your interview for the <strong>{job_title}</strong> role is being re-scheduled. Our HR team will reach out to you shortly with a new set of available time slots.</p>
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L1 Selected": {
        "subject": "Update on your {job_title} Interview Process",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>We have great news! Following your recent L1 interview, we are pleased to inform you that you have successfully cleared the round.</p>
            <p>Our team was impressed with your skills and experience. We will be in touch shortly to schedule the next steps.</p>
            <p>Well done, and we'll speak soon!</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L1 Rejected": {
        "subject": "Update on your application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you for taking the time to interview with us for the <strong>{job_title}</strong> position.</p>
            <p>While we were impressed with your qualifications, the selection process was highly competitive. After careful consideration, we have decided to move forward with other candidates whose experience more closely matched the requirements for this specific role.</p>
            <p>We appreciate your interest and wish you the very best in your job search.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Document Verification": {
        "subject": "Request for Documents for the {job_title} Position",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Congratulations on progressing to the next stage for the <strong>{job_title}</strong> position. To proceed, we require a few documents for verification.</p>
            <p>Our HR team will send you a separate email with a list of the required documents and instructions on how to submit them.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Documents Cleared": {
        "subject": "Document Verification Successful for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>This is a confirmation that the documents you submitted for the <strong>{job_title}</strong> position have been successfully verified.</p>
            <p>We are now moving to the next stage of the process and will update you shortly.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L2 interview scheduled": {
        "subject": "Invitation to Second Interview for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Following your successful previous round, we would like to invite you for the second technical interview (L2) for the <strong>{job_title}</strong> position.</p>
            <p>Our team will be in touch shortly to schedule a time. Well done, and we look forward to speaking with you again.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L2 Re-scheduled": {
        "subject": "Interview Re-scheduling for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>This is to confirm that your L2 interview for the <strong>{job_title}</strong> role is being re-scheduled. Our HR team will reach out to you shortly with a new set of available time slots.</p>
            <p>Thank you for your understanding.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L2 Selected": {
        "subject": "Update on your {job_title} Interview Process",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>We have great news! Following your L2 interview, we are pleased to inform you that you have successfully cleared the technical rounds.</p>
            <p>The next and final step is a discussion with our HR team. We will be in touch very soon to schedule this.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "L2 Rejected": {
        "subject": "Update on your application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you again for your time and effort in the interview process for the <strong>{job_title}</strong> position.</p>
            <p>After careful consideration of the final interview rounds, we have decided to move forward with another candidate at this time. The decision was a difficult one due to the high caliber of candidates.</p>
            <p>We truly appreciate your interest and wish you all the best in your future endeavors.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "HR scheduled": {
        "subject": "Invitation to HR Discussion for the {job_title} role",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Congratulations on clearing the technical rounds for the <strong>{job_title}</strong> position! We would like to invite you for the final HR discussion.</p>
            <p>Our team will contact you shortly to arrange a convenient time. We look forward to speaking with you.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "HR Round Selected": {
        "subject": "Great News Regarding Your Application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>We are thrilled to inform you that you have successfully cleared the final HR discussion for the <strong>{job_title}</strong> position. Our team was very impressed throughout the process.</p>
            <p>Please expect to hear from us very soon regarding the final steps of your application.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "HR Round Rejected": {
        "subject": "Update on your application for {job_title}",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you for taking the time to speak with our HR team about the <strong>{job_title}</strong> position.</p>
            <p>After a comprehensive review of all candidates, we have decided to proceed with others at this time. We appreciate you sharing your experience and aspirations with us.</p>
            <p>We wish you the very best in your job search and hope our paths cross again in the future.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Offer Letter Issued": {
        "subject": "Job Offer for the {job_title} Position!",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Congratulations! We are thrilled to formally offer you the position of <strong>{job_title}</strong>.</p>
            <p>We were very impressed during the interview process and believe you will be a valuable addition to our team. A detailed offer letter has been sent to your email, outlining the terms, salary, and benefits.</p>
            <p>Please review the offer and let us know if you have any questions. We look forward to you joining us!</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Offer Accepted": {
        "subject": "Welcome to the Team!",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>We are absolutely delighted that you have accepted our offer for the <strong>{job_title}</strong> position. Welcome to the team!</p>
            <p>Our HR department will be in touch with you soon to guide you through the onboarding process and provide details for your first day.</p>
            <p>We are excited to have you on board!</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    },
    "Offer Rejected": {
        "subject": "Regarding your decision on the {job_title} offer",
        "body": textwrap.dedent("""\
            <html><body>
            <p>Dear {candidate_name},</p>
            <p>Thank you for letting us know your decision regarding the offer for the <strong>{job_title}</strong> position.</p>
            <p>While we are disappointed that you won't be joining us at this time, we respect your decision and appreciate you considering us.</p>
            <p>We wish you the very best in your career and hope our paths may cross again in the future.</p>
            <p>Best regards,<br>The Hiring Team</p>
            </body></html>
            """)
    }
}