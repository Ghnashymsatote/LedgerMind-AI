import os
from typing import Annotated, Literal, Protocol

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="LedgerMind AI", version="2.0")


class HealthResponse(BaseModel):
    status: Literal["ok"]



class ExtractedValue(BaseModel):
    value: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class InvoiceLineExtraction(BaseModel):
    description: ExtractedValue = Field(default_factory=ExtractedValue)
    hsn_sac: ExtractedValue = Field(default_factory=ExtractedValue)
    quantity: ExtractedValue = Field(default_factory=ExtractedValue)
    unit_price: ExtractedValue = Field(default_factory=ExtractedValue)
    taxable_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    tax_rate: ExtractedValue = Field(default_factory=ExtractedValue)
    cgst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    sgst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    igst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    total_amount: ExtractedValue = Field(default_factory=ExtractedValue)


class InvoiceExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: str = ""
    model: str = ""
    supplier_name: ExtractedValue = Field(default_factory=ExtractedValue)
    supplier_gstin: ExtractedValue = Field(default_factory=ExtractedValue)
    buyer_name: ExtractedValue = Field(default_factory=ExtractedValue)
    buyer_gstin: ExtractedValue = Field(default_factory=ExtractedValue)
    invoice_number: ExtractedValue = Field(default_factory=ExtractedValue)
    invoice_date: ExtractedValue = Field(default_factory=ExtractedValue)
    currency: ExtractedValue = Field(default_factory=lambda: ExtractedValue(value="INR", confidence=1))
    taxable_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    cgst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    sgst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    igst_amount: ExtractedValue = Field(default_factory=ExtractedValue)
    total_tax: ExtractedValue = Field(default_factory=ExtractedValue)
    invoice_total: ExtractedValue = Field(default_factory=ExtractedValue)
    lines: list[InvoiceLineExtraction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ExtractionProvider(Protocol):
    async def extract(self, content: bytes, mime_type: str, supplier_name: str | None) -> InvoiceExtraction: ...


class MockExtractionProvider:
    async def extract(self, content: bytes, mime_type: str, supplier_name: str | None) -> InvoiceExtraction:
        del content, mime_type
        return InvoiceExtraction(
            provider="mock",
            model="deterministic-empty-v1",
            supplier_name=ExtractedValue(value=supplier_name, confidence=1 if supplier_name else None),
            warnings=[
                "Mock extraction does not read document contents.",
                "Enter and verify every financial value before a later approval step.",
            ],
        )


class GeminiExtractionProvider:
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is required when EXTRACTION_PROVIDER=gemini")
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    async def extract(self, content: bytes, mime_type: str, supplier_name: str | None) -> InvoiceExtraction:
        from google.genai import types
        prompt = (
            "Extract the Indian GST invoice into the supplied JSON schema. Never infer or calculate a missing "
            "document value. Use null for absent/unclear values and add a warning. Decimal values must be plain "
            "base-10 strings without currency symbols. Dates must be YYYY-MM-DD. Include GSTIN, HSN/SAC, taxable "
            f"amounts, CGST, SGST and IGST. Expected supplier context: {supplier_name or 'unknown'}."
        )
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[types.Part.from_bytes(data=content, mime_type=mime_type), prompt],
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=InvoiceExtraction),
        )
        if not response.text:
            raise RuntimeError("Gemini returned an empty extraction")
        result = InvoiceExtraction.model_validate_json(response.text)
        return result.model_copy(update={"provider": "gemini", "model": self.model})


def provider() -> ExtractionProvider:
    name = os.getenv("EXTRACTION_PROVIDER", "mock").lower()
    if name == "mock":
        return MockExtractionProvider()
    if name == "gemini":
        return GeminiExtractionProvider()
    raise RuntimeError("EXTRACTION_PROVIDER must be mock or gemini")


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/extract", response_model=InvoiceExtraction)
async def extract(
    file: Annotated[UploadFile, File()],
    supplier_name: Annotated[str | None, Form()] = None,
) -> InvoiceExtraction:
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Only PDF, JPEG and PNG invoices are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Invoice file is empty.")
    try:
        return await provider().extract(content, file.content_type, supplier_name)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Invoice extraction failed.") from error
