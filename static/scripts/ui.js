/**
 * Shows the specified section (login, signup, or chat).
 * @param {string} section - The section to show ('login', 'signup', 'chat').
 */
export function showSection(section) {
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    const chatSection = document.getElementById('chat-section');

    if (section === 'login') {
        loginSection.style.display = 'flex';
        signupSection.style.display = 'none';
        chatSection.style.display = 'none';
    } else if (section === 'signup') {
        signupSection.style.display = 'flex';
        loginSection.style.display = 'none';
        chatSection.style.display = 'none';
    } else if (section === 'chat') {
        chatSection.style.display = 'block';
        loginSection.style.display = 'none';
        signupSection.style.display = 'none';
    }
}

/**
 * Clears all input fields in the forms.
 */
export function clearInputs() {
    document.querySelectorAll('input').forEach(input => input.value = '');
}
