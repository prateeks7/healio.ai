from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.config import get_settings
from src.db.client import connect_to_mongo, close_mongo_connection
from src.db.indexes import create_indexes
from src.utils.request_id import RequestIDMiddleware

# Import routes
from src.routes import (
    auth_routes,
    history_routes,
    upload_routes,
    agent_routes,
    doctor_routes,
    patient_routes,
    patient_routes,
    search_routes,
    chat_routes,
    health
)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await create_indexes()
    yield
    await close_mongo_connection()

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan
)

from fastapi.middleware.cors import CORSMiddleware

# Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_routes.router)
app.include_router(history_routes.router)
app.include_router(upload_routes.router)
app.include_router(agent_routes.router)
app.include_router(doctor_routes.router)
app.include_router(patient_routes.router)
app.include_router(search_routes.router)
app.include_router(chat_routes.router)
app.include_router(health.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.app:app", host="0.0.0.0", port=8000, reload=True)
