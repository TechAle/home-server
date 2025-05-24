# This decorator is used to create new routes in the Flask application.
def route(url, methods, **options):
    def decorator(func):
        func._route_info = {
            "url": url,
            "methods": methods,
            **options
        }
        return func

    return decorator
