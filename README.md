Of course. Your existing README is good, but it's now outdated because of the major frontend upgrade to React.

A great README for this project needs to clearly explain the modern, decoupled architecture and provide separate, easy-to-follow instructions for setting up both the backend and the frontend.

Here is a completely rewritten, professional `README.md` file that reflects your current project structure. It's designed to be clear and comprehensive for any new developer visiting your repository.

---

# HR Hire Agent

An intelligent, end-to-end hiring platform designed to streamline the recruitment process. This application leverages AI for automated resume screening and provides a modern, interactive user interface for HR professionals to manage the entire hiring pipeline.

The system is built with a modern decoupled architecture, featuring a powerful **Python (Flask) backend API** and a dynamic **React single-page application (SPA)** frontend.

## 📸 Screenshots

*(It is highly recommended to replace these placeholders with actual screenshots of your application)*

| Dashboard View | Candidates View |
| :---: | :---: |
| *(Your Dashboard Screenshot Here)* | *(Your Candidates Screenshot Here)* |

| Messages View | Candidate Profile Modal |
| :---: | :---: |
| *(Your Messages Screenshot Here)* | *(Your Profile Modal Screenshot Here)* |

## ✨ Core Features

*   **AI-Powered Resume Screening:** Utilizes Google Gemini to intelligently score resumes against job descriptions, automatically shortlisting or declining candidates.
*   **Modern & Responsive UI:** A fast, user-friendly single-page application built with React for a seamless experience.
*   **Interactive Dashboard:** At-a-glance view of key hiring metrics, active jobs, and candidate pipeline distribution with dynamic charts.
*   **Full Candidate Lifecycle Management:** Track candidates from initial application through multiple interview stages, offers, and onboarding.
*   **Bulk Actions:** Efficiently upload resumes in bulk, and manage multiple candidates or jobs at once.
*   **Multi-Channel Communication:** Send targeted bulk messages to candidates via Email or WhatsApp using customizable templates.
*   **Detailed Status History:** Maintains an auditable log of every status change for each candidate.

## 💻 Technology Stack

#### Backend
*   **Framework:** Python 3, Flask
*   **Database:** MySQL
*   **ORM:** SQLAlchemy
*   **AI/LLM:** Google Gemini
*   **Messaging:** Twilio API for WhatsApp
*   **Configuration:** YAML, python-dotenv

#### Frontend
*   **Library:** React
*   **Build Tool:** Vite
*   **Language:** JavaScript (ES6+)
*   **Charting:** Chart.js
*   **Styling:** Plain CSS3 with Custom Properties

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing.

### Prerequisites

You will need the following software installed on your system:
*   Python (3.8 or newer)
*   Node.js (v16 or newer) and npm
*   A running MySQL server

### 1. Backend Setup

First, let's set up and run the Python Flask server.

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd HR-HIRE-AGENT
    ```

2.  **Create and Activate a Python Virtual Environment:**
    ```bash
    python3 -m venv env
    source env/bin/activate  # On Windows: env\Scripts\activate
    ```

3.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    Create a file named `.env` in the project's root directory. Copy the contents of `.env.example` (if provided) or use the template below and fill in your actual credentials.

    ```env
    # Flask Settings
    FLASK_APP=api/main.py
    FLASK_ENV=development
    APP_SECRET_KEY="a_strong_random_secret_key"

    # Database URL (ensure your MySQL user, password, and DB name are correct)
    DATABASE_URL="mysql+pymysql://root:your_password@localhost:3306/hr_agent_db"

    # Google Gemini API Key
    GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"

    # Twilio Credentials for WhatsApp
    TWILIO_ACCOUNT_SID="YOUR_TWILIO_ACCOUNT_SID"
    TWILIO_AUTH_TOKEN="YOUR_TWILIO_AUTH_TOKEN"
    TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886" # Your Twilio number
    ```

5.  **Set Up the Database:**
    *   Log in to your MySQL server.
    *   Create the database you specified in `DATABASE_URL`.
        ```sql
        CREATE DATABASE hr_agent_db;
        ```
    *   The Flask application will automatically create the necessary tables on its first run.

### 2. Frontend Setup

Next, let's set up the React development server in a **new terminal window**.

1.  **Navigate to the Frontend Directory:**
    ```bash
    cd frontend-react
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

## 🏃‍♂️ Running the Application

To run the application, you need to have **two terminals** open simultaneously: one for the backend and one for the frontend.

**➡️ In Terminal 1 (Backend):**
Make sure you are in the project's root directory (`HR-HIRE-AGENT/`) and your Python virtual environment is active.

```bash
flask run
```
This will start the Flask API server, typically on `http://127.0.0.1:5000`.

**➡️ In Terminal 2 (Frontend):**
Make sure you are in the `frontend-react/` directory.

```bash
npm run dev
```
This will start the Vite development server, typically on `http://localhost:5173`.

**You're all set! Open your web browser and navigate to the frontend URL (e.g., `http://localhost:5173`) to use the application.** The React app is configured to automatically proxy API requests to your running Flask backend.

---

### Application Flow (Simplified)

1.  **HR Defines Job:** HR creates a `Job Description (JD)` in the app.
2.  **Candidates Apply (Bulk Upload):** HR uploads multiple resume files for a specific job.
3.  **Resume Processing & AI Scoring:**
    *   For each resume, `Google Gemini (AI)` calculates an `ATS Score` against the JD.
    *   This processing happens in parallel for speed.
4.  **Shortlisting Decision:**
    *   If a candidate's score is above a pre-set threshold, they are marked `ATS Shortlisted`.
    *   Otherwise, they are marked `Resume declined`.
5.  **Database Storage:** Shortlisted candidates and their details are saved to the MySQL database.
6.  **Ongoing Workflow:**
    *   HR uses the app to manage `Interviews`, `Offers`, and other stages.
    *   Every status change is logged in the `Status History`.
7.  **Communication:** HR can send bulk emails or WhatsApp messages to candidates at any stage.