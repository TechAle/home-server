def route(rule, methods, **options):
    def decorator(func):
        func._route_info = {
            "rule": rule,
            "methods": methods,
            **options
        }
        return func

    return decorator
