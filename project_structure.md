HR-HIRE-AGENT/
├── 📂 .ven/                     # (Generated) Your Python virtual environment.
├── 📂 api/
│   ├── 📄 __init__.py          # ✅ Initializes the Flask application using the App Factory pattern.
│   └── 📄 main.py               # ✅ Defines all API endpoints as a Flask Blueprint.
│
├── 📂 config/
│   ├── 📄 __init__.py
│   ├── 📄 config_loader.py       # ✅ Loads settings from .env and config.yaml.
│   └── 📄 config.yaml           # ✅ Main non-secret application settings.
│
├── 📂 database/
│   ├── 📄 __init__.py
│   └── 📄 database.py           # ✅ Handles the database connection using SQLAlchemy.
│
├── 📂 env/                       # (Generated) Alternative Python virtual environment folder.
│
├── 📂 exception/
│   ├── 📄 __init__.py
│   └── 📄 custom_exception.py   # ✅ Defines custom Python exceptions.
│
├── 📂 frontend-react/
│   ├── 📂 public/
│   │   ├── 📄 background-globe.png
│   │   ├── 📄 favicon.ico
│   │   ├── 📄 handshake.png
│   │   ├── 📄 logo-full.png
│   │   └── 📄 logo-icon.png
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📄 ActivityTimeline.jsx
│   │   │   ├── 📄 InterviewLog.jsx
│   │   │   ├── 📄 KpiCard.jsx
│   │   │   ├── 📄 Modal.jsx
│   │   │   ├── 📄 Pagination.jsx
│   │   │   ├── 📄 ProcessingWidget.jsx # 🗑️ TO BE DELETED: This is a leftover file from the removed background processing feature.
│   │   │   ├── 📄 Sidebar.jsx
│   │   │   └── 📄 StageTracker.jsx
│   │   ├── 📂 pages/
│   │   │   ├── 📄 AdminPage.jsx
│   │   │   ├── 📄 CandidateDetailPage.jsx
│   │   │   ├── 📄 CandidatesPage.jsx
│   │   │   ├── 📄 DashboardPage.jsx
│   │   │   ├── 📄 LoginPage.jsx
│   │   │   └── 📄 MessagesPage.jsx
│   │   ├── 📄 App.css
│   │   ├── 📄 App.jsx
│   │   └── 📄 main.jsx
│   ├── 📄 Dockerfile.frontend
│   ├── 📄 index.html
│   ├── 📄 nginx.conf
│   ├── 📄 package.json
│   ├── 📄 postcss.config.js
│   ├── 📄 tailwind.config.js
│   └── 📄 vite.config.js
│
├── 📂 logger/
│   ├── 📄 __init__.py
│   └── 📄 logger.py
│
├── 📂 logs/
│   └── (Generated log files)
│
├── 📂 model/
│   ├── 📄 models.py
│   └── 📄 status_constants.py
│
├── 📂 project_architecture/
│
├── 📂 promt/ (prompt)
│   └── 📄 prompt_library.py
│
├── 📂 src/ (Backend Logic)
│   ├── 📄 __init__.py
│   ├── 📄 ats_service.py
│   ├── 📄 email_templates.py
│   ├── 📄 helpers.py
│   ├── 📄 hiring_service.py
│   ├── 📄 notification_service.py
│   └── 📄 whatsapp_service.py
│
├── 📂 uploads/
│   └── (Runtime generated files)
│
├── 📄 .dockerignore
├── 📄 .env
├── 📄 .gitignore
├── 📄 create_first_user.py      # ✅ A utility script to create the initial admin user.
├── 📄 docker-compose.yml
├── 📄 Dockerfile
├── 📄 project_structure.md
└── 📄 requirements.txt