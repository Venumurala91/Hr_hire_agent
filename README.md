# =============================================================================
# HR-HIRE-AGENT/README.md
# =============================================================================
# HR-HIRE-AGENT

This project implements an end-to-end HR Hire Workflow using Python Flask, MySQL, and SQLAlchemy, enhanced with an ATS scoring system powered by Google Gemini and WhatsApp notifications for candidates.

## Features

*   **Candidate ATS Scoring:** Leverage Google Gemini for intelligent resume screening and scoring against job descriptions.
*   **Multi-Stage Interview Process:** Manage candidates through various interview rounds.
*   **HR Discussion & Verification:** Support for HR-specific steps in the hiring pipeline.
*   **Offer Management:** Handle offer decisions (Accept/Reject/Hold).
*   **Automated WhatsApp Notifications:** Keep candidates informed at key stages of the process.
*   **Detailed Status Tracking:** Continuous tracking and updates of candidate status.

## Technologies Used

*   **Backend:** Python 3, Flask
*   **Database:** MySQL (via SQLAlchemy ORM)
*   **AI/LLM:** Google Gemini
*   **Messaging:** Twilio (for WhatsApp SMS)
*   **Configuration:** YAML

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd HR-HIRE-AGENT
    ```

2.  **Create a Virtual Environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables & `config.yaml`:**
    *   Create a `.env` file in the root directory and add your sensitive credentials:
        ```
        GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
        TWILIO_ACCOUNT_SID="YOUR_TWILIO_ACCOUNT_SID"
        TWILIO_AUTH_TOKEN="YOUR_TWILIO_AUTH_TOKEN"
        TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886" # Your Twilio Sandbox or approved number
        DATABASE_URL="mysql+pymysql://user:password@host:port/database_name"
        # For local development: DATABASE_URL="mysql+pymysql://root:password@localhost:3306/hr_hire_db"
        FLASK_APP=api/main.py
        FLASK_ENV=development
        ```
    *   Update `config/config.yaml` with non-sensitive configurations or ensure it points to environment variables where appropriate. A template is provided in `config/config.yaml`.

5.  **Database Setup:**
    *   Ensure your MySQL server is running.
    *   Create the database specified in `DATABASE_URL` (e.g., `CREATE DATABASE hr_hire_db;`).
    *   The application will automatically create tables based on `model/models.py` when it first runs or on a migration command (we'll implement basic table creation for now).

6.  **Run the Application:**
    ```bash
    flask run
    ```
    The API will typically run on `http://127.0.0.1:5000`.

## API Endpoints (Examples)

*   `POST /candidates`: Upload resume and JD, trigger ATS scoring.
*   `GET /candidates/<id>`: Get candidate details.
*   `POST /candidates/<id>/interview/1`: Record 1st round interview details.
*   `POST /candidates/<id>/offer`: Make an offer decision.
*   ...and more, following the HR Hire Workflow.

---


Okay, here's the application flow in short, concise lines, incorporating all the recent changes:

---

### **HR Hire Agent Application Flow (Simplified)**

1.  **HR Defines Job:** HR creates a `Job Description (JD)` in the app.
2.  **Candidates Apply (Bulk or Single):**
    *   HR uploads multiple resume files (`/candidates/bulk`) OR a single resume (`/candidates`).
3.  **Resume Processing & AI Scoring:**
    *   For each resume:
        *   `pyresparser` extracts key facts (skills, experience).
        *   `Google Gemini (AI)` uses these facts + raw resume text + JD to calculate an `ATS Score` (e.g., 85/100).
        *   **Crucial:** All these steps happen **in parallel** for bulk uploads, making it fast.
4.  **Shortlisting Decision:**
    *   The `ATS Score` is compared to a **pre-set `ATS Threshold`** (e.g., 70%).
    *   If score >= threshold, candidate is `Shortlisted`.
    *   If score < threshold, candidate is `Discarded`.
5.  **WhatsApp Notifications (for ALL):**
    *   **Every candidate** gets a WhatsApp SMS:
        *   Shortlisted candidates get a "Congratulations! You're in!" message with their score.
        *   Discarded candidates get a "Thanks, but not this time" message with their score.
    *   These messages are sent **in parallel**.
6.  **Database Storage (Only Shortlisted):**
    *   **Only `Shortlisted` candidates** and their initial `Status History` are saved to the MySQL database.
    *   This saving happens in **one big batch** for efficiency.
7.  **Ongoing Workflow & Status Tracking:**
    *   HR uses the app to manage `Interviews` (L1, L2), `HR Discussions`, `Verifications` (BGV), and `Offer Decisions` (Accept/Reject/Hold).
    *   **Every single step** automatically updates the candidate's `Current Status` and creates a detailed `Status History` entry in the database.
8.  **Final Steps:** `Onboarding` and `Joining` finalize the process, with automatic status updates and WhatsApp messages.

---

**In essence:** HR defines the job, candidates apply. The system intelligently screens resumes fast using AI and parallel processing, communicates with ALL candidates via WhatsApp, and meticulously tracks the full journey of ONLY the shortlisted candidates, logging every step.