#!/bin/bash

set -e

# wait for the database to be ready

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h db -p 5432 -U $POSTGRES_USER; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Set Python path so 'app' can be found
export PYTHONPATH=/app/src

# run backend to initialize the database
python -m src.app.scripts.init_db

# run the load_problems script to populate problems table
echo "📦 Loading problems into the database..."
python -m src.app.scripts.load_problems

# start the fastapi server (HTTP)
# CRITICAL: Must use exactly 1 worker!
# The matchmaking system uses an in-memory singleton. Multiple workers would
# create separate queues that don't communicate, causing users to never match.
# For scaling, replace in-memory state with Redis.
echo "🚀 Starting FastAPI server (HTTP) with single worker..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1