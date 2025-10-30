import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask import Flask, request, jsonify, send_from_directory, session
from sqlalchemy import func
from datetime import datetime
import json
from functools import wraps
import threading
import time
import uuid
from contextlib import contextmanager
from werkzeug.utils import secure_filename

# Local imports
from config.config_loader import config
from database.database import SessionLocal, init_db
from exception.custom_exception import CustomException, ValidationError, NotFoundError
from logger.logger import logger
from model.models import Candidate, JobDescription, Interview, User
from model.status_constants import StatusConstants
from src.hiring_service import HiringService
from src.helpers import cleanup_directory
from src.email_templates import EMAIL_TEMPLATES

# --- Application Setup ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__, static_folder=os.path.join(PROJECT_ROOT, 'frontend-react', 'dist'), static_url_path='/')
app.secret_key = config.APP_SECRET_KEY

# --- File Upload Security Configuration ---
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25 MB total request size limit
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}

# --- Create Upload Directories ---
os.makedirs(config.TEMP_BULK_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(config.RESUME_UPLOAD_FOLDER, exist_ok=True)
with app.app_context():
    init_db()
    logger.info("Application started and database initialized.")

# --- Thread-Safe Task Management ---
tasks = {}
task_lock = threading.Lock()

# --- Helper Functions ---
def allowed_file(filename):
    """Checks if an uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@contextmanager
def get_db_session():
    """Provides a transactional database session that is safely closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Decorators ---
def login_required(f):
    """Decorator to ensure a user is logged in before accessing a route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"message": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- Error Handlers ---
@app.errorhandler(CustomException)
def handle_custom_exception(error):
    """Handles custom application exceptions with appropriate HTTP status codes."""
    logger.error(f"Application error: {error.message}", exc_info=False)
    return jsonify({"message": error.message}), error.status_code

@app.errorhandler(404)
def handle_not_found_error(error):
    """Handles Flask's default 404 for undefined routes."""
    return jsonify({"message": "The requested API endpoint was not found."}), 404

@app.errorhandler(Exception)
def handle_general_exception(error):
    """Handles any other unhandled server exceptions to prevent crashes."""
    logger.critical(f"Unhandled server error: {error}", exc_info=True)
    return jsonify({"message": "An unexpected internal server error occurred."}), 500


def process_resumes_in_background(task_id, file_paths, jd_id, ats_threshold, changed_by, temp_dir_to_delete):
    """
    Background thread worker that orchestrates parallel resume processing
    by calling the HiringService and updating the shared task status.
    """
    app.logger.info(f"Starting background processing for task {task_id}")
    with task_lock:
        tasks[task_id]['status'] = 'processing'

    def progress_callback(result_type: str):
        """A nested function to safely update the global tasks dictionary."""
        with task_lock:
            if tasks.get(task_id):
                tasks[task_id]['processed'] += 1
                if result_type in tasks[task_id]:
                    tasks[task_id][result_type] += 1
    
    with app.app_context():
        with get_db_session() as db:
            hiring_service = HiringService(db)
            try:
                # Delegate the entire parallel processing job to the service layer
                hiring_service.bulk_process_and_shortlist_resumes(
                    resume_file_paths=file_paths,
                    jd_id=jd_id,
                    ats_threshold=ats_threshold,
                    changed_by=changed_by,
                    progress_callback=progress_callback
                )
                
                with task_lock:
                    if tasks.get(task_id) and tasks[task_id].get('status') != 'cancelled':
                        tasks[task_id]['status'] = 'completed'
                app.logger.info(f"Background processing for task {task_id} completed.")

            except Exception as e:
                with task_lock:
                    if tasks.get(task_id):
                        tasks[task_id]['status'] = 'failed'
                        tasks[task_id]['error'] = str(e)
                app.logger.error(f"Background processing for task {task_id} failed critically: {e}", exc_info=True)
            finally:

                time.sleep(3) # Give a moment for file handles to release
                db.close()
                time.sleep(1) # A small delay is still a good safety measure
                if temp_dir_to_delete:
                    cleanup_directory(temp_dir_to_delete)
                with task_lock:
                    if tasks.get(task_id):
                        tasks[task_id]['finished_at'] = time.time()

# =============================================================================
# === API ENDPOINTS ===========================================================
# =============================================================================

# --- Static File Serving ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serves the main React application and its assets."""
    static_folder = os.path.join(PROJECT_ROOT, 'frontend-react', 'dist')
    if path != "" and os.path.exists(os.path.join(static_folder, path)):
        return send_from_directory(static_folder, path)
    else:
        index_path = os.path.join(static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder, 'index.html')
        return "React app not built. Run 'npm run build' in frontend-react directory.", 404

@app.route('/uploads/<path:subpath>')
def serve_uploads(subpath):
    """Serves uploaded resume files securely."""
    return send_from_directory(os.path.join(PROJECT_ROOT, 'uploads'), subpath)

# --- Authentication Endpoints ---
@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticates a user and creates a session."""
    data = request.json
    email, password = data.get("email"), data.get("password")
    if not email or not password:
        raise ValidationError("Email and password are required.")
    
    with get_db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        if user and user.check_password(password):
            user.last_login = datetime.utcnow()
            db.commit()
            session['user_id'] = user.id
            logger.info(f"User {user.email} logged in successfully.")
            return jsonify({"message": "Login successful.", "user": {"id": user.id, "email": user.email, "first_name": user.first_name}}), 200
        else:
            return jsonify({"message": "Invalid email or password."}), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Logs out the current user by clearing the session."""
    session.clear()
    return jsonify({"message": "Logout successful."}), 200

@app.route("/api/auth/profile", methods=["GET"])
@login_required
def profile():
    """Fetches the profile of the currently logged-in user."""
    user_id = session.get('user_id')
    with get_db_session() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            session.clear() # Clean up an invalid session
            return jsonify({"message": "User not found for this session."}), 404
        return jsonify({"id": user.id, "email": user.email, "first_name": user.first_name, "last_name": user.last_name}), 200

# --- User Management Endpoints ---
@app.route("/api/users", methods=["GET", "POST"])
@login_required
def handle_users():
    """Handles creation of new users and listing all users."""
    with get_db_session() as db:
        if request.method == "GET":
            # GET /api/users - Fetches a list of all users.
            users = db.query(User).order_by(User.created_at.desc()).all()
            results = [{"id": u.id, "email": u.email, "first_name": u.first_name, "last_name": u.last_name, "last_login": u.last_login.isoformat() if u.last_login else None} for u in users]
            return jsonify(results), 200
        
        elif request.method == "POST":
            # POST /api/users - Creates a new user.
            data = request.json
            if not all(k in data for k in ["email", "password", "first_name", "last_name"]):
                raise ValidationError("Missing required fields: email, password, first_name, last_name.")
            
            if db.query(User).filter(User.email == data["email"]).first():
                return jsonify({"message": "An account with this email already exists."}), 409 # 409 Conflict
            
            new_user = User(email=data["email"], first_name=data["first_name"], last_name=data["last_name"])
            new_user.set_password(data["password"])
            db.add(new_user)
            db.commit()
            return jsonify({"message": "User created successfully.", "user_id": new_user.id}), 201

# --- Asynchronous Task Endpoints ---
@app.route("/api/tasks/progress", methods=["GET"])
@login_required
def get_tasks_progress():
    """Polls the status of active background processing tasks."""
    with task_lock:
        # Clean up old, completed tasks from memory
        cleanup_threshold = time.time() - 300 # 5 minutes
        tasks_to_delete = [tid for tid, task in tasks.items() if task.get('finished_at') and task['finished_at'] < cleanup_threshold]
        for tid in tasks_to_delete:
            del tasks[tid]
        
        # Return only tasks that are currently processing
        active_tasks = {tid: task for tid, task in tasks.items() if task.get('status') == 'processing'}
        return jsonify(active_tasks), 200

@app.route("/api/tasks/<task_id>/cancel", methods=["POST"])
@login_required
def cancel_task(task_id):
    """Requests cancellation of a running background task."""
    with task_lock:
        if task_id in tasks:
            if tasks[task_id]['status'] == 'processing':
                tasks[task_id]['status'] = 'cancelled'
                logger.info(f"User requested cancellation for task {task_id}")
                return jsonify({"message": f"Cancellation requested for task {task_id}."}), 200
            else:
                return jsonify({"message": "Task has already completed or been cancelled."}), 400 # 400 Bad Request
    return jsonify({"message": "Task not found."}), 404

# --- Application Configuration Endpoints ---
@app.route("/api/config/statuses", methods=["GET"])
@login_required
def get_status_config():
    """Provides the frontend with all status-related configurations."""
    return jsonify(StatusConstants.get_all_configs()), 200

@app.route("/api/config/templates", methods=["GET"])
@login_required
def get_email_templates():
    """Provides the frontend with all available email templates."""
    return jsonify(EMAIL_TEMPLATES), 200

# --- Dashboard & Analytics Endpoints ---
@app.route("/api/dashboard/stats", methods=["GET"])
@login_required
def get_dashboard_stats():
    """Retrieves key performance indicators for the dashboard."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
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
    """Retrieves data for the candidate distribution doughnut chart."""
    with get_db_session() as db:
        # A bit verbose, but clear. Could be simplified.
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

# --- Job Management Endpoints ---
@app.route("/api/jobs", methods=["GET", "POST"])
@login_required
def handle_jobs():
    """Handles creation of new jobs and listing all jobs."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
        if request.method == "GET":
            # GET /api/jobs - Fetches a list of all jobs.
            # NOTE: This route has a potential N+1 performance issue on `len(j.candidates)`.
            jobs = hiring_service.get_jobs()
            return jsonify([{"id": j.id, "title": j.title, "created_at": j.created_at.isoformat(), "candidate_count": len(j.candidates), "min_experience_years": j.min_experience_years} for j in jobs]), 200
        
        elif request.method == "POST":
            # POST /api/jobs - Creates a new job.
            data = request.json
            if not all(k in data for k in ["title", "description_text", "location"]):
                 raise ValidationError("Missing required fields: title, description_text, location.")
            
            min_experience_years = data.get('min_experience_years', '0')
            jd = hiring_service.create_job_description(
                title=data["title"], 
                description_text=data["description_text"], 
                location=data["location"], 
                salary_range=data.get("salary_range", ""), 
                min_experience_years=min_experience_years
            )
            db.commit()
            return jsonify({"message": "Job created successfully.", "job_id": jd.id}), 201

@app.route("/api/jobs/<int:job_id>", methods=["GET", "PUT"])
@login_required
def handle_single_job(job_id):
    """Retrieves or updates a single job posting."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
        if request.method == "GET":
            # GET /api/jobs/{id} - Fetches details for one job.
            job = hiring_service.get_job_description(job_id)
            return jsonify({ "id": job.id, "title": job.title, "description_text": job.description_text, "location": job.location, "salary_range": job.salary_range, "created_at": job.created_at.isoformat(), "min_experience_years": job.min_experience_years }), 200
        
        elif request.method == "PUT":
            # PUT /api/jobs/{id} - Updates an existing job.
            data = request.json
            if not all(k in data for k in ["title", "description_text", "location"]):
                raise ValidationError("Missing required fields: title, description_text, location.")
            
            min_experience_years = data.get('min_experience_years', '0')
            updated_job = hiring_service.update_job_description(
                job_id=job_id, 
                title=data['title'], 
                desc=data['description_text'], 
                location=data['location'], 
                salary=data.get('salary_range', ''), 
                min_experience_years=min_experience_years
            )
            db.commit()
            return jsonify({"message": "Job updated successfully.", "job_id": updated_job.id}), 200

@app.route("/api/jobs/bulk", methods=["DELETE"])
@login_required
def bulk_delete_jobs_api():
    """Deletes multiple job postings and their associated candidates in bulk."""
    data = request.json
    job_ids = data.get('job_ids')
    if not job_ids or not isinstance(job_ids, list):
        raise ValidationError("Request body must contain a list of 'job_ids'.")
    
    with get_db_session() as db:
        hiring_service = HiringService(db)
        hiring_service.bulk_delete_jobs(job_ids)
        db.commit()
        return jsonify({"message": f"{len(job_ids)} job(s) and associated candidates deleted successfully."}), 200

# --- Candidate Management Endpoints ---
@app.route("/api/candidates/bulk_process", methods=["POST"])
@login_required
def bulk_process_resumes_start():
    """Accepts resume files to start a background processing job."""
    if 'resumes' not in request.files:
        raise ValidationError("No 'resumes' file part in the request.")
    
    resume_files = request.files.getlist('resumes')
    jd_id = request.form.get('job_description_id')
    job_title = request.form.get('job_title', 'Unknown Job')
    ats_threshold = request.form.get('ats_threshold', type=float, default=70.0)
    
    if not resume_files or not jd_id: 
        raise ValidationError("Missing resume files or a selected job.")

    task_id = str(uuid.uuid4())
    # temp_path = os.path.join(config.TEMP_BULK_UPLOAD_FOLDER, task_id)
    temp_path = os.path.abspath(os.path.join(config.TEMP_BULK_UPLOAD_FOLDER, task_id))
    os.makedirs(temp_path, exist_ok=True)
    
    uploaded_paths = []
    
    """
    This loop checks if the files in resume_files have .pdf or .doc extensions,
    secures the filenames, and saves them to a temporary folder.
    
    """
    for file in resume_files:
        if file.filename == '':
            continue
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            save_path = os.path.join(temp_path, filename)
            file.save(save_path)
            uploaded_paths.append(save_path)
        else:
            logger.warning(f"Skipped disallowed file type during bulk upload: {file.filename}")

    if not uploaded_paths:
        raise ValidationError("No valid files were uploaded. Check file types are one of: " + ", ".join(ALLOWED_EXTENSIONS))

    with task_lock:
        tasks[task_id] = {'status': 'pending', 'total': len(uploaded_paths), 'processed': 0, 'shortlisted': 0, 'rejected': 0, 'failed': 0, 'job_title': job_title, 'started_at': datetime.utcnow().isoformat()}
    
    
    # thread = threading.Thread(target=process_resumes_in_background, args=(task_id, uploaded_paths, int(jd_id), ats_threshold, "HR System"))
    thread = threading.Thread(target=process_resumes_in_background, args=(task_id, uploaded_paths, int(jd_id), ats_threshold, "HR System", temp_path))
    thread.daemon = True
    thread.start()

    return jsonify({"message": "Resume processing started.", "task_id": task_id}), 202

@app.route("/api/candidates", methods=["GET"])
@login_required
def get_candidates_api():
    """Fetches a paginated and filterable list of all candidates."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status_filter = request.args.getlist('status')
    job_id_filter = request.args.get('job_id', type=int)
    search_query = request.args.get('search')
    
    with get_db_session() as db:
        hiring_service = HiringService(db)
        query, total_count = hiring_service.get_candidates(status=status_filter, job_id=job_id_filter, search_query=search_query, paginated=True)
        offset = (page - 1) * limit
        paginated_query = query.offset(offset).limit(limit)
        candidates = paginated_query.all()
        results = [{"id": c.id, "first_name": c.first_name, "last_name": c.last_name, "email": c.email, "phone_number": c.phone_number, "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "ats_score": c.ats_score} for c in candidates]
        return jsonify({"candidates": results, "total": total_count}), 200

@app.route("/api/candidates/<int:candidate_id>", methods=["GET", "DELETE"])
@login_required
def handle_candidate(candidate_id):
    """Retrieves or deletes a single candidate."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
        if request.method == "GET":
            # GET /api/candidates/{id} - Fetches detailed information for one candidate.
            c = hiring_service.get_candidate(candidate_id)
            return jsonify({ 
                "id": c.id, "first_name": c.first_name, "last_name": c.last_name, 
                "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), 
                "email": c.email, "phone_number": c.phone_number, "status": c.current_status, 
                "job_title": c.job_description.title if c.job_description else "N/A", 
                "ats_score": c.ats_score, "ai_analysis": json.loads(c.ai_analysis) if c.ai_analysis else {}, 
                "status_history": [{"status_description": h.status_description, "changed_at": h.changed_at.isoformat(), "comments": h.comments, "changed_by": h.changed_by} for h in sorted(c.status_history, key=lambda x: x.changed_at, reverse=True)], 
                "resume_path": c.resume_path 
            }), 200
        
        elif request.method == "DELETE":
            # DELETE /api/candidates/{id} - Deletes one candidate.
            hiring_service.bulk_delete_candidates([candidate_id])
            db.commit()
            return jsonify({"message": f"Candidate {candidate_id} deleted successfully."}), 200 # Can also be 204 No Content

@app.route("/api/candidates/bulk", methods=["DELETE"])
@login_required
def bulk_delete_candidates_api():
    """Deletes multiple candidates in bulk."""
    candidate_ids = request.json.get('candidate_ids')
    if not candidate_ids or not isinstance(candidate_ids, list):
        raise ValidationError("Request must contain a list of 'candidate_ids'.")
    
    with get_db_session() as db:
        hiring_service = HiringService(db)
        hiring_service.bulk_delete_candidates(candidate_ids)
        db.commit()
        return jsonify({"message": f"{len(candidate_ids)} candidates deleted successfully."}), 200

@app.route("/api/candidates/counts", methods=["GET"])
@login_required
def get_candidate_counts():
    """Gets the count of candidates for each major pipeline stage (for UI tabs)."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
        tab_stages = hiring_service.status_configs['tab_status_groups']
        all_query_statuses = [status for sublist in tab_stages.values() for status in sublist]
        db_counts = dict(db.query(Candidate.current_status, func.count(Candidate.id)).filter(Candidate.current_status.in_(all_query_statuses)).group_by(Candidate.current_status).all())
        final_counts = {tab_key: 0 for tab_key in tab_stages.keys()}
        for tab_key, associated_statuses in tab_stages.items():
            for status in associated_statuses:
                final_counts[tab_key] += db_counts.get(status, 0)
        return jsonify(final_counts), 200

@app.route("/api/candidates/<int:candidate_id>/update_status", methods=["POST"])
@login_required
def update_candidate_status(candidate_id):
    """Updates the status of a single candidate."""
    data = request.json
    new_status, comments = data.get('status'), data.get('comments', '')
    if not new_status:
        raise ValidationError("A 'status' must be provided.")
    
    with get_db_session() as db:
        hiring_service = HiringService(db)
        # NOTE: 'changed_by' is hardcoded.
        candidate = hiring_service.update_candidate_status(candidate_id, new_status, comments, "HR")
        db.commit()
        return jsonify({"message": f"Candidate status updated to '{candidate.current_status}'."}), 200

@app.route("/api/candidates/<int:candidate_id>/reschedule", methods=["POST"])
@login_required
def reschedule_interview(candidate_id):
    """Reschedules an interview for a candidate."""
    comments = request.json.get('comments')
    if not comments:
        raise ValidationError("A comment/reason is required to reschedule.")
        
    with get_db_session() as db:
        hiring_service = HiringService(db)
        # NOTE: 'changed_by' is hardcoded.
        candidate = hiring_service.reschedule_interview(candidate_id, comments, "HR")
        db.commit()
        return jsonify({"message": f"Candidate interview has been marked for rescheduling to '{candidate.current_status}'."}), 200

@app.route("/api/candidates/<int:candidate_id>/interviews", methods=["GET", "POST"])
@login_required
def handle_interviews(candidate_id):
    """Fetches interview history or adds new interview feedback for a candidate."""
    with get_db_session() as db:
        if request.method == "GET":
            interviews = db.query(Interview).filter(Interview.candidate_id == candidate_id).order_by(Interview.round_number).all()
            results = [{"id": i.id, "round_number": i.round_number, "interviewer_name": i.interviewer_name, "interview_date": i.interview_date.isoformat() if i.interview_date else None, "score": i.score, "feedback": i.feedback, "status": i.status} for i in interviews]
            return jsonify(results), 200
        
        elif request.method == "POST":
            data = request.json
            if not all(k in data for k in ['round_number', 'interviewer_name', 'feedback']):
                raise ValidationError("Missing required fields: round_number, interviewer_name, feedback.")
            
            interview_date_obj = None
            date_str = data.get('interview_date')
            if date_str:
                if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
                try: 
                    interview_date_obj = datetime.fromisoformat(date_str)
                except ValueError: 
                    raise ValidationError("Invalid date format. Please use ISO 8601 format.")
            
            new_interview = Interview(
                candidate_id=candidate_id, 
                round_number=data['round_number'], 
                interviewer_name=data.get('interviewer_name'), 
                interview_date=interview_date_obj, 
                score=data.get('score'), 
                feedback=data.get('feedback'), 
                status="Completed"
            )
            db.add(new_interview)
            db.commit()
            return jsonify({"message": "Interview feedback added successfully.", "interview_id": new_interview.id}), 201

@app.route("/api/candidates/active", methods=["GET"])
@login_required
def get_active_candidates_api():
    """Fetches a list of candidates with contact info for the 'Messages' page."""
    with get_db_session() as db:
        hiring_service = HiringService(db)
        candidates = hiring_service.get_active_candidates()
        results = [{"id": c.id, "name": f"{c.first_name or ''} {c.last_name or ''}".strip(), "status": c.current_status, "job_title": c.job_description.title if c.job_description else "N/A", "email": c.email, "phone_number": c.phone_number} for c in candidates]
        return jsonify(results), 200

@app.route("/api/messages/bulk_send", methods=["POST"])
@login_required
def bulk_send_messages():
    """Sends a bulk message (Email or WhatsApp) to a list of candidates."""
    data = request.json
    candidate_ids = data.get('candidate_ids')
    channel = data.get('channel')
    subject = data.get('subject')
    message = data.get('message')

    if not all([candidate_ids, channel, message]):
        raise ValidationError("Missing required fields: 'candidate_ids', 'channel', or 'message'.")
    if channel == 'email' and not subject:
        raise ValidationError("A 'subject' is required for the email channel.")
        
    with get_db_session() as db:
        hiring_service = HiringService(db)
        # NOTE: 'changed_by' is hardcoded.
        result = hiring_service.send_bulk_notification(candidate_ids, channel, subject, message, "HR")
        db.commit()
        return jsonify({"message": f"Bulk {channel} process complete. Sent: {result['success']}, Failed: {result['failed']}."}), 200

# --- Main Execution ---
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)