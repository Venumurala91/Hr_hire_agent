# =============================================================================
# HR-HIRE-AGENT/src/helpers.py
# =============================================================================
import os
import secrets
import shutil
from werkzeug.utils import secure_filename
from config.config_loader import config
from logger.logger import logger
import json

# Libraries for resume parsing
import PyPDF2
import docx
from pyresparser import ResumeParser

# --- CRITICAL: NLTK/SpaCy Initialization ---
import nltk
import spacy

def _initialize_nlp_resources():
    """Ensures NLTK stopwords and SpaCy model are downloaded and loaded."""
    # NLTK Stopwords
    try:
        nltk.data.find('corpora/stopwords')
        logger.info("NLTK 'stopwords' already downloaded.")
    except LookupError:
        logger.info("NLTK 'stopwords' not found, downloading...")
        nltk.download('stopwords')
        logger.info("NLTK 'stopwords' downloaded successfully.")

    # SpaCy English Model
    try:
        spacy.load('en_core_web_sm')
        logger.info("SpaCy 'en_core_web_sm' model already loaded.")
    except OSError:
        logger.warning("SpaCy 'en_core_web_sm' model not found, attempting download and load. This can take a moment...")
        # Fallback for systems where direct `spacy.load` might fail path resolution
        try:
            spacy.cli.download('en_core_web_sm')
            logger.info("SpaCy 'en_core_web_sm' downloaded successfully.")
            spacy.load('en_core_web_sm') # Try loading again after download
        except Exception as e:
            logger.critical(f"CRITICAL ERROR: Failed to download or load SpaCy 'en_core_web_sm' model. ATS parsing will likely fail. Error: {e}", exc_info=True)
            raise # Re-raise to prevent application from starting with broken ATS

# Call this initialization once when helpers module is loaded
_initialize_nlp_resources()
# --- END CRITICAL INITIALIZATION ---


# Global SpaCy NLP object for pyresparser (if ResumeParser needs it explicitly, though it usually loads its own)
# This part is more for robustness, pyresparser typically handles this internally.
# But having a global nlp might prevent some issues if pyresparser's internal load is flaky.
# It's less about directly using 'nlp' in our code, more about ensuring the model is loaded in the interpreter.
# However, for pyresparser, it often loads its own instance. Let's rely on the above _initialize_nlp_resources to ensure existence.


def save_uploaded_file(file, folder: str):
    """
    Saves an uploaded file to a specified folder with a secure, unique filename.
    Returns the relative path to the saved file.
    """
    if not file:
        return None

    full_upload_path = os.path.join(os.getcwd(), folder)
    os.makedirs(full_upload_path, exist_ok=True)

    filename = secure_filename(file.filename)
    random_hex = secrets.token_hex(8)
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{os.path.splitext(filename)[0]}_{random_hex}{file_extension}"
    file_path = os.path.join(full_upload_path, unique_filename)

    try:
        file.save(file_path)
        logger.info(f"File saved: {file_path}")
        return os.path.join(folder, unique_filename)
    except Exception as e:
        logger.error(f"Error saving file {filename}: {e}")
        return None

def extract_raw_text_from_file(file_path: str) -> str:
    """Helper to extract raw text content from PDF/DOCX/TXT."""
    if not os.path.exists(file_path):
        logger.warning(f"File not found for raw text extraction: {file_path}")
        return ""

    _, file_extension = os.path.splitext(file_path)
    text_content = ""

    try:
        if file_extension.lower() == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page_num in range(len(reader.pages)):
                    text_content += reader.pages[page_num].extract_text() or ""
        elif file_extension.lower() == '.docx':
            document = docx.Document(file_path)
            for paragraph in document.paragraphs:
                text_content += paragraph.text + "\n"
        elif file_extension.lower() in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
        else:
            logger.warning(f"Unsupported file type for raw text extraction: {file_extension}. Attempting simple read.")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text_content = f.read()
            except UnicodeDecodeError:
                with open(file_path, 'r', encoding='latin-1') as f:
                    text_content = f.read()

        return text_content.strip()
    except Exception as e:
        logger.error(f"Error extracting raw text from {file_path}: {e}")
        return ""


# def parse_resume(file_path: str) -> tuple[str, dict]:
#     """
#     Parses a resume file using pyresparser to extract structured data,
#     and also returns the raw text content.
#     Returns a tuple: (raw_text: str, structured_data: dict)
#     """
#     if not os.path.exists(file_path):
#         logger.warning(f"Resume file not found for parsing: {file_path}")
#         return "", {}

#     raw_text = extract_raw_text_from_file(file_path)
#     structured_data = {}

#     try:
#         # pyresparser loads 'en_core_web_sm' internally, but our _initialize_nlp_resources
#         # ensures it's present for pyresparser to find.
#         parser = ResumeParser(file_path)
#         data = parser.get_extracted_data()

#         if data:
#             structured_data = {k: (v if v is not None else ([] if isinstance(data.get(k), list) else '')) 
#                                for k, v in data.items()}
#             logger.info(f"Successfully extracted structured data from {file_path} using pyresparser.")
#         else:
#             logger.warning(f"pyresparser could not extract structured data from {file_path}.")

#     except Exception as e:
#         logger.error(f"Error during pyresparser extraction for {file_path}: {e}", exc_info=True) # <-- Added exc_info=True
#         # If pyresparser fails, structured_data remains empty {}

#     if not raw_text and structured_data.get('raw_text'):
#         raw_text = structured_data['raw_text']

#     logger.info(f"Final text content extracted from {file_path}")
#     return raw_text.strip(), structured_data


def parse_resume(file_path: str) -> tuple[str, dict]:
    """
    Parses a resume file. It first attempts fast text extraction. If that fails,
    it uses pyresparser as a complete fallback.
    """
    if not os.path.exists(file_path):
        logger.warning(f"Resume file not found for parsing: {file_path}")
        return "", {}

    # Step 1: Attempt primary, fast text extraction
    raw_text = extract_raw_text_from_file(file_path)
    structured_data = {}

    # Step 2 (Your Optimization): Check if primary extraction worked.
    if raw_text:
        logger.info(f"Successfully extracted text from {file_path} using primary with pypdf2 method.")
        # We have the text, so we can return immediately and skip pyresparser.
        # We will have no structured data fallback, but this is much faster.
        return raw_text.strip(), {}

    # Step 3: If we are here, it means raw_text is empty. Use pyresparser as a fallback.
    logger.warning(f"Primary text extraction failed for {file_path}. Falling back to pyresparser.")
    try:
        parser = ResumeParser(file_path)
        data = parser.get_extracted_data()

        if data:
            structured_data = {k: (v if v is not None else ([] if isinstance(data.get(k), list) else '')) 
                               for k, v in data.items()}
            
            # Use the text extracted by pyresparser
            raw_text = data.get('text', '')
            logger.info(f"Successfully extracted text and data from {file_path} using pyresparser fallback.")
        else:
            logger.error(f"Fallback pyresparser also failed to extract any data from {file_path}.")
            return "", {}

    except Exception as e:
        logger.error(f"Critical error during pyresparser fallback for {file_path}: {e}", exc_info=True)
        return "", {}

    return raw_text.strip(), structured_data




def calculate_overall_interview_score(interviews: list) -> float:
    """
    Calculates the average score from a list of interview objects.
    """
    if not interviews:
        return 0.0
    
    total_score = sum(i.score for i in interviews if i.score is not None)
    num_scored_interviews = sum(1 for i in interviews if i.score is not None)
    
    return round(total_score / num_scored_interviews, 2) if num_scored_interviews > 0 else 0.0

def cleanup_directory(directory_path: str):
    """Removes a directory and all its contents."""
    try:
        if os.path.exists(directory_path) and os.path.isdir(directory_path):
            shutil.rmtree(directory_path)
            logger.info(f"Cleaned up directory: {directory_path}")
    except Exception as e:
        logger.error(f"Error cleaning up directory {directory_path}: {e}")