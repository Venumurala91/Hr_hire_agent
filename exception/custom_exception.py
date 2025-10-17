# =============================================================================
# HR-HIRE-AGENT/exception/custom_exception.py
# =============================================================================

class CustomException(Exception):
    """Base class for custom exceptions in the HR Hire Agent."""
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class ValidationError(CustomException):
    """Exception raised for validation errors in input data."""
    def __init__(self, message="Invalid input provided.", status_code=400):
        super().__init__(message, status_code)

class NotFoundError(CustomException):
    """Exception raised when a requested resource is not found."""
    def __init__(self, message="Resource not found.", status_code=404):
        super().__init__(message, status_code)

class ATSProcessingError(CustomException):
    """Exception raised during ATS processing (e.g., LLM API issues, parsing errors)."""
    def __init__(self, message="Error during ATS processing.", status_code=500):
        super().__init__(message, status_code)

class WhatsAppMessagingError(CustomException):
    """Exception raised when there's an issue sending WhatsApp messages."""
    def __init__(self, message="Error sending WhatsApp message.", status_code=500):
        super().__init__(message, status_code)

class DatabaseError(CustomException):
    """Exception raised for database-related issues."""
    def __init__(self, message="A database error occurred.", status_code=500):
        super().__init__(message, status_code)

class APIError(CustomException):
    """General API error exception."""
    def __init__(self, message="An API error occurred.", status_code=500):
        super().__init__(message, status_code)