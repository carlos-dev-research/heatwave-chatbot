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


@chat_bp.route('/stream-send', methods=['GET'])
def stream_send():
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
            conversation = [{'role': 'user', 'content': message}]
            title = current_app.slm.create_title(message)
            conversation_id = ss.create_conversation(title,conversation)
        else:
            conversation = ss.read_conversation(conversation_id)
            conversation.append({'role': 'user', 'content': message})
            ss.update_conversation(conversation_id,conversation)
    except:
        return jsonify({'error':'Internal server error', 'status':500}),500


    # Streaming response
    def generate():
        # Send the conversation_id as an event for the stream
        yield f"event: conversation_id\ndata: {conversation_id}\n\n"

        try:
            # Call Ollama with streaming enabled and stream chat response
            stream = current_app.slm.chat(chat_history=conversation, data_folder=os.path.join(os.getcwd(),'data'), is_stream=True)
            out=""
            for chunk in stream.response_gen:
                out+= chunk
                data = json.dumps({"response": chunk, "endOfMessage": False})
                yield f"event: chat\ndata: {data}\n\n"   
            
            # Add response from the model to conversation and save it
            conversation.append({'role': 'assistant', 'content': out})
            ss.update_conversation(conversation_id,conversation)

            # Send last message
            end_message = json.dumps({"endOfMessage": True})
            yield f"event: chat\ndata: {end_message}\n\n"
        
        except Exception as e:
            error = json.dumps({'error':'Internal server error', 'status':500})
            yield f"event: error\ndata: {error}\n\n"
            return # Close conection
        
    return Response(stream_with_context(generate()), content_type='text/event-stream')