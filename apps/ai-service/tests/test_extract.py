from fastapi.testclient import TestClient

from main import app


def test_mock_extraction_is_deterministic_and_does_not_invent_values(monkeypatch) -> None:
    monkeypatch.setenv("EXTRACTION_PROVIDER", "mock")
    response = TestClient(app).post(
        "/extract",
        files={"file": ("invoice.pdf", b"%PDF-1.7 sample", "application/pdf")},
        data={"supplier_name": "Example Supplier"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "mock"
    assert body["supplier_name"] == {"value": "Example Supplier", "confidence": 1.0}
    assert body["invoice_number"]["value"] is None
    assert body["invoice_total"]["value"] is None
    assert body["lines"] == []
    assert body["warnings"]


def test_rejects_unsupported_document() -> None:
    response = TestClient(app).post(
        "/extract", files={"file": ("invoice.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 415
