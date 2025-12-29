# 🚀 HR Hire Agent

**HR Hire Agent** is a modern, full-stack web application designed to automate and streamline the recruitment process. Powered by a Python backend with Google Gemini integration and a responsive React frontend, this tool helps HR professionals manage the entire hiring pipeline, from automated resume screening to candidate onboarding.

---

## ✨ Key Features

*   **🤖 AI-Powered Resume Screening:** Automatically parse resumes, extract key information (skills, experience, contact info), and calculate an ATS (Applicant Tracking System) score against a job description using Google's Gemini AI.
*   **📂 Bulk Resume Upload:** Process dozens of resumes simultaneously for a specific job posting, instantly shortlisting or rejecting candidates based on a configurable ATS threshold.
*   **🪜 Visual Hiring Pipeline:** Track candidates through customizable stages of the hiring process (Screening, L1/L2 Interviews, Document Verification, Offer, Onboarding) with a clear, visual progress bar.
*   **📊 Interactive Dashboard:** Get a high-level overview of your recruitment efforts with key metrics, active job postings, and a chart showing candidate status distribution.
*   **✉️ Integrated Communication:** Send bulk emails and WhatsApp messages to candidates directly from the application using pre-defined, customizable templates.
*   **📋 Detailed Candidate Profiles:** Dive deep into each candidate's profile with their AI analysis summary, matched skills, interview feedback logs, and a complete activity timeline.
*   **🐳 Flexible Deployment:** Run easily with Docker for a one-command setup, or configure manually for local development.

---

## 🛠️ Tech Stack

| Component         | Technology                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Frontend**      | ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![Chart.js](https://img.shields.io/badge/-Chart.js-FF6384?logo=chart.js&logoColor=white) |
| **Backend**       | ![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/-Flask-000000?logo=flask&logoColor=white) ![SQLAlchemy](https://img.shields.io/badge/-SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white) |
| **Database**      | ![MySQL](https://img.shields.io/badge/-MySQL-4479A1?logo=mysql&logoColor=white)                             |
| **AI & NLP**      | ![Google Gemini](https://img.shields.io/badge/-Google_Gemini-8E75B2?logo=google&logoColor=white) `pyresparser` `spacy` |
| **Communication** | ![Twilio](https://img.shields.io/badge/-Twilio-F22F46?logo=twilio&logoColor=white) (for WhatsApp)             |

---

## ⚙️ Installation & Setup

You can set up the project in two ways:
1.  **Docker (Recommended):** Easiest for running the app quickly.
2.  **Manual Setup:** Best for development and debugging.

### Prerequisites (For both methods)
*   **Google Gemini API Key**: [Get it here](https://aistudio.google.com/app/apikey)
*   **Twilio Account**: (Optional) For WhatsApp features.
*   **SMTP Credentials**: (Optional) For sending emails (e.g., Gmail App Password).

---

### Option 1: 🐳 Docker Setup (Recommended)

**Prerequisite:** Install [Docker Desktop](https://www.docker.com/get-started).

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/hr-hire-agent.git
    cd hr-hire-agent
    ```

2.  **Configure Environment:**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   **Edit `.env`:** Fill in your API keys.
    *   **IMPORTANT:** For Docker, ensure your `DATABASE_URL` uses the hostname `db`:
        ```env
        DATABASE_URL="mysql+pymysql://root:YourRootPassword@db:3306/ats"
        ```

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    *   This starts the Backend, Frontend, and MySQL database automatically.

4.  **Access the App:** Open **`http://localhost`** in your browser.

---

### Option 2: 💻 Manual Setup (Without Docker)

Use this method if you want to run the backend and frontend locally for development.

#### Prerequisites
*   **Python 3.11+**
*   **Node.js 18+**
*   **MySQL Server** running locally.

#### 1. Database Setup
1.  Log in to your local MySQL:
    ```bash
    mysql -u root -p
    ```
2.  Create the database:
    ```sql
    CREATE DATABASE ats;
    ```

#### 2. Backend Setup
1.  Navigate to the root directory.
2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Download Required NLP Models (Crucial Step):**
    If you skip this, resume parsing will fail with 500 errors.
    ```bash
    python -m nltk.downloader stopwords
    python -m spacy download en_core_web_sm
    ```
5.  **Configure `.env`:**
    *   Copy `.env.example` to `.env`.
    *   **IMPORTANT:** Change `DATABASE_URL` to point to `localhost` instead of `db`:
        ```env
        DATABASE_URL="mysql+pymysql://root:YourLocalConfiguredPassword@localhost:3306/ats"
        ```
6.  **Run the Backend:**
    ```bash
    # Make sure venv is active
    python -m api.main
    # OR
    flask run --host=0.0.0.0 --port=5000
    ```

#### 3. Frontend Setup
1.  Open a new terminal and navigate to the frontend folder:
    ```bash
    cd frontend-react
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run the Frontend:**
    ```bash
    npm run dev
    ```
4.  **Access the App:** Open **`http://localhost:5173`** (or the port shown in your terminal).

---

## 🔐 Authentication & User Setup

Before you can use the application, you need to create an initial admin user.

### 1. Create the First User (Admin)
The application comes with a built-in script to set up your first user account securely.

1.  Open your terminal in the project root.
2.  Ensure your virtual environment is active (for Manual Setup) or attach to the backend container (for Docker).
    *   **Manual:** `python create_first_user.py`
    *   **Docker:** `docker-compose exec backend python create_first_user.py`
3.  Follow the prompts to enter:
    *   First Name
    *   Last Name
    *   Email (This will be your **Login ID**)
    *   Password

### 2. Logging In
1.  Go to the login page on the frontend (e.g., `http://localhost`).
2.  Enter the **Email** and **Password** you just created.
3.  Click **Login** to access the dashboard.

### 3. Creating More Users
Once logged in, you can create additional users for your team via the API:
*   **Endpoint:** `POST /api/users`
*   **Payload:**
    ```json
    {
      "email": "new.hr@example.com",
      "password": "securepassword123",
      "first_name": "Jane",
      "last_name": "Doe"
    }
    ```

---

## ❓ Troubleshooting & Common Mistakes

Here are the most common issues you might face during setup:

### 1. Database Connection Failed
*   **Error:** `sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) ... Can't connect to MySQL server`
*   **Cause:** Incorrect `DATABASE_URL` host.
*   **Solution:**
    *   **Docker:** Host MUST be `db` (e.g., `@db:3306/ats`).
    *   **Manual:** Host MUST be `localhost` (e.g., `@localhost:3306/ats`).
    *   Ensure your MySQL server is actually running.

### 2. Resume Parsing Fails (500 Internal Server Error)
*   **Error:** Errors related to `spacy` or `nltk` data missing.
*   **Cause:** You skipped the model download step in Manual Setup.
*   **Solution:** Run the following commands in your active virtual environment:
    ```bash
    python -m nltk.downloader stopwords
    python -m spacy download en_core_web_sm
    ```

### 3. API Keys Issues
*   **Error:** `GenerativeAIError` or Twilio authentication errors.
*   **Solution:** Double-check your `.env` file. Ensure there are no extra spaces or quotes around the keys if not needed. Restart the backend after changing `.env`.

### 4. CORS Errors
*   **Error:** Frontend cannot fetch data from Backend (`Network Error`).
*   **Solution:** Ensure the Backend is running on port `5000`. If you changed the port, update the API requests in the frontend code.

---