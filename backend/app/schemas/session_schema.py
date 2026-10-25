from datetime import datetime
from typing import List
from pydantic import BaseModel


class SessionInfo(BaseModel):
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime


class ActiveSessionsResponse(BaseModel):
    active_sessions: List[SessionInfo]
    total: int
    max_allowed: int
