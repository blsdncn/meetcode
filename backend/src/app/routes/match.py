from datetime import datetime, timezone
from fastapi import HTTPException, Security
from uuid import UUID
from app.schemas.match import MatchCreate, MatchStart, MatchEnd, MatchDetails, MatchHistory, MatchResponse, MatchEndResponse, SoloMatchRequest, SoloMatchResponse
from fastapi import APIRouter, Depends
from app.models.match import Match

import app.services.match as match_service
from app.dependencies import get_db
from sqlalchemy.orm import Session
from app.dependencies import oauth2_scheme

router = APIRouter()

# MeetCodeBot UUID - must match seed_users.py
MEETCODEBOT_ID = UUID("00000000-0000-0000-0000-000000000001")

@router.post("/create", response_model=MatchResponse, tags=["Match"])
def create_match(reqBody: MatchCreate, db: Session = Depends(get_db)):
    new_match = match_service.create_match(db=db, match=reqBody)
    return new_match

@router.delete("/delete{match_id}")
def delete_match(reqBody: UUID, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.match_id == reqBody).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    db.delete(match)
    db.commit()
    return {"message": "Match deleted successfully"}

@router.put("/start/{match_id}", response_model=MatchStart, tags=["Match"])
def start_match(reqBody: UUID, db: Session = Depends(get_db)):
    existing = db.query(Match).filter(Match.match_id == reqBody).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Match not found")
    
    start = match_service.start_match(db=db, match_id=reqBody)
    return start

@router.put("/end/{match_id}", response_model=MatchEndResponse, tags=["Match"])
def end_match(match_id:UUID, match: MatchEnd, db: Session = Depends(get_db)):
    match_over = match_service.end_match(db=db, match_id=match_id, match_data=match)
    return match_over

@router.get("/details/{match_id}", response_model=MatchDetails, tags=["Match"])
def get_match_details(match_id: UUID, db: Session = Depends(get_db)):
    details = match_service.get_match_details(db=db, match_id=match_id)
    if not details:
        raise HTTPException(status_code=404, detail="Match not found")
    return details


@router.get("/history/{user_id}", response_model=list[MatchHistory], tags=["Match"])
def get_match_history(
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    token: str = Security(oauth2_scheme)
):
    matches = match_service.get_all_matches(db=db, user_id=user_id, skip=skip, limit=limit)
    if not matches:
        raise HTTPException(status_code=404, detail="No match history found")
    return matches


@router.post("/solo", response_model=SoloMatchResponse, tags=["Match"])
def create_solo_match(
    req: SoloMatchRequest,
    db: Session = Depends(get_db),
    token: str = Security(oauth2_scheme)
):
    """
    Create a solo practice match with MeetCodeBot.
    Instantly creates a match without queuing.
    """
    from app.core.auth import decode_access_token
    from app.models.user import User
    from app.models.problem import Problem
    import random
    
    # Decode token to get user
    token_data = decode_access_token(token)
    user = db.query(User).filter(User.username == token_data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify MeetCodeBot exists
    bot = db.query(User).filter(User.id == MEETCODEBOT_ID).first()
    if not bot:
        raise HTTPException(status_code=500, detail="MeetCodeBot not configured. Run seed_users.py")
    
    # Get problem_id (use provided or pick random)
    problem_id = req.problem_id
    if problem_id is None:
        problems = db.query(Problem).all()
        if problems:
            problem_id = random.choice(problems).problem_id
        else:
            problem_id = 1  # Fallback
    
    # Create match with user as host and MeetCodeBot as guest
    match_data = MatchCreate(
        host_id=user.id,
        guest_id=MEETCODEBOT_ID,
        problem_id=problem_id
    )
    
    new_match = match_service.create_match(db=db, match=match_data)
    
    return SoloMatchResponse(
        match_id=new_match.match_id,
        problem_id=new_match.problem_id
    )


# Guest user UUID - for anonymous solo practice
GUEST_USER_ID = UUID("00000000-0000-0000-0000-000000000002")


@router.post("/solo/guest", response_model=SoloMatchResponse, tags=["Match"])
def create_guest_solo_match(
    req: SoloMatchRequest,
    db: Session = Depends(get_db)
):
    """
    Create a solo practice match for guest (non-authenticated) users.
    No authentication required - uses a shared guest user.
    """
    from app.models.user import User
    from app.models.problem import Problem
    import random
    
    # Verify MeetCodeBot exists
    bot = db.query(User).filter(User.id == MEETCODEBOT_ID).first()
    if not bot:
        raise HTTPException(status_code=500, detail="MeetCodeBot not configured")
    
    # Get or create guest user
    guest_user = db.query(User).filter(User.id == GUEST_USER_ID).first()
    if not guest_user:
        raise HTTPException(status_code=500, detail="Guest user not configured. Run seed_users.py")
    
    # Get problem_id (use provided or pick random)
    problem_id = req.problem_id
    if problem_id is None:
        problems = db.query(Problem).all()
        if problems:
            problem_id = random.choice(problems).problem_id
        else:
            problem_id = 1  # Fallback
    
    # Create match with guest as host and MeetCodeBot as guest
    match_data = MatchCreate(
        host_id=GUEST_USER_ID,
        guest_id=MEETCODEBOT_ID,
        problem_id=problem_id
    )
    
    new_match = match_service.create_match(db=db, match=match_data)
    
    return SoloMatchResponse(
        match_id=new_match.match_id,
        problem_id=new_match.problem_id
    )
