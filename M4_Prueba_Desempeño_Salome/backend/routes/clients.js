const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// GET /api/clients - Get all clients
router.get('/', async (req, res) => {
    try {
        const result = await Client.getAll();
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving clients',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data,
            count: result.data.length
        });
    } catch (error) {
        console.error('Error in GET /api/clients:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/clients/search - Search clients
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const result = await Client.search(q.trim());
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error searching clients',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data,
            count: result.data.length,
            searchTerm: q.trim()
        });
    } catch (error) {
        console.error('Error in GET /api/clients/search:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/clients/statistics - Get client statistics
router.get('/statistics', async (req, res) => {
    try {
        const result = await Client.getStatistics();
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving statistics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });
    } catch (error) {
        console.error('Error in GET /api/clients/statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/clients/:id - Get client by ID
router.get('/:id', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        const result = await Client.getById(clientId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error retrieving client',
                error: result.error
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });
    } catch (error) {
        console.error('Error in GET /api/clients/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// POST /api/clients - Create new client
router.post('/', Client.getValidationRules(), async (req, res) => {
    try {
        // Check validation
        const validation = Client.checkValidation(req);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Check if client code already exists
        const existingClient = await Client.getByCode(req.body.client_code);
        if (existingClient.success && existingClient.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Client code already exists'
            });
        }

        // Create client
        const result = await Client.create(req.body);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error creating client',
                error: result.error
            });
        }

        // Get the created client
        const createdClient = await Client.getById(result.data.insertId);
        
        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: createdClient.data[0]
        });
    } catch (error) {
        console.error('Error in POST /api/clients:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// PUT /api/clients/:id - Update client
router.put('/:id', Client.getValidationRules(), async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        // Check validation
        const validation = Client.checkValidation(req);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Check if client exists
        const existingClient = await Client.getById(clientId);
        if (!existingClient.success || existingClient.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Check if new client code already exists (excluding current client)
        const clientWithCode = await Client.getByCode(req.body.client_code);
        if (clientWithCode.success && clientWithCode.data.length > 0) {
            const existingClientWithCode = clientWithCode.data[0];
            if (existingClientWithCode.client_id !== clientId) {
                return res.status(409).json({
                    success: false,
                    message: 'Client code already exists'
                });
            }
        }

        // Update client
        const result = await Client.update(clientId, req.body);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error updating client',
                error: result.error
            });
        }

        // Get the updated client
        const updatedClient = await Client.getById(clientId);
        
        res.json({
            success: true,
            message: 'Client updated successfully',
            data: updatedClient.data[0]
        });
    } catch (error) {
        console.error('Error in PUT /api/clients/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// DELETE /api/clients/:id - Delete client (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        // Check if client exists
        const existingClient = await Client.getById(clientId);
        if (!existingClient.success || existingClient.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Delete client
        const result = await Client.delete(clientId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting client',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });
    } catch (error) {
        console.error('Error in DELETE /api/clients/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// DELETE /api/clients/:id/hard - Hard delete client
router.delete('/:id/hard', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        // Check if client exists
        const existingClient = await Client.getById(clientId);
        if (!existingClient.success || existingClient.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Hard delete client
        const result = await Client.hardDelete(clientId);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting client',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Client permanently deleted'
        });
    } catch (error) {
        console.error('Error in DELETE /api/clients/:id/hard:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;

