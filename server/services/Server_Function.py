# This decorator is used for background stufff
def server_function(**options):
    def decorator(func):
        func._route_info = {
            **options
        }
        return func

    return decorator
