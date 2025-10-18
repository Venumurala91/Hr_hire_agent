HR-HIRE-AGENT/
├── 📂 api/
│   └── 📄 main.py               # Flask API server: Defines all backend routes and logic.
├── 📂 config/
│   ├── 📄 config_loader.py       # Loads all configuration from YAML and environment variables.
│   └── 📄 config.yaml           # Main configuration for application settings (non-secret).
├── 📂 database/
│   └── 📄 database.py           # Handles database connection (SQLAlchemy) and session management.
├── 📂 frontend-react/
│   ├── 📂 src/
│   │   ├── 📂 components/        # Reusable React UI pieces (Sidebar, Modals, etc.).
│   │   ├── 📂 pages/             # Main React page components (Dashboard, Candidates, etc.).
│   │   ├── 📄 App.jsx             # Core frontend application component and routing logic.
│   │   ├── 📄 App.css             # Global stylesheet for the entire frontend.
│   │   └── 📄 main.jsx             # Entry point for the React application.
│   ├── 📄 Dockerfile.frontend   # Instructions to build the production frontend (Nginx) image.
│   └── 📄 nginx.conf            # Nginx configuration for serving the React app and proxying API calls.
├── 📂 model/
│   ├── 📄 models.py              # Defines all database tables as Python classes (SQLAlchemy ORM).
│   └── 📄 status_constants.py   # Central rulebook for all candidate status codes and descriptions.
├── 📂 prompt/
│   └── 📄 prompt_library.py     # Stores and formats the text prompts sent to the AI (Google Gemini).
├── 📂 src/
│   ├── 📄 hiring_service.py     # Core business logic for all hiring operations (CRUD, etc.).
│   ├── 📄 ats_service.py          # Handles communication with the AI for ATS scoring and analysis.
│   ├── 📄 notification_service.py # Manages sending email notifications via SMTP.
│   └── 📄 whatsapp_service.py   # Manages sending WhatsApp messages via Twilio.
├── 📄 .env                      # **SECRET**: Stores all API keys, database URLs, and passwords.
├── 📄 requirements.txt          # Lists all Python packages required for the backend.
├── 📄 Dockerfile                # Instructions to build the production backend (Python/Gunicorn) image.
└── 📄 docker-compose.yml        # **KEY FILE**: Defines and orchestrates all Docker services (frontend, backend, db).



