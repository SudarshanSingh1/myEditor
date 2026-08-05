from locust import HttpUser, task, between, events
import json
import uuid


class HamaraLoadTest(HttpUser):
    # Simulate a user thinking for 1 to 3 seconds between actions
    wait_time = between(1, 3)

    def on_start(self):
        """Executed when a virtual user starts."""
        self.access_token = None
        # We simulate hitting the public endpoints if we don't have a specific test user
        # In a real environment, you'd feed this from a CSV of pre-registered users.

    @task(3)
    def check_health(self):
        """Simulate pinging the health endpoint."""
        with self.client.get("/api/v1/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(1)
    def view_dashboard(self):
        """Simulate a user fetching system status (public/unauthenticated version)."""
        with self.client.get("/api/v1/status", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status check failed: {response.status_code}")

    @task(2)
    def get_public_projects(self):
        """Simulate a user searching for public projects (requires auth, expect 401/403 if not logged in)."""
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        with self.client.get(
            "/api/v1/projects", headers=headers, catch_response=True
        ) as response:
            # We accept 401 as a success for guests, 200 for logged in users
            if response.status_code in (200, 401, 403):
                response.success()
            else:
                response.failure(f"Projects failed: {response.status_code}")


# Run with: locust -f locustfile.py --host=http://localhost:8000
