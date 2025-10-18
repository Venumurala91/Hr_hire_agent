from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy import func, or_
import shutil
import uuid
import os
import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# Import all relevant models for operations, especially for deletions
from model.models import Candidate, JobDescription, StatusHistory, Interview, HRDiscussion, Verification
from model.status_constants import StatusConstants
from src.ats_service import ATSService
from src.whatsapp_service import WhatsAppService
from src.notification_service import NotificationService
from src.helpers import parse_resume
from logger.logger import logger
from config.config_loader import config
from exception.custom_exception import NotFoundError, ValidationError, DatabaseError, APIError

class HiringService:
    """
    Provides a high-level API for all hiring-related business logic.
    This service class encapsulates interactions with the database, AI services,
    and notification systems to perform core application functions.
    """
    def __init__(self, db: Session):
        """
        Initializes the HiringService.
        :param db: An active SQLAlchemy database session.
        """
        self.db = db
        self.ats_service = ATSService()
        self.whatsapp_service = WhatsAppService()
        self.notification_service = NotificationService()
        self.max_workers_resume_processing = config.MAX_WORKERS_RESUME_PROCESSING
        # Load the status configs once
        self.status_configs = StatusConstants.get_all_configs()


    def _record_status_change(self, candidate_id: int, status_description: str, comments: str = None, changed_by: str = "System"):
        """
        Creates a new entry in the StatusHistory table to log a status change.
        :param candidate_id: The ID of the candidate whose status is changing.
        :param status_description: The new human-readable status description.
        :param comments: Optional comments about the status change.
        :param changed_by: Identifier for who made the change (e.g., 'HR', 'System').
        """
        status_code = StatusConstants.get_code(status_description)
        history_entry = StatusHistory(
            candidate_id=candidate_id,
            status_code=status_code,
            status_description=status_description,
            comments=comments,
            changed_by=changed_by
        )
        self.db.add(history_entry)
        logger.debug(f"Status history added for Candidate {candidate_id}: {status_description}")

    def _format_whatsapp_phone_number(self, phone_number: str) -> str:
        """
        Cleans and formats a phone number into the E.164 format required by Twilio for WhatsApp.
        Handles international numbers and standardizes them.
        :param phone_number: The raw phone number string.
        :return: A formatted string like 'whatsapp:+91...' or None if invalid.
        """
        if not phone_number: return None
        if isinstance(phone_number, list): phone_number = phone_number[0] if phone_number else None
        if not phone_number or not isinstance(phone_number, str): return None
        
        # Remove all non-digit characters except for the leading '+'
        cleaned_number = re.sub(r'[^\d+]', '', phone_number)

        if cleaned_number.startswith('+'):
            # Already in international format
            return f"whatsapp:{cleaned_number}"
        
        # Assume Indian numbers if it's 10 digits long and has no country code
        if len(cleaned_number) == 10:
            return f"whatsapp:+91{cleaned_number}"
            
        # Handle cases like '919876543210'
        if len(cleaned_number) == 12 and cleaned_number.startswith('91'):
            return f"whatsapp:+{cleaned_number}"

        logger.warning(f"Could not format phone number into E.164 standard: {phone_number}")
        return None

    def create_job_description(self, title: str, description_text: str, location: str, salary_range: str, min_experience_years: int) -> JobDescription:
        """
        Creates a new job description in the database.
        :param title: The title of the job.
        :param description_text: The full text of the job description.
        :param location: The location for the job.
        :param salary_range: The salary range for the job.
        :return: The newly created JobDescription object.
        :raises DatabaseError: If the database operation fails.
        """
        try:
            jd = JobDescription(
                title=title, 
                description_text=description_text,
                location=location,
                salary_range=salary_range,
                min_experience_years=min_experience_years
            )
            self.db.add(jd)
            self.db.commit()
            self.db.refresh(jd)
            return jd
        except Exception as e:
            self.db.rollback()
            raise DatabaseError(f"Failed to create JD: {e}")

    def get_job_description(self, jd_id: int) -> JobDescription:
        """
        Retrieves a single job description by its ID.
        :param jd_id: The ID of the job to retrieve.
        :return: The JobDescription object.
        :raises NotFoundError: If no job with the given ID is found.
        """
        jd = self.db.query(JobDescription).filter(JobDescription.id == jd_id).first()
        if not jd:
            raise NotFoundError(f"Job Description with ID {jd_id} not found.")
        return jd

    def get_jobs(self, search_query: str = None) -> list[JobDescription]:
        """
        Retrieves a list of all job descriptions, optionally filtered by a search query.
        :param search_query: An optional string to filter job titles.
        :return: A list of JobDescription objects.
        """
        query = self.db.query(JobDescription)
        if search_query:
            query = query.filter(JobDescription.title.ilike(f"%{search_query}%"))
        return query.order_by(JobDescription.created_at.desc()).all()

    def get_candidate(self, candidate_id: int) -> Candidate:
        """
        Retrieves a single candidate by their ID, eagerly loading their status history.
        :param candidate_id: The ID of the candidate to retrieve.
        :return: The Candidate object.
        :raises NotFoundError: If no candidate with the given ID is found.
        """
        candidate = self.db.query(Candidate).options(joinedload(Candidate.status_history)).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise NotFoundError(f"Candidate with ID {candidate_id} not found.")
        return candidate
        
    def _process_single_resume_task(self, file_path: str, jd_description_text: str) -> dict:
        """
        A single unit of work for processing one resume against a job description.
        This function is designed to be run in a separate thread.
        :param file_path: The path to the resume file.
        :param jd_description_text: The text of the job description.
        :return: A dictionary containing the processed data or an error.
        """
        try:
            resume_text, structured_data = parse_resume(file_path)
            if not resume_text and not structured_data:
                raise APIError("Failed to extract content from resume.")
            
            # The ATS service is expected to return a full analysis, including work history
            ats_result = self.ats_service.generate_ats_score(resume_text, structured_data, jd_description_text)
            
            name = ats_result.get('candidate_name', '').strip() or structured_data.get('name', '').strip()
            email = ats_result.get('email', '').strip() or structured_data.get('email', '').strip()
            phone = ats_result.get('phone_number', '').strip() or structured_data.get('mobile_number', '')
            
            parts = name.split() if name else []
            first, last = (parts[0], ' '.join(parts[1:])) if parts else ("Candidate", f"({os.path.basename(file_path)})")
            
            return {
                "first_name": first, "last_name": last, "email": email, "phone_number": phone, 
                "ats_score": ats_result.get("overall_ats_score", 0.0), 
                "full_analysis": ats_result, "error": None,
                "original_path": file_path
            }
        except Exception as e:
            return {"file_name": os.path.basename(file_path), "error": str(e), "original_path": file_path}

    def bulk_process_and_shortlist_resumes(self, resume_file_paths: list[str], jd_id: int, ats_threshold: float, changed_by: str) -> dict:
        """
        Processes a batch of resumes in parallel and creates candidate records.
        :param resume_file_paths: A list of paths to the uploaded resume files.
        :param jd_id: The ID of the job description to screen against.
        :param ats_threshold: The minimum ATS score required to be shortlisted.
        :param changed_by: Identifier for who initiated this bulk process.
        :return: A summary dictionary of the processing results.
        """
        jd = self.get_job_description(jd_id)
        summary = {"processed": 0, "shortlisted": 0, "rejected": 0, "failed": 0}
        
        # Use a thread pool to process resumes concurrently for better performance
        with ThreadPoolExecutor(max_workers=self.max_workers_resume_processing) as executor:
            future_to_resume = {executor.submit(self._process_single_resume_task, rp, jd.description_text): rp for rp in resume_file_paths}
            for future in as_completed(future_to_resume):
                summary["processed"] += 1
                try:
                    data = future.result()
                    if data.get("error"):
                        summary["failed"] += 1
                        continue
                    
                    is_shortlisted = data.get('ats_score', 0.0) >= ats_threshold
                    self._create_candidate_from_processed_data(data, jd, changed_by, is_shortlisted)
                    summary["shortlisted" if is_shortlisted else "rejected"] += 1
                except Exception as e:
                    logger.error(f"Error creating candidate from processed data: {e}", exc_info=True)
                    summary["failed"] += 1
        
        self.db.commit()
        return summary

    def _create_candidate_from_processed_data(self, data: dict, jd: JobDescription, changed_by: str, is_shortlisted: bool):
        """
        Helper function to create and save a single candidate record from processed data.
        """
        sanitized_filename = re.sub(r'[^\w.-]', '_', os.path.splitext(data.get('file_name', ''))[0])
        email = data.get('email') or f"{sanitized_filename}_{uuid.uuid4().hex[:6]}@placeholder.email"
        
        # Prevent creating duplicate candidates for the same job
        if self.db.query(Candidate).filter(func.lower(Candidate.email) == email.lower(), Candidate.job_description_id == jd.id).first():
            logger.warning(f"Duplicate candidate skipped: {email} for job {jd.id}")
            return

        permanent_resume_path = None
        temp_path = data.get('original_path')

        if temp_path and os.path.exists(temp_path):
            try:
                _, file_extension = os.path.splitext(temp_path)
                unique_filename = f"{uuid.uuid4().hex}{file_extension}"
                destination_path = os.path.join(config.RESUME_UPLOAD_FOLDER, unique_filename)
                
                shutil.copy(temp_path, destination_path)
                permanent_resume_path = os.path.join(config.RESUME_UPLOAD_FOLDER, unique_filename).replace('\\', '/')
                logger.info(f"Copied resume from {temp_path} to {destination_path}")
            except Exception as e:
                logger.error(f"Failed to copy resume file {temp_path}: {e}")

        status = StatusConstants.ATS_SHORTLISTED_DESCR if is_shortlisted else StatusConstants.ATS_DISCARDED_DESCR
        new_candidate = Candidate(
            first_name=data['first_name'], 
            last_name=data['last_name'], 
            email=email, 
            phone_number=self._format_whatsapp_phone_number(data.get('phone_number')), 
            job_description_id=jd.id, 
            current_status=status, 
            ats_score=data['ats_score'], 
            ai_analysis=json.dumps(data.get('full_analysis', {})),
            resume_path=permanent_resume_path
        )
        self.db.add(new_candidate)
        self.db.flush() # Flush to get the new_candidate.id for the history record
        self._record_status_change(new_candidate.id, status, f"ATS Score: {new_candidate.ats_score}", changed_by)
        
        if is_shortlisted:
            self.notification_service.notify_new_candidate_shortlisted(new_candidate, jd)

    def get_candidates(self, status: str = None, job_id: int = None, search_query: str = None, paginated: bool = False):
        """
        Retrieves a list of candidates with optional filtering, searching, and pagination.
        :param status: Filter by a specific status.
        :param job_id: Filter by a specific job ID.
        :param search_query: Filter by a search term across multiple fields.
        :param paginated: If True, returns a tuple of (query, total_count). Otherwise, returns a list of results.
        :return: Either a tuple (query, total_count) or a list of Candidate objects.
        """
        q = self.db.query(Candidate)
        if status:
            q = q.filter(Candidate.current_status.in_(status))
        if job_id:
            q = q.filter(Candidate.job_description_id == job_id)
        if search_query:
            term = f"%{search_query.lower()}%"
            jd_alias = aliased(JobDescription)
            q = q.join(jd_alias, Candidate.job_description_id == jd_alias.id).filter(
                or_(
                    func.lower(Candidate.first_name).like(term),
                    func.lower(Candidate.last_name).like(term),
                    func.lower(Candidate.email).like(term),
                    func.lower(jd_alias.title).like(term)
                )
            )
        
        if paginated:
            total_count = q.count()
            ordered_query = q.order_by(Candidate.updated_at.desc())
            return ordered_query, total_count
        else:
            return q.order_by(Candidate.updated_at.desc()).all()

    def bulk_delete_candidates(self, c_ids: list[int]):
        """
        Deletes multiple candidates and all their related child records.
        This function correctly handles foreign key constraints by deleting child records first.
        :param c_ids: A list of candidate IDs to delete.
        :raises DatabaseError: If the database operation fails.
        """
        if not c_ids: return
        try:
            # Step 1: Delete all "child" records first to avoid foreign key violations.
            self.db.query(Interview).filter(Interview.candidate_id.in_(c_ids)).delete(synchronize_session=False)
            self.db.query(HRDiscussion).filter(HRDiscussion.candidate_id.in_(c_ids)).delete(synchronize_session=False)
            self.db.query(Verification).filter(Verification.candidate_id.in_(c_ids)).delete(synchronize_session=False)
            self.db.query(StatusHistory).filter(StatusHistory.candidate_id.in_(c_ids)).delete(synchronize_session=False)
            
            # Step 2: Now that child records are gone, delete the "parent" candidates.
            self.db.query(Candidate).filter(Candidate.id.in_(c_ids)).delete(synchronize_session=False)
            
            self.db.commit()
            logger.info(f"Successfully deleted {len(c_ids)} candidates and their related data.")
        except Exception as e:
            self.db.rollback()
            raise DatabaseError(f"Failed to bulk delete candidates: {e}")

    def bulk_delete_jobs(self, j_ids: list[int]):
        """
        Deletes multiple jobs and all candidates associated with them.
        :param j_ids: A list of job description IDs to delete.
        :raises DatabaseError: If the database operation fails.
        """
        if not j_ids: return
        try:
            # Find all candidates related to the jobs being deleted
            candidates_to_delete = self.db.query(Candidate.id).filter(Candidate.job_description_id.in_(j_ids)).all()
            if candidates_to_delete:
                candidate_ids_to_delete = [c.id for c in candidates_to_delete]
                # Use the corrected bulk_delete_candidates function to handle their deletion
                self.bulk_delete_candidates(candidate_ids_to_delete)

            # Now, it's safe to delete the jobs themselves
            self.db.query(JobDescription).filter(JobDescription.id.in_(j_ids)).delete(synchronize_session=False)
            
            self.db.commit()
            logger.info(f"Successfully deleted {len(j_ids)} jobs and their related candidates.")
        except Exception as e:
            self.db.rollback()
            raise DatabaseError(f"Failed to bulk delete jobs: {e}")
    
    def update_candidate_status(self, c_id: int, new_status: str, comments: str, changed_by: str) -> Candidate:
        """
        Updates the status of a single candidate and logs the change.
        :param c_id: The ID of the candidate to update.
        :param new_status: The new status description.
        :param comments: Optional comments for the status change.
        :param changed_by: Identifier for who made the change.
        :return: The updated Candidate object.
        :raises ValidationError: If the new status is invalid.
        """
        candidate = self.get_candidate(c_id)
        if new_status not in self.status_configs["all_status_options"]:
            raise ValidationError(f"Invalid status: '{new_status}'")
            
        candidate.current_status = new_status
        self._record_status_change(candidate.id, new_status, comments, changed_by)
        self.db.commit()
        self.db.refresh(candidate)
        
        try:
            self.notification_service.send_candidate_status_update(candidate, new_status)
        except Exception as e:
            logger.error(f"Failed to send email for status update to {c_id}: {e}")
            # Do not re-raise, the status update itself was successful
            
        return candidate

    def reschedule_interview(self, candidate_id: int, comments: str, changed_by: str) -> Candidate:
        """
        Handles the specific workflow of rescheduling an interview.
        It updates the previous status history with a reason and sets the new 'Re-scheduled' status.
        :param candidate_id: The ID of the candidate to reschedule.
        :param comments: The reason for rescheduling (e.g., "No Show").
        :param changed_by: Identifier for who initiated the reschedule.
        :return: The updated Candidate object.
        :raises ValidationError: If the candidate is not in a reschedulable state.
        """
        candidate = self.get_candidate(candidate_id)
        
        reschedulable_statuses_map = {
            StatusConstants.L1_INTERVIEW_SCHEDULED_DESCR: StatusConstants.L1_RE_SCHEDULED_DESCR,
            StatusConstants.L2_INTERVIEW_SCHEDULED_DESCR: StatusConstants.L2_RE_SCHEDULED_DESCR,
            StatusConstants.HR_SCHEDULED_DESCR: StatusConstants.HR_RE_SCHEDULED_DESCR,
        }
        
        current_status = candidate.current_status
        if current_status not in self.status_configs["reschedulable_statuses"]:
            raise ValidationError(f"Candidate status '{current_status}' is not eligible for rescheduling.")
            
        new_status = reschedulable_statuses_map[current_status]
        
        last_history_entry = self.db.query(StatusHistory).filter(
            StatusHistory.candidate_id == candidate_id,
            StatusHistory.status_description == current_status
        ).order_by(StatusHistory.changed_at.desc()).first()
        
        if last_history_entry:
            last_history_entry.comments = (last_history_entry.comments or '') + f" [Reschedule reason: {comments}]"
            
        candidate.current_status = new_status
        self._record_status_change(candidate.id, new_status, "Awaiting new interview time.", changed_by)
        
        self.db.commit()
        self.db.refresh(candidate)
        logger.info(f"Candidate {candidate_id} rescheduled from '{current_status}' to '{new_status}'.")
        return candidate
    
    def send_bulk_notification(self, candidate_ids: list[int], channel: str, subject: str, message: str, changed_by: str) -> dict:
        """
        Sends a bulk notification (Email or WhatsApp) to a list of candidates.
        :param candidate_ids: List of IDs of candidates to notify.
        :param channel: The communication channel ('email' or 'whatsapp').
        :param subject: The subject of the message (for email).
        :param message: The body of the message.
        :param changed_by: Identifier for who sent the notification.
        :return: A summary dictionary of success and fail counts.
        """
        summary = {"success": 0, "failed": 0}
        candidates = self.db.query(Candidate).filter(Candidate.id.in_(candidate_ids)).all()
        
        for c in candidates:
            try:
                name = f"{c.first_name} {c.last_name}".strip()
                job = c.job_description.title if c.job_description else "the role"
                
                # Personalize message with placeholders
                p_subject = subject.replace("{candidate_name}", name).replace("{job_title}", job) if subject else None
                p_message = message.replace("{candidate_name}", name).replace("{job_title}", job)

                if channel == 'email':
                    self.notification_service.send_email(c.email, p_subject, p_message.replace('\n', '<br>'))
                elif channel == 'whatsapp' and c.phone_number:
                    self.whatsapp_service.send_whatsapp_message(c.phone_number, p_message)
                else:
                    raise ValueError(f"Channel '{channel}' not supported or phone missing.")
                
                self._record_status_change(c.id, f"Bulk {channel.capitalize()} Sent", changed_by=changed_by)
                summary["success"] += 1
            except Exception as e:
                logger.error(f"Failed to send {channel} to candidate {c.id}: {e}")
                self._record_status_change(c.id, f"Bulk {channel.capitalize()} Failed", comments=str(e), changed_by="System")
                summary["failed"] += 1
        
        self.db.commit()
        return summary

    def get_active_candidates(self) -> list[Candidate]:
        """
        Retrieves a list of candidates who have contact info and are not in the 'Resume declined' state.
        This is used to populate the Messages page.
        :return: A list of Candidate objects.
        """
        # Define the single status that should NOT appear on the messages page.
        excluded_status = StatusConstants.ATS_DISCARDED_DESCR # This is "Resume declined"

        return self.db.query(Candidate).filter(
            or_(Candidate.phone_number.isnot(None), Candidate.email.isnot(None)),
            Candidate.current_status != excluded_status
        ).order_by(Candidate.updated_at.desc()).all()
    
    def update_job_description(self, j_id: int, title: str, desc: str, location: str, salary: str) -> JobDescription:
        """
        Updates the details of an existing job description.
        :param j_id: The ID of the job to update.
        :param title: The new title for the job.
        :param desc: The new description text for the job.
        :param location: The new location for the job.
        :param salary: The new salary range for the job.
        :return: The updated JobDescription object.
        :raises DatabaseError: If the database operation fails.
        """
        jd = self.get_job_description(j_id)
        try:
            jd.title = title
            jd.description_text = desc
            jd.location = location
            jd.salary_range = salary
            self.db.commit()
            self.db.refresh(jd)
            return jd
        except Exception as e:
            self.db.rollback()
            raise DatabaseError(f"Failed to update job: {e}")