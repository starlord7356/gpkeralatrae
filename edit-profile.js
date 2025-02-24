// Fetch and populate user data when the page loads
async function fetchUserData() {
    try {
        const response = await fetch('/api/user-info');
        const data = await response.json();

        if (response.ok) {
            // Populate form fields (excluding password fields)
            document.getElementById('name').value = data.name;
            document.getElementById('username').value = data.username;
            document.getElementById('email').value = data.email;
            document.getElementById('dob').value = data.dob;

            // Ensure password fields are empty
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert('Failed to load user data. Please try again.');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        alert('Failed to load user data. Please try again.');
    }
}

// Handle personal details form submission
document.getElementById('personalDetailsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Reset error messages
    document.querySelectorAll('.error-text').forEach(error => error.style.display = 'none');

    // Get form values
    const formData = {
        name: document.getElementById('name').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        dob: document.getElementById('dob').value
    };

    // Basic validation
    if (!formData.name || !formData.username || !formData.email || !formData.dob) {
        alert('Please fill in all fields');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        const emailError = document.getElementById('email-error');
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        return;
    }

    // Show confirmation dialog
    if (!confirm('Are you sure you want to update your profile?')) {
        return;
    }

    // Show loading state
    const saveButton = document.querySelector('#personalDetailsForm button');
    saveButton.querySelector('.save-text').classList.add('hidden');
    saveButton.querySelector('.loading-text').classList.remove('hidden');
    saveButton.disabled = true;

    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            alert('Profile updated successfully!');
        } else {
            if (data.error === 'username_exists') {
                const usernameError = document.getElementById('username-error');
                usernameError.textContent = 'Username already exists';
                usernameError.style.display = 'block';
            } else if (data.error === 'email_exists') {
                const emailError = document.getElementById('email-error');
                emailError.textContent = 'Email already registered';
                emailError.style.display = 'block';
            } else {
                alert(data.message || 'Failed to update profile');
            }
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    } finally {
        // Reset button state
        saveButton.querySelector('.save-text').classList.remove('hidden');
        saveButton.querySelector('.loading-text').classList.add('hidden');
        saveButton.disabled = false;
    }
});

// Handle password form submission
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Reset error messages
    document.querySelectorAll('.error-text').forEach(error => error.style.display = 'none');

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        const confirmPasswordError = document.getElementById('confirm-password-error');
        confirmPasswordError.textContent = 'Passwords do not match';
        confirmPasswordError.style.display = 'block';
        return;
    }

    // Show confirmation dialog
    if (!confirm('Are you sure you want to change your password?')) {
        return;
    }

    // Show loading state
    const updateButton = document.querySelector('#passwordForm button');
    updateButton.querySelector('.save-text').classList.add('hidden');
    updateButton.querySelector('.loading-text').classList.remove('hidden');
    updateButton.disabled = true;

    try {
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Password updated successfully!');
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            if (data.error === 'invalid_password') {
                const currentPasswordError = document.getElementById('current-password-error');
                currentPasswordError.textContent = 'Invalid current password';
                currentPasswordError.style.display = 'block';
            } else {
                alert(data.message || 'Failed to update password');
            }
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('Failed to update password. Please try again.');
    } finally {
        // Reset button state
        updateButton.querySelector('.save-text').classList.remove('hidden');
        updateButton.querySelector('.loading-text').classList.add('hidden');
        updateButton.disabled = false;
    }
});

// Real-time password matching validation
document.getElementById('confirmPassword').addEventListener('input', function() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = this.value;
    const confirmPasswordError = document.getElementById('confirm-password-error');
    
    if (confirmPassword && newPassword !== confirmPassword) {
        confirmPasswordError.textContent = 'Passwords do not match';
        confirmPasswordError.style.display = 'block';
    } else {
        confirmPasswordError.style.display = 'none';
    }
});

// Clear current password error on input
document.getElementById('currentPassword').addEventListener('input', function() {
    const currentPasswordError = document.getElementById('current-password-error');
    currentPasswordError.style.display = 'none';
});

// Load user data when the page loads
document.addEventListener('DOMContentLoaded', fetchUserData);