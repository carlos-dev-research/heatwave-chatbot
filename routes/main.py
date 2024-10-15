from flask import Blueprint, request,send_from_directory, url_for,redirect, current_app

main_bp = Blueprint('main',__name__)

# Main Endpoint
@main_bp.route('/')
def index():
    return redirect(url_for('main.send_static',path='main.html'))

@main_bp.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)