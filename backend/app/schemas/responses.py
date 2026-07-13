from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class BaseResponse(BaseModel):
    success: bool
    message: str
    
    model_config = ConfigDict(populate_by_name=True)

class SuccessResponse(BaseResponse, Generic[T]):
    success: bool = True
    data: Optional[T] = None

class StandardResponse(SuccessResponse[T]):
    pass

class ErrorResponse(BaseResponse):
    success: bool = False
    errors: Optional[List[str]] = None

class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

class PaginatedResponse(SuccessResponse[PaginatedData[T]]):
    pass
