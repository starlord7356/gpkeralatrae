let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let transactions = [];
let adminCenter = '';
let filters = {
    username: '',
    dateRange: '',
    wasteType: '',
    minPoints: '',
    maxPoints: ''
};

// Get admin's center information when page loads
async function getAdminCenter() {
    try {
        const response = await fetch('/api/admin/center-info');
        const data = await response.json();
        if (response.ok && data.success) {
            adminCenter = data.center;
            fetchTransactions(); // Initial fetch after getting center info
        } else {
            toastr.error('Failed to get center information');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to get center information');
    }
}

// Event listeners for filter inputs
document.getElementById('usernameFilter').addEventListener('input', function() {
    filters.username = this.value;
});

document.getElementById('wasteTypeFilter').addEventListener('change', function() {
    filters.wasteType = this.value;
});

document.getElementById('minPointsFilter').addEventListener('input', function() {
    filters.minPoints = this.value;
});

document.getElementById('maxPointsFilter').addEventListener('input', function() {
    filters.maxPoints = this.value;
});

document.getElementById('applyFilters').addEventListener('click', function() {
    currentPage = 1; // Reset to first page when applying filters
    fetchTransactions();
});

document.getElementById('resetFilters').addEventListener('click', function() {
    document.getElementById('usernameFilter').value = '';
    document.getElementById('dateRangeFilter').value = '';
    document.getElementById('wasteTypeFilter').value = '';
    document.getElementById('minPointsFilter').value = '';
    document.getElementById('maxPointsFilter').value = '';
    
    filters = {
        username: '',
        dateRange: '',
        wasteType: '',
        minPoints: '',
        maxPoints: ''
    };
    
    currentPage = 1;
    fetchTransactions();
});

// Initialize Flatpickr for date range picker
flatpickr('#dateRangeFilter', {
    mode: 'range',
    dateFormat: 'Y-m-d',
    onChange: function(selectedDates, dateStr) {
        filters.dateRange = dateStr;
    }
});

// Configure toastr notifications
toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: 'toast-top-right',
    timeOut: 3000
};

// Fetch and display transactions
async function fetchTransactions() {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage,
            center: adminCenter, // Add center parameter
            ...filters
        });

        const response = await fetch(`/api/transactions?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
            transactions = data.transactions;
            totalPages = Math.ceil(data.total / itemsPerPage);
            updatePagination();
            displayTransactions();
            updateSummaryStats(data.stats);
        } else {
            toastr.error('Failed to fetch transactions');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('An error occurred while fetching transactions');
    }
}

// Display transactions in the table
function displayTransactions() {
    const tableBody = document.getElementById('transactionsTable');
    tableBody.innerHTML = '';

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Convert UTC to IST using the formula (UTC + 5:30)
        const utcDate = new Date(transaction.created_at);
        const istDate = new Date(utcDate.getTime() + (5 * 60 + 30) * 60000); // Adding 5 hours and 30 minutes in milliseconds
        const istDateTime = istDate.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.username}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${istDateTime}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.wasteType}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.quantity}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.points}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editTransaction('${transaction._id}')" class="text-green-600 hover:text-green-900 mr-3">Edit</button>
                <button onclick="deleteTransaction('${transaction._id}')" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Update summary statistics
function updateSummaryStats(stats) {
    document.getElementById('totalQuantity').textContent = stats.totalQuantity.toFixed(2);
    document.getElementById('totalPoints').textContent = stats.totalPoints;
    document.getElementById('totalTransactions').textContent = stats.totalTransactions;
}

// Update pagination controls
function updatePagination() {
    document.getElementById('currentPage').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Points calculation logic based on waste type
function calculatePoints(wasteType, quantity) {
    const pointsPerKg = {
        'plastic': 11,
        'electronic': 16,
        'organic': 5,
        'metal': 13,
        'paper': 8,
        'glass': 8
    };
    return pointsPerKg[wasteType.toLowerCase()] * parseFloat(quantity) || 0;
}

// Edit transaction
function editTransaction(transactionId) {
    const transaction = transactions.find(t => t._id === transactionId);
    if (transaction) {
        document.getElementById('editTransactionId').value = transactionId;
        document.getElementById('editUsername').value = transaction.username;
        document.getElementById('editWasteType').value = transaction.wasteType.toLowerCase();
        document.getElementById('editQuantity').value = transaction.quantity;
        document.getElementById('editPoints').value = transaction.points;
        document.getElementById('editPoints').readOnly = true;
        document.getElementById('editModal').classList.remove('hidden');

        // Add event listeners for real-time point calculation
        const editWasteType = document.getElementById('editWasteType');
        const editQuantity = document.getElementById('editQuantity');
        const editPoints = document.getElementById('editPoints');

        function updatePoints() {
            const wasteType = editWasteType.value;
            const quantity = editQuantity.value;
            const newPoints = calculatePoints(wasteType, quantity);
            editPoints.value = newPoints;
        }

        editWasteType.addEventListener('change', updatePoints);
        editQuantity.addEventListener('input', updatePoints);
    }
}

// Delete transaction
async function deleteTransaction(transactionId) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toastr.success('Transaction deleted successfully');
                fetchTransactions();
            } else {
                toastr.error('Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('An error occurred while deleting the transaction');
        }
    }
}

// Event Listeners
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const transactionId = document.getElementById('editTransactionId').value;
    const formData = {
        username: document.getElementById('editUsername').value,
        wasteType: document.getElementById('editWasteType').value,
        quantity: parseFloat(document.getElementById('editQuantity').value),
        points: parseInt(document.getElementById('editPoints').value)
    };

    try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            document.getElementById('editModal').classList.add('hidden');
            toastr.success('Transaction updated successfully');
            fetchTransactions();
        } else {
            toastr.error('Failed to update transaction');
        }
    } catch (error) {
        console.error('Error:', error);
        toastr.error('An error occurred while updating the transaction');
    }
});

document.getElementById('cancelEdit').addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
});

document.getElementById('applyFilters').addEventListener('click', () => {
    filters.username = document.getElementById('usernameFilter').value;
    filters.wasteType = document.getElementById('wasteTypeFilter').value;
    filters.minPoints = document.getElementById('minPointsFilter').value;
    filters.maxPoints = document.getElementById('maxPointsFilter').value;
    currentPage = 1;
    fetchTransactions();
});

document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('usernameFilter').value = '';
    document.getElementById('dateRangeFilter').value = '';
    document.getElementById('wasteTypeFilter').value = '';
    document.getElementById('minPointsFilter').value = '';
    document.getElementById('maxPointsFilter').value = '';
    filters = {
        username: '',
        dateRange: '',
        wasteType: '',
        minPoints: '',
        maxPoints: ''
    };
    currentPage = 1;
    fetchTransactions();
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchTransactions();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchTransactions();
    }
});

document.getElementById('itemsPerPage').addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    fetchTransactions();
});

// Initial load
getAdminCenter();
fetchTransactions();