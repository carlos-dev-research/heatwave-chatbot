import { logoutUser, deleteUser } from '../api.js';
import { getUser, getToken } from '../state.js';  // Access state here

/**
 * Modal component that handles showing, hiding, logout, and delete user functionality.
 */
export function initModal() {
    // Open modal when the user button is clicked
    document.getElementById('user-btn').addEventListener('click', showModal);

    // Close modal when the close button is clicked
    document.getElementById('close-modal').addEventListener('click', closeModal);

    // Close modal when clicking outside the modal content
    window.addEventListener('click', handleWindowClick);

    // Add event listeners for Logout and Delete User buttons
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('delete-btn').addEventListener('click', handleDeleteUser);
}

/**
 * Shows the user modal by setting its display style.
 */
function showModal() {
    const modal = document.getElementById('popup-modal');
    modal.style.display = 'flex';  // Show the modal
}

/**
 * Closes the user modal by setting its display style.
 */
function closeModal() {
    const modal = document.getElementById('popup-modal');
    modal.style.display = 'none';  // Hide the modal
}

/**
 * Closes the modal when clicking outside the modal content.
 * @param {Event} event - The window click event.
 */
function handleWindowClick(event) {
    const modal = document.getElementById('popup-modal');
    if (event.target === modal) {
        modal.style.display = 'none';  // Hide modal if clicked outside
    }
}

/**
 * Handles the Logout button click event.
 * Logs out the user by calling the logout API and refreshing the page.
 */
async function handleLogout() {
    const user = getUser();  // Get the current user from the state
    const token = getToken();  // Get the authentication token from the state

    if (user && token) {
        await logoutUser(user, token);  // Call the logout API with parameters
        alert('You have been logged out.');
        closeModal();  // Close the modal
        location.reload();  // Reload the page to reset the state
    } else {
        alert('Unable to log out. Please try again.');
    }
}

/**
 * Handles the Delete User button click event.
 * Deletes the user account by calling the delete user API.
 */
async function handleDeleteUser() {
    const user = getUser();  // Get the current user from the state
    const token = getToken();  // Get the authentication token from the state

    // Ask the user for their password
    const password = prompt('Please enter your password to delete your account:');
    if (!password) {
        alert('Password is required to delete your account.');
        return;
    }

    const confirmation = confirm('Are you sure you want to delete your account? This action is irreversible.');
    if (confirmation && user && token) {
        await deleteUser(user, token, password);  // Call the delete user API with parameters
        alert('Your account has been deleted.');
        closeModal();  // Close the modal
        location.reload();  // Reload the page after account deletion
    } else {
        alert('Unable to delete account. Please try again.');
    }
}

