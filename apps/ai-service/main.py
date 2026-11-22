from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="LedgerMind AI")


class HealthResponse(BaseModel):
    status: Literal["ok"]


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok")
