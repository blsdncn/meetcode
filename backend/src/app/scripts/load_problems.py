# backend/src/app/scripts/load_problems.py

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.core.database import SessionLocal
from app.models.problem import Problem

CSV_PATH = "./data/cleaned_problems.csv"  # You can mount this into the container

def load_data():
    """
    Load problems from CSV into the database.
    
    Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
    This allows the script to be safely re-run without duplicating data
    or failing on partial loads.
    """
    df = pd.read_csv(CSV_PATH)

    session: Session = SessionLocal()
    
    try:
        # Get counts for logging
        initial_count = session.query(Problem).count()
        
        if initial_count >= len(df):
            print(f"🟡 Database already has {initial_count} problems (CSV has {len(df)}). Skipping load.")
            return
        
        print(f"📦 Loading problems from CSV ({len(df)} rows)...")
        print(f"   Current database count: {initial_count}")
        
        # Prepare data for bulk insert
        problems_data = []
        for _, row in df.iterrows():
            # Parse categories from string format like "{tag1,tag2}" or "tag1,tag2"
            categories_str = str(row['topic_tags']).strip('{}')
            categories = [c.strip() for c in categories_str.split(',') if c.strip()]
            
            problems_data.append({
                'problem_id': int(row['id']),
                'title': str(row['title']),
                'problem_link': str(row['problem_URL']),
                'methods_video_link': str(row['solution_URL']) if pd.notna(row['solution_URL']) else None,
                'categories': categories
            })
        
        # Use PostgreSQL's INSERT ... ON CONFLICT DO NOTHING
        # This skips any rows that would violate the unique constraint on problem_id
        stmt = insert(Problem).values(problems_data)
        stmt = stmt.on_conflict_do_nothing(index_elements=['problem_id'])
        
        result = session.execute(stmt)
        session.commit()
        
        # Get final count for reporting
        final_count = session.query(Problem).count()
        inserted_count = final_count - initial_count
        skipped_count = len(df) - inserted_count
        
        print(f"✅ Load complete!")
        print(f"   Inserted: {inserted_count} new problems")
        print(f"   Skipped: {skipped_count} (already existed)")
        print(f"   Total in database: {final_count}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error loading problems: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    load_data()
