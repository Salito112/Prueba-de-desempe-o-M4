# Installation and Setup Guide

## Prerequisites

Before installing the Financial Data Management System, ensure you have the following software installed:

### Required Software
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **Git** (optional) - [Download here](https://git-scm.com/)

### Verify Installation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check MySQL version
mysql --version
```

## Database Setup

### 1. Create MySQL Database
```sql
-- Connect to MySQL as root or privileged user
mysql -u root -p

-- Create the database
CREATE DATABASE pd_salome_gonzalez_clan;

-- Verify database creation
SHOW DATABASES;
```

### 2. Import Database Schema
```bash
# Navigate to the project directory
cd M4_Prueba_Desempeno_Salome

# Import the schema
mysql -u root -p pd_salome_gonzalez_clan < database/schema.sql
```

### 3. Verify Database Setup
```sql
-- Connect to the database
mysql -u root -p pd_salome_gonzalez_clan

-- Check tables
SHOW TABLES;

-- Check platforms (should have 5 default platforms)
SELECT * FROM platforms;
```

## Backend Setup

### 1. Install Dependencies
```bash
# Navigate to backend directory
cd backend

# Install Node.js dependencies
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your database credentials
# Use your preferred text editor
nano .env
```

**Example .env configuration:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pd_salome_gonzalez_clan
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:5500

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### 3. Test Database Connection
```bash
# Start the server
npm start
```

You should see output similar to:
```
🚀 Financial Data Management System Server
==========================================
📡 Server running on port 3000
🌐 Frontend: http://localhost:3000
🔗 API Base: http://localhost:3000/api
💾 Database: Connected
==========================================
```

## Frontend Setup

### 1. Access the Application
The frontend is served directly by the Express server. Once the backend is running:

1. Open your web browser
2. Navigate to: `http://localhost:3000`
3. You should see the Financial Data Management System dashboard

### 2. Alternative: Use Live Server (Optional)
If you prefer to use a separate development server:

```bash
# Install Live Server globally (if using VS Code)
npm install -g live-server

# Navigate to frontend directory
cd frontend

# Start Live Server
live-server --port=5500
```

Then access: `http://localhost:5500`

## Initial Data Loading

### Option 1: Load Sample Data via Frontend
1. Open the application in your browser
2. Navigate to the "Data Loader" section
3. Click "Load Sample Data"
4. Confirm the action

### Option 2: Load Sample Data via API
```bash
# Using curl
curl -X POST http://localhost:3000/api/data-loader/load-sample

# Using Postman
# Import the collection from postman/collection.json
# Run the "Load Sample Data" request
```

### Option 3: Upload Custom CSV
1. Prepare a CSV file with the required format (see sample_data.csv)
2. Navigate to "Data Loader" section
3. Click "Choose File" and select your CSV
4. Click "Upload and Process"

## Testing the System

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Financial Data Management System API",
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Test Client CRUD Operations
```bash
# Get all clients
curl http://localhost:3000/api/clients

# Create a new client
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_code": "TEST001",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com"
  }'
```

### 3. Test Advanced Queries
```bash
# Get total payments by client
curl http://localhost:3000/api/queries/total-payments

# Get pending invoices
curl http://localhost:3000/api/queries/pending-invoices

# Get transactions by platform
curl http://localhost:3000/api/queries/transactions-by-platform
```

## Postman Collection

### Import Collection
1. Open Postman
2. Click "Import"
3. Select the file: `postman/collection.json`
4. The collection will be imported with all endpoints

### Configure Environment
1. Create a new environment in Postman
2. Add variable: `base_url` = `http://localhost:3000`
3. Select the environment for the collection

### Test Endpoints
1. Start with "API Health Check"
2. Test client CRUD operations
3. Test advanced queries
4. Test data loading endpoints

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
**Error**: `ER_ACCESS_DENIED_ERROR`
**Solution**: 
- Check MySQL credentials in .env file
- Ensure MySQL service is running
- Verify database exists

#### 2. Port Already in Use
**Error**: `EADDRINUSE`
**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env file
PORT=3001
```

#### 3. Module Not Found
**Error**: `Cannot find module`
**Solution**:
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### 4. CORS Issues
**Error**: CORS policy blocked
**Solution**:
- Check CORS_ORIGIN in .env file
- Ensure frontend URL is included
- Restart the server

### Logs and Debugging

#### Enable Debug Mode
```bash
# Set environment variable
export NODE_ENV=development

# Start server with debug info
npm start
```

#### Check Server Logs
The server provides detailed logging:
- Request/response logs
- Database connection status
- Error details

#### Database Logs
```bash
# Check MySQL error log
sudo tail -f /var/log/mysql/error.log

# Check MySQL general log
sudo tail -f /var/log/mysql/general.log
```

## Production Deployment

### Environment Variables
For production, update the .env file:
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
PORT=80
```

### Security Considerations
1. Use strong database passwords
2. Enable HTTPS in production
3. Configure proper CORS origins
4. Set up firewall rules
5. Regular database backups

### Performance Optimization
1. Enable database connection pooling
2. Configure proper indexes
3. Use CDN for static files
4. Enable compression
5. Monitor server resources

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify all prerequisites are installed
4. Ensure database is properly configured
5. Test with the provided sample data

For additional support, refer to the documentation in the `docs/` folder.


