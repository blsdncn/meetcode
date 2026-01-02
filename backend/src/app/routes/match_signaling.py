
from uuid import UUID

from app.core.auth import decode_access_token
from app.dependencies import get_db
from app.models.user import User
from app.services.match import get_match_by_id
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from app.services.match_signaling import match_signaling_service
from sqlalchemy.orm import Session

router = APIRouter()


# @router.websocket("/match/{match_id}")
# async def match_signaling_endpoint(
#     websocket: WebSocket,
#     match_id: UUID,
#     db: Session = Depends(get_db)
# ):
    
#     print(f"🔌 WS connection incoming: match={match_id}")

#     # ✅ Check if the match exists and includes the user
#     match = get_match_by_id(db, match_id)
#     if not match:
#         print(f"[match WS] Match {match_id} not found")
#         await websocket.close(code=1008)
#         return


#     # ✅ All good, accept the connection
#     await websocket.accept()

#     room = await match_signaling_service.get_or_create_room(match_id)

#     # Send confirmation event
#     await websocket.send_json({"event": "room_ready"})

#     await room.connect(match_id, websocket)

#     try:
#         while True:
#             data = await websocket.receive_json()
#             await room.relay(match_id, data)
#     except WebSocketDisconnect:
#         await room.disconnect(match_id)
#         await match_signaling_service.cleanup_room(match_id)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter()

# This holds connected peers: match_id -> list of WebSocket connections
rooms: Dict[str, List[WebSocket]] = {}

@router.websocket("/match/{match_id}")
async def match_signaling(websocket: WebSocket, match_id: str):
    await websocket.accept()
    print(f"✅ WebSocket connected: match_id={match_id}")

    if match_id not in rooms:
        rooms[match_id] = []

    room = rooms[match_id]

    # If already full, reject connection
    if len(room) >= 2:
        await websocket.send_json({ "event": "room_full" })
        await websocket.close()
        print(f"❌ Room {match_id} full, rejected")
        return

    # Add this peer
    room.append(websocket)

    try:
        # If two peers are connected, notify them both
        if len(room) == 2:
            for peer in room:
                await peer.send_json({ "event": "room_ready" })

        while True:
            data = await websocket.receive_json()

            # Handle end_match event - notify peer and close
            if data.get("event") == "end_match":
                for peer in room:
                    if peer != websocket:
                        try:
                            await peer.send_json({ 
                                "event": "match_ended", 
                                "reason": "peer_ended" 
                            })
                        except Exception:
                            pass
                continue

            # Relay message to the other peer
            for peer in room:
                if peer != websocket:
                    await peer.send_json(data)

    except WebSocketDisconnect:
        # Notify other peer that this user disconnected
        for peer in room:
            if peer != websocket:
                try:
                    await peer.send_json({ 
                        "event": "match_ended", 
                        "reason": "peer_disconnected" 
                    })
                except Exception:
                    pass
        room.remove(websocket)
        if not room:
            del rooms[match_id]
