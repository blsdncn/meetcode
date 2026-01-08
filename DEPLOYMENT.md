# MeetCode Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Production environment variables configured in `.env.prod`

## Deployment Steps

### 1. Build and Start Services
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up --build -d
```

### 2. Run Database Migrations
```bash
# Run Alembic migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### 3. Seed Required Users
The application requires two special users to be seeded before running:

#### Method A: Run the Seed Script (Recommended)
```bash
# Execute the seed users script in the backend container
docker-compose -f docker-compose.prod.yml exec backend python seed_users.py
```

This script will:
- Create the MeetCodeBot user (ID: 00000000-0000-0000-0000-000000000001)
- Create the Guest user (ID: 00000000-0000-0000-0000-000000000002)
- Skip creation if users already exist (handles re-running safely)

#### Method B: Manual SQL Execution
If the script fails, you can manually insert the users:

```bash
# Connect to PostgreSQL container
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d meetcode

# Insert MeetCodeBot user
INSERT INTO users (id, username, email, hashed_password, is_active, created_at, updated_at) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'meetcodebot',
    'bot@meetcode.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsZYmPnMa', -- password: botpassword
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

# Insert Guest user
INSERT INTO users (id, username, email, hashed_password, is_active, created_at, updated_at) 
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'guest',
    'guest@meetcode.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsZYmPnMa', -- password: guestpassword
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

# Exit psql
\q
```

### 4. Verify Services
```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Check backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Check frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 5. Test the Application
- Navigate to your domain
- Test login with existing users
- Test "Practice Solo as Guest" functionality
- Verify solo matches work correctly

## Important Notes

### Seed Users
- **MeetCodeBot**: Required for solo practice mode
- **Guest**: Required for unauthenticated solo practice
- Both users have special UUIDs that are hardcoded in the application
- The seed script is safe to run multiple times

### Environment Variables
Ensure these are set in `.env.prod`:
```
DATABASE_URL=postgresql+psycopg2://postgres:yourpassword@postgres:5432/meetcode
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key
```

### SSL/TLS
- The production setup uses HTTPS by default
- Ensure your domain's SSL certificates are properly configured
- The nginx container handles SSL termination

### Troubleshooting
- If solo mode returns 500 errors, check that both seed users exist
- If guests can't access matchmaking, verify the middleware configuration
- Check logs for any database connection issues

## Post-Deployment
1. Monitor application logs for any errors
2. Test all user flows (login, guest solo, regular matchmaking)
3. Verify database backups are configured
4. Set up monitoring/alerting as needed
