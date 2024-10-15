/**
 * State management module to handle shared state in the application.
 * Provides getter and setter functions for user, token, and conversation ID.
 * 
 * Variables:
 * - currentUser: Stores the currently logged-in user's username.
 * - authToken: Stores the authentication token for the current session.
 * - conversationId: Stores the current conversation ID.
 */

let currentUser = null;
let authToken = null;
let conversationId = null;
let audioChunks = [];  // Initialize the state for audio chunks
let mediaRecorder;

/**
 * Get the current user from the state.
 * @returns {string|null} - The current user or null if not set.
 */
export function getUser() {
    return currentUser;
}

/**
 * Set the current user in the state.
 * @param {string} user - The user to set.
 */
export function setUser(user) {
    currentUser = user;
}

/**
 * Get the authentication token from the state.
 * @returns {string|null} - The current token or null if not set.
 */
export function getToken() {
    return authToken;
}

/**
 * Set the authentication token in the state.
 * @param {string} token - The token to set.
 */
export function setToken(token) {
    authToken = token;
}

/**
 * Get the conversation ID from the state.
 * @returns {string|null} - The current conversation ID or null if not set.
 */
export function getConversationId() {
    return conversationId;
}

/**
 * Set the conversation ID in the state.
 * @param {string} id - The conversation ID to set.
 */
export function setConversationId(id) {
    conversationId = id;
}

/**
 * Get the audio chunks from the state.
 * @returns {Blob[]} - The current audio chunks array.
 */
export function getAudioChunks() {
    return audioChunks;
}

/**
 * Set the audio chunks in the state.
 * @param {Blob[]} chunks - The audio chunks to set.
 */
export function setAudioChunks(chunks) {
    audioChunks = chunks;
}

/**
* Get Media Recorder Object
*@param {MediaRecorder}
*/
export function getMediaRecorder(){
    return mediaRecorder;
}

/**
 * Set Media Recorder Object
 * @param {MediaRecorder}
 */export function setMediaRecorder(newMediaRecorder){
    mediaRecorder = newMediaRecorder;
 }