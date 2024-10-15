from flask import Blueprint, request, jsonify, current_app
from models import *

user_bp = Blueprint('user',__name__)

@user_bp.route('/get-auth',methods=['GET'])
def get_auth():
    """
    Endpoint to get authorization token to interact with user data
    """
    user = request.args.get('user')
    password = request.args.get('password')
    token_duration = 3

    # Check for bad input
    if user is None or password is None:
        return jsonify({'error':'Bad input arguments'}),400
    
    # Create new token
    try:
        token = session.create_token(current_app.mydb, user, password, token_duration)
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401
    
    return jsonify({'token':token})

@user_bp.route('/register',methods=['GET'])
def register():
    """
    Endpoint to get authorization token to interact with user data
    """
    user = request.args.get('user')
    password = request.args.get('password')
    token_duration = 3

    # Check for bad input
    if user is None or password is None:
        return jsonify({'error':'Bad input arguments'}),400
    
    # Create new token
    try:
        session.create_user(current_app.mydb, user, password)
        token = session.create_token(current_app.mydb, user, password, token_duration)
    except:
        return jsonify({'error': 'Unable to Create User'}), 401
    
    return jsonify({'token':token})


@user_bp.route('/logout', methods=['DELETE'])
def logout():
    """
    Endpoint to logout the user by deleting the token
    """
    # Extract arguments
    user = request.args.get('user')
    token = request.args.get('token')

    # Check for bad input
    if user is None or token is None:
        return jsonify({'error': 'Bad input arguments'}), 400

    # Create session instance for authorization
    try:
        ss = session(current_app.mydb, user, token)
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401

    # Delete the token (logging out the user)
    try:
        ss.delete_token()  # This should handle token deletion
    except:
        return jsonify({'error': 'Internal server error'}), 500

    return jsonify({'message': 'Logout successful'}), 200


@user_bp.route('/delete-user', methods=['DELETE'])
def delete_user():
    """
    Endpoint to delete the user by verifying password and token
    """
    # Extract arguments
    user = request.args.get('user')
    token = request.args.get('token')
    password = request.args.get('password')

    # Check for bad input
    if user is None or token is None or password is None:
        return jsonify({'error': 'Bad input arguments'}), 400

    # Create session instance for authorization
    try:
        ss = session(current_app.mydb, user, token)
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401

    # Delete the user after verifying password and token
    try:
        ss.delete_user(password, token)
    except:
        return jsonify({'error': 'Internal server error'}), 500

    return jsonify({'message': 'User deleted successfully'}), 200