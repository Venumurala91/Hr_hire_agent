from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, or_
from model.models import Candidate, JobDescription, StatusHistory
from model.status_constants import StatusConstants
from src.ats_service import ATSService
from src.whatsapp_service import WhatsAppService
from src.notification_service import NotificationService
from src.helpers import parse_resume
from logger.logger import logger
from config.config_loader import config
from exception.custom_exception import NotFoundError, ValidationError, DatabaseError, APIError, WhatsAppMessagingError
import os
import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

class HiringService:
    def __init__(self, db: Session):
        self.db = db
        self.ats_service = ATSService()
        self.whatsapp_service = WhatsAppService()
        self.notification_service = NotificationService()
        self.max_workers_resume_processing = config.MAX_WORKERS_RESUME_PROCESSING

    def _record_status_change(self, candidate_id: int, status_description: str, comments: str = None, changed_by: str = "System"):
        status_code = StatusConstants.get_code(status_description)
        history_entry = StatusHistory(
            candidate_id=candidate_id, status_code=status_code,
            status_description=status_description, comments=comments, changed_by=changed_by
        )
        self.db.add(history_entry)
        logger.debug(f"Status history added for Candidate {candidate_id}: {status_description}")

    def _format_whatsapp_phone_number(self, phone_number: str) -> str:
        if not phone_number: return None
        if isinstance(phone_number, list): phone_number = phone_number[0] if phone_number else None
        if not phone_number or not isinstance(phone_number, str): return None
        phone_number = ''.join(filter(str.isdigit, phone_number))
        if len(phone_number) >= 10: return f"whatsapp:+91{phone_number[-10:]}"
        return None

    def create_job_description(self, title: str, description_text: str) -> JobDescription:
        try:
            jd = JobDescription(title=title, description_text=description_text)
            self.db.add(jd)
            self.db.commit(); self.db.refresh(jd); return jd
        except Exception as e:
            self.db.rollback(); raise DatabaseError(f"Failed to create JD: {e}")

    def get_job_description(self, jd_id: int) -> JobDescription:
        jd = self.db.query(JobDescription).filter(JobDescription.id == jd_id).first()
        if not jd: raise NotFoundError(f"Job Description with ID {jd_id} not found.")
        return jd

    def get_jobs(self, search_query: str = None) -> list[JobDescription]:
        query = self.db.query(JobDescription)
        if search_query: query = query.filter(JobDescription.title.ilike(f"%{search_query}%"))
        return query.order_by(JobDescription.created_at.desc()).all()

    def get_candidate(self, candidate_id: int) -> Candidate:
        candidate = self.db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate: raise NotFoundError(f"Candidate with ID {candidate_id} not found.")
        return candidate
        
    def _process_single_resume_task(self, file_path: str, jd_description_text: str) -> dict:
        try:
            resume_text, structured_data = parse_resume(file_path)
            if not resume_text and not structured_data: raise APIError("Failed to extract content from resume.")
            ats_result = self.ats_service.generate_ats_score(resume_text, structured_data, jd_description_text)
            name = ats_result.get('candidate_name', '').strip() or structured_data.get('name', '').strip()
            email = ats_result.get('email', '').strip() or structured_data.get('email', '').strip()
            phone = ats_result.get('phone_number', '').strip() or structured_data.get('mobile_number', '')
            parts = name.split() if name else []; first, last = (parts[0], ' '.join(parts[1:])) if parts else ("C", f"({os.path.basename(file_path)})")
            return {"first_name": first, "last_name": last, "email": email, "phone_number": phone, "ats_score": ats_result.get("overall_ats_score", 0.0), "full_analysis": ats_result, "error": None}
        except Exception as e:
            return {"file_name": os.path.basename(file_path), "error": str(e)}

    def bulk_process_and_shortlist_resumes(self, resume_file_paths: list[str], jd_id: int, ats_threshold: float, changed_by: str) -> dict:
        jd = self.get_job_description(jd_id)
        summary = {"processed": 0, "shortlisted": 0, "rejected": 0, "failed": 0}
        with ThreadPoolExecutor(max_workers=self.max_workers_resume_processing) as executor:
            f_to_r = {executor.submit(self._process_single_resume_task, rp, jd.description_text): rp for rp in resume_file_paths}
            for future in as_completed(f_to_r):
                summary["processed"] += 1
                try:
                    data = future.result()
                    if data.get("error"): summary["failed"] += 1; continue
                    is_shortlisted = data.get('ats_score', 0.0) >= ats_threshold
                    self._create_candidate_from_processed_data(data, jd, changed_by, is_shortlisted)
                    summary["shortlisted" if is_shortlisted else "rejected"] += 1
                except Exception as e:
                    summary["failed"] += 1
        self.db.commit(); return summary

    def _create_candidate_from_processed_data(self, data: dict, jd: JobDescription, changed_by: str, is_shortlisted: bool):
        sanitized_filename = re.sub(r'[^\w.-]', '_', os.path.splitext(data.get('file_name', ''))[0])
        email = data.get('email') or f"{sanitized_filename}@placeholder.email"
        if self.db.query(Candidate).filter(func.lower(Candidate.email) == email.lower(), Candidate.job_description_id == jd.id).first(): return
        
        status = StatusConstants.ATS_SHORTLISTED_DESCR if is_shortlisted else StatusConstants.ATS_DISCARDED_DESCR
        new_candidate = Candidate(first_name=data['first_name'], last_name=data['last_name'], email=email, phone_number=self._format_whatsapp_phone_number(data.get('phone_number')), job_description_id=jd.id, current_status=status, ats_score=data['ats_score'], ai_analysis=json.dumps(data.get('full_analysis', {})))
        self.db.add(new_candidate); self.db.flush()
        self._record_status_change(new_candidate.id, status, f"ATS Score: {new_candidate.ats_score}", changed_by)
        if is_shortlisted: self.notification_service.notify_new_candidate_shortlisted(new_candidate, jd)

    def get_candidates(self, status: str = None, job_id: int = None, search_query: str = None) -> list[Candidate]:
        q = self.db.query(Candidate)
        if status: q = q.filter(Candidate.current_status == status)
        if job_id: q = q.filter(Candidate.job_description_id == job_id)
        if search_query:
            term = f"%{search_query.lower()}%"
            jd_alias = aliased(JobDescription)
            q = q.join(jd_alias, Candidate.job_description_id == jd_alias.id).filter(or_(func.lower(Candidate.first_name).like(term), func.lower(Candidate.last_name).like(term), func.lower(Candidate.email).like(term), func.lower(jd_alias.title).like(term)))
        return q.order_by(Candidate.updated_at.desc()).all()

    def bulk_delete_candidates(self, c_ids: list[int]):
        if not c_ids: return
        try:
            self.db.query(StatusHistory).filter(StatusHistory.candidate_id.in_(c_ids)).delete(synchronize_session=False)
            self.db.query(Candidate).filter(Candidate.id.in_(c_ids)).delete(synchronize_session=False)
            self.db.commit()
        except Exception as e: self.db.rollback(); raise DatabaseError(f"Failed to bulk delete candidates: {e}")

    def bulk_delete_jobs(self, j_ids: list[int]):
        if not j_ids: return
        try:
            self.db.query(Candidate).filter(Candidate.job_description_id.in_(j_ids)).update({"job_description_id": None}, synchronize_session=False)
            self.db.query(JobDescription).filter(JobDescription.id.in_(j_ids)).delete(synchronize_session=False)
            self.db.commit()
        except Exception as e: self.db.rollback(); raise DatabaseError(f"Failed to bulk delete jobs: {e}")
    
    def update_candidate_status(self, c_id: int, new_status: str, comments: str, changed_by: str) -> Candidate:
        candidate = self.get_candidate(c_id)
        if not StatusConstants.get_code(new_status): raise ValidationError(f"Invalid status: '{new_status}'")
        candidate.current_status = new_status
        self._record_status_change(candidate.id, new_status, comments, changed_by)
        self.db.commit(); self.db.refresh(candidate)
        try: self.notification_service.send_candidate_status_update(candidate, new_status)
        except Exception as e: logger.error(f"Failed to send email for status update to {c_id}: {e}")
        return candidate

    # NEW: Generic bulk notification method
    def send_bulk_notification(self, candidate_ids: list[int], channel: str, subject: str, message: str, changed_by: str) -> dict:
        summary = {"success": 0, "failed": 0}
        candidates = self.db.query(Candidate).filter(Candidate.id.in_(candidate_ids)).all()
        
        for c in candidates:
            try:
                name = f"{c.first_name} {c.last_name}".strip()
                job = c.job_description.title if c.job_description else "the role"
                
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
        return self.db.query(Candidate).filter(or_(Candidate.phone_number.isnot(None), Candidate.email.isnot(None))).order_by(Candidate.updated_at.desc()).all()
    
    def update_job_description(self, j_id: int, title: str, desc: str) -> JobDescription:
        jd = self.get_job_description(j_id)
        try:
            jd.title, jd.description_text = title, desc
            self.db.commit(); self.db.refresh(jd); return jd
        except Exception as e: self.db.rollback(); raise DatabaseError(f"Failed to update job: {e}")