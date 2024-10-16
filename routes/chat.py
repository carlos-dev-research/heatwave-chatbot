from flask import Blueprint, request, jsonify, Response,stream_with_context, current_app
import os
from models import *

chat_bp = Blueprint('chat',__name__)


@chat_bp.route('/get-chat-history', methods=['GET'])
def get_chat_history():
    """
    Endpoint to get chat_history to be displayed in the user interface
    """
    # Extract request arguments
    user = request.args.get('user')
    token = request.args.get('token')

    # Check for bad input
    if user is None or token is None:
        return jsonify({'error':'Bad input arguments'}),400
    
    # Create session
    try:
        ss = session(current_app.mydb,user,token)
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401
    
    try:
        chat_history = ss.read_chat_history()

    except:
        return jsonify({'error':'Internal server error'}),500

    return jsonify({'chat_history':chat_history})

@chat_bp.route('/get-conversation', methods=['GET'])
def get_conversation():
    """
    Endpoint to retrieve Conversation using conversation_id
    """
    # Extract arguments
    user = request.args.get('user')
    token = request.args.get('token')
    conversation_id = request.args.get('conversation_id')

    # Check for bad input
    if user is None or token is None or conversation_id is None:
        return jsonify({'error': 'Bad input arguments'}), 400
    
    # Create session instance
    try:
        ss = session(current_app.mydb,user,token)
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401
    
    try:
        conversation = ss.read_conversation(conversation_id)
    except:
        return jsonify({'error':'Internal server error'}),500

    return jsonify({'conversation_id':conversation_id, 'conversation':conversation})

@chat_bp.route('/delete-conversation', methods=['DELETE'])
def delete_conversation():
    """
    Endpoint to delete Conversation using conversation_id
    """
    # Extract arguments
    user = request.args.get('user')
    token = request.args.get('token')
    conversation_id = request.args.get('conversation_id')

    # Check for missing input
    if user is None or token is None or conversation_id is None:
        return jsonify({'error': 'Bad input arguments'}), 400

    # Create session instance for authorization
    try:
        ss = session(current_app.mydb, user, token)  # Assuming session handles authorization
    except:
        return jsonify({'error': 'Unable to get authorization'}), 401

    # Delete the conversation
    try:
        ss.delete_conversation(conversation_id)  # Assuming ss has delete_conversation method
    except:
        return jsonify({'error': 'Internal server error'}), 500

    return jsonify({'message': f'Conversation deleted successfully'}), 200


@chat_bp.route('/chat', methods=['GET'])
def chat():
    """
    Endpoint to talk to the LM on Stream
    """
    # Extract arguments
    user = request.args.get('user')
    token = request.args.get('token')
    conversation_id = request.args.get('conversation_id')
    message = request.args.get('message')
    
    # Check for bad input
    if user is None or token is None or message is None:
        return jsonify({'error': 'Bad input arguments', 'status':400}), 400
    
    # Create session instance
    try:
        ss = session(current_app.mydb,user,token)
    except:
        return jsonify({'error': 'Unable to get authorization','status':401}), 401
    
    # Handle conversation creation or updating
    try:
        if conversation_id is None:
            template="""Your only task is to create headline for the following text, the complete Output of the text should be less than 30 characters
            Text:{}\n\n
            Headline: 
            """
            prompt = template.format(message)
            print(prompt)
            title= ss.gen_text(prompt)
            print(title)
            conversation_id = ss.create_conversation(title)
        
        chat_response, documents = ss.chat_db(conversation_id,message)
    except:
        return jsonify({'error':'Internal server error', 'status':500}),500
    
    return jsonify({'chat_response':chat_response, 'documents':documents})