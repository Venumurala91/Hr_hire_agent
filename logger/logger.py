# =============================================================================
# HR-HIRE-AGENT/logger/logger.py
# =============================================================================
import logging
import os
# from config.config_loader import config # <--- REMOVED direct import here

# Function to get log level, which can now be called after config is ready
def get_log_level_from_config():
    # Import config locally here to avoid circular dependency on module load
    from config.config_loader import config
    return config.LOG_LEVEL.upper()

def setup_logging():
    log_level_str = get_log_level_from_config()
    numeric_level = getattr(logging, log_level_str, None)
    if not isinstance(numeric_level, int):
        # Fallback if config isn't ready or invalid level
        numeric_level = logging.INFO
        logging.warning(f'Invalid log level: {log_level_str}. Defaulting to INFO.', exc_info=True)


    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file_path = os.path.join(log_dir, "app.log")

    # Clear any existing handlers to prevent duplicate logs if setup_logging is called multiple times
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file_path),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

# Initialize logger once
logger = setup_logging()