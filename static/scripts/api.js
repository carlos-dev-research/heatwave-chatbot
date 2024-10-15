import { addIncomingMessage, updateChatHistoryBar } from './components/chat.js';  
import { getUser, getToken, setConversationId } from './state.js';

/**
 * Logs in the user by calling the authentication API.
 * @param {string} user - The username.
 * @param {string} password - The user's password.
 * @returns {string|null} - The authentication token or null if there was an error.
 */
export async function getAuth(user, password) {
    let endpoint = `/get-auth?user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`;
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to authenticate.');
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error fetching auth token:', error);
        return null;
    }
}

/**
 * Registers a new user by calling the registration API.
 * @param {string} user - The username.
 * @param {string} password - The user's password.
 * @returns {string|null} - The authentication token or null if there was an error.
 */
export async function register(user, password) {
    let endpoint = `/register?user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`;
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to register.');
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error registering user:', error);
        return null;
    }
}

/**
 * Logs out the user by calling the logout API.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @returns {string|null} - Success message if logout is successful, otherwise null.
 */
export async function logoutUser(user, token) {
    const endpoint = `/logout?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}`;

    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to log out.');
        }
        const data = await response.json();
        return data.message;  // Return success message
    } catch (error) {
        console.error('Error logging out user:', error);
        return null;
    }
}

/**
 * Deletes the user account by calling the delete user API.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @param {string} password - The user's password to confirm deletion.
 * @returns {string|null} - Success message if deletion is successful, otherwise null.
 */
export async function deleteUser(user, token, password) {
    const endpoint = `/delete-user?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`;

    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to delete user.');
        }
        const data = await response.json();
        return data.message;  // Return success message
    } catch (error) {
        console.error('Error deleting user:', error);
        return null;
    }
}

/**
 * Sends a chat message to the server and dynamically adds incoming messages using EventSource.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @param {string} message - The chat message.
 * @param {string|null} conversationId - The conversation ID (optional).
 * @returns {Promise<string|null>} - The full streamed response text or null if there was an error.
 */
export async function sendMessage(user, token, message, conversationId = null) {
    // Construct the stream URL for EventSource
    let streamUrl = `/stream-send?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}&message=${encodeURIComponent(message)}`;
    if (conversationId) {
        streamUrl += `&conversation_id=${encodeURIComponent(conversationId)}`;
    }

    return new Promise((resolve, reject) => {
        // Initialize EventSource for streaming
        const eventSource = new EventSource(streamUrl);
        let incomingMessage;
        let incomingText = '';

        // Handle the conversation ID event (for new conversations)
        eventSource.addEventListener("conversation_id", (event) => {
            const newConversationId = event.data;
            if (conversationId == null) {
                // Set conversationId for the current session (if it's a new conversation)
                setConversationId(newConversationId);
                updateChatHistoryBar();
            }
        });

        // Handle chat events (streamed message chunks)
        eventSource.addEventListener("chat", (event) => {
            const data = JSON.parse(event.data);
            if (data.endOfMessage) {
                // Close the EventSource once the message is fully received
                eventSource.close();
                resolve(incomingText);
            } else {
                [incomingMessage, incomingText] = addIncomingMessage(data.response, incomingMessage, incomingText);  // Update the UI as chunks arrive
            }
        });

        // Handle errors in the EventSource
        eventSource.onerror = function () {
            eventSource.close();
            reject('EventSource failed.');
        };
    });
}

/**
 * Fetches the chat history for the current user.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @returns {Array|null} - The chat history, or null if there was an error.
 */
export async function getChatHistory(user, token) {
    let endpoint = `/get-chat-history?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}`;
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to fetch chat history.');
        }
        const data = await response.json();
        return data.chat_history;  // Assumed response structure
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return null;
    }
}

/**
 * Loads a specific conversation by its ID.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @param {string} conversationId - The ID of the conversation to load.
 * @returns {Array|null} - The conversation messages, or null if there was an error.
 */
export async function loadConversation(user, token, conversationId) {
    let endpoint = `/get-conversation?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}&conversation_id=${encodeURIComponent(conversationId)}`;
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Failed to load conversation.');
        }
        const data = await response.json();
        return data.conversation;  // Assumed response structure
    } catch (error) {
        console.error('Error loading conversation:', error);
        return null;
    }
}

/**
 * Deletes a conversation by its ID.
 * @param {string} user - The current user.
 * @param {string} token - The authentication token.
 * @param {string} conversationId - The ID of the conversation to delete.
 * @returns {string|null} - Success message if deletion is successful, otherwise null.
 */
export async function deleteConversation(user, token, conversationId) {
    const endpoint = `/delete-conversation?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}&conversation_id=${encodeURIComponent(conversationId)}`;
    
    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to delete conversation.');
        }
        const data = await response.json();
        return data.message;
    } catch (error) {
        console.error('Error deleting conversation:', error);
        return null;
    }
}

/**
 * Transcribes the recorded audio using the server API.
 * @param {Blob[]} audioChunks - The recorded audio chunks to transcribe.
 * @returns {string|null} - The transcribed text or null if there was an error.
 */
export async function transcribeAudio(audioChunks) {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('audioFile', audioBlob);

    const user = getUser();
    const token = getToken();
    formData.append('user', user);
    formData.append('token', token);

    try {
        const response = await fetch('/upload-audio', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            throw new Error('Failed to transcribe audio.');
        }
        const data = await response.json();
        return data.transcription;  // Return the transcribed text
    } catch (error) {
        console.error('Error transcribing audio:', error);
        return null;
    }
}
