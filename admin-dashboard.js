// Check if user is logged in and fetch user info
async function checkAuth() {
    try {
        const response = await fetch('/api/user-info');
        if (!response.ok) {
            window.location.href = 'index.html';
            return;
        }
        const data = await response.json();
        displayUserInfo(data);
        // Fetch transactions after successful auth
        fetchTransactions();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    }
}

// Display user information in the dashboard
function displayUserInfo(data) {
    document.getElementById('centerName').textContent = data.center;
    document.getElementById('welcomeMessage').textContent = `Welcome to ${data.center}`;
    document.getElementById('centerDetails').textContent = 
        `You are logged in as ${data.username} for ${data.center}. You can manage your center's activities from this dashboard.`;
}

// Fetch transactions for the center
async function fetchTransactions() {
    try {
        const response = await fetch('/api/admin/transactions');
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        const transactions = await response.json();
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        document.getElementById('transactionsTable').innerHTML = '<tr><td colspan="6" class="text-center py-4">Failed to load transactions</td></tr>';
    }
}

// Display transactions in the table
function displayTransactions(transactions) {
    const tableBody = document.getElementById('transactionsTable');
    if (!transactions || transactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No transactions found</td></tr>';
        return;
    }

    tableBody.innerHTML = transactions.map(transaction => {
        // Convert UTC to IST
        const istDateTime = new Date(transaction.date).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        return `
        <tr class="border-b border-solid border-[#e7f3ec]">
            <td class="py-4 px-4">${transaction.username}</td>
            <td class="py-4 px-4">${transaction.wasteType}</td>
            <td class="py-4 px-4">${transaction.quantity} kg</td>
            <td class="py-4 px-4">${transaction.points}</td>
            <td class="py-4 px-4">${istDateTime}</td>
            <td class="py-4 px-4 flex gap-2">
                <button onclick="editTransaction('${transaction.id}')" class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Edit</button>
                <button onclick="deleteTransaction('${transaction.id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
            </td>
        </tr>
    `}).join('');
}

// Edit transaction
async function editTransaction(id) {
    // Implement edit functionality
    console.log('Edit transaction:', id);
}

// Delete transaction
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/transactions/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete transaction');
        }

        // Refresh transactions list
        fetchTransactions();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
    }
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout');
        if (response.ok) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

// Check authentication when page loads
document.addEventListener('DOMContentLoaded', checkAuth);