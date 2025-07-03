import random
from typing import List, Tuple, Dict, Set
from uuid import UUID
from app.models.problem import Problem
from sqlalchemy.orm import Session
import asyncio
from fastapi import WebSocket
from app.schemas.match import MatchCreate
from app.schemas.queue import QueueTicket
import app.services.match as match_service

class MatchmakingService:
    def __init__(self):
        # Queue state
        self.queue: Dict[UUID, QueueTicket] = {}
        self.queue_lock = asyncio.Lock()
        
        # Active connections
        self.connections: Dict[UUID, WebSocket] = {}
        self.conn_lock = asyncio.Lock()
        
        # Track matched users to prevent duplicate processing
        self.matched_pairs: Set[Tuple[UUID, UUID]] = set()


    async def _find_problem_id(self, categories: List[str], db: Session) -> int:
        print("=== FIND_PROBLEM_ID CALLED ===")
        print("searching for problem ID with categories:", categories)
        print("\n\n\n______________________________________\n")
        """Find a problem ID based on shared categories with weighted random selection."""
        # If "None" is in categories, include uncategorized problems
        include_uncategorized = "None" in categories
        filtered_categories = [c for c in categories if c != "None"]
        
        # Build query step by step to avoid boolean operation errors
        query = db.query(Problem)
        
        # Create the appropriate filtering conditions
        if filtered_categories and include_uncategorized:
            # Either match one of the categories OR it has no categories
            query = query.filter(
                (Problem.categories.overlap(filtered_categories)) | 
                (Problem.categories == None)
            )
        elif filtered_categories:
            # Only match the specified categories
            query = query.filter(Problem.categories.overlap(filtered_categories))
        elif include_uncategorized:
            # Only include uncategorized problems
            query = query.filter(Problem.categories == None)
        else:
            return None
            
        problems = query.all()
        print(f"Found {len(problems)} problems matching criteria")
        if not problems:
            print("No problems found! Returning None")
            return None

        # Score problems by number of shared categories
        scored = []
        for p in problems:
            if p.categories:
                shared = len(set(p.categories) & set(filtered_categories))
            else:
                shared = 0
            scored.append((p, shared))
        
        # Sort by shared count descending
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Weighted random selection: more weight for higher shared count
        weights = []
        for s in scored:
            if not s[0].categories:
                # Uncategorized problems get half weight
                weights.append(max(1, s[1]) * 0.5)
            else:
                weights.append(max(1, s[1]))
        
        selected = random.choices(scored, weights=weights, k=1)[0][0]
        print(f"Selected problem: ID={selected.problem_id}, categories={selected.categories}")
        return selected.problem_id

    async def create_match(self, pair: Tuple[QueueTicket, QueueTicket], db: Session) -> UUID:
        """Database interaction"""
        print("=== CREATE_MATCH CALLED ===")
        shared_cats = list(
            set(pair[0].categories) & 
            set(pair[1].categories)
        )
        print(f"Shared categories: {shared_cats}")
        
        # Get problem ID using the implemented method
        problem_id = await self._find_problem_id(shared_cats, db)
        print(f"Problem ID from _find_problem_id: {problem_id}")
        
        # Fallback to a default problem if none found
        if problem_id is None:
            print("WARNING: No problem found for categories, using fallback problem ID 1")
            problem_id = 1
        
        match_data = MatchCreate(
            host_id=pair[0].user_id,
            guest_id=pair[1].user_id,
            problem_id=problem_id
        )
        print(f"Creating match for {pair[0].user_id} and {pair[1].user_id} with problem ID {problem_id}")
        
        db_match = match_service.create_match(db, match_data)
        return db_match.match_id
    
    async def add_to_queue(self, user_id: UUID, ticket: QueueTicket):
        async with self.queue_lock:
            if user_id not in self.queue:
                self.queue[user_id] = ticket
                print(f"Added {user_id} to queue. Queue size: {len(self.queue)}")

    async def remove_from_queue(self, user_id: UUID):
        async with self.queue_lock:
            if user_id in self.queue:
                del self.queue[user_id]
                print(f"Removed {user_id} from queue")

    async def register_connection(self, user_id: UUID, websocket: WebSocket):
        async with self.conn_lock:
            self.connections[user_id] = websocket
            print(f"Registered connection for {user_id}")

    async def unregister_connection(self, user_id: UUID):
        async with self.conn_lock:
            if user_id in self.connections:
                del self.connections[user_id]
                print(f"Unregistered connection for {user_id}")

    async def find_pairs(self) -> List[Tuple[QueueTicket, QueueTicket]]:
        """Core matching algorithm"""
        async with self.queue_lock:
            candidates = list(self.queue.values())
        
        pairs = []
        processed = set()
        
        for i, ticket_a in enumerate(candidates):
            if ticket_a.user_id in processed:
                continue
                
            for j, ticket_b in enumerate(candidates[i+1:]):
                if ticket_b.user_id in processed:
                    continue
                    
                # Match condition check
                shared_lang = bool(
                    set(ticket_a.programming_languages) & 
                    set(ticket_b.programming_languages)
                )
                shared_cat = bool(
                    set(ticket_a.categories) & 
                    set(ticket_b.categories)
                )
                
                if shared_lang and shared_cat:
                    pairs.append((ticket_a, ticket_b))
                    processed.update({ticket_a.user_id, ticket_b.user_id})
                    break
        
        return pairs

    async def notify_match(self, user_id: UUID, match_id: UUID, peer_id: UUID, role: str):
        print(f"[notify_match] Notifying {user_id} with match {match_id}")
        websocket = None
        async with self.conn_lock:
            websocket = self.connections.get(user_id)

        if not websocket:
            print(f"[notify_match] No websocket found for {user_id}")

        async with self.conn_lock:
            websocket = self.connections.get(user_id)

        if not websocket:
            print(f"[notify_match] User {user_id} disconnected before notification")
            return

        try:
            await websocket.send_json({
                "event": "match_found",
                "match_id": str(match_id),
                "signaling_url": f"/match/{match_id}",
                "peer_id": str(peer_id),
                "role": role
            })
        except Exception as e:
            print(f"[notify_match] Failed to notify {user_id}: {e}")
        finally:
            await self.unregister_connection(user_id)

    async def execute_matchmaking_cycle(self, db: Session):
        """Full matchmaking workflow (run every few seconds)"""
        print(f"[execute_matchmaking_cycle] Starting cycle, queue size: {len(self.queue)}")
        pairs = await self.find_pairs()
        print(f"[matchmaker] Pairs found: {len(pairs)}")
        if not pairs:
            return

        for pair in pairs:
            host, guest = pair
            print(f"[execute_matchmaking_cycle] Processing pair: {host.user_id} & {guest.user_id}")

            # Create match in DB
            match_id = await self.create_match(pair, db)
            print(f"[execute_matchmaking_cycle] Created match: {match_id}")

            # Send signaling info
            await self.notify_match(host.user_id, match_id, guest.user_id, "host")
            await self.notify_match(guest.user_id, match_id, host.user_id, "guest")

            # Remove from queue (they’re moving on)
            await self.remove_from_queue(host.user_id)
            await self.remove_from_queue(guest.user_id)


# Singleton instance for the service
matchmaking_service = MatchmakingService()