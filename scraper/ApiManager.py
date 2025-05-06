import json
import secrets
import webbrowser

import requests


class scraper:
    def __init__(self, configurationPath: str):
        # (Your code remains unchanged)
        self.refreshToken: str = ""
        self.accessToken: str = ""
        self.codeChallenge: str = ""
        self.clientId: str = ""
        self.delayClicks: int = 0
        self.checkInterval: int = 0
        self.urlAnilist: str = ""
        self.urlAnimelist: str = ""
        self.state: str = secrets.token_urlsafe(16)
        self.configurate(configurationPath)

    def configurate(self, configurationPath):
        with open(configurationPath, 'r') as file:
            config = json.load(file)
            self.urlAnimelist = config["myanimelist"]["url"]
            self.urlAnilist = config["anilist"]
            self.checkInterval = config["checkInterval"]
            self.delayClicks = config["delayClicks"]
            self.clientId = config["myanimelist"]["clientId"]

    def generatePKCE(self):
        self.codeChallenge = secrets.token_urlsafe(64)

    def auth(self):
        self.generatePKCE()
        url = (
            f"{self.urlAnimelist}/v1/oauth2/authorize?"
            f"response_type=code&client_id={self.clientId}&state={self.state}"
            f"&code_challenge={self.codeChallenge}&code_challenge_method=plain"
        )
        webbrowser.open(url)
        self.code = input("Paste the url: ")
        self.code = self.code.split("code=")[1].split("&")[0]
        self.authorization = ""  # For scheme 2, no header needed
        self.contentType = "application/x-www-form-urlencoded"

    def getAccessToken(self):
        try:
            token_url = f"{self.urlAnimelist}/v1/oauth2/token"

            payload = {
                "grant_type": "authorization_code",
                "client_id": self.clientId,
                "code": self.code,
                "code_verifier": self.codeChallenge,
            }

            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }

            response = requests.post(
                url=token_url,
                data=payload,
                headers=headers
            )

            response.raise_for_status()
            token_data = response.json()
            print("Successfully authenticated!")
            self.accessToken = token_data["access_token"]
            self.refreshToken = token_data["refresh_token"]
            return token_data

        except requests.exceptions.RequestException as e:
            print(f"Authentication failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                print(f"Response content: {e.response.text}")
            raise

    def refreshAccessToken(self):
        try:
            token_url = f"{self.urlAnimelist}/v1/oauth2/token"

            payload = {
                "grant_type": "refresh_token",
                "refresh_token": self.refreshToken,
                "client_id": self.clientId
            }

            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }

            response = requests.post(
                url=token_url,
                data=payload,
                headers=headers
            )

            response.raise_for_status()
            token_data = response.json()
            print("Access token refreshed!")
            self.accessToken = token_data["access_token"]
            self.refreshToken = token_data["refresh_token"]
            return token_data

        except requests.exceptions.RequestException as e:
            print(f"Token refresh failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                print(f"Response content: {e.response.text}")
            raise
