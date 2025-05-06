from ApiManager import scraper

bot: scraper | None = None
if __name__ == "__main__":
    bot = scraper("configuration.json")
    bot.auth()
    bot.getAccessToken()
    bot.refreshAccessToken()