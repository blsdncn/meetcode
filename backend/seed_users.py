from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from app.models.user import User
from app.core.database import SessionLocal
from app.core.auth import get_password_hash
import app.services.user_data as user_data_service

host_id = UUID("c9c3b53f-6719-4c33-9f02-1927bdfb9ed9")
guest_id = UUID("e1483f9a-2dfc-4dbb-b7c3-5c1262b4a01c")

# MeetCodeBot - used for solo practice mode
MEETCODEBOT_ID = UUID("00000000-0000-0000-0000-000000000001")

# Guest user - for anonymous solo practice
GUEST_USER_ID = UUID("00000000-0000-0000-0000-000000000002")

def seed_users():
    db: Session = SessionLocal()

    # Create test users with proper password hashes
    test_users = [
        (host_id, "testuser1", "test1@example.com", "password123"),
        (guest_id, "testuser2", "test2@example.com", "password123"),
    ]

    for user_id, username, email, password in test_users:
        # Check by ID or username to avoid conflicts
        user = db.query(User).filter(
            (User.id == user_id) | (User.username == username) | (User.email == email)
        ).first()
        if not user:
            # Hash the password properly
            password_hash = get_password_hash(password)
            
            db_user = User(
                id=user_id,
                username=username,
                email=email,
                password_hash=password_hash,  # Properly hashed password
                is_active=True,
                is_verified=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            # Create user_data for the new user
            user_data_service.create_user_data(db=db, user_id=db_user.id)
            
            print(f"✅ Added user {username} with password: {password}")
        else:
            print(f"🔄 User {username} already exists (or conflicts with existing user)")
            
    # Create MeetCodeBot user for solo practice mode
    bot_user = db.query(User).filter_by(id=MEETCODEBOT_ID).first()
    if not bot_user:
        db_bot = User(
            id=MEETCODEBOT_ID,
            username="MeetCodeBot",
            email="bot@meetcode.local",
            password_hash=None,  # Bot cannot log in
            is_active=True,
            is_verified=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_bot)
        db.commit()
        db.refresh(db_bot)
        user_data_service.create_user_data(db=db, user_id=db_bot.id)
        print("🤖 Added MeetCodeBot user for solo practice mode")
    else:
        print("🤖 MeetCodeBot already exists")

    # Create Guest user for anonymous solo practice
    guest_user = db.query(User).filter_by(id=GUEST_USER_ID).first()
    if not guest_user:
        db_guest = User(
            id=GUEST_USER_ID,
            username="Guest",
            email="guest@meetcode.local",
            password_hash=None,  # Guest cannot log in
            is_active=True,
            is_verified=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_guest)
        db.commit()
        db.refresh(db_guest)
        user_data_service.create_user_data(db=db, user_id=db_guest.id)
        print("👤 Added Guest user for anonymous solo practice")
    else:
        print("👤 Guest user already exists")

    db.close()
    print("\n📝 Test Credentials:")
    print("Username: testuser1, Password: password123")
    print("Username: testuser2, Password: password123")

if __name__ == "__main__":
    seed_users()