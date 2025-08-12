const { executeQuery, executeTransaction } = require('../config/database');
const { body, validationResult } = require('express-validator');

class Client {
    // Get all clients
    static async getAll() {
        const query = `
            SELECT 
                client_id,
                client_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                department,
                is_active,
                created_at,
                updated_at
            FROM clients 
            ORDER BY created_at DESC
        `;
        return await executeQuery(query);
    }

    // Get client by ID
    static async getById(clientId) {
        const query = `
            SELECT 
                client_id,
                client_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                department,
                is_active,
                created_at,
                updated_at
            FROM clients 
            WHERE client_id = ?
        `;
        return await executeQuery(query, [clientId]);
    }

    // Get client by code
    static async getByCode(clientCode) {
        const query = `
            SELECT 
                client_id,
                client_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                department,
                is_active,
                created_at,
                updated_at
            FROM clients 
            WHERE client_code = ?
        `;
        return await executeQuery(query, [clientCode]);
    }

    // Create new client
    static async create(clientData) {
        const query = `
            INSERT INTO clients (
                client_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                department
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            clientData.client_code,
            clientData.first_name,
            clientData.last_name,
            clientData.email,
            clientData.phone,
            clientData.address,
            clientData.city,
            clientData.department
        ];
        
        return await executeQuery(query, params);
    }

    // Update client
    static async update(clientId, clientData) {
        const query = `
            UPDATE clients SET
                client_code = ?,
                first_name = ?,
                last_name = ?,
                email = ?,
                phone = ?,
                address = ?,
                city = ?,
                department = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE client_id = ?
        `;
        
        const params = [
            clientData.client_code,
            clientData.first_name,
            clientData.last_name,
            clientData.email,
            clientData.phone,
            clientData.address,
            clientData.city,
            clientData.department,
            clientId
        ];
        
        return await executeQuery(query, params);
    }

    // Delete client (soft delete)
    static async delete(clientId) {
        const query = `
            UPDATE clients SET
                is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE client_id = ?
        `;
        return await executeQuery(query, [clientId]);
    }

    // Hard delete client
    static async hardDelete(clientId) {
        const query = `DELETE FROM clients WHERE client_id = ?`;
        return await executeQuery(query, [clientId]);
    }

    // Search clients
    static async search(searchTerm) {
        const query = `
            SELECT 
                client_id,
                client_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                city,
                department,
                is_active,
                created_at,
                updated_at
            FROM clients 
            WHERE 
                client_code LIKE ? OR
                first_name LIKE ? OR
                last_name LIKE ? OR
                email LIKE ? OR
                city LIKE ?
            ORDER BY created_at DESC
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
        
        return await executeQuery(query, params);
    }

    // Get client statistics
    static async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_clients,
                COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_clients,
                COUNT(DISTINCT city) as cities_count,
                COUNT(DISTINCT department) as departments_count
            FROM clients
        `;
        return await executeQuery(query);
    }

    // Validation rules for client data
    static getValidationRules() {
        return [
            body('client_code')
                .notEmpty()
                .withMessage('Client code is required')
                .isLength({ min: 3, max: 20 })
                .withMessage('Client code must be between 3 and 20 characters')
                .matches(/^[A-Z0-9]+$/)
                .withMessage('Client code must contain only uppercase letters and numbers'),
            
            body('first_name')
                .notEmpty()
                .withMessage('First name is required')
                .isLength({ min: 2, max: 100 })
                .withMessage('First name must be between 2 and 100 characters')
                .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
                .withMessage('First name must contain only letters and spaces'),
            
            body('last_name')
                .notEmpty()
                .withMessage('Last name is required')
                .isLength({ min: 2, max: 100 })
                .withMessage('Last name must be between 2 and 100 characters')
                .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
                .withMessage('Last name must contain only letters and spaces'),
            
            body('email')
                .optional()
                .isEmail()
                .withMessage('Email must be a valid email address')
                .normalizeEmail(),
            
            body('phone')
                .optional()
                .matches(/^[0-9+\-\s()]+$/)
                .withMessage('Phone number must contain only numbers, spaces, hyphens, and parentheses'),
            
            body('address')
                .optional()
                .isLength({ max: 500 })
                .withMessage('Address must not exceed 500 characters'),
            
            body('city')
                .optional()
                .isLength({ max: 100 })
                .withMessage('City must not exceed 100 characters'),
            
            body('department')
                .optional()
                .isLength({ max: 100 })
                .withMessage('Department must not exceed 100 characters')
        ];
    }

    // Check validation results
    static checkValidation(req) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return {
                success: false,
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: error.msg
                }))
            };
        }
        return { success: true };
    }
}

module.exports = Client;

