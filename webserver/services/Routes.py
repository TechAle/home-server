# This decorator is used to create new routes in the Flask application.
def route(rule, methods, **options):
    def decorator(func):
        func._route_info = {
            "rule": rule,
            "methods": methods,
            **options
        }
        return func

    return decorator
