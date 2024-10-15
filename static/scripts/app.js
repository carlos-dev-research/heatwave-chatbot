import { initLogin } from './components/login.js';
import { initSignup } from './components/signup.js';
import { initModal } from './components/modal.js';
import { initChat } from './components/chat.js';
import { showSection } from './ui.js';

/**
 * Main entry point for initializing the application.
 * Initializes all components and sets up event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    showSection('login')
    initLogin();  // Initialize the login component
    initSignup();  // Initialize the sign-up component
    initModal();  // Initialize the modal component
    initChat();  // Initialize the chat component
});
