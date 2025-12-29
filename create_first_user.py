from getpass import getpass
from database.database import get_db
from model.models import User
from logger.logger import logger

def create_initial_user():
    """
    A command-line script to create the first administrative user.
    """
    print("--- Create Initial HR User ---")
    
    # Get a database session
    db_session = next(get_db())
    
    try:
        # Check if any user already exists
        if db_session.query(User).first():
            print("A user already exists in the database. Aborting.")
            return

        # Get user details from input
        first_name = input("Enter First Name: ").strip()
        last_name = input("Enter Last Name: ").strip()
        email = input("Enter Email Address: ").strip()
        password = getpass("Enter Password: ")
        password_confirm = getpass("Confirm Password: ")

        if not all([first_name, last_name, email, password]):
            print("\nError: All fields are required.")
            return

        if password != password_confirm:
            print("\nError: Passwords do not match.")
            return

        # Create the new user object
        new_user = User(
            first_name=first_name,
            last_name=last_name,
            email=email
        )
        new_user.set_password(password) # Hash the password

        # Add to the database
        db_session.add(new_user)
        db_session.commit()
        
        logger.info(f"Successfully created initial user: {email}")
        print(f"\n✅ User '{email}' created successfully!")
        print("You can now start the application and log in.")

    except Exception as e:
        db_session.rollback()
        logger.error(f"Failed to create initial user: {e}")
        print(f"\n❌ An error occurred: {e}")
    finally:
        db_session.close()

if __name__ == "__main__":
    create_initial_user()