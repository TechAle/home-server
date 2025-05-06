import os

from flask import Flask, jsonify, request
import threading
import time
class MyFlaskApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.scheduled_functions = []
        self.message_log = []  # 🟡 Example state
        self.configure_routes()
        '''
            Let me explain this...
            Flask when is in dev mode, everytime i change something, the server updates, that is good!
            For making this work, flask has to keep the first, main thread always alive.
            At the beginning this thread is used for flask things, but then it will get dispatched for
            managing flask autoreload/keep it alive.
            The problem? if that shit is alive, then the threads i created are too!
            So at the beginning, we must never create threads. 
        '''
        if self.app.debug or 'RUNNING' in os.environ:
            self.register_scheduled_tasks()
            self.start_scheduler()
        else:
            os.environ['RUNNING'] = "True"

    def scheduled_task(self, interval):
        def decorator(func):
            def wrapper(main_thread):
                while main_thread.is_alive():
                    print(main_thread)
                    func()
                    time.sleep(interval)
            self.scheduled_functions.append(wrapper)
            return func
        return decorator

    def my_minute_task(self):
        print(f"⏰ Running scheduled task. {len(self.message_log)} messages logged.")

    def register_scheduled_tasks(self):
        self.scheduled_task(interval=10)(self.my_minute_task)

    def configure_routes(self):
        # Register instance methods as routes
        self.app.add_url_rule('/', view_func=self.home)
        self.app.add_url_rule('/api/echo', view_func=self.echo, methods=['POST'])

    # /
    def home(self):
        return f"Hello! {len(self.message_log)} messages received so far."

    # /api/echo POST
    def echo(self):
        data = request.get_json()
        self.message_log.append(data)  # 🟢 Access to self
        return jsonify({'you_sent': data, 'total_messages': len(self.message_log)})

    def start_scheduler(self):
        for task_func in self.scheduled_functions:
            thread = threading.Thread(target=task_func, daemon=True, name="test", args=(threading.current_thread(),))
            thread.start()

    def run(self, **kwargs):
        self.app.run(**kwargs)



if __name__ == '__main__':
    app_instance = MyFlaskApp()
    app_instance.run(debug=True)
    print("k   ")
