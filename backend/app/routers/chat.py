"""
Chat Router - Messaging between owners and providers
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from app.core.database import db
from app.core.security import get_current_user

router = APIRouter(prefix="/messages", tags=["Chat"])


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    content: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    provider_id: str
    provider_type: str
    booking_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    owner_unread: int = 0
    provider_unread: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SendMessageRequest(BaseModel):
    content: str


class StartConversationRequest(BaseModel):
    provider_id: str
    provider_type: str
    booking_id: Optional[str] = None


@router.post("/conversations")
async def start_conversation(data: StartConversationRequest, current_user: dict = Depends(get_current_user)):
    """Start a new conversation with a provider"""
    existing = await db.conversations.find_one({
        "owner_id": current_user["id"],
        "provider_id": data.provider_id
    })
    if existing:
        existing.pop("_id", None)
        return existing
    
    conversation = Conversation(
        owner_id=current_user["id"],
        provider_id=data.provider_id,
        provider_type=data.provider_type,
        booking_id=data.booking_id
    )
    await db.conversations.insert_one(conversation.model_dump())
    return conversation


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    if current_user["role"] == "owner":
        query = {"owner_id": current_user["id"]}
    else:
        # Provider - get their provider ID first
        collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return []
        query = {"provider_id": profile["id"]}
    
    conversations = await db.conversations.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(100)
    return conversations


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Get messages in a conversation"""
    messages = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["id"]}},
        {"$set": {"read": True}}
    )
    
    return messages


@router.post("/conversations/{conversation_id}/send")
async def send_message(conversation_id: str, data: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    """Send a message in a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user["id"],
        content=data.content
    )
    await db.messages.insert_one(message.model_dump())
    
    # Update conversation
    now = datetime.now(timezone.utc).isoformat()
    update = {"last_message": data.content, "last_message_at": now}
    
    if current_user["id"] == conversation["owner_id"]:
        update["provider_unread"] = conversation.get("provider_unread", 0) + 1
    else:
        update["owner_unread"] = conversation.get("owner_unread", 0) + 1
    
    await db.conversations.update_one({"id": conversation_id}, {"$set": update})
    
    return message
