const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { executeQuery, executeTransaction } = require('../config/database');

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// POST /api/data-loader/upload - Upload and process CSV file
router.post('/upload', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const filePath = req.file.path;
        const results = [];
        const errors = [];

        // Read and parse CSV file
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', async () => {
                try {
                    console.log(`Processing ${results.length} records from uploaded CSV`);
                    
                    // Process the data
                    const processedData = await processCSVData(results);
                    
                    // Clean up uploaded file
                    fs.unlinkSync(filePath);
                    
                    res.json({
                        success: true,
                        message: 'Data loaded successfully',
                        data: processedData
                    });
                } catch (error) {
                    // Clean up uploaded file on error
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    
                    console.error('Error processing uploaded CSV:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Error processing CSV file',
                        error: error.message
                    });
                }
            })
            .on('error', (error) => {
                // Clean up uploaded file on error
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                
                console.error('Error reading CSV file:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error reading CSV file',
                    error: error.message
                });
            });

    } catch (error) {
        console.error('Error in upload endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// POST /api/data-loader/load-sample - Load sample data from predefined CSV
router.post('/load-sample', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '../../data.csv');
        
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({
                success: false,
                message: 'Sample data file not found'
            });
        }

        const results = [];

        // Read and parse CSV file
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', async () => {
                try {
                    console.log(`Processing ${results.length} records from sample CSV`);
                    
                    // Process the data
                    const processedData = await processCSVData(results);
                    
                    res.json({
                        success: true,
                        message: 'Sample data loaded successfully',
                        data: processedData
                    });
                } catch (error) {
                    console.error('Error processing sample CSV:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Error processing sample data',
                        error: error.message
                    });
                }
            })
            .on('error', (error) => {
                console.error('Error reading sample CSV file:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error reading sample CSV file',
                    error: error.message
                });
            });

    } catch (error) {
        console.error('Error in load-sample endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Function to validate CSV row data
function validateRow(data, rowNumber) {
    const errors = [];
    
    // Required fields validation
    if (!data.client_code || !data.first_name || !data.last_name) {
        errors.push(`Row ${rowNumber}: Missing required client information`);
    }
    
    if (!data.invoice_number) {
        errors.push(`Row ${rowNumber}: Missing invoice number`);
    }
    
    if (!data.transaction_reference) {
        errors.push(`Row ${rowNumber}: Missing transaction reference`);
    }
    
    if (!data.platform_name) {
        errors.push(`Row ${rowNumber}: Missing platform name`);
    }
    
    // Data type validation
    if (data.total_amount && isNaN(parseFloat(data.total_amount))) {
        errors.push(`Row ${rowNumber}: Invalid total amount`);
    }
    
    if (data.paid_amount && isNaN(parseFloat(data.paid_amount))) {
        errors.push(`Row ${rowNumber}: Invalid paid amount`);
    }
    
    if (data.transaction_amount && isNaN(parseFloat(data.transaction_amount))) {
        errors.push(`Row ${rowNumber}: Invalid transaction amount`);
    }
    
    return errors;
}

// Function to process CSV data and insert into database
async function processCSVData(data) {
    const stats = {
        clients_processed: 0,
        clients_created: 0,
        clients_updated: 0,
        invoices_processed: 0,
        invoices_created: 0,
        invoices_updated: 0,
        transactions_processed: 0,
        transactions_created: 0,
        transactions_updated: 0,
        errors: []
    };

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 because CSV has header and we're 0-indexed
        
        try {
            // Validate row data
            const validationErrors = validateRow(row, rowNumber);
            if (validationErrors.length > 0) {
                stats.errors.push(...validationErrors);
                continue;
            }

            // Process client
            const clientResult = await processClient(row);
            if (clientResult.created) {
                stats.clients_created++;
            } else {
                stats.clients_updated++;
            }
            stats.clients_processed++;

            // Process invoice
            const invoiceResult = await processInvoice(row, clientResult.clientId);
            if (invoiceResult.created) {
                stats.invoices_created++;
            } else {
                stats.invoices_updated++;
            }
            stats.invoices_processed++;

            // Process transaction
            const transactionResult = await processTransaction(row, invoiceResult.invoiceId);
            if (transactionResult.created) {
                stats.transactions_created++;
            } else {
                stats.transactions_updated++;
            }
            stats.transactions_processed++;

        } catch (error) {
            stats.errors.push(`Row ${rowNumber}: ${error.message}`);
            console.error(`Error processing row ${rowNumber}:`, error);
        }
    }

    return stats;
}

// Function to process client data
async function processClient(clientData) {
    try {
        // Check if client already exists
        const existingClient = await executeQuery(
            'SELECT client_id FROM clients WHERE client_code = ?',
            [clientData.client_code]
        );

        if (existingClient.length > 0) {
            // Update existing client
            await executeQuery(
                `UPDATE clients SET 
                first_name = ?, last_name = ?, email = ?, phone = ?, 
                address = ?, city = ?, department = ?, updated_at = CURRENT_TIMESTAMP
                WHERE client_code = ?`,
                [
                    clientData.first_name,
                    clientData.last_name,
                    clientData.email || null,
                    clientData.phone || null,
                    clientData.address || null,
                    clientData.city || null,
                    clientData.department || null,
                    clientData.client_code
                ]
            );
            return { clientId: existingClient[0].client_id, created: false };
        } else {
            // Create new client
            const result = await executeQuery(
                `INSERT INTO clients 
                (client_code, first_name, last_name, email, phone, address, city, department)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    clientData.client_code,
                    clientData.first_name,
                    clientData.last_name,
                    clientData.email || null,
                    clientData.phone || null,
                    clientData.address || null,
                    clientData.city || null,
                    clientData.department || null
                ]
            );
            return { clientId: result.insertId, created: true };
        }
    } catch (error) {
        throw new Error(`Error processing client: ${error.message}`);
    }
}

// Function to process invoice data
async function processInvoice(invoiceData, clientId) {
    try {
        // Check if invoice already exists
        const existingInvoice = await executeQuery(
            'SELECT invoice_id FROM invoices WHERE invoice_number = ?',
            [invoiceData.invoice_number]
        );

        if (existingInvoice.length > 0) {
            // Update existing invoice
            await executeQuery(
                `UPDATE invoices SET 
                billing_period = ?, total_amount = ?, paid_amount = ?, 
                status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE invoice_number = ?`,
                [
                    invoiceData.billing_period,
                    parseFloat(invoiceData.total_amount),
                    parseFloat(invoiceData.paid_amount),
                    invoiceData.invoice_status,
                    invoiceData.invoice_number
                ]
            );
            return { invoiceId: existingInvoice[0].invoice_id, created: false };
        } else {
            // Create new invoice
            const result = await executeQuery(
                `INSERT INTO invoices 
                (invoice_number, client_id, billing_period, total_amount, paid_amount, status)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    invoiceData.invoice_number,
                    clientId,
                    invoiceData.billing_period,
                    parseFloat(invoiceData.total_amount),
                    parseFloat(invoiceData.paid_amount),
                    invoiceData.invoice_status
                ]
            );
            return { invoiceId: result.insertId, created: true };
        }
    } catch (error) {
        throw new Error(`Error processing invoice: ${error.message}`);
    }
}

// Function to process transaction data
async function processTransaction(transactionData, invoiceId) {
    try {
        // Get or create platform
        let platformId;
        const existingPlatform = await executeQuery(
            'SELECT platform_id FROM platforms WHERE platform_name = ?',
            [transactionData.platform_name]
        );

        if (existingPlatform.length > 0) {
            platformId = existingPlatform[0].platform_id;
        } else {
            // Create new platform
            const platformResult = await executeQuery(
                'INSERT INTO platforms (platform_name, platform_type) VALUES (?, ?)',
                [transactionData.platform_name, 'DIGITAL_WALLET']
            );
            platformId = platformResult.insertId;
        }

        // Check if transaction already exists
        const existingTransaction = await executeQuery(
            'SELECT transaction_id FROM transactions WHERE transaction_reference = ?',
            [transactionData.transaction_reference]
        );

        if (existingTransaction.length > 0) {
            // Update existing transaction
            await executeQuery(
                `UPDATE transactions SET 
                invoice_id = ?, platform_id = ?, transaction_date = ?, amount = ?,
                transaction_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE transaction_reference = ?`,
                [
                    invoiceId,
                    platformId,
                    transactionData.transaction_date,
                    parseFloat(transactionData.transaction_amount),
                    transactionData.transaction_type,
                    transactionData.transaction_status,
                    transactionData.transaction_reference
                ]
            );
            return { transactionId: existingTransaction[0].transaction_id, created: false };
        } else {
            // Create new transaction
            const result = await executeQuery(
                `INSERT INTO transactions 
                (transaction_reference, invoice_id, platform_id, transaction_date, 
                amount, transaction_type, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    transactionData.transaction_reference,
                    invoiceId,
                    platformId,
                    transactionData.transaction_date,
                    parseFloat(transactionData.transaction_amount),
                    transactionData.transaction_type,
                    transactionData.transaction_status
                ]
            );
            return { transactionId: result.insertId, created: true };
        }
    } catch (error) {
        throw new Error(`Error processing transaction: ${error.message}`);
    }
}

module.exports = router;
