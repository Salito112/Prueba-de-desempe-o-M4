// Financial Data Management System - Frontend JavaScript

// Global variables
let currentClientId = null;
let isEditingClient = false;
const API_BASE_URL = window.location.origin + '/api';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Check API health
        await checkApiHealth();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        await loadDashboardData();
        
        // Load platforms for filter
        await loadPlatforms();
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showAlert('Failed to initialize application. Please refresh the page.', 'danger');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    // Client search
    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchClients();
            }
        });
    }

    // CSV upload form
    const csvForm = document.getElementById('csvUploadForm');
    if (csvForm) {
        csvForm.addEventListener('submit', handleCsvUpload);
    }

    // Client form validation
    setupClientFormValidation();
}

// Check API health
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.success) {
            updateSystemStatus(true);
        } else {
            updateSystemStatus(false);
        }
    } catch (error) {
        console.error('API health check failed:', error);
        updateSystemStatus(false);
    }
}

// Update system status display
function updateSystemStatus(isHealthy) {
    const statusElement = document.getElementById('systemStatus');
    if (statusElement) {
        if (isHealthy) {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center mb-2">
                    <i class="bi bi-circle-fill text-success me-2"></i>
                    <span>Database: Connected</span>
                </div>
                <div class="d-flex align-items-center mb-2">
                    <i class="bi bi-circle-fill text-success me-2"></i>
                    <span>API: Running</span>
                </div>
                <div class="d-flex align-items-center">
                    <i class="bi bi-circle-fill text-success me-2"></i>
                    <span>Frontend: Active</span>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center mb-2">
                    <i class="bi bi-circle-fill text-danger me-2"></i>
                    <span>Database: Disconnected</span>
                </div>
                <div class="d-flex align-items-center mb-2">
                    <i class="bi bi-circle-fill text-danger me-2"></i>
                    <span>API: Error</span>
                </div>
                <div class="d-flex align-items-center">
                    <i class="bi bi-circle-fill text-warning me-2"></i>
                    <span>Frontend: Limited</span>
                </div>
            `;
        }
    }
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'clients':
            loadClients();
            break;
        case 'reports':
            loadReports();
            break;
        case 'data-loader':
            // No specific data to load
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load client statistics
        const statsResponse = await fetch(`${API_BASE_URL}/clients/statistics`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            updateDashboardStats(statsData.data);
        }

        // Load pending invoices count
        const pendingResponse = await fetch(`${API_BASE_URL}/queries/pending-invoices`);
        const pendingData = await pendingResponse.json();
        
        if (pendingData.success) {
            document.getElementById('pendingInvoices').textContent = pendingData.summary.total_pending_invoices;
        }

        // Load total transactions
        const transactionsResponse = await fetch(`${API_BASE_URL}/queries/transactions-by-platform`);
        const transactionsData = await transactionsResponse.json();
        
        if (transactionsData.success) {
            document.getElementById('totalTransactions').textContent = transactionsData.summary.total_transactions;
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data', 'danger');
    } finally {
        showLoading(false);
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.getElementById('totalClients').textContent = stats.total_clients || 0;
    document.getElementById('activeClients').textContent = stats.active_clients || 0;
}

// Load clients
async function loadClients() {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/clients`);
        const data = await response.json();
        
        if (data.success) {
            renderClientsTable(data.data);
        } else {
            showAlert('Failed to load clients', 'danger');
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        showAlert('Failed to load clients', 'danger');
    } finally {
        showLoading(false);
    }
}

// Render clients table
function renderClientsTable(clients) {
    const tbody = document.getElementById('clientsTableBody');
    
    if (!clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No clients found</td></tr>';
        return;
    }

    tbody.innerHTML = clients.map(client => `
        <tr>
            <td><strong>${client.client_code}</strong></td>
            <td>${client.first_name} ${client.last_name}</td>
            <td>${client.email || '-'}</td>
            <td>${client.city || '-'}</td>
            <td>
                <span class="badge ${client.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${client.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editClient(${client.client_id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteClient(${client.client_id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Search clients
async function searchClients() {
    const searchTerm = document.getElementById('clientSearch').value.trim();
    
    if (!searchTerm) {
        loadClients();
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/clients/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.success) {
            renderClientsTable(data.data);
        } else {
            showAlert('Failed to search clients', 'danger');
        }
    } catch (error) {
        console.error('Error searching clients:', error);
        showAlert('Failed to search clients', 'danger');
    } finally {
        showLoading(false);
    }
}

// Show client modal
function showClientModal(clientId = null) {
    const modal = new bootstrap.Modal(document.getElementById('clientModal'));
    const title = document.getElementById('clientModalTitle');
    const form = document.getElementById('clientForm');
    
    // Reset form
    form.reset();
    
    if (clientId) {
        // Edit mode
        title.textContent = 'Edit Client';
        currentClientId = clientId;
        isEditingClient = true;
        loadClientData(clientId);
    } else {
        // Add mode
        title.textContent = 'Add New Client';
        currentClientId = null;
        isEditingClient = false;
    }
    
    modal.show();
}

// Load client data for editing
async function loadClientData(clientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/clients/${clientId}`);
        const data = await response.json();
        
        if (data.success) {
            const client = data.data;
            document.getElementById('clientId').value = client.client_id;
            document.getElementById('clientCode').value = client.client_code;
            document.getElementById('clientFirstName').value = client.first_name;
            document.getElementById('clientLastName').value = client.last_name;
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('clientCity').value = client.city || '';
            document.getElementById('clientDepartment').value = client.department || '';
            document.getElementById('clientAddress').value = client.address || '';
        }
    } catch (error) {
        console.error('Error loading client data:', error);
        showAlert('Failed to load client data', 'danger');
    }
}

// Save client
async function saveClient() {
    const form = document.getElementById('clientForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const clientData = {
        client_code: document.getElementById('clientCode').value,
        first_name: document.getElementById('clientFirstName').value,
        last_name: document.getElementById('clientLastName').value,
        email: document.getElementById('clientEmail').value || null,
        phone: document.getElementById('clientPhone').value || null,
        city: document.getElementById('clientCity').value || null,
        department: document.getElementById('clientDepartment').value || null,
        address: document.getElementById('clientAddress').value || null
    };

    try {
        showLoading(true);
        
        const url = isEditingClient 
            ? `${API_BASE_URL}/clients/${currentClientId}`
            : `${API_BASE_URL}/clients`;
        
        const method = isEditingClient ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clientData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(
                isEditingClient ? 'Client updated successfully' : 'Client created successfully', 
                'success'
            );
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
            modal.hide();
            
            // Reload clients
            loadClients();
            
            // Update dashboard if on dashboard
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'Failed to save client', 'danger');
        }
    } catch (error) {
        console.error('Error saving client:', error);
        showAlert('Failed to save client', 'danger');
    } finally {
        showLoading(false);
    }
}

// Edit client
function editClient(clientId) {
    showClientModal(clientId);
}

// Delete client
async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) {
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Client deleted successfully', 'success');
            loadClients();
            
            // Update dashboard if on dashboard
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'Failed to delete client', 'danger');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showAlert('Failed to delete client', 'danger');
    } finally {
        showLoading(false);
    }
}

// Load reports
async function loadReports() {
    await Promise.all([
        loadTotalPayments(),
        loadPendingInvoices(),
        loadTransactionsByPlatform()
    ]);
}

// Load total payments
async function loadTotalPayments() {
    try {
        const response = await fetch(`${API_BASE_URL}/queries/total-payments`);
        const data = await response.json();
        
        if (data.success) {
            renderPaymentsTable(data.data);
        }
    } catch (error) {
        console.error('Error loading total payments:', error);
    }
}

// Render payments table
function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No payment data found</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td><strong>${payment.client_code}</strong></td>
            <td>${payment.client_name}</td>
            <td>${payment.email || '-'}</td>
            <td>${payment.city || '-'}</td>
            <td><strong>$${parseFloat(payment.total_paid).toLocaleString()}</strong></td>
            <td><span class="badge bg-info">${payment.total_transactions}</span></td>
            <td>${payment.last_payment_date ? new Date(payment.last_payment_date).toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');
}

// Load pending invoices
async function loadPendingInvoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/queries/pending-invoices`);
        const data = await response.json();
        
        if (data.success) {
            renderPendingInvoicesTable(data.data);
        }
    } catch (error) {
        console.error('Error loading pending invoices:', error);
    }
}

// Render pending invoices table
function renderPendingInvoicesTable(invoices) {
    const tbody = document.getElementById('pendingTableBody');
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No pending invoices found</td></tr>';
        return;
    }

    tbody.innerHTML = invoices.map(invoice => {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        let statusBadge = '';
        if (daysOverdue > 0) {
            statusBadge = `<span class="badge bg-danger">Overdue (${daysOverdue} days)</span>`;
        } else if (daysOverdue === 0) {
            statusBadge = '<span class="badge bg-warning">Due Today</span>';
        } else {
            statusBadge = '<span class="badge bg-info">Pending</span>';
        }

        return `
            <tr>
                <td><strong>${invoice.invoice_number}</strong></td>
                <td>${invoice.client_name}</td>
                <td>${dueDate.toLocaleDateString()}</td>
                <td>$${parseFloat(invoice.total_amount).toLocaleString()}</td>
                <td>$${parseFloat(invoice.paid_amount).toLocaleString()}</td>
                <td><strong>$${parseFloat(invoice.pending_amount).toLocaleString()}</strong></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// Load transactions by platform
async function loadTransactionsByPlatform(platform = '') {
    try {
        const url = platform 
            ? `${API_BASE_URL}/queries/transactions-by-platform?platform=${encodeURIComponent(platform)}`
            : `${API_BASE_URL}/queries/transactions-by-platform`;
            
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            renderTransactionsTable(data.data);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Render transactions table
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(transaction => {
        const statusBadge = transaction.status === 'COMPLETED' 
            ? '<span class="badge bg-success">Completed</span>'
            : transaction.status === 'PENDING'
            ? '<span class="badge bg-warning">Pending</span>'
            : '<span class="badge bg-danger">Failed</span>';

        return `
            <tr>
                <td><strong>${transaction.platform_name}</strong></td>
                <td>${transaction.transaction_reference}</td>
                <td>${transaction.client_name}</td>
                <td>${transaction.invoice_number}</td>
                <td><strong>$${parseFloat(transaction.amount).toLocaleString()}</strong></td>
                <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// Load platforms for filter
async function loadPlatforms() {
    try {
        const response = await fetch(`${API_BASE_URL}/queries/platforms`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('platformFilter');
            if (select) {
                select.innerHTML = '<option value="">All Platforms</option>' +
                    data.data.map(platform => 
                        `<option value="${platform.platform_name}">${platform.platform_name}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading platforms:', error);
    }
}

// Filter transactions by platform
function filterTransactionsByPlatform() {
    const platform = document.getElementById('platformFilter').value;
    loadTransactionsByPlatform(platform);
}

// Handle CSV upload
async function handleCsvUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Please select a CSV file', 'warning');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showAlert('Please select a valid CSV file', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('csvFile', file);
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/data-loader/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUploadResults(data);
            showAlert('CSV file uploaded and processed successfully', 'success');
            
            // Reload dashboard data
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'Failed to upload CSV file', 'danger');
            if (data.errors) {
                showUploadErrors(data.errors);
            }
        }
    } catch (error) {
        console.error('Error uploading CSV:', error);
        showAlert('Failed to upload CSV file', 'danger');
    } finally {
        showLoading(false);
        fileInput.value = '';
    }
}

// Load sample data
async function loadSampleData() {
    if (!confirm('This will load sample financial data. Continue?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/data-loader/load-sample`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUploadResults(data);
            showAlert('Sample data loaded successfully', 'success');
            
            // Reload all data
            await loadDashboardData();
            if (document.getElementById('clients').classList.contains('active')) {
                loadClients();
            }
            if (document.getElementById('reports').classList.contains('active')) {
                loadReports();
            }
        } else {
            showAlert(data.message || 'Failed to load sample data', 'danger');
        }
    } catch (error) {
        console.error('Error loading sample data:', error);
        showAlert('Failed to load sample data', 'danger');
    } finally {
        showLoading(false);
    }
}

// Show upload results
function showUploadResults(data) {
    const resultsDiv = document.getElementById('uploadResults');
    
    if (data.summary) {
        resultsDiv.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="bi bi-check-circle me-2"></i>Upload Summary</h6>
                <ul class="mb-0">
                    <li>Clients created: ${data.summary.clients_created}</li>
                    <li>Clients updated: ${data.summary.clients_updated}</li>
                    <li>Invoices created: ${data.summary.invoices_created}</li>
                    <li>Invoices updated: ${data.summary.invoices_updated}</li>
                    <li>Transactions created: ${data.summary.transactions_created}</li>
                    <li>Transactions updated: ${data.summary.transactions_updated}</li>
                </ul>
                ${data.summary.errors && data.summary.errors.length > 0 ? 
                    `<hr><strong>Errors:</strong><ul>${data.summary.errors.map(e => `<li>${e.client_code}: ${e.error}</li>`).join('')}</ul>` : 
                    ''
                }
            </div>
        `;
    } else {
        resultsDiv.innerHTML = '<p class="text-muted">No upload results to display.</p>';
    }
}

// Show upload errors
function showUploadErrors(errors) {
    const resultsDiv = document.getElementById('uploadResults');
    
    resultsDiv.innerHTML = `
        <div class="alert alert-danger">
            <h6><i class="bi bi-exclamation-triangle me-2"></i>Upload Errors</h6>
            <ul class="mb-0">
                ${errors.map(error => `<li>Row ${error.row}: ${error.error}</li>`).join('')}
            </ul>
        </div>
    `;
}

// Setup client form validation
function setupClientFormValidation() {
    const form = document.getElementById('clientForm');
    if (form) {
        // Client code validation
        const clientCode = document.getElementById('clientCode');
        if (clientCode) {
            clientCode.addEventListener('input', function() {
                this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
        
        // Name validation
        const firstName = document.getElementById('clientFirstName');
        const lastName = document.getElementById('clientLastName');
        
        [firstName, lastName].forEach(field => {
            if (field) {
                field.addEventListener('input', function() {
                    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                });
            }
        });
    }
}

// Show loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }
}

// Show alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Export functions for global access
window.showSection = showSection;
window.loadClients = loadClients;
window.searchClients = searchClients;
window.showClientModal = showClientModal;
window.saveClient = saveClient;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.loadSampleData = loadSampleData;
window.filterTransactionsByPlatform = filterTransactionsByPlatform;

