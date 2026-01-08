import sys
import os

# Add parent dir to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from models.database import engine
    from sqlalchemy import text
except ImportError:
    # Fallback if run from root
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from models.database import engine
    from sqlalchemy import text

def update_schema():
    print("Updating schema: Making workspace_id nullable and adding user_id in conversations table...")
    try:
        with engine.connect() as connection:
            # MySQL syntax
            connection.execute(text("ALTER TABLE conversations MODIFY workspace_id VARCHAR(36) NULL;"))
            
            # Add user_id if it doesn't exist
            try:
                connection.execute(text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36) NULL;"))
                connection.execute(text("ALTER TABLE conversations ADD CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES users(id);"))
            except Exception as e:
                print(f"Note: user_id column might already exist or error adding it: {e}")

            connection.commit()
            print("Schema updated successfully.")
    except Exception as e:
        print(f"Error updating schema: {e}")
        print("NOTE: If the database is not accessible, you may need to run this query manually:")
        print("ALTER TABLE conversations MODIFY workspace_id VARCHAR(36) NULL;")

if __name__ == "__main__":
    update_schema()
