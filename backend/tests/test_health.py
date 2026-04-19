"""Smoke test for the /health endpoint."""

from fastapi.testclient import TestClient

from axolotl.main import app


def test_health_ok() -> None:
    """/health must return 200 with status ok."""
    with TestClient(app) as client:
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
