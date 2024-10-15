import { getUser, getToken, getConversationId, setConversationId, setAudioChunks, getAudioChunks, getMediaRecorder, setMediaRecorder } from '../state.js';
import { sendMessage, getChatHistory, loadConversation, transcribeAudio, deleteConversation } from '../api.js';
/**
 * Chat component that handles sending and receiving chat messages.
 */
export function initChat() {
    // Event listener for the keydown event (e.g., stop speech synthesis with space key)
    document.addEventListener('keydown', handleKeyDown);

    // Event listener to send message when the "Enter" key is pressed
    document.getElementById('chat-input').addEventListener('keypress', handleChatInputKeyPress);

    // Event listener for the send button
    document.getElementById('send-button').addEventListener('click', handleSendButtonClick);

    // Event listener for starting a new conversation
    document.getElementById('new-conversation-button').addEventListener('click', newConversation);

    // Event listeners for starting and stopping recording
    document.getElementById('startRecord').addEventListener('click', startRecording);
    document.getElementById('stopRecord').addEventListener('click', stopRecording);

    document.getElementById("startRecord").style.display = "inline-block";
    document.getElementById("stopRecord").style.display = "none";

}

/**
 * Handles the keydown event (e.g., stops speech synthesis when space key is pressed).
 * @param {Event} event - The keydown event.
 */
function handleKeyDown(event) {
    if (event.key === ' ' || event.code === 'Space') {
        window.speechSynthesis.cancel();  // Stop ongoing speech synthesis
    }
}

/**
 * Handles the keypress event for sending a chat message when the Enter key is pressed.
 * @param {Event} event - The keypress event.
 */
async function handleChatInputKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();  // Prevent form submission
        await sendChatMessage();  // Send chat message
    }
}

/**
 * Handles the send button click event for sending a chat message.
 */
async function handleSendButtonClick() {
    await sendChatMessage();  // Send chat message
}

/**
 * Sends the chat message using the sendMessage API and updates the chat history.
 * Adds outgoing messages to the chat UI and handles incoming messages dynamically.
 * @param {boolean} isAudio - If true, handle it as an audio message.
 * @param {string} inMessage - Alternative way to use the function to send message
 */
async function sendChatMessage(isAudio = false, inMessage=null) {
    let message;
    if (inMessage){
        message = inMessage
    }
    else{
        message = document.getElementById('chat-input').value.trim();
    }
    
    if (message === "") return;  // Prevent sending empty messages
    document.getElementById('chat-input').value = '';  // Clear input

    const user = getUser();
    const token = getToken();
    const conversationId = getConversationId();

    if (user && token && message) {
        // Add outgoing message to the UI
        addOutgoingMessage(message);

        // Disable send and create buttons during message processing
        document.getElementById('send-button').disabled = true;
        document.getElementById('new-conversation-button').disabled = true;

        try {
            // Send the message and handle the incoming response
            const incomingText = await sendMessage(user, token, message, conversationId);

            if (isAudio) {
                handleAudioResponse(incomingText);  // Read the message aloud if needed
            }

            updateChatHistoryBar();  // Optionally update chat history after the message

        } catch (error) {
            console.error('Error sending chat message:', error);
        }

        // Re-enable buttons once the message is processed
        document.getElementById('send-button').disabled = false;
        document.getElementById('new-conversation-button').disabled = false;
    } else {
        alert('Message cannot be sent. Ensure you are logged in and the input is not empty.');
    }
}

/**
 * Adds the outgoing message to the chat UI.
 * @param {string} message - The outgoing message text.
 */
export function addOutgoingMessage(message) {
    const messages = document.getElementById('messages');

    const outgoingMessage = document.createElement('div');
    outgoingMessage.classList.add('message', 'outgoing');

    const labelContainer = document.createElement('div');
    labelContainer.classList.add('labelContainer');

    const userLabel = document.createElement('span');
    userLabel.classList.add('label');
    userLabel.textContent = "User";
    labelContainer.appendChild(userLabel);

    const avatarImg = document.createElement('img');
    avatarImg.src = "images/user.webp";
    avatarImg.alt = "User";
    avatarImg.classList.add('avatar');
    labelContainer.appendChild(avatarImg);

    outgoingMessage.appendChild(labelContainer);
    outgoingMessage.appendChild(document.createTextNode(message));
    messages.appendChild(outgoingMessage);
    messages.scrollTop = messages.scrollHeight;
}

/**
 * Handles incoming messages by dynamically updating the UI as chunks arrive.
 * @param {string} responseText - The incoming message text.
 * @param {Element} incomingMessage - The incoming message DOM element.
 * @param {string} incomingText - The accumulated incoming message text.
 * @returns {[Element, string]} - Updated incoming message element and accumulated text.
 */
export function addIncomingMessage(responseText, incomingMessage, incomingText) {
    const messages = document.getElementById('messages');
    incomingText += responseText;

    if (!incomingMessage) {
        incomingMessage = document.createElement('div');
        incomingMessage.classList.add('message', 'incoming');

        // Message Container
        const labelContainer = document.createElement('div');
        labelContainer.classList.add('labelContainer');

        // Add Image
        const avatarImg = document.createElement('img');
        avatarImg.src = "images/assistant.webp";
        avatarImg.alt = "Assistant";
        avatarImg.classList.add('avatar');
        labelContainer.appendChild(avatarImg);

        // Add label
        const assistantLabel = document.createElement('span');
        assistantLabel.classList.add('label');
        assistantLabel.textContent = "Assistant";
        labelContainer.appendChild(assistantLabel);

        incomingMessage.appendChild(labelContainer);

        const responseContent = document.createElement('div');
        responseContent.classList.add('response-content');
        responseContent.innerHTML = cleanOutput(incomingText);
        incomingMessage.appendChild(responseContent);
        messages.appendChild(incomingMessage);

    } else {
        const responseContent = incomingMessage.querySelector('.response-content');
        responseContent.innerHTML = cleanOutput(incomingText);
    }

    messages.scrollTop = messages.scrollHeight;
    return [incomingMessage, incomingText];
}

/**
 * Handles audio responses by reading them aloud and controlling when to send new messages.
 * @param {string} incomingMessage - The message content to read aloud.
 */
function handleAudioResponse(incomingMessage) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(incomingMessage);
    utterance.voice = synth.getVoices().find(voice => voice.lang.startsWith('en'));

    // Disable startRecord button while audio is being read
    document.getElementById('startRecord').disabled = true;

    utterance.onend = function () {
        // Re-enable the startRecord button once the speech has finished
        document.getElementById('startRecord').disabled = false;
    };

    synth.speak(utterance);
}

/**
 * Updates the chat history bar with the latest conversations.
 * Renders an empty list if no chat history is present.
 */
export async function updateChatHistoryBar() {
    const user = getUser();
    const token = getToken();

    if (user && token) {
        const chatHistory = await getChatHistory(user, token);
        renderChatHistory(chatHistory || []);  // Render an empty list if no history
    } else {
        console.error('Unable to update chat history. User or token is missing.');
    }
}

/**
 * Renders the chat history inside the scrollable div.
 * Adds event listeners for each conversation and delete button dynamically.
 * @param {Array} chatHistory - An array of chat conversation data.
 */
function renderChatHistory(chatHistory) {
    const listContainer = document.getElementById('chat-history');
    listContainer.innerHTML = '';  // Clear any existing chat history

    chatHistory.reverse().forEach(([id, title, time]) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;

        // Event listener for selecting a conversation
        listItem.addEventListener('click', () => handleDisplayConversation(id));

        // Create a delete button for each conversation
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X'; // Label the button with an "X"
        deleteButton.className = 'list-item-delete';

        // Add event listener for deleting the conversation
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();  // Prevent triggering the conversation click
            handleDeleteConversation(id);  // Delete the conversation
        });

        listItem.appendChild(titleSpan);
        listItem.appendChild(deleteButton);
        listContainer.appendChild(listItem);
    });
}

/**
 * Starts the audio recording process.
 */
function startRecording() {
    document.getElementById('startRecord').style.display = 'none';
    document.getElementById('startRecord').disabled = true;  // Disable startRecord while recording
    document.getElementById('stopRecord').style.display = 'inline-block';
    

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            let mediaRecorder = new MediaRecorder(stream);
            setMediaRecorder(mediaRecorder);
            mediaRecorder.ondataavailable = event => {
                const chunks = getAudioChunks();  // Retrieve current audio chunks from state
                chunks.push(event.data);
                setAudioChunks(chunks);  // Store updated chunks in state
            };
            mediaRecorder.start();
            document.getElementById("stopRecord").disabled = false;
        });
}

/**
 * Stops the audio recording process and sends the recorded audio to the server.
 */
function stopRecording() {
    document.getElementById('startRecord').style.display = 'inline-block';
    document.getElementById('stopRecord').style.display = 'none';

    let mediaRecorder = getMediaRecorder();
    mediaRecorder.stop();
    document.getElementById("stopRecord").disabled = true;
    mediaRecorder.onstop = async () => {
        const audioChunks = getAudioChunks();  // Retrieve audio chunks from state
        const transcription = await transcribeAudio(audioChunks);

        if (transcription) {
            await sendChatMessage(true,transcription);  // Send as audio if transcription is successful
        } else {
            console.error('Error processing audio.');
        }

        // Reset audioChunks after use
        setAudioChunks([]);

        // Re-enable the startRecord button after sending the audio
        document.getElementById('startRecord').disabled = false;
    };
}

/**
 * Starts a new conversation by clearing the conversation ID and chat window.
 */
function newConversation() {
    setConversationId(null);  // Reset conversation ID in state
    document.getElementById('messages').innerHTML = '';  // Clear chat window
}

/**
 * Handles the deletion of a conversation by its ID.
 * @param {string} conversationId - The ID of the conversation to delete.
 */
async function handleDeleteConversation(conversationId) {
    const user = getUser();
    const token = getToken();

    const confirmation = confirm('Are you sure you want to delete this conversation?');
    if (confirmation && user && token) {
        await deleteConversation(user, token, conversationId);  // Call API to delete conversation
        if (conversationId == getConversationId()){
            newConversation();
        }
        updateChatHistoryBar();  // Refresh chat history after deletion
    }
}

/**
 * Handles the display of a conversation by its ID.
 * @param {string} conversationId - The ID of the conversation to display.
 */
async function handleDisplayConversation(conversationId) {
    const user = getUser();
    const token = getToken();

    if (user && token) {
        let conversation = await loadConversation(user, token, conversationId);  // Call API to load conversation
        if (conversation){
            // Clean actual converation
            document.getElementById("messages").innerHTML = "";
            setConversationId(conversationId);
            for (const message of conversation){
                if (message.role == "user"){
                    addOutgoingMessage(message.content)
                }
                else if (message.role == "assistant"){
                    let incomingMessage;
                    addIncomingMessage(message.content,incomingMessage,"")
                }
            }
        }
        else{
            alert("NO conversation Found")
        }
    }
}

/**
 * Preprocess the server response for safe HTML display and format code snippets.
 * @param {string} rsp - The response from the server.
 * @returns {string} Safe and formatted HTML string.
 */
function cleanOutput(rsp) {
    // Convert angle brackets to prevent HTML injection
    rsp = rsp.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Handle code snippets by wrapping them in <pre> tags for proper formatting
    rsp = rsp.replace(/```[^\s]+/g, "<pre>"); // Start code block
    rsp = rsp.replace(/```/g, "</pre>"); // End code block
    
    // Convert markdown to HTML
    var converter = new showdown.Converter();
    var safeHtml = converter.makeHtml(rsp);
    return safeHtml;
}