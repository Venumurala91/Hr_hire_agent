Of course. A great README is essential for any project. Here is a comprehensive and attractive README file written in Markdown. It's designed to be clear, easy to follow, and provides anyone who clones your repository with all the information they need to get started.

You can copy and paste this directly into your `README.md` file.

---

# 🚀 HR Hire Agent

**HR Hire Agent** is a modern, full-stack web application designed to automate and streamline the recruitment process. Powered by a Python backend with Google Gemini integration and a responsive React frontend, this tool helps HR professionals manage the entire hiring pipeline, from automated resume screening to candidate onboarding.

 <!-- It's a good practice to add a screenshot of your app here -->

---

## ✨ Key Features

*   **🤖 AI-Powered Resume Screening:** Automatically parse resumes, extract key information (skills, experience, contact info), and calculate an ATS (Applicant Tracking System) score against a job description using Google's Gemini AI.
*   **📂 Bulk Resume Upload:** Process dozens of resumes simultaneously for a specific job posting, instantly shortlisting or rejecting candidates based on a configurable ATS threshold.
*   **-a-visu-pipeline Visual Hiring Pipeline:** Track candidates through customizable stages of the hiring process (Screening, L1/L2 Interviews, Document Verification, Offer, Onboarding) with a clear, visual progress bar.
*   **📊 Interactive Dashboard:** Get a high-level overview of your recruitment efforts with key metrics, active job postings, and a chart showing candidate status distribution.
*   **✉️ Integrated Communication:** Send bulk emails and WhatsApp messages to candidates directly from the application using pre-defined, customizable templates.
*   **📋 Detailed Candidate Profiles:** Dive deep into each candidate's profile with their AI analysis summary, matched skills, interview feedback logs, and a complete activity timeline.
*   **🐳 Fully Dockerized:** The entire application stack (React Frontend, Python Backend, MySQL Database) is containerized with Docker, allowing for a one-command setup and consistent deployment.

---

## 🛠️ Tech Stack

| Component         | Technology                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Frontend**      | ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![Chart.js](https://img.shields.io/badge/-Chart.js-FF6384?logo=chart.js&logoColor=white) |
| **Backend**       | ![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/-Flask-000000?logo=flask&logoColor=white) ![SQLAlchemy](https://img.shields.io/badge/-SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white) |
| **Database**      | ![MySQL](https://img.shields.io/badge/-MySQL-4479A1?logo=mysql&logoColor=white)                             |
| **AI & NLP**      | ![Google Gemini](https://img.shields.io/badge/-Google_Gemini-8E75B2?logo=google&logoColor=white) `pyresparser` |
| **Communication** | ![Twilio](https://img.shields.io/badge/-Twilio-F22F46?logo=twilio&logoColor=white) (for WhatsApp)             |
| **Deployment**    | ![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/-Nginx-269539?logo=nginx&logoColor=white) `gunicorn` |

---

## ⚙️ Getting Started: Setup & Installation

Follow these steps to get the HR Hire Agent running on your local machine using Docker.

### Prerequisites

*   [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) must be installed on your system.
*   You need API keys for **Google Gemini** and **Twilio**.
*   You need SMTP credentials for sending emails (e.g., a Gmail [App Password](https://support.google.com/accounts/answer/185833)).

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/hr-hire-agent.git
cd hr-hire-agent
```

### Step 2: Configure Environment Variables

*   Create a file named `.env` in the root of the project directory by copying the example:
    ```bash
    # (On Windows Command Prompt)
    copy .env.example .env
    # (On Linux/macOS/Git Bash)
    cp .env.example .env
    ```
*   Open the `.env` file and fill in your secret keys and credentials. **This is the most important step.**

    ```env
    # .env

    # --- IMPORTANT: Change this for Docker ---
    # Use 'db' as the hostname to connect to the Dockerized MySQL service
    DATABASE_URL="mysql+pymysql://root:YourRootPassword@db:3306/ats"

    # --- API Keys ---
    GEMINI_API_KEY="your_google_gemini_api_key"
    TWILIO_ACCOUNT_SID="your_twilio_account_sid"
    TWILIO_AUTH_TOKEN="your_twilio_auth_token"
    TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886" # Your Twilio WhatsApp number

    # --- Email (SMTP) Settings ---
    SMTP_SERVER="smtp.gmail.com"
    SMTP_PORT=587
    SMTP_SENDER_EMAIL="your-email@gmail.com"
    SMTP_USERNAME="your-email@gmail.com"
    SMTP_PASSWORD="your_16_character_gmail_app_password"
    HR_RECIPIENT_EMAIL="your-hr-team-email@example.com"
    ```

### Step 3: Build and Run with Docker Compose

*   From the root of the project directory, run the following command. This will build the frontend and backend images, pull the MySQL image, and start all three containers.

    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces a rebuild of your images if you've made code changes.
    *   `-d`: Runs the containers in detached mode (in the background).

### Step 4: Access the Application

*   Once the containers are running, open your web browser and navigate to:
    **`http://localhost`**

*   The application should be fully functional!

---

## 🐳 Docker Usage

Here are the most common Docker commands for managing the application:

*   **Start the application:**
    ```bash
    docker-compose up -d
    ```

*   **Stop the application:**
    ```bash
    docker-compose down
    ```

*   **View live logs for the backend:**
    ```bash
    docker-compose logs -f backend
    ```

*   **View live logs for the frontend (Nginx):**
    ```bash
    docker-compose logs -f frontend
    ```

*   **Force a rebuild of all images:**
    ```bash
    docker-compose up --build -d
    ```