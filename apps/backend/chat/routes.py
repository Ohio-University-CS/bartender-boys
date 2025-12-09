"""
Main router for chat endpoints.
This module imports and includes all sub-routers to maintain the same API structure.
"""

from fastapi import APIRouter

from .routes_respond import router as respond_router
from .routes_conversations import router as conversations_router
from .routes_chats import router as chats_router

# Create main router with prefix and tags
router = APIRouter(prefix="/chat", tags=["Chat"])

# Include all sub-routers
router.include_router(respond_router)
router.include_router(conversations_router)
router.include_router(chats_router)
