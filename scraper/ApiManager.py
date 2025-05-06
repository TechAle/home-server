import json
import secrets
import webbrowser

import requests


class scraper:
    def __init__(self, configurationPath: str):
        # (Your code remains unchanged)
        self.apiMAL: str = ""
        self.authorization: str = ""
        self.code: str = ""
        self.refreshToken: str = ""
        self.accessToken: str = ""
        self.codeChallenge: str = ""
        self.clientId: str = ""
        self.delayClicks: int = 0
        self.checkInterval: int = 0
        self.urlAnilist: str = ""
        self.urlAnimelist: str = ""
        self.configurate(configurationPath)

    def configurate(self, configurationPath):
        with open(configurationPath, 'r') as file:
            config = json.load(file)
            self.urlAnimelist = config["myanimelist"]["url"]
            self.urlAnilist = config["anilist"]
            self.checkInterval = config["checkInterval"]
            self.delayClicks = config["delayClicks"]
            self.clientId = config["myanimelist"]["clientId"]
            self.apiMAL = config["myanimelist"]["api"]

    def generatePKCE(self):
        self.codeChallenge = secrets.token_urlsafe(64)

    def auth(self):
        self.generatePKCE()
        url = (
            f"{self.urlAnimelist}/v1/oauth2/authorize?"
            f"response_type=code&client_id={self.clientId}"
            f"&code_challenge={self.codeChallenge}&code_challenge_method=plain"
        )
        webbrowser.open(url)
        self.code = input("Paste the url: ")
        self.code = self.code.split("code=")[1].split("&")[0]
        self.authorization = ""  # For scheme 2, no header needed

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
            self.accessToken = token_data["accessToken"]
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
            self.accessToken = token_data["accessToken"]
            print(self.accessToken)
            self.refreshToken = token_data["refresh_token"]
            return token_data

        except requests.exceptions.RequestException as e:
            print(f"Token refresh failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                print(f"Response content: {e.response.text}")
            raise

    # Anime Endpoints
    def get_anime_list(self, q="", limit=4, offset=0, fields=""):
        """Search anime"""
        url = f"{self.apiMAL}/anime"
        if q == "":
            return {"error": "No query provided"}
        params = {
            'q': q,
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_anime_details(self, anime_id, fields=None):
        """Get anime details"""
        url = f"{self.apiMAL}/anime/{anime_id}"
        params = {'fields': fields}
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_anime_ranking(self, ranking_type='all', limit=100, offset=0, fields=None):
        """Get anime ranking"""
        url = f"{self.apiMAL}/anime/ranking"
        params = {
            'ranking_type': ranking_type,
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_seasonal_anime(self, year, season, sort=None, limit=4, offset=0, fields=None):
        """Get seasonal anime"""
        url = f"{self.apiMAL}/anime/season/{year}/{season}"
        if type(year) != int or type(season) != str:
            return {"error": "Invalid year or season"}
        params = {
            'sort': sort,
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_suggested_anime(self, limit=100, offset=0, fields=None):
        """Get suggested anime for authorized user"""
        url = f"{self.apiMAL}/anime/suggestions"
        params = {
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    # Anime List Management
    def update_anime_list_status(self, anime_id, status=None, is_rewatching=None, score=None,
                                 num_watched_episodes=None, priority=None, num_times_rewatched=None,
                                 rewatch_value=None, tags=None, comments=None):
        """Update anime list status"""
        url = f"{self.apiMAL}/anime/{anime_id}/my_list_status"
        data = {
            'status': status,
            'is_rewatching': is_rewatching,
            'score': score,
            'num_watched_episodes': num_watched_episodes,
            'priority': priority,
            'num_times_rewatched': num_times_rewatched,
            'rewatch_value': rewatch_value,
            'tags': tags,
            'comments': comments
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.patch(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()

    def delete_anime_list_item(self, anime_id):
        """Delete anime from user's list"""
        url = f"{self.apiMAL}/anime/{anime_id}/my_list_status"
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.delete(url, headers=headers)
        if response.status_code != 404:  # 404 is expected if item doesn't exist
            response.raise_for_status()
        return response.status_code == 200

    def get_user_anime_list(self, user_name, status=None, sort=None, limit=100, offset=0):
        """Get user's anime list"""
        url = f"{self.apiMAL}/users/{user_name}/animelist"
        params = {
            'status': status,
            'sort': sort,
            'limit': limit,
            'offset': offset
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    # Manga Endpoints
    def get_manga_list(self, q=None, limit=100, offset=0, fields=None):
        """Search manga"""
        url = f"{self.apiMAL}/manga"
        params = {
            'q': q,
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_manga_details(self, manga_id, fields=None):
        """Get manga details"""
        url = f"{self.apiMAL}/manga/{manga_id}"
        params = {'fields': fields}
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_manga_ranking(self, ranking_type='all', limit=100, offset=0, fields=None):
        """Get manga ranking"""
        url = f"{self.apiMAL}/manga/ranking"
        params = {
            'ranking_type': ranking_type,
            'limit': limit,
            'offset': offset,
            'fields': fields
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    # Manga List Management
    def update_manga_list_status(self, manga_id, status=None, is_rereading=None, score=None,
                                 num_volumes_read=None, num_chapters_read=None, priority=None,
                                 num_times_reread=None, reread_value=None, tags=None, comments=None):
        """Update manga list status"""
        url = f"{self.apiMAL}/manga/{manga_id}/my_list_status"
        data = {
            'status': status,
            'is_rereading': is_rereading,
            'score': score,
            'num_volumes_read': num_volumes_read,
            'num_chapters_read': num_chapters_read,
            'priority': priority,
            'num_times_reread': num_times_reread,
            'reread_value': reread_value,
            'tags': tags,
            'comments': comments
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.patch(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()

    def delete_manga_list_item(self, manga_id):
        """Delete manga from user's list"""
        url = f"{self.apiMAL}/manga/{manga_id}/my_list_status"
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.delete(url, headers=headers)
        if response.status_code != 404:  # 404 is expected if item doesn't exist
            response.raise_for_status()
        return response.status_code == 200

    def get_user_manga_list(self, user_name, status=None, sort=None, limit=100, offset=0):
        """Get user's manga list"""
        url = f"{self.apiMAL}/users/{user_name}/mangalist"
        params = {
            'status': status,
            'sort': sort,
            'limit': limit,
            'offset': offset
        }
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    # User Endpoints
    def get_user_info(self, fields=None):
        """Get my user information"""
        url = f"{self.apiMAL}/users/@me"
        params = {'fields': fields}
        headers = {"Authorization": f"Bearer {self.accessToken}"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

