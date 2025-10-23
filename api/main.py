from flask import Flask, request, jsonify, send_from_directory, session
from sqlalchemy import func
import os
import uuid
from datetime import datetime
import json
from functools import wraps
import threading
import time

# Local imports
from config.config_loader import config
from database.database import get_db, init_db
from exception.custom_exception import CustomException, ValidationError
from logger.logger import logger
from model.models import Candidate, JobDescription, Interview, User
from model.status_constants import StatusConstants
from src.hiring_service import HiringService
from src.helpers import cleanup_directory

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__, static_folder=os.path.join(PROJECT_ROOT, 'frontend-react', 'dist'), static_url_path='/')
app.secret_key = config.APP_SECRET_KEY

os.makedirs(config.TEMP_BULK_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(config.RESUME_UPLOAD_FOLDER, exist_ok=True)
with app.app_context():
    init_db()
    logger.info("Application started and database initialized.")

# NEW: In-memory store for background task progress.
# For a multi-worker production setup, this should be a shared store like Redis.
tasks = {}

@app.errorhandler(CustomException)
def handle_custom_exception(error):
    logger.error(f"Application error: {error.message}", exc_info=False)
    return jsonify({"message": error.message}), error.status_code

@app.errorhandler(Exception)
def handle_general_exception(error):
    logger.critical(f"Unhandled server error: {error}", exc_info=True)
    return jsonify({"message": "An unexpected server error occurred."}), 500

def get_hiring_service():
    db_gen = get_db()
    db = next(db_gen)
    try:
        yield HiringService(db)
    finally:
        db.close()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"message": "Authentication required."}), 401
        return f(*args, **kwargs)
    return decorated_function

# NEW: Background processing function for resumes
def process_resumes_in_background(task_id, file_paths, jd_id, ats_threshold, changed_by):
    app.logger.info(f"Starting background processing for task {task_id}")
    tasks[task_id]['total'] = len(file_paths)
    
    with app.app_context():
        db_gen = get_db()
        db = next(db_gen)
        hiring_service = HiringService(db)
        
        try:
            for i, file_path in enumerate(file_paths):
                if tasks.get(task_id, {}).get('status') == 'cancelled':
                    app.logger.info(f"Task {task_id} was cancelled. Stopping processing.")
                    break
                try:
                    jd = hiring_service.get_job_description(jd_id)
                    processed_data = hiring_service._process_single_resume_task(file_path, jd.description_text)
                    
                    if processed_data.get("error"):
                        tasks[task_id]['failed'] += 1
                    else:
                        is_shortlisted = processed_data.get('ats_score', 0.0) >= ats_threshold
                        hiring_service._create_candidate_from_processed_data(processed_data, jd, changed_by, is_shortlisted)
                        tasks[task_id]['shortlisted' if is_shortlisted else 'rejected'] += 1
                except Exception as inner_exc:
                    app.logger.error(f"Error processing a single resume in task {task_id}: {inner_exc}")
                    tasks[task_id]['failed'] += 1
                
                tasks[task_id]['processed'] = i + 1
                
            db.commit()
            tasks[task_id]['status'] = 'completed'
            app.logger.info(f"Background processing for task {task_id} completed successfully.")
        except Exception as e:
            db.rollback()
            tasks[task_id]['status'] = 'failed'
            tasks[task_id]['error'] = str(e)
            app.logger.error(f"Background processing for task {task_id} failed: {e}", exc_info=True)
        finally:
            db.close()
            temp_dir = os.path.dirname(file_paths[0])
            cleanup_directory(temp_dir)
            tasks[task_id]['finished_at'] = time.time()

@app.route("/api/tasks/<task_id>/cancel", methods=["POST"])
@login_required
def cancel_task(task_id):
    if task_id in tasks:
        if tasks[task_id]['status'] == 'processing':
            tasks[task_id]['status'] = 'cancelled'
            logger.info(f"User requested cancellation for task {task_id}")
            return jsonify({"message": f"Cancellation requested for task {task_id}."}), 200
        else:
            return jsonify({"message": "Task is already completed or cancelled."}), 400
    return jsonify({"message": "Task not found."}), 404

# --- Page and Asset Serving ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    static_folder = os.path.join(PROJECT_ROOT, 'frontend-react', 'dist')
    if path != "" and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    else:
        if os.path.exists(os.path.join(static_folder, 'index.html')):
            return send_from_directory(static_folder, 'index.html')
        return "React app not built. Run 'npm run build' in frontend-react directory.", 404

@app.route('/uploads/<path:subpath>')
def serve_uploads(subpath):
    return send_from_directory(os.path.join(PROJECT_ROOT, 'uploads'), subpath)

# --- Authentication Routes ---
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email, password = data.get("email"), data.get("password")
    if not email or not password: raise ValidationError("Email and password are required.")
    
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if user and user.check_password(password):
            user.last_login = datetime.utcnow()
            db.commit()
            session['user_id'] = user.id
            logger.info(f"User {user.email} logged in successfully.")
            return jsonify({"message": "Login successful", "user": {"id": user.id, "email": user.email, "first_name": user.first_name}}), 200
        else:
            return jsonify({"message": "Invalid credentials"}), 401
    finally:
        db.close()

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logout successful"}), 200

@app.route("/api/auth/profile", methods=["GET"])
@login_required
def profile():
    user_id = session.get('user_id')
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            session.clear()
            return jsonify({"message": "User not found"}), 404
        return jsonify({"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name}), 200
    finally:
        db.close()

# --- User Management Routes ---
@app.route("/api/users", methods=["GET"])
@login_required
def get_all_users():
    db = next(get_db())
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        results = [{"id": u.id, "email": u.email, "first_name": u.first_name, "last_name": u.last_name, "last_login": u.last_login.isoformat() if u.last_login else None} for u in users]
        return jsonify(results), 200
    finally:
        db.close()

@app.route("/api/users", methods=["POST"])
@login_required
def create_user():
    data = request.json
    if not all(k in data for k in ["email", "password", "first_name", "last_name"]):
        raise ValidationError("Missing required fields.")
    db = next(get_db())
    try:
        if db.query(User).filter(User.email == data["email"]).first():
            raise ValidationError("An account with this email already exists.")
        new_user = User(email=data["email"], first_name=data["first_name"], last_name=data["last_name"])
        new_user.set_password(data["password"])
        db.add(new_user); db.commit(); db.refresh(new_user)
        return jsonify({"message": "User created successfully", "user_id": new_user.id}), 201
    finally:
        db.close()

# --- Asynchronous Task Routes ---
@app.route("/api/tasks/progress", methods=["GET"])
@login_required
def get_tasks_progress():
    cleanup_threshold = time.time() - 300 # 5 minutes
    tasks_to_delete = [tid for tid, task in tasks.items() if task.get('finished_at') and task['finished_at'] < cleanup_threshold]
    for tid in tasks_to_delete:
        del tasks[tid]
    active_tasks = {tid: task for tid, task in tasks.items() if task.get('status') == 'processing'}
    return jsonify(active_tasks)

# --- Application Routes (Protected) ---
@app.route("/api/config/statuses", methods=["GET"])
@login_required
def get_status_config():
    return jsonify(StatusConstants.get_all_configs()), 200

@app.route("/api/dashboard/stats", methods=["GET"])
@login_required
def get_dashboard_stats():
    for hiring_service in get_hiring_service():
        db = hiring_service.db
        interview_statuses = [ StatusConstants.L1_INTERVIEW_SCHEDULED_DESCR, StatusConstants.L2_INTERVIEW_SCHEDULED_DESCR, StatusConstants.HR_SCHEDULED_DESCR ]
        offer_statuses = [ StatusConstants.OFFER_LETTER_ISSUED_DESCR, StatusConstants.OFFER_ACCEPTED_DESCR ]
        total_jobs = db.query(func.count(JobDescription.id)).scalar() or 0
        total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
        candidates_interviewing = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(interview_statuses)).scalar() or 0
        offers_extended = db.query(func.count(Candidate.id)).filter(Candidate.current_status.in_(offer_statuses)).scalar() or 0
        stats = { "active_jobs": total_jobs, "total_candidates_shortlisted": total_candidates, "candidates_interviewing": candidates_interviewing, "offers_extended": offers_extended }
        return jsonify(stats), 200

@app.route("/api/candidates/distribution", methods=["GET"])
@login_required
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

@app.route("/api/jobs", methods=["GET", "POST"])
@login_required
def handle_jobs():
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            jobs = hiring_service.get_jobs()
            return jsonify([{"id": j.id, "title": j.title, "created_at": j.created_at.isoformat(), "candidate_count": len(j.candidates), "min_experience_years": j.min_experience_years} for j in jobs]), 200
        elif request.method == "POST":
            data = request.json
            if not all(k in data for k in ["title", "description_text", "location"]):
                 raise ValidationError("Missing required fields.")
            experience = data.get('min_experience_years')
            try:
                min_experience_years = int(experience) if experience else 0
            except (ValueError, TypeError):
                min_experience_years = 0
            jd = hiring_service.create_job_description(title=data["title"], description_text=data["description_text"], location=data["location"], salary_range=data.get("salary_range", ""), min_experience_years=min_experience_years)
            return jsonify({"message": "Job created successfully", "job_id": jd.id}), 201

@app.route("/api/candidates/bulk_process", methods=["POST"])
@login_required
def bulk_process_resumes_start():
    resume_files = request.files.getlist('resumes')
    jd_id = request.form.get('job_description_id')
    job_title = request.form.get('job_title', 'Unknown Job')
    ats_threshold = request.form.get('ats_threshold', type=float, default=70.0)
    
    if not resume_files or not jd_id: raise ValidationError("Missing resume files or job ID.")

    task_id = str(uuid.uuid4())
    temp_path = os.path.join(config.TEMP_BULK_UPLOAD_FOLDER, task_id)
    os.makedirs(temp_path, exist_ok=True)
    
    uploaded_paths = [os.path.join(temp_path, f.filename) for f in resume_files if f.filename]
    for i, file in enumerate(resume_files): file.save(uploaded_paths[i])

    if not uploaded_paths: raise ValidationError("No valid files were saved.")

    tasks[task_id] = {'status': 'processing', 'total': len(uploaded_paths), 'processed': 0, 'shortlisted': 0, 'rejected': 0, 'failed': 0, 'job_title': job_title, 'started_at': datetime.utcnow().isoformat()}
    
    thread = threading.Thread(target=process_resumes_in_background, args=(task_id, uploaded_paths, int(jd_id), ats_threshold, "HR"))
    thread.daemon = True
    thread.start()

    return jsonify({"message": "Resume processing started.", "task_id": task_id}), 202

@app.route("/api/jobs/<int:job_id>", methods=["GET", "PUT"])
@login_required
def handle_single_job(job_id):
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            job = hiring_service.get_job_description(job_id)
            return jsonify({ "id": job.id, "title": job.title, "description_text": job.description_text, "location": job.location, "salary_range": job.salary_range, "created_at": job.created_at.isoformat(), "min_experience_years": job.min_experience_years }), 200
        elif request.method == "PUT":
            data = request.json
            if not data or not all(k in data for k in ["title", "description_text", "location"]):
                raise ValidationError("Missing required fields.")
            
            # Safely get and convert the experience value
            experience = data.get('min_experience_years')
            try:
                min_experience_years = int(experience) if experience is not None else 0
            except (ValueError, TypeError):
                min_experience_years = 0 # Default to 0 if value is invalid

            updated_job = hiring_service.update_job_description(
                job_id=job_id, 
                title=data['title'], 
                desc=data['description_text'], 
                location=data['location'], 
                salary=data.get('salary_range', ''), 
                min_experience_years=min_experience_years  # Pass the new value
            )
            return jsonify({"message": "Job updated successfully", "job_id": updated_job.id}), 200

@app.route("/api/jobs/bulk", methods=["DELETE"])
@login_required
def bulk_delete_jobs_api():
    data = request.json; job_ids = data.get('job_ids')
    if not job_ids or not isinstance(job_ids, list): raise ValidationError("Request body must contain a list of 'job_ids'.")
    for hiring_service in get_hiring_service():
        hiring_service.bulk_delete_jobs(job_ids)
        return jsonify({"message": f"{len(job_ids)} jobs deleted successfully."}), 200

@app.route("/api/candidates", methods=["GET"])
@login_required
def get_candidates_api():
    page = request.args.get('page', 1, type=int); limit = request.args.get('limit', 10, type=int)
    status_filter = request.args.getlist('status'); job_id_filter = request.args.get('job_id', type=int)
    search_query = request.args.get('search')
    for hiring_service in get_hiring_service():
        query, total_count = hiring_service.get_candidates(status=status_filter, job_id=job_id_filter, search_query=search_query, paginated=True)
        offset = (page - 1) * limit; paginated_query = query.offset(offset).limit(limit); candidates = paginated_query.all()
        results = [{"id": c.id, "first_name": c.first_name, "last_name": c.last_name, "email": c.email, "phone_number": c.phone_number, "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "ats_score": c.ats_score} for c in candidates]
        return jsonify({"candidates": results, "total": total_count}), 200

@app.route("/api/candidates/<int:candidate_id>", methods=["GET", "DELETE"])
@login_required
def handle_candidate(candidate_id):
    for hiring_service in get_hiring_service():
        if request.method == "GET":
            c = hiring_service.get_candidate(candidate_id)
            return jsonify({ "id": c.id, "first_name": c.first_name, "last_name": c.last_name, "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), "email": c.email, "phone_number": c.phone_number, "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "ats_score": c.ats_score, "ai_analysis": json.loads(c.ai_analysis) if c.ai_analysis else {}, "status_history": [{"status_description": h.status_description, "changed_at": h.changed_at.isoformat(), "comments": h.comments, "changed_by": h.changed_by} for h in sorted(c.status_history, key=lambda x: x.changed_at, reverse=True)], "resume_path": c.resume_path }), 200
        if request.method == "DELETE":
            hiring_service.bulk_delete_candidates([candidate_id])
            return jsonify({"message": f"Candidate {candidate_id} deleted successfully."}), 200

@app.route("/api/candidates/bulk", methods=["DELETE"])
@login_required
def bulk_delete_candidates_api():
    candidate_ids = request.json.get('candidate_ids')
    if not candidate_ids or not isinstance(candidate_ids, list): raise ValidationError("Request must contain a list of 'candidate_ids'.")
    for hiring_service in get_hiring_service():
        hiring_service.bulk_delete_candidates(candidate_ids)
        return jsonify({"message": f"{len(candidate_ids)} candidates deleted."}), 200

@app.route("/api/candidates/counts", methods=["GET"])
@login_required
def get_candidate_counts():
    for hiring_service in get_hiring_service():
        tab_stages = hiring_service.status_configs['tab_status_groups']
        all_query_statuses = [status for sublist in tab_stages.values() for status in sublist]
        db_counts = dict(hiring_service.db.query(Candidate.current_status, func.count(Candidate.id)).filter(Candidate.current_status.in_(all_query_statuses)).group_by(Candidate.current_status).all())
        final_counts = {tab_key: 0 for tab_key in tab_stages.keys()}
        for tab_key, associated_statuses in tab_stages.items():
            for status in associated_statuses:
                final_counts[tab_key] += db_counts.get(status, 0)
        return jsonify(final_counts), 200

@app.route("/api/candidates/<int:candidate_id>/update_status", methods=["POST"])
@login_required
def update_candidate_status(candidate_id):
    data = request.json; new_status, comments = data.get('status'), data.get('comments', '')
    if not new_status: raise ValidationError("Missing 'status'.")
    for hiring_service in get_hiring_service():
        candidate = hiring_service.update_candidate_status(candidate_id, new_status, comments, "HR")
        return jsonify({"message": f"Candidate status updated to '{candidate.current_status}'"}), 200

@app.route("/api/candidates/<int:candidate_id>/reschedule", methods=["POST"])
@login_required
def reschedule_interview(candidate_id):
    data = request.json; comments = data.get('comments', 'No reason provided.')
    if not comments: raise ValidationError("A comment is required to reschedule.")
    for hiring_service in get_hiring_service():
        candidate = hiring_service.reschedule_interview(candidate_id, comments, "HR")
        return jsonify({"message": f"Candidate interview has been rescheduled to '{candidate.current_status}'"}), 200

@app.route("/api/candidates/<int:candidate_id>/interviews", methods=["GET", "POST"])
@login_required
def handle_interviews(candidate_id):
    db = next(get_db())
    if request.method == "GET":
        interviews = db.query(Interview).filter(Interview.candidate_id == candidate_id).order_by(Interview.round_number).all()
        results = [{"id": i.id, "round_number": i.round_number, "interviewer_name": i.interviewer_name, "interview_date": i.interview_date.isoformat() if i.interview_date else None, "score": i.score, "feedback": i.feedback, "status": i.status} for i in interviews]
        return jsonify(results), 200
    elif request.method == "POST":
        data = request.json
        if not all(k in data for k in ['round_number', 'interviewer_name', 'feedback']): raise ValidationError("Missing required fields.")
        interview_date_obj = None; date_str = data.get('interview_date')
        if date_str:
            if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
            try: interview_date_obj = datetime.fromisoformat(date_str)
            except ValueError: raise ValidationError("Invalid date format.")
        new_interview = Interview(candidate_id=candidate_id, round_number=data['round_number'], interviewer_name=data.get('interviewer_name'), interview_date=interview_date_obj, score=data.get('score'), feedback=data.get('feedback'), status="Completed")
        db.add(new_interview); db.commit()
        return jsonify({"message": "Interview feedback added successfully.", "interview_id": new_interview.id}), 201

@app.route("/api/candidates/active", methods=["GET"])
@login_required
def get_active_candidates_api():
    for hiring_service in get_hiring_service():
        candidates = hiring_service.get_active_candidates()
        results = [{"id": c.id, "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "email": c.email, "phone_number": c.phone_number} for c in candidates]
        return jsonify(results), 200

@app.route("/api/messages/bulk_send", methods=["POST"])
@login_required
def bulk_send_messages():
    data = request.json; candidate_ids, channel, subject, message = data.get('candidate_ids'), data.get('channel'), data.get('subject'), data.get('message')
    if not all([candidate_ids, channel, message]): raise ValidationError("Missing 'candidate_ids', 'channel', or 'message'.")
    if channel == 'email' and not subject: raise ValidationError("Missing 'subject' for email channel.")
    for hiring_service in get_hiring_service():
        result = hiring_service.send_bulk_notification(candidate_ids, channel, subject, message, "HR")
        return jsonify({"message": f"Bulk {channel} process complete. Sent: {result['success']}, Failed: {result['failed']}."}), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)