import json
import requests
import webbrowser


class analistManager:
    def __init__(self, configurationPath: str):
        self.apiAniList: str = ""
        self.authorization: str = ""
        self.code: str = ""
        self.accessToken: str = ""
        self.refreshToken: str = ""
        self.clientId: str = ""
        self.clientSecret: str = ""
        self.redirectUri: str = ""
        self.currentId: int = -1
        self.configurate(configurationPath)

    def configurate(self, configurationPath):
        with open(configurationPath, 'r') as file:
            config = json.load(file)
            self.apiAniList = config["anilist"]["api"]
            self.clientId = config["anilist"]["clientId"]
            self.clientSecret = config["anilist"]["clientSecret"]
            self.redirectUri = config["anilist"]["redirectUri"]

    def auth(self):
        url = (
            f"https://anilist.co/api/v2/oauth/authorize?"
            f"client_id={self.clientId}&"
            f"redirect_uri={self.redirectUri}&"
            f"response_type=code"
        )
        webbrowser.open(url)
        self.code = input("Paste the URL you were redirected to: ").strip()
        self.code = self.code.split("code=")[1].split("&")[0]

    def getAccessToken(self):
        try:
            token_url = "https://anilist.co/api/v2/oauth/token"
            payload = {
                "grant_type": "authorization_code",
                "client_id": self.clientId,
                "client_secret": self.clientSecret,
                "redirect_uri": self.redirectUri,
                "code": self.code
            }
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            response = requests.post(
                url=token_url,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            token_data = response.json()
            print("Successfully authenticated with AniList!")
            self.accessToken = token_data["access_token"]
            return token_data

        except requests.exceptions.RequestException as e:
            print(f"Authentication failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                print(f"Response content: {e.response.text}")
            raise

    def execute_query(self, query, variables=None):
        headers = {
            'Authorization': f'Bearer {self.accessToken}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        payload = {
            'query': query,
            'variables': variables or {}
        }

        response = requests.post(self.apiAniList, headers=headers, json=payload)

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"GraphQL query failed with status {response.status_code}")

    def get_current_user(self):
        query = """
        query {
            Viewer {
                id
            }
        }
        """
        self.currentId = self.execute_query(query)["data"]["Viewer"]["id"]

    def check_status_anime(self):
        query = """
        query MediaListCollection($type: MediaType, $status: MediaListStatus, $userId: Int) {
            MediaListCollection(type: $type, status: $status, userId: $userId) {
                lists {
                  entries {
                    media {
                        title {
                        english
                      }
                      nextAiringEpisode {
                        airingAt
                        episode
                      }
                    }
                    progress
                    score
                    }
                }
            }
        }
        """
        variables = {
          "type": "ANIME",
          "status": "CURRENT",
          "userId": self.currentId
        }
        response = self.execute_query(query, variables)
        return response["data"]["MediaListCollection"]["lists"]