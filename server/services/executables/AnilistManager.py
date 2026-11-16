import json
import os
import urllib
from pathlib import Path

import requests
import webbrowser
from dotenv import load_dotenv

from services.Routes import route

# server/.env, loaded regardless of the current working directory.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing environment variable {name}. "
            f"Copy server/.env.example to server/.env and fill in the value."
        )
    return value


class analistManager:
    def __init__(self, configurationPath: str = "configuration.json"):
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
        # OAuth tokens are secrets: they live in server/.env, never in the repository.
        self.accessToken = require_env("ANILIST_ACCESS_TOKEN")
        self.get_current_user()

    def configurate(self, configurationPath):
        with open(configurationPath, 'r') as file:
            config = json.load(file)
            self.apiAniList = config["anilist"]["api"]
            self.clientId = config["anilist"]["clientId"]
            self.clientSecret = require_env("ANILIST_CLIENT_SECRET")
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
        return self.currentId

    def get_watching_anime(self):
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
        return response["data"]["MediaListCollection"]["lists"][0]["entries"]

    @route("/get_anime", methods=["GET"])
    def get_to_watch(self):
        watching = self.get_watching_anime()
        to_watch = {}
        for anime in watching:
            if anime["media"]["nextAiringEpisode"] is None or \
                    anime["media"]["nextAiringEpisode"]["episode"] > anime["progress"] + 1:
                to_watch[anime["media"]["title"]["english"]] = {
                    "progress": anime["progress"],
                    "link": []
                }
        for anime in to_watch:
            to_watch_list = [anime]
            if anime.__contains__("Season") or anime.__contains__("Part"):
                to_watch_list.append(anime.replace("Season ", "").replace("Part ", ""))
            for animeLoad in to_watch_list:
                response = requests.get(f"https://www.anisaturn.com/index.php?search=1&key={urllib.parse.quote(animeLoad)}")
                if response.status_code == 200:
                    data = response.json()
                    if len(data) > 0:
                        for links in data:
                            to_watch[anime]["link"].append(f"https://www.anisaturn.com/anime/{links['link']}")
                        break
                else:
                    to_watch[anime] = ""

        for anime in to_watch:
            for idx, link in enumerate(to_watch[anime]["link"]):
                newLinkGet = f"{link.replace('https://www.anisaturn.com/anime/', 'https://www.anisaturn.com/episode/')}-ep-{to_watch[anime]['progress']}"
                response = requests.get(newLinkGet)
                if response.status_code == 200:
                    data = response.text
                    if data.__contains__("https://www.anisaturn.com/watch?file="):
                        to_watch[anime]["link"][idx] = "https://www.anisaturn.com/watch?file=" + data.split("https://www.anisaturn.com/watch?file=")[1].split('"')[0]
        return to_watch
