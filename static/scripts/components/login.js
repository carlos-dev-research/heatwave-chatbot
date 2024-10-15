import { setUser, setToken } from '../state.js';
import { getAuth } from '../api.js';
import { showSection, clearInputs } from '../ui.js';  // For switching forms
import { initSignup } from './signup.js';  // For initializing the sign-up component
import { updateChatHistoryBar } from './chat.js';
/**
 * Login component that handles the login form submission and state management.
 */
export function initLogin() {
    document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
    document.getElementById('show-signup-btn').addEventListener('click', switchToSignup);  // Switch to sign-up form
}

/**
 * Handles login form submission and updates the state.
 * @param {Event} event - The form submission event.
 */
async function handleLoginSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const token = await getAuth(username, password);
    if (token) {
        setUser(username);
        setToken(token);
        updateChatHistoryBar();
        showSection('chat');
    } else {
        alert('Login failed. Please try again.');
    }
}

/**
 * Switches the view from the login form to the sign-up form.
 */
function switchToSignup() {
    clearInputs();  // Clear form inputs
    showSection('signup');  // Show the sign-up section
    initSignup();  // Initialize the sign-up form
}

