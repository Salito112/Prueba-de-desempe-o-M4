const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// GET /api/queries/total-payments - Total paid by each client
router.get('/total-payments', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.client_id,
                c.client_code,
                CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                c.email,
                c.city,
                c.department,
                COALESCE(SUM(t.amount), 0) AS total_paid,
                COUNT(t.transaction_id) AS total_transactions,
                MAX(t.transaction_date) AS last_payment_date
            FROM clients c
            LEFT JOIN invoices i ON c.client_id = i.client_id
            LEFT JOIN transactions t ON i.invoice_id = t.invoice_id AND t.status = 'COMPLETED'
            WHERE c.is_active = TRUE
            GROUP BY c.client_id, c.client_code, c.first_name, c.last_name, c.email, c.city, c.department
            ORDER BY total_paid DESC
        `;

        const result = await executeQuery(query);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving total payments',
                error: result.error
            });
        }

        // Calculate summary statistics
        const totalClients = result.data.length;
        const totalAmount = result.data.reduce((sum, client) => sum + parseFloat(client.total_paid), 0);
        const averagePayment = totalClients > 0 ? totalAmount / totalClients : 0;

        res.json({
            success: true,
            data: result.data,
            summary: {
                total_clients: totalClients,
                total_amount_paid: totalAmount,
                average_payment_per_client: averagePayment
            },
            count: result.data.length
        });
    } catch (error) {
        console.error('Error in GET /api/queries/total-payments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/queries/pending-invoices - Pending invoices with client and transaction info
router.get('/pending-invoices', async (req, res) => {
    try {
        const query = `
            SELECT 
                i.invoice_id,
                i.invoice_number,
                c.client_code,
                CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                c.email,
                c.phone,
                c.city,
                c.department,
                i.invoice_date,
                i.due_date,
                i.total_amount,
                i.paid_amount,
                (i.total_amount - i.paid_amount) AS pending_amount,
                i.status,
                i.description,
                DATEDIFF(CURRENT_DATE, i.due_date) AS days_overdue,
                CASE 
                    WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
                    WHEN i.due_date = CURRENT_DATE THEN 'DUE_TODAY'
                    ELSE 'PENDING'
                END AS payment_status,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'transaction_id', t2.transaction_id,
                            'transaction_reference', t2.transaction_reference,
                            'amount', t2.amount,
                            'transaction_date', t2.transaction_date,
                            'status', t2.status,
                            'platform_name', p.platform_name
                        )
                    )
                    FROM transactions t2
                    JOIN platforms p ON t2.platform_id = p.platform_id
                    WHERE t2.invoice_id = i.invoice_id
                ) AS transactions
            FROM invoices i
            JOIN clients c ON i.client_id = c.client_id
            WHERE i.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
            AND c.is_active = TRUE
            ORDER BY 
                CASE 
                    WHEN i.due_date < CURRENT_DATE THEN 1
                    WHEN i.due_date = CURRENT_DATE THEN 2
                    ELSE 3
                END,
                i.due_date ASC,
                pending_amount DESC
        `;

        const result = await executeQuery(query);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving pending invoices',
                error: result.error
            });
        }

        // Calculate summary statistics
        const totalPendingInvoices = result.data.length;
        const totalPendingAmount = result.data.reduce((sum, invoice) => sum + parseFloat(invoice.pending_amount), 0);
        const overdueInvoices = result.data.filter(invoice => invoice.days_overdue > 0).length;
        const dueTodayInvoices = result.data.filter(invoice => invoice.days_overdue === 0).length;

        res.json({
            success: true,
            data: result.data,
            summary: {
                total_pending_invoices: totalPendingInvoices,
                total_pending_amount: totalPendingAmount,
                overdue_invoices: overdueInvoices,
                due_today_invoices: dueTodayInvoices
            },
            count: result.data.length
        });
    } catch (error) {
        console.error('Error in GET /api/queries/pending-invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/queries/transactions-by-platform - Transactions by platform
router.get('/transactions-by-platform', async (req, res) => {
    try {
        const { platform } = req.query;
        
        let query = `
            SELECT 
                p.platform_id,
                p.platform_name,
                p.platform_type,
                t.transaction_id,
                t.transaction_reference,
                t.transaction_date,
                t.amount,
                t.transaction_type,
                t.status,
                t.description,
                c.client_code,
                CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                c.email,
                c.city,
                c.department,
                i.invoice_number,
                i.invoice_date,
                i.total_amount,
                i.status AS invoice_status
            FROM transactions t
            JOIN platforms p ON t.platform_id = p.platform_id
            JOIN invoices i ON t.invoice_id = i.invoice_id
            JOIN clients c ON i.client_id = c.client_id
            WHERE c.is_active = TRUE
        `;

        const params = [];
        
        if (platform) {
            query += ` AND p.platform_name = ?`;
            params.push(platform);
        }

        query += ` ORDER BY t.transaction_date DESC`;

        const result = await executeQuery(query, params);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving transactions by platform',
                error: result.error
            });
        }

        // Calculate summary statistics
        const totalTransactions = result.data.length;
        const totalAmount = result.data.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
        const completedTransactions = result.data.filter(t => t.status === 'COMPLETED').length;
        const pendingTransactions = result.data.filter(t => t.status === 'PENDING').length;
        const failedTransactions = result.data.filter(t => t.status === 'FAILED').length;

        // Group by platform for additional statistics
        const platformStats = {};
        result.data.forEach(transaction => {
            const platformName = transaction.platform_name;
            if (!platformStats[platformName]) {
                platformStats[platformName] = {
                    platform_name: platformName,
                    total_transactions: 0,
                    total_amount: 0,
                    completed_transactions: 0,
                    pending_transactions: 0,
                    failed_transactions: 0
                };
            }
            
            platformStats[platformName].total_transactions++;
            platformStats[platformName].total_amount += parseFloat(transaction.amount);
            
            if (transaction.status === 'COMPLETED') {
                platformStats[platformName].completed_transactions++;
            } else if (transaction.status === 'PENDING') {
                platformStats[platformName].pending_transactions++;
            } else if (transaction.status === 'FAILED') {
                platformStats[platformName].failed_transactions++;
            }
        });

        res.json({
            success: true,
            data: result.data,
            summary: {
                total_transactions: totalTransactions,
                total_amount: totalAmount,
                completed_transactions: completedTransactions,
                pending_transactions: pendingTransactions,
                failed_transactions: failedTransactions,
                platform_statistics: Object.values(platformStats)
            },
            count: result.data.length,
            filtered_by_platform: platform || 'all'
        });
    } catch (error) {
        console.error('Error in GET /api/queries/transactions-by-platform:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/queries/platforms - Get available platforms
router.get('/platforms', async (req, res) => {
    try {
        const query = `
            SELECT 
                platform_id,
                platform_name,
                platform_type,
                is_active,
                (
                    SELECT COUNT(*)
                    FROM transactions t
                    WHERE t.platform_id = p.platform_id
                ) AS transaction_count,
                (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions t
                    WHERE t.platform_id = p.platform_id AND t.status = 'COMPLETED'
                ) AS total_amount
            FROM platforms p
            WHERE is_active = TRUE
            ORDER BY platform_name
        `;

        const result = await executeQuery(query);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving platforms',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data,
            count: result.data.length
        });
    } catch (error) {
        console.error('Error in GET /api/queries/platforms:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;

