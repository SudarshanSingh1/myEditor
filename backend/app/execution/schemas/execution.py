from pydantic import BaseModel, Field
from uuid import UUID

class ExecutionRequest(BaseModel):
    project_id: UUID
    file_id: UUID
    language: str
    # Limit stdin to 64KB to prevent memory exhaustion from large input payloads
    input: str = Field(default="", max_length=65536)

class ExecutionResponse(BaseModel):
    language: str
    compile_time_ms: int
    execution_time_ms: int
    memory_used_kb: int
    exit_code: int
    output: str
    status: str

class StopExecutionRequest(BaseModel):
    container_id: str
