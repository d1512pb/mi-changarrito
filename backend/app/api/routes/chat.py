from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies.deps import get_current_user
from app.core.database import get_database
from app.services.chat_service import ChatService

router = APIRouter(prefix="/ai/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=1000)
    budget_cents: int | None = Field(None, strict=True, gt=0, le=100_000_000)


@router.post("")
async def ask_chat(payload: ChatRequest, actor=Depends(get_current_user), db=Depends(get_database)):
    query = payload.query.strip()
    if not query:
        from fastapi import HTTPException
        raise HTTPException(422, "Escribe tu pregunta")
    return await ChatService(db, actor).ask(query, payload.budget_cents)


@router.get("/history")
async def chat_history(actor=Depends(get_current_user), db=Depends(get_database)):
    service = ChatService(db, actor)
    catalog = {row["id"]: row for row in await service.visible_catalog()}
    return {"items": [{"query": row["query"], "answer": row["answer"], "mode": row["mode"],
                       "created_at": row["created_at"],
                       "recommendations": [catalog[key] for key in row.get("offer_ids", []) if key in catalog]}
                      for row in await service.history()]}
