# This decorator is used for background stufff
def scheduled_task(interval, **options):
    def decorator(func):
        func._route_info = {
            "interval": interval,
            **options
        }
        return func

    return decorator
