document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthStatus();

    // Add event listener for logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add event listener for user dropdown toggle
    const dropdownToggle = document.getElementById('userDropdownToggle');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const userDropdown = document.getElementById('userDropdown');

    if (dropdownToggle && userDropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('hidden');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (userDropdown && !userDropdown.contains(e.target)) {
            userDropdownMenu?.classList.add('hidden');
        }
    });

    // Fetch and display user data
    fetchUserData();
});

function checkAuthStatus() {
    fetch('/api/user-info', {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .catch(() => {
            window.location.href = '/index.html';
        });
}

function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

function fetchUserData() {
    // Show loading state
    document.getElementById('userName').textContent = 'Loading...';
    document.getElementById('userEmail').textContent = 'Loading...';
    document.getElementById('totalPoints').textContent = '0';
    document.getElementById('memberSince').textContent = 'Loading...';
    document.getElementById('pointsEarned').textContent = '0';
    
    fetch('/api/user-info', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('User not found');
                } else if (response.status === 401) {
                    window.location.href = '/index.html';
                    throw new Error('Not authenticated');
                }
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.username) {
                throw new Error('Invalid user data received');
            }
            
            const initials = getInitials(data.name || data.username);
            const createdDate = data.created_at ? new Date(data.created_at) : new Date();
            
            // Update user information
            document.getElementById('userName').textContent = data.name || data.username;
            document.getElementById('userEmail').textContent = data.email || 'No email provided';
            document.getElementById('userInitials').textContent = initials;
            document.getElementById('userInitialsLarge').textContent = initials;
            document.getElementById('userNameLarge').textContent = data.name || data.username;
            document.getElementById('userEmailLarge').textContent = data.email || 'No email provided';
            
            // Update additional information with proper fallbacks
            document.getElementById('totalPoints').textContent = data.points?.toString() || '0';
            document.getElementById('memberSince').textContent = createdDate.toLocaleDateString();
            document.getElementById('pointsEarned').textContent = data.weekly_points?.toString() || '0';
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            document.getElementById('userName').textContent = 'Error loading user data';
            document.getElementById('userEmail').textContent = 'Please try refreshing the page';
            document.getElementById('userInitials').textContent = '!';
            document.getElementById('userInitialsLarge').textContent = '!';
            document.getElementById('userNameLarge').textContent = 'Error loading user data';
            document.getElementById('userEmailLarge').textContent = 'Please try refreshing the page';
            document.getElementById('totalPoints').textContent = '0';
            document.getElementById('memberSince').textContent = 'Error';
            document.getElementById('pointsEarned').textContent = '0';
        });
}

function handleLogout() {
    fetch('/api/logout', {
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/index.html';
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
        });
}