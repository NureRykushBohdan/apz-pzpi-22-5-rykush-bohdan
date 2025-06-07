from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def login(self):
        self.client.post(
            "/login",
            json={"email": "bohdan.rykush@nure.ua", "password": "11"}
        )