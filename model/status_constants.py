# =============================================================================
# HR-HIRE-AGENT/model/status_constants.py
# =============================================================================

class StatusConstants:
    """
    Centralized collection of status codes and descriptions for the HR Hire Workflow.
    This class now also serves as the single source of truth for UI configurations.
    """

    # --- System Entry & Resume Stages ---
    CANDIDATE_ENTERED_BY_SYSTEM_CODE = 10
    CANDIDATE_ENTERED_BY_SYSTEM_DESCR = "Candidate Entered by System"
    ATS_SHORTLISTED_CODE = 25
    ATS_SHORTLISTED_DESCR = "ATS Shortlisted"
    ATS_DISCARDED_CODE = 75
    ATS_DISCARDED_DESCR = "Resume declined"

    # --- Interview Stages (L1 = First Level, L2 = Second Level) ---
    L1_INTERVIEW_SCHEDULED_CODE = 90
    L1_INTERVIEW_SCHEDULED_DESCR = "L1 interview scheduled"
    L1_RE_SCHEDULED_CODE = 92
    L1_RE_SCHEDULED_DESCR = "L1 Re-scheduled"
    L1_SELECTED_CODE = 100
    L1_SELECTED_DESCR = "L1 Selected"
    L1_REJECTED_CODE = 95
    L1_REJECTED_DESCR = "L1 Rejected"
    
    # --- Document Verification Stage ---
    DOC_VERIFICATION_PENDING_CODE = 142
    DOC_VERIFICATION_PENDING_DESCR = "Document Verification"
    DOCS_CLEARED_CODE = 144
    DOCS_CLEARED_DESCR = "Documents Cleared"
    DOCS_REJECTED_CODE = 146
    DOCS_REJECTED_DESCR = "Documents Rejected"

    # --- L2 Interview ---
    L2_INTERVIEW_SCHEDULED_CODE = 110
    L2_INTERVIEW_SCHEDULED_DESCR = "L2 interview scheduled"
    L2_RE_SCHEDULED_CODE = 112
    L2_RE_SCHEDULED_DESCR = "L2 Re-scheduled"
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

    # --- Offer Stages ---
    OFFER_LETTER_ON_HOLD_CODE = 145
    OFFER_LETTER_ON_HOLD_DESCR = "Offer Letter On Hold"
    OFFER_LETTER_ISSUED_CODE = 150
    OFFER_LETTER_ISSUED_DESCR = "Offer Letter Issued"
    OFFER_ACCEPTED_CODE = 160
    OFFER_ACCEPTED_DESCR = "Offer Accepted"
    OFFER_REJECTED_CODE = 155
    OFFER_REJECTED_DESCR = "Offer Rejected"

    # --- Onboarding & Joining ---
    CANDIDATE_JOINED_CODE = 170
    CANDIDATE_JOINED_DESCR = "Candidate Joined"
    CANDIDATE_NOT_JOINED_CODE = 165
    CANDIDATE_NOT_JOINED_DESCR = "Candidate Not Joined"

    # --- Other/Internal Statuses (Not necessarily for primary pipeline) ---
    MESSAGE_SENT_DESCR = "Message Sent"
    MESSAGE_SENT_CODE = 20

    @classmethod
    def get_all_configs(cls):
        """
        Provides a dictionary containing all status-related configurations
        needed by the frontend to build its UI dynamically.
        """
        
        # UPDATED: Use cleaner, more generic names for the tabs
        pipeline_stages = [
            "ATS Shortlisted",
            "L1 interview",
            "Document Verification",
            "L2 interview",
            "HR",
            "Offer Letter Issued",
            "Candidate Joined",
            "Resume declined",
        ]

        # UPDATED: Group ALL related sub-statuses to correctly calculate counts
        tab_status_groups = {
            "ATS Shortlisted": [cls.ATS_SHORTLISTED_DESCR],
            "L1 interview": [
                cls.L1_INTERVIEW_SCHEDULED_DESCR, 
                cls.L1_RE_SCHEDULED_DESCR, 
                cls.L1_SELECTED_DESCR, 
                cls.L1_REJECTED_DESCR
            ],
            "Document Verification": [
                cls.DOC_VERIFICATION_PENDING_DESCR, 
                cls.DOCS_CLEARED_DESCR, 
                cls.DOCS_REJECTED_DESCR
            ],
            "L2 interview": [
                cls.L2_INTERVIEW_SCHEDULED_DESCR, 
                cls.L2_RE_SCHEDULED_DESCR, 
                cls.L2_SELECTED_DESCR, 
                cls.L2_REJECTED_DESCR
            ],
            "HR": [
                cls.HR_SCHEDULED_DESCR, 
                cls.HR_RE_SCHEDULED_DESCR, 
                cls.HR_ROUND_SELECTED_DESCR, 
                cls.HR_ROUND_REJECTED_DESCR
            ],
            "Offer Letter Issued": [
                cls.OFFER_LETTER_ISSUED_DESCR, 
                cls.OFFER_LETTER_ON_HOLD_DESCR, 
                cls.OFFER_ACCEPTED_DESCR, 
                cls.OFFER_REJECTED_DESCR
            ],
            "Candidate Joined": [
                cls.CANDIDATE_JOINED_DESCR, 
                cls.CANDIDATE_NOT_JOINED_DESCR
            ],
            "Resume declined": [cls.ATS_DISCARDED_DESCR]
        }
        
        # No changes are needed for the dropdown list of all statuses
        all_status_options = [
            cls.ATS_SHORTLISTED_DESCR,
            cls.L1_INTERVIEW_SCHEDULED_DESCR,
            cls.L1_RE_SCHEDULED_DESCR,
            cls.L1_SELECTED_DESCR,
            cls.L1_REJECTED_DESCR,
            cls.DOC_VERIFICATION_PENDING_DESCR,
            cls.DOCS_CLEARED_DESCR,
            cls.DOCS_REJECTED_DESCR,
            cls.L2_INTERVIEW_SCHEDULED_DESCR,
            cls.L2_RE_SCHEDULED_DESCR,
            cls.L2_SELECTED_DESCR,
            cls.L2_REJECTED_DESCR,
            cls.HR_SCHEDULED_DESCR,
            cls.HR_RE_SCHEDULED_DESCR,
            cls.HR_ROUND_SELECTED_DESCR,
            cls.HR_ROUND_REJECTED_DESCR,
            cls.OFFER_LETTER_ISSUED_DESCR,
            cls.OFFER_LETTER_ON_HOLD_DESCR,
            cls.OFFER_ACCEPTED_DESCR,
            cls.OFFER_REJECTED_DESCR,
            cls.CANDIDATE_JOINED_DESCR,
            cls.CANDIDATE_NOT_JOINED_DESCR,
            cls.ATS_DISCARDED_DESCR,
        ]
        
        reschedulable_statuses = [
            cls.L1_INTERVIEW_SCHEDULED_DESCR,
            cls.L2_INTERVIEW_SCHEDULED_DESCR,
            cls.HR_SCHEDULED_DESCR,
        ]

        detail_page_config = {
            "stage_order": ["SCREENING", "L1_INTERVIEW", "DOC_VERIFICATION", "L2_INTERVIEW", "HR_ROUND", "OFFER", "JOINED"],
            "stage_names": {
                "SCREENING": "Screening",
                "L1_INTERVIEW": "L1 Interview",
                "DOC_VERIFICATION": "Documents",
                "L2_INTERVIEW": "L2 Interview",
                "HR_ROUND": "HR Round",
                "OFFER": "Offer",
                "JOINED": "Joined",
            },
            "stage_groups": {
                "SCREENING": [cls.ATS_SHORTLISTED_DESCR, cls.ATS_DISCARDED_DESCR],
                "L1_INTERVIEW": [cls.L1_INTERVIEW_SCHEDULED_DESCR, cls.L1_RE_SCHEDULED_DESCR, cls.L1_SELECTED_DESCR, cls.L1_REJECTED_DESCR],
                "DOC_VERIFICATION": [cls.DOC_VERIFICATION_PENDING_DESCR, cls.DOCS_CLEARED_DESCR, cls.DOCS_REJECTED_DESCR],
                "L2_INTERVIEW": [cls.L2_INTERVIEW_SCHEDULED_DESCR, cls.L2_RE_SCHEDULED_DESCR, cls.L2_SELECTED_DESCR, cls.L2_REJECTED_DESCR],
                "HR_ROUND": [cls.HR_SCHEDULED_DESCR, cls.HR_RE_SCHEDULED_DESCR, cls.HR_ROUND_SELECTED_DESCR, cls.HR_ROUND_REJECTED_DESCR],
                "OFFER": [cls.OFFER_LETTER_ISSUED_DESCR, cls.OFFER_LETTER_ON_HOLD_DESCR, cls.OFFER_ACCEPTED_DESCR, cls.OFFER_REJECTED_DESCR, cls.CANDIDATE_NOT_JOINED_DESCR],
                "JOINED": [cls.CANDIDATE_JOINED_DESCR],
            }
        }

        return {
            "pipeline_stages": pipeline_stages,
            "tab_status_groups": tab_status_groups,
            "all_status_options": all_status_options,
            "reschedulable_statuses": reschedulable_statuses,
            "detail_page_config": detail_page_config
        }

    @classmethod
    def get_description(cls, code: int) -> str:
        for attr, value in cls.__dict__.items():
            if attr.endswith('_CODE') and value == code:
                return getattr(cls, attr.replace('_CODE', '_DESCR'))
        return f"Unknown Status Code: {code}"
    
    @classmethod
    def get_code(cls, description: str) -> int:
        for attr, value in cls.__dict__.items():
            if attr.endswith('_DESCR') and value == description:
                return getattr(cls, attr.replace('_DESCR', '_CODE'))
        return 0