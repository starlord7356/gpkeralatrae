document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginButton = document.querySelector('.button1');
        
        // Basic validation
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Add loading state
        loginButton.classList.add('loading');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                // Redirect based on user type
                if (data.user_type === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            } else {
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = data.message || 'Invalid credentials';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login failed:', error);
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Login failed. Please try again.';
            errorMessage.style.display = 'block';
        } finally {
            // Remove loading state
            loginButton.classList.remove('loading');
        }
    });
});

// Add floating label effect
document.querySelectorAll('.form-group input').forEach(input => {
    input.addEventListener('input', function() {
        if (this.value) {
            this.classList.add('has-value');
        } else {
            this.classList.remove('has-value');
        }
    });
});