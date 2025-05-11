import os
import threading
import time

from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from webserver.utils.ClassUtils import getClassesWithRules
from importlib import import_module

from webserver.webpush_handler import trigger_push_notifications_for_subscriptions


class MyFlaskApp:
    def __init__(self):
        self.app = Flask(__name__, instance_relative_config=True)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite://"
        self.app.config.from_pyfile('application.cfg.py')

        self.db = SQLAlchemy(self.app)
        self.scheduled_functions = []
        self.message_log = []
        self.managers_functions = {}
        self.scheduled_functions = []

        self.init_db_models()
        self.configure_routes()

        # Scheduler logic to avoid re-entrance in debug autoreload
        if self.app.debug or 'RUNNING' in os.environ:
            self.init_executables()
            self.register_scheduled_tasks()
            self.start_scheduler()
        else:
            os.environ['RUNNING'] = "True"

    def init_db_models(self):
        class PushSubscription(self.db.Model):
            id = self.db.Column(self.db.Integer, primary_key=True, unique=True)
            subscription_json = self.db.Column(self.db.Text, nullable=False)

        self.PushSubscription = PushSubscription
        with self.app.app_context():
            self.db.create_all()

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

        # Push subscription API
        self._add_push_subscription_routes()

        # Extra test/debug route
        self._add_extra_routes()

    def _add_html_routes(self):
        @self.app.route("/")
        def home_page():
            return render_template("webserver/templates/index.html")

        @self.app.route("/unsubscribe")
        def unsubscribe_page():
            return render_template("webserver/templates/unsubscribe.html")

        @self.app.route("/admin")
        def admin_page():
            return render_template("webserver/templates/admin.html")

    def _add_push_subscription_routes(self):
        @self.app.route("/api/push-subscriptions", methods=["POST"])
        def create_push_subscription():
            json_data = request.get_json()
            subscription = self.PushSubscription.query.filter_by(
                subscription_json=json_data['subscription_json']
            ).first()

            if subscription is None:
                subscription = self.PushSubscription(subscription_json=json_data['subscription_json'])
                self.db.session.add(subscription)
                self.db.session.commit()

            return jsonify({
                "status": "success",
                "result": {
                    "id": subscription.id,
                    "subscription_json": subscription.subscription_json
                }
            })

        @self.app.route("/admin-api/trigger-push-notifications", methods=["POST"])
        def trigger_push_notifications():
            json_data = request.get_json()
            subscriptions = self.PushSubscription.query.all()
            results = trigger_push_notifications_for_subscriptions(
                subscriptions,
                json_data.get('title'),
                json_data.get('body')
            )
            return jsonify({"status": "success", "result": results})

    def _add_extra_routes(self):
        @self.app.route('/info')
        def info():
            return f"Hello! {len(self.message_log)} messages received so far."

    def run(self, **kwargs):
        self.app.run(**kwargs)

    def init_executables(self):
        # Get all possible executables
        executables = getClassesWithRules("webserver/services/executables", ["route", "scheduled_task", "server_function"])
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
                    self.app.add_url_rule(function["args"]["rule"], view_func=getattr(instance, method_name),
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
