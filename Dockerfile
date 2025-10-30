# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# =============================================================================
# === THIS IS THE FIX =========================================================
# =============================================================================
# Download the necessary NLTK and SpaCy models during the build process
# This ensures the resources are available inside the container when the app runs.
RUN python -m nltk.downloader stopwords
RUN python -m spacy download en_core_web_sm
# =============================================================================

# Copy the rest of the application code into the container
COPY . .

# The command to run the application using a production-ready WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "api.main:app"]