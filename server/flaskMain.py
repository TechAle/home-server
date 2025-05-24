import os
import threading
import time
from importlib import import_module

from flask import Flask, render_template

from utils.ClassUtils import getClassesWithRules


class MyFlaskApp:
    def __init__(self):
        self.app = Flask(__name__, template_folder="templates/")

        self.managers_functions = {}
        self.scheduled_functions = []

        self.configure_routes()

        # Scheduler logic to avoid re-entrance in debug autoreload
        if self.app.debug or 'RUNNING' in os.environ:
            self.init_executables()
            self.register_scheduled_tasks()
            self.start_scheduler()
        else:
            os.environ['RUNNING'] = "True"
    # Decorator to mark scheduled functions
    def scheduled_task(self, interval):
        def decorator(func):
            def wrapper(main_thread):
                while main_thread.is_alive():
                    func()
                    time.sleep(interval)
            self.scheduled_functions.append(wrapper)
            return func
        return decorator

    def my_minute_task(self):
        print("Background task running...")

    def register_scheduled_tasks(self):
        self.scheduled_task(interval=10)(self.my_minute_task)

    def start_scheduler(self):
        for task_func in self.scheduled_functions:
            thread = threading.Thread(
                target=task_func,
                daemon=True,
                name="scheduler-thread",
                args=(threading.current_thread(),)
            )
            thread.start()

    def configure_routes(self):
        # HTML routes
        self._add_html_routes()

        # Extra test/debug route
        self._add_extra_routes()

    def _add_html_routes(self):
        @self.app.route("/")
        def home_page():
            return render_template("index.html")

        @self.app.route("/unsubscribe")
        def unsubscribe_page():
            return render_template("unsubscribe.html")

        @self.app.route("/admin")
        def admin_page():
            return render_template("admin.html")


    def _add_extra_routes(self):
        @self.app.route('/info')
        def info():
            return f"Hello!."

    def run(self, **kwargs):
        self.app.run(**kwargs)

    def init_executables(self):
        # Get all possible executables
        executables = getClassesWithRules("services/executables", ["route", "scheduled_task", "server_function"])
        # Now add them to the app
        for classKind in executables:
            module_name = classKind["path"].replace("/", ".").replace(".py", "")
            module = import_module(module_name)
            cls = getattr(module, classKind["moduleName"])
            instance = cls()
            for function in classKind["functions"]:
                method_name = function["function"]
                rule = function["rule"]
                if rule == "route":
                    self.app.add_url_rule(function["args"]["url"], view_func=getattr(instance, method_name),
                                          methods=function["args"]["methods"] if "methods" in function["args"] else ["GET"])
                elif rule == "scheduled_task":
                    # Handle scheduled tasks if needed
                    self.scheduled_functions.append({
                        "functionObject": getattr(instance, method_name),
                        "interval": function["args"]["interval"],
                    })
                elif rule == "server_function":
                    self.managers_functions[method_name] = {
                        "functionObject": getattr(instance, method_name),
                        "instance": instance
                    }



if __name__ == '__main__':
    app_instance = MyFlaskApp()
    app_instance.run(debug=True)
