import uuid
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("teledoc")

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        logger.info(f"Request started: {request.method} {request.url.path} [ID: {request_id}]")
        try:
            response = await call_next(request)
            logger.info(f"Request finished: {response.status_code} [ID: {request_id}]")
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            logger.error(f"Request failed: {str(e)} [ID: {request_id}]")
            raise
