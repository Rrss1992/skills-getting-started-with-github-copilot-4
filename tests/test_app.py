import importlib
from copy import deepcopy
from fastapi.testclient import TestClient
import pytest

app_module = importlib.import_module("src.app")
client = TestClient(app_module.app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities before/after each test."""
    backup = deepcopy(app_module.activities)
    yield
    app_module.activities = deepcopy(backup)


def test_get_activities():
    # Arrange: none (server already running in test client)
    # Act
    r = client.get("/activities")
    # Assert
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_duplicate_prevention():
    activity = "Basketball Team"
    email = "tester@example.com"
    # Arrange: ensure participant not present
    participants = app_module.activities[activity].get("participants", [])
    app_module.activities[activity]["participants"] = [p for p in participants if p.lower() != email.lower()]

    # Act: first signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    # Assert: created
    assert r.status_code == 200
    assert email.lower() in r.json().get("message", "").lower()

    # Act: duplicate signup
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    # Assert: rejected
    assert r2.status_code == 400
    assert "already" in r2.json().get("detail", "").lower()


def test_delete_participant():
    activity = "Basketball Team"
    email = "toremove@example.com"
    # Arrange: add participant first
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200

    # Act: remove participant
    r2 = client.delete(f"/activities/{activity}/participants?email={email}")
    # Assert: removed
    assert r2.status_code == 200
    assert "removed" in r2.json().get("message", "").lower()

    # Act: fetch activities
    r3 = client.get("/activities")
    # Assert: confirm removed
    participants = [p.lower() for p in r3.json()[activity].get("participants", [])]
    assert email.lower() not in participants


def test_capacity_limit():
    activity = "Tennis Club"
    max_p = app_module.activities[activity]["max_participants"]
    # Arrange: fill to capacity
    app_module.activities[activity]["participants"] = [f"u{i}@example.com" for i in range(max_p)]

    # Act: attempt to add one more
    r = client.post(f"/activities/{activity}/signup?email=newone@example.com")
    # Assert: rejected due to full
    assert r.status_code == 400
    assert "full" in r.json().get("detail", "").lower()
