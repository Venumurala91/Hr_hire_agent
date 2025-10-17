# =============================================================================
# HR-HIRE-AGENT/model/status_constants.py
# =============================================================================

class StatusConstants:
    """
    Centralized collection of status codes and descriptions for the HR Hire Workflow.
    """

    # --- System Entry & Resume Stages ---
    CANDIDATE_ENTERED_BY_SYSTEM_CODE = 10
    CANDIDATE_ENTERED_BY_SYSTEM_DESCR = "Candidate Entered by System"

    ATS_SHORTLISTED_CODE = 25 # Custom status for ATS shortlisting
    ATS_SHORTLISTED_DESCR = "ATS Shortlisted"
    ATS_DISCARDED_CODE = 75 # Using 'Resume declined' for ATS discard
    ATS_DISCARDED_DESCR = "Resume declined"

    RESUME_SUBMITTED_CODE = 70
    RESUME_SUBMITTED_DESCR = "Resume submitted"
    RESUME_ACCEPTED_CODE = 80 # Could be after initial HR review for manual pass
    RESUME_ACCEPTED_DESCR = "Resume Accepted"


    # --- Interview Stages (L1 = First Level, L2 = Second Level) ---
    L1_INTERVIEW_SCHEDULED_CODE = 90
    L1_INTERVIEW_SCHEDULED_DESCR = "L1 interview scheduled"
    L1_RE_SCHEDULED_CODE = 92
    L1_RE_SCHEDULED_DESCR = "L1 Re-scheduled"
    L1_SECOND_INTERVIEW_RE_SCHEDULED_CODE = 94 # If L1 has sub-rounds
    L1_SECOND_INTERVIEW_RE_SCHEDULED_DESCR = "L1 second interview Re-scheduled"
    INTERVIEW_ATTENDED_CODE = 5 # Using "Came to interview" from your list
    INTERVIEW_ATTENDED_DESCR = "Came to interview"
    L1_SELECTED_CODE = 100
    L1_SELECTED_DESCR = "L1 Selected"
    L1_REJECTED_CODE = 95
    L1_REJECTED_DESCR = "L1 Rejected"

    L2_INTERVIEW_SCHEDULED_CODE = 110
    L2_INTERVIEW_SCHEDULED_DESCR = "L2 interview scheduled"
    L2_RE_SCHEDULED_CODE = 112
    L2_RE_SCHEDULED_DESCR = "L2 interview Re-scheduled"
    L2_SECOND_INTERVIEW_RE_SCHEDULED_CODE = 114
    L2_SECOND_INTERVIEW_RE_SCHEDULED_DESCR = "L2 second interview Re-scheduled"
    L2_SELECTED_CODE = 120
    L2_SELECTED_DESCR = "L2 Selected"
    L2_REJECTED_CODE = 115
    L2_REJECTED_DESCR = "L2 Rejected"

    # --- HR Discussion & Round ---
    HR_SCHEDULED_CODE = 130
    HR_SCHEDULED_DESCR = "HR scheduled"
    HR_RE_SCHEDULED_CODE = 132
    HR_RE_SCHEDULED_DESCR = "HR Re-scheduled"
    HR_ROUND_SELECTED_CODE = 140
    HR_ROUND_SELECTED_DESCR = "HR Round Selected"
    HR_ROUND_REJECTED_CODE = 135
    HR_ROUND_REJECTED_DESCR = "HR Round Rejected"

    # --- NEW: Document Verification Stage ---
    DOC_VERIFICATION_PENDING_CODE = 142
    DOC_VERIFICATION_PENDING_DESCR = "Document Verification Pending"
    DOCS_CLEARED_CODE = 144
    DOCS_CLEARED_DESCR = "Documents Cleared"
    DOCS_REJECTED_CODE = 146 
    DOCS_REJECTED_DESCR = "Documents Rejected"
    # ------------------------------------

    # --- Background Verification (BGV) ---
    BGV_SELECTED_CODE = 102 # Implies BGV Cleared
    BGV_SELECTED_DESCR = "BG Cleared"
    BGV_REJECTED_CODE = 105 # Implies BGV Failed
    BGV_REJECTED_DESCR = "BG Failed"

    # --- Offer Stages ---
    OFFER_LETTER_ON_HOLD_CODE = 145
    OFFER_LETTER_ON_HOLD_DESCR = "Offer Letter On Hold"
    OFFER_LETTER_ISSUED_CODE = 150
    OFFER_LETTER_ISSUED_DESCR = "Offer Letter Issued"
    OFFER_ACCEPTED_CODE = 160
    OFFER_ACCEPTED_DESCR = "Offer Accepted"
    OFFER_REJECTED_CODE = 155
    OFFER_REJECTED_DESCR = "Offer Rejected" # Candidate rejected offer

    # --- Onboarding & Joining ---
    CANDIDATE_JOINED_CODE = 170
    CANDIDATE_JOINED_DESCR = "Candidate Joined"
    CANDIDATE_NOT_JOINED_CODE = 165
    CANDIDATE_NOT_JOINED_DESCR = "Candidate Not Joined" # Accepted, but didn't join

    # --- Communication Statuses (for StatusHistory, not necessarily Candidate.current_status) ---
    MESSAGE_NOT_SENT_CODE = 15
    MESSAGE_NOT_SENT_DESCR = "Message Not Sent"
    MESSAGE_SENT_CODE = 20
    MESSAGE_SENT_DESCR = "Message Sent"
    MESSAGE_DELIVERED_CODE = 30
    MESSAGE_DELIVERED_DESCR = "Message Delivered"
    SENT_MESSAGE_VIEWED_CODE = 40
    SENT_MESSAGE_VIEWED_DESCR = "Sent Message Viewed" # Requires webhook
    CANDIDATE_RESPONDED_CODE = 50
    CANDIDATE_RESPONDED_DESCR = "Candidate Responded" # Requires webhook/manual update
    CANDIDATE_NOT_INTERESTED_CODE = 55
    CANDIDATE_NOT_INTERESTED_DESCR = "Candidate not interested"
    CANDIDATE_IS_INTERESTED_CODE = 60
    CANDIDATE_IS_INTERESTED_DESCR = "Candidate is interested"

    # --- Invoice/Payment (if integrated later) ---
    INVOICE_RAISED_CODE = 180
    INVOICE_RAISED_DESCR = "Invoice Raised"
    INVOICE_REJECTED_CODE = 185
    INVOICE_REJECTED_DESCR = "Invoice Rejected"
    PAYMENT_RECEIVED_CODE = 200
    PAYMENT_RECEIVED_DESCR = "Payment Received"


    # Helper to get description by code
    @classmethod
    def get_description(cls, code: int) -> str:
        for attr, value in cls.__dict__.items():
            if attr.endswith('_CODE') and value == code:
                return getattr(cls, attr.replace('_CODE', '_DESCR'))
        return f"Unknown Status Code: {code}"
    
    # Helper to get code by description
    @classmethod
    def get_code(cls, description: str) -> int:
        for attr, value in cls.__dict__.items():
            if attr.endswith('_DESCR') and value == description:
                return getattr(cls, attr.replace('_DESCR', '_CODE'))
        return 0 # Or raise an error, depending on desired behavior for unknown descriptions