// Points calculation rates per kg
const pointsRate = {
    plastic: 11,
    electronic: 16,
    organic: 5,
    metal: 13,
    paper: 8,
    glass: 8
};

// Waste type options with GP rates
const wasteTypeOptions = {
    plastic: 'Plastic - 11 GP/kg',
    electronic: 'Electronic - 16 GP/kg',
    organic: 'Organic - 5 GP/kg',
    metal: 'Metal - 13 GP/kg',
    paper: 'Paper - 8 GP/kg',
    glass: 'Glass - 8 GP/kg'
};

// Initialize toastr options
toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: "toast-top-right",
    timeOut: 3000
};

// DOM Elements
const usernameInput = document.getElementById('username');
const verifyUserBtn = document.getElementById('verifyUser');
const userInfoDiv = document.getElementById('userInfo');
const currentGPSpan = document.getElementById('currentGP');
const entriesContainer = document.getElementById('entriesContainer');
const addEntryBtn = document.getElementById('addEntry');
const summaryTableBody = document.getElementById('summaryTableBody');
const totalQuantityCell = document.getElementById('totalQuantity');
const totalPointsCell = document.getElementById('totalPoints');
const resetFormBtn = document.getElementById('resetForm');
const submitReportBtn = document.getElementById('submitReport');
const logoutBtn = document.getElementById('logoutBtn');
const centerNameElement = document.getElementById('centerName');

// Check authentication and get center name
async function checkAuth() {
    try {
        const response = await fetch('/api/user-info');
        if (!response.ok) {
            window.location.href = 'index.html';
            return;
        }
        const data = await response.json();
        if (data.user_type !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        centerNameElement.textContent = data.center;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'index.html';
    }
}

// Verify user and display GP balance
async function verifyUser() {
    const username = usernameInput.value.trim();
    if (!username) {
        toastr.error('Please enter a username');
        return;
    }

    try {
        const response = await fetch(`/api/user/${username}`);
        const data = await response.json();

        if (data.success) {
            userInfoDiv.classList.remove('hidden');
            currentGPSpan.textContent = parseFloat(data.currentGP).toFixed(2);
            toastr.success('User verified successfully');
            usernameInput.disabled = true;
            verifyUserBtn.disabled = true;
        } else {
            toastr.error('User not found');
        }
    } catch (error) {
        console.error('User verification failed:', error);
        toastr.error('Failed to verify user');
    }
}

// Calculate points based on waste type and quantity
function calculatePoints(wasteType, quantity) {
    if (!wasteType || !quantity) return 0;
    const points = pointsRate[wasteType] * parseFloat(quantity);
    return parseFloat(points.toFixed(2));
}

// Update summary table
function updateSummary() {
    let totalQuantity = 0;
    let totalPoints = 0;
    summaryTableBody.innerHTML = '';

    document.querySelectorAll('.waste-entry').forEach(entry => {
        const wasteType = entry.querySelector('.waste-type').value;
        const quantity = parseFloat(entry.querySelector('.quantity').value) || 0;
        const points = parseFloat(entry.querySelector('.points').value) || 0;

        if (wasteType && quantity > 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-2 text-[#0e1b13]">${wasteType.charAt(0).toUpperCase() + wasteType.slice(1)}</td>
                <td class="px-4 py-2 text-[#0e1b13]">${quantity.toFixed(2)}</td>
                <td class="px-4 py-2 text-[#0e1b13]">${points.toFixed(2)}</td>
            `;
            summaryTableBody.appendChild(row);

            totalQuantity += quantity;
            totalPoints += points;
        }
    });

    totalQuantityCell.textContent = totalQuantity.toFixed(2);
    totalPointsCell.textContent = totalPoints.toFixed(2);
}

// Add new waste entry
function addWasteEntry() {
    const template = document.querySelector('.waste-entry').cloneNode(true);
    template.querySelector('.waste-type').value = '';
    template.querySelector('.quantity').value = '';
    template.querySelector('.points').value = '';
    entriesContainer.appendChild(template);
    setupEntryListeners(template);
}

// Setup event listeners for waste entry
function setupEntryListeners(entry) {
    const wasteTypeSelect = entry.querySelector('.waste-type');
    const quantityInput = entry.querySelector('.quantity');
    const pointsInput = entry.querySelector('.points');
    const removeButton = entry.querySelector('.remove-entry');

    const updatePoints = () => {
        const wasteType = wasteTypeSelect.value;
        const quantity = parseFloat(quantityInput.value) || 0;
        pointsInput.value = calculatePoints(wasteType, quantity);
        updateSummary();
    };

    wasteTypeSelect.addEventListener('change', updatePoints);
    quantityInput.addEventListener('input', updatePoints);
    removeButton.addEventListener('click', () => {
        if (document.querySelectorAll('.waste-entry').length > 1) {
            entry.remove();
            updateSummary();
        } else {
            toastr.warning('At least one entry is required');
        }
    });
}

// Reset form
function resetForm() {
    if (confirm('Are you sure you want to reset the form? All entries will be cleared.')) {
        usernameInput.value = '';
        usernameInput.disabled = false;
        verifyUserBtn.disabled = false;
        userInfoDiv.classList.add('hidden');
        currentGPSpan.textContent = '0';

        // Keep only one empty entry
        const entries = document.querySelectorAll('.waste-entry');
        entries.forEach((entry, index) => {
            if (index === 0) {
                entry.querySelector('.waste-type').value = '';
                entry.querySelector('.quantity').value = '';
                entry.querySelector('.points').value = '';
            } else {
                entry.remove();
            }
        });

        updateSummary();
        toastr.success('Form has been reset');
    }
}

// Submit report
async function submitReport() {
    if (!usernameInput.value.trim()) {
        toastr.error('Please verify a user first');
        return;
    }

    const entries = [];
    let isValid = true;

    document.querySelectorAll('.waste-entry').forEach(entry => {
        const wasteType = entry.querySelector('.waste-type').value;
        const quantity = parseFloat(entry.querySelector('.quantity').value);
        const points = parseFloat(entry.querySelector('.points').value);

        if (!wasteType || !quantity || quantity <= 0) {
            isValid = false;
            return;
        }

        entries.push({ wasteType, quantity, points });
    });

    if (!isValid || entries.length === 0) {
        toastr.error('Please fill all entries with valid values');
        return;
    }

    if (!confirm('Are you sure you want to submit this report?')) {
        return;
    }

    try {
        const centerName = document.getElementById('centerName').textContent;
        for (const entry of entries) {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    wasteType: entry.wasteType,
                    quantity: entry.quantity,
                    center: centerName
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit report');
            }
        }

        toastr.success('Report submitted successfully');
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 2000);
    } catch (error) {
        console.error('Submit report failed:', error);
        toastr.error(error.message || 'Failed to submit report');
    }
}

// Logout functionality
async function logout() {
    try {
        const response = await fetch('/api/logout');
        if (response.ok) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Logout failed:', error);
        toastr.error('Failed to logout');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEntryListeners(document.querySelector('.waste-entry'));
});

verifyUserBtn.addEventListener('click', verifyUser);
addEntryBtn.addEventListener('click', addWasteEntry);
resetFormBtn.addEventListener('click', resetForm);
submitReportBtn.addEventListener('click', submitReport);
logoutBtn.addEventListener('click', logout);