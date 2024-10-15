from flask import Blueprint
from routes.main import main_bp
from routes.user import user_bp
from routes.chat import chat_bp

def register_routes(app):
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(chat_bp)
    