from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.logger import logger
from app.schemas.responses import ErrorResponse


def setup_exception_handlers(app: FastAPI):
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        path = request.url.path
        status_code = exc.status_code
        detail_lower = str(exc.detail).lower()

        if status_code == 401:
            if "missing" in detail_lower or "not authenticated" in detail_lower:
                logger.info(f"HTTP info: {exc.detail} - Path: {path}")
            elif (
                "expired" in detail_lower
                or "invalid" in detail_lower
                or "validate" in detail_lower
                or "revoked" in detail_lower
                or "inactive" in detail_lower
                or "not found" in detail_lower
                or "subject" in detail_lower
            ):
                logger.warning(f"HTTP warning: {exc.detail} - Path: {path}")
            else:
                logger.info(f"HTTP info: {exc.detail} - Path: {path}")
        elif status_code == 403:
            logger.warning(f"HTTP warning: {exc.detail} - Path: {path}")
        elif status_code == 429:
            logger.warning(f"HTTP warning: {exc.detail} - Path: {path}")
        elif status_code >= 500:
            logger.error(f"HTTP error: {exc.detail} - Path: {path}")
        else:
            if "oauth" in path and (
                "failed to exchange" in detail_lower
                or "failed to fetch" in detail_lower
            ):
                logger.error(f"HTTP error: {exc.detail} - Path: {path}")
            else:
                logger.warning(f"HTTP warning: {exc.detail} - Path: {path}")
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                success=False, message=str(exc.detail), errors=[]
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        logger.error(f"Validation error: {exc.errors()} - Path: {request.url.path}")
        errors = [f"{err['loc'][-1]}: {err['msg']}" for err in exc.errors()]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                success=False, message="Validation Error", errors=errors
            ).model_dump(),
        )

    from sqlalchemy.exc import IntegrityError, SQLAlchemyError

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        logger.error(f"Integrity error: {str(exc.orig)} - Path: {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ErrorResponse(
                success=False,
                message="Database Integrity Error: Record already exists or violates constraints.",
                errors=[],
            ).model_dump(),
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.exception(f"Database error: {str(exc)} - Path: {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                success=False, message="Database Operation Failed", errors=[]
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled exception: {str(exc)} - Path: {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                message="Internal Server Error",
                errors=["An unexpected error occurred."],
            ).model_dump(),
        )
