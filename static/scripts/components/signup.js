import { setUser, setToken } from '../state.js';
import { register } from '../api.js';
import { showSection, clearInputs } from '../ui.js';  // For switching forms
import { initLogin } from './login.js';  // For initializing the login component
import { updateChatHistoryBar } from './chat.js';

/**
 * Sign-up component that handles the sign-up form submission and state management.
 */
export function initSignup() {
    document.getElementById('signup-form').addEventListener('submit', handleSignupSubmit);
    document.getElementById('show-login-btn').addEventListener('click', switchToLogin);  // Switch to login form
}

/**
 * Handles sign-up form submission and updates the state.
 * @param {Event} event - The form submission event.
 */
async function handleSignupSubmit(event) {
    event.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    const token = await register(username, password);
    if (token) {
        setUser(username);
        setToken(token);
        updateChatHistoryBar();
        showSection('chat');
    } else {
        alert('Sign-up failed. Please try again.');
    }
}

/**
 * Switches the view from the sign-up form to the login form.
 */
function switchToLogin() {
    clearInputs();  // Clear form inputs
    showSection('login');  // Show the login section
    initLogin();  // Initialize the login form
}
