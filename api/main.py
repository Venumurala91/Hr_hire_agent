from flask import Flask, request, jsonify, render_template, Response, redirect, url_for, send_from_directory
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
import os
import uuid
import json

# Local imports
from config.config_loader import config
from database.database import init_db, get_db
from model.models import Candidate, JobDescription, StatusHistory, Interview # <-- Import Interview model
from model.status_constants import StatusConstants
from logger.logger import logger
from exception.custom_exception import CustomException, ValidationError, APIError
from src.hiring_service import HiringService
from src.helpers import save_uploaded_file, cleanup_directory

# --- Flask App Initialization ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__,
            static_folder=os.path.join(PROJECT_ROOT, 'frontend-react', 'dist'),
            static_url_path='/')

app.secret_key = config.APP_SECRET_KEY

# --- Directory and DB Initialization ---
os.makedirs(config.TEMP_BULK_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(config.RESUME_UPLOAD_FOLDER, exist_ok=True) 
with app.app_context():
    init_db()
    logger.info("Application started and database initialized.")

# --- Error Handlers ---
@app.errorhandler(CustomException)
def handle_custom_exception(error):
    logger.error(f"Application error: {error.message}", exc_info=False)
    return jsonify({"message": error.message}), error.status_code

@app.errorhandler(Exception)
def handle_general_exception(error):
    logger.critical(f"Unhandled server error: {error}", exc_info=True)
    return jsonify({"message": "An unexpected server error occurred."}), 500

# --- Database Session Dependency ---
def get_hiring_service():
    db_gen = get_db()
    db = next(db_gen)
    try:
        yield HiringService(db)
    finally:
        db_gen.close()

# =============================================================================
# === 1. FILE & PAGE SERVING ROUTES ===========================================
# =============================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    # This logic handles serving the React app and its assets.
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # For any other path, serve the main index.html to let React Router take over.
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        # Fallback for development if React app isn't built yet
        return "React app not built. Run 'npm run build' in frontend-react directory.", 404

@app.route('/uploads/<path:subpath>')
def serve_uploads(subpath):
    # This route is essential for the "View Resume" button to work.
    return send_from_directory(os.path.join(PROJECT_ROOT, 'uploads'), subpath)

# =============================================================================
# === 2. API ENDPOINTS ========================================================
# =============================================================================

@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    for hiring_service in get_hiring_service():
        db = hiring_service.db
        total_jobs = db.query(func.count(JobDescription.id)).scalar() or 0
        total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
        interview_statuses = [ StatusConstants.L1_INTERVIEW_SCHEDULED_DESCR, StatusConstants.L2_INTERVIEW_SCHEDULED_DESCR, StatusConstants.HR_SCHEDULED_DESCR ]
        offer_statuses = [ StatusConstants.OFFER_LETTER_ISSUED_DESCR, StatusConstants.OFFER_ACCEPTED_DESCR ]
        candidates_interviewing = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(interview_statuses)).scalar() or 0
        offers_extended = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(offer_statuses)).scalar() or 0
        stats = { "active_jobs": total_jobs, "total_candidates_shortlisted": total_candidates, "candidates_interviewing": candidates_interviewing, "offers_extended": offers_extended }
        return jsonify(stats), 200

@app.route("/api/candidates/distribution", methods=["GET"])
def get_candidate_status_distribution():
    for hiring_service in get_hiring_service():
        db = hiring_service.db
        interview_statuses = [ StatusConstants.L1_INTERVIEW_SCHEDULED_DESCR, StatusConstants.L2_INTERVIEW_SCHEDULED_DESCR, StatusConstants.HR_SCHEDULED_DESCR, StatusConstants.L1_SELECTED_DESCR, StatusConstants.L2_SELECTED_DESCR, StatusConstants.HR_ROUND_SELECTED_DESCR ]
        offer_statuses = [ StatusConstants.OFFER_LETTER_ISSUED_DESCR, StatusConstants.OFFER_ACCEPTED_DESCR, ]
        rejected_statuses = [ StatusConstants.ATS_DISCARDED_DESCR, StatusConstants.L1_REJECTED_DESCR, StatusConstants.L2_REJECTED_DESCR, StatusConstants.HR_ROUND_REJECTED_DESCR, StatusConstants.OFFER_REJECTED_DESCR, StatusConstants.CANDIDATE_NOT_JOINED_DESCR, ]
        shortlisted_count = db.query(func.count(Candidate.id)).filter(Candidate.current_status == StatusConstants.ATS_SHORTLISTED_DESCR).scalar() or 0
        interviewing_count = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(interview_statuses)).scalar() or 0
        offers_count = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(offer_statuses)).scalar() or 0
        rejected_count = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(rejected_statuses)).scalar() or 0
        joined_count = db.query(func.count(Candidate.id)).filter(Candidate.current_status == StatusConstants.CANDIDATE_JOINED_DESCR).scalar() or 0
        distribution_data = { "ATS Shortlisted": shortlisted_count, "Interviewing": interviewing_count, "Offers": offers_count, "Joined": joined_count, "Rejected": rejected_count }
        final_distribution = {label: count for label, count in distribution_data.items() if count > 0}
        return jsonify({"labels": list(final_distribution.keys()), "data": list(final_distribution.values())}), 200

@app.route("/api/candidates/counts", methods=["GET"])
def get_candidate_counts():
    for hiring_service in get_hiring_service():
        pipeline_stages = [ StatusConstants.ATS_SHORTLISTED_DESCR, StatusConstants.L1_INTERVIEW_SCHEDULED_DESCR, StatusConstants.L2_INTERVIEW_SCHEDULED_DESCR, StatusConstants.HR_SCHEDULED_DESCR, StatusConstants.OFFER_LETTER_ISSUED_DESCR, StatusConstants.CANDIDATE_JOINED_DESCR, StatusConstants.ATS_DISCARDED_DESCR ]
        counts = hiring_service.db.query(Candidate.current_status, func.count(Candidate.id)).filter(Candidate.current_status.in_(pipeline_stages)).group_by(Candidate.current_status).all()
        counts_dict = {stage: 0 for stage in pipeline_stages}
        counts_dict.update(dict(counts))
        return jsonify(counts_dict), 200

@app.route("/api/jobs", methods=["GET", "POST"])
def handle_jobs():
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            search_query = request.args.get('search')
            jobs = hiring_service.get_jobs(search_query=search_query)
            return jsonify([{"id": j.id, "title": j.title, "created_at": j.created_at.isoformat(), "candidate_count": len(j.candidates)} for j in jobs]), 200
        elif request.method == "POST":
            data = request.json
            if not data or "title" not in data or "description_text" not in data: raise ValidationError("Missing 'title' or 'description_text'.")
            jd = hiring_service.create_job_description(title=data["title"], description_text=data["description_text"])
            return jsonify({"message": "Job created successfully", "job_id": jd.id}), 201

@app.route("/api/jobs/bulk", methods=["DELETE"])
def bulk_delete_jobs_api():
    data = request.json
    job_ids = data.get('job_ids')
    if not job_ids or not isinstance(job_ids, list): raise ValidationError("Request body must contain a list of 'job_ids'.")
    for hiring_service in get_hiring_service():
        hiring_service.bulk_delete_jobs(job_ids)
        return jsonify({"message": f"{len(job_ids)} jobs deleted successfully."}), 200

@app.route("/api/candidates/bulk_process", methods=["POST"])
def bulk_process_resumes():
    resume_files = request.files.getlist('resumes')
    jd_id = request.form.get('job_description_id')
    ats_threshold = request.form.get('ats_threshold', type=float, default=70.0)
    if not resume_files or not jd_id: raise ValidationError("Missing resume files or job ID.")
    temp_path = os.path.join(config.TEMP_BULK_UPLOAD_FOLDER, str(uuid.uuid4()))
    os.makedirs(temp_path, exist_ok=True)
    try:
        uploaded_paths = [os.path.join(temp_path, file.filename) for file in resume_files if file.filename]
        for i, file in enumerate(resume_files): file.save(uploaded_paths[i])
        if not uploaded_paths: raise ValidationError("No valid files were saved.")
        for hiring_service in get_hiring_service():
            processed_data = hiring_service.bulk_process_and_shortlist_resumes(uploaded_paths, int(jd_id), ats_threshold, "HR")
            return jsonify(processed_data), 200
    finally:
        cleanup_directory(temp_path)

@app.route("/api/candidates", methods=["GET"])
def get_candidates_api():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status_filter = request.args.get('status')
    job_id_filter = request.args.get('job_id', type=int)
    search_query = request.args.get('search')
    for hiring_service in get_hiring_service():
        query, total_count = hiring_service.get_candidates(
            status=status_filter, job_id=job_id_filter, search_query=search_query, paginated=True
        )
        offset = (page - 1) * limit
        paginated_query = query.offset(offset).limit(limit)
        candidates = paginated_query.all()
        results = [{"id": c.id, "first_name": c.first_name, "last_name": c.last_name, "email": c.email, "phone_number": c.phone_number, "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "ats_score": c.ats_score} for c in candidates]
        return jsonify({"candidates": results, "total": total_count}), 200

@app.route("/api/candidates/<int:candidate_id>", methods=["GET", "DELETE"])
def handle_candidate(candidate_id):
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            c = hiring_service.get_candidate(candidate_id)
            return jsonify({ 
                "id": c.id, "first_name": c.first_name, "last_name": c.last_name, 
                "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), 
                "email": c.email, "phone_number": c.phone_number, "status": c.current_status, 
                "job_title": c.job_description.title if c.job_description else "N/A", 
                "ats_score": c.ats_score, 
                "ai_analysis": json.loads(c.ai_analysis) if c.ai_analysis else {},
                "status_history": [{"status_description": h.status_description, "changed_at": h.changed_at.isoformat(), "comments": h.comments, "changed_by": h.changed_by} for h in sorted(c.status_history, key=lambda x: x.changed_at, reverse=True)],
                "resume_path": c.resume_path
            }), 200
        if request.method == "DELETE":
            hiring_service.bulk_delete_candidates([candidate_id])
            return jsonify({"message": f"Candidate {candidate_id} deleted successfully."}), 200

@app.route("/api/candidates/bulk", methods=["DELETE"])
def bulk_delete_candidates_api():
    candidate_ids = request.json.get('candidate_ids')
    if not candidate_ids or not isinstance(candidate_ids, list): raise ValidationError("Request must contain a list of 'candidate_ids'.")
    for hiring_service in get_hiring_service():
        hiring_service.bulk_delete_candidates(candidate_ids)
        return jsonify({"message": f"{len(candidate_ids)} candidates deleted."}), 200

@app.route("/api/candidates/<int:candidate_id>/update_status", methods=["POST"])
def update_candidate_status(candidate_id):
    data = request.json
    new_status, comments = data.get('status'), data.get('comments', '')
    if not new_status: raise ValidationError("Missing 'status'.")
    for hiring_service in get_hiring_service():
        candidate = hiring_service.update_candidate_status(candidate_id, new_status, comments, "HR")
        return jsonify({"message": f"Candidate status updated to '{candidate.current_status}'"}), 200

@app.route("/api/candidates/<int:candidate_id>/interviews", methods=["GET"])
def get_interviews_for_candidate(candidate_id):
    db = next(get_db())
    interviews = db.query(Interview).filter(Interview.candidate_id == candidate_id).order_by(Interview.round_number).all()
    results = [{
        "id": i.id, "round_number": i.round_number, "interviewer_name": i.interviewer_name,
        "interview_date": i.interview_date.isoformat() if i.interview_date else None,
        "score": i.score, "feedback": i.feedback, "status": i.status
    } for i in interviews]
    return jsonify(results), 200

@app.route("/api/candidates/<int:candidate_id>/interviews", methods=["POST"])
def add_interview_for_candidate(candidate_id):
    db = next(get_db())
    data = request.json
    if not all(k in data for k in ['round_number', 'interviewer_name', 'feedback']):
        raise ValidationError("Missing required fields: round_number, interviewer_name, feedback.")
    new_interview = Interview(
        candidate_id=candidate_id, round_number=data['round_number'],
        interviewer_name=data.get('interviewer_name'), interview_date=data.get('interview_date'),
        score=data.get('score'), feedback=data.get('feedback'), status="Completed"
    )
    db.add(new_interview)
    db.commit()
    return jsonify({"message": "Interview feedback added successfully.", "interview_id": new_interview.id}), 201

@app.route("/api/candidates/active", methods=["GET"])
def get_active_candidates_api():
    for hiring_service in get_hiring_service():
        candidates = hiring_service.get_active_candidates()
        results = [{
            "id": c.id, "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), 
            "status": c.current_status, 
            "job_title": c.job_description.title if c.job_description else "N/A",
            "email": c.email, "phone_number": c.phone_number
        } for c in candidates]
        return jsonify(results), 200

@app.route("/api/messages/bulk_send", methods=["POST"])
def bulk_send_messages():
    data = request.json
    candidate_ids, channel, subject, message = data.get('candidate_ids'), data.get('channel'), data.get('subject'), data.get('message')
    if not all([candidate_ids, channel, message]):
        raise ValidationError("Missing 'candidate_ids', 'channel', or 'message'.")
    if channel == 'email' and not subject:
        raise ValidationError("Missing 'subject' for email channel.")
    for hiring_service in get_hiring_service():
        result = hiring_service.send_bulk_notification(
            candidate_ids, channel, subject, message, "HR"
        )
        return jsonify({"message": f"Bulk {channel} process complete. Sent: {result['success']}, Failed: {result['failed']}."}), 200

@app.route("/api/jobs/<int:job_id>", methods=["GET", "PUT"])
def handle_single_job(job_id):
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            job = hiring_service.get_job_description(job_id)
            return jsonify({ "id": job.id, "title": job.title, "description_text": job.description_text, "created_at": job.created_at.isoformat() }), 200
        elif request.method == "PUT":
            data = request.json
            if not data or "title" not in data or "description_text" not in data: raise ValidationError("Missing 'title' or 'description_text'.")
            updated_job = hiring_service.update_job_description(job_id=job_id, title=data['title'], description_text=data['description_text'])
            return jsonify({"message": "Job updated successfully", "job_id": updated_job.id}), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)