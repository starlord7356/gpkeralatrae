document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const inputs = signupForm.querySelectorAll('input');

    // Configure toastr options
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 3000,
        preventDuplicates: true
    };

    // Add input validation on blur
    inputs.forEach(input => {
        input.addEventListener('blur', validateInput);
    });

    function validateInput(e) {
        const input = e.target;
        const value = input.value.trim();

        switch(input.id) {
            case 'name':
                if (value.length < 2) {
                    showError(input, 'Name must be at least 2 characters long');
                } else {
                    removeError(input);
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    showError(input, 'Please enter a valid email address');
                } else {
                    removeError(input);
                }
                break;
            case 'username':
                if (value.length < 3) {
                    showError(input, 'Username must be at least 3 characters long');
                } else {
                    removeError(input);
                }
                break;
            case 'password':
                if (value.length < 6) {
                    showError(input, 'Password must be at least 6 characters long');
                } else {
                    removeError(input);
                }
                break;
            case 'confirmPassword':
                const password = document.getElementById('password').value;
                if (value !== password) {
                    showError(input, 'Passwords do not match');
                } else {
                    removeError(input);
                }
                break;
        }
    }

    function showError(input, message) {
        const formGroup = input.closest('.space-y-4 > div');
        let errorDiv = formGroup.querySelector('.error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            formGroup.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        input.classList.add('border-red-500');
    }

    function removeError(input) {
        const formGroup = input.closest('.space-y-4 > div');
        const errorDiv = formGroup.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.classList.remove('border-red-500');
    }

    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const name = document.getElementById('name').value.trim();
        const dob = document.getElementById('dob').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate all inputs
        let hasErrors = false;
        inputs.forEach(input => {
            if (input.value.trim() === '') {
                showError(input, 'This field is required');
                hasErrors = true;
            } else {
                const event = new Event('blur');
                input.dispatchEvent(event);
                if (input.closest('.space-y-4 > div').querySelector('.error-message')) {
                    hasErrors = true;
                }
            }
        });

        if (hasErrors) {
            toastr.error('Please fix the errors before submitting');
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('#submitBtn');
        submitBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    dob,
                    email,
                    username,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                toastr.success('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                if (data.error === 'username_exists') {
                    toastr.error('Username already exists');
                } else if (data.error === 'email_exists') {
                    toastr.error('Email already registered');
                } else {
                    toastr.error(data.message || 'Registration failed');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('An error occurred. Please try again.');
        } finally {
            // Reset loading state
            submitBtn.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    });

    // Real-time password matching validation
    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    passwordInput.addEventListener('input', validatePasswordMatch);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
});