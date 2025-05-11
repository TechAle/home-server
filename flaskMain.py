import os
import threading
import time

from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from webserver.utils.ClassUtils import getClassesWithRoutes
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
        app = self.app

        # HTML routes
        app.add_url_rule("/", view_func=self.home_page)
        app.add_url_rule("/unsubscribe", view_func=self.unsubscribe_page)
        app.add_url_rule("/admin", view_func=self.admin_page)

        # Push subscription API
        app.add_url_rule("/api/push-subscriptions", view_func=self.create_push_subscription, methods=["POST"])
        app.add_url_rule("/admin-api/trigger-push-notifications", view_func=self.trigger_push_notifications, methods=["POST"])


        # Extra test/debug route
        app.add_url_rule('/info', view_func=self.info)

    # HTML Pages
    def home_page(self):
        return render_template("webserver/templates/index.html")

    def unsubscribe_page(self):
        return render_template("webserver/templates/unsubscribe.html")

    def admin_page(self):
        return render_template("webserver/templates/admin.html")


    # API: Push subscription
    def create_push_subscription(self):
        json_data = request.get_json()
        Subscription = self.PushSubscription

        subscription = Subscription.query.filter_by(
            subscription_json=json_data['subscription_json']
        ).first()

        if subscription is None:
            subscription = Subscription(subscription_json=json_data['subscription_json'])
            self.db.session.add(subscription)
            self.db.session.commit()

        return jsonify({
            "status": "success",
            "result": {
                "id": subscription.id,
                "subscription_json": subscription.subscription_json
            }
        })

    # API: Admin trigger
    def trigger_push_notifications(self):
        json_data = request.get_json()
        subscriptions = self.PushSubscription.query.all()
        results = trigger_push_notifications_for_subscriptions(
            subscriptions,
            json_data.get('title'),
            json_data.get('body')
        )
        return jsonify({"status": "success", "result": results})

    # Test route
    def info(self):
        return f"Hello! {len(self.message_log)} messages received so far."

    def run(self, **kwargs):
        self.app.run(**kwargs)

    def init_executables(self):
        # Get all possible executables
        executables = getClassesWithRoutes("webserver/services/executables")
        # Now add them to the app
        for file, class_name, method_name in executables:
            module_name = file.replace("/", ".").replace(".py", "")
            module = import_module(module_name)
            cls = getattr(module, class_name)
            instance = cls()
            route_info = getattr(instance, method_name)._route_info
            self.app.add_url_rule(route_info["rule"], view_func=getattr(instance, method_name), methods=route_info["methods"])



if __name__ == '__main__':
    app_instance = MyFlaskApp()
    app_instance.run(debug=True)
