# Database Normalization Explanation

## Overview
This document explains the normalization process applied to the financial data from ExpertSoft's client, which was originally stored in disorganized Excel files from Fintech platforms (Nequi and Daviplata).

## Original Data Structure
The original data was contained in an Excel file (`data.xlsx`) with the following structure:

### Original Columns (Spanish):
1. **ID de la Transacción** - Transaction ID
2. **Fecha y Hora de la Transacción** - Transaction Date and Time
3. **Monto de la Transacción** - Transaction Amount
4. **Estado de la Transacción** - Transaction Status
5. **Tipo de Transacción** - Transaction Type
6. **Nombre del Cliente** - Client Name
7. **Número de Identificación** - Identification Number
8. **Dirección** - Address
9. **Teléfono** - Phone
10. **Correo Electrónico** - Email
11. **Plataforma Utilizada** - Platform Used
12. **Número de Factura** - Invoice Number
13. **Periodo de Facturación** - Billing Period
14. **Monto Facturado** - Billed Amount
15. **Monto Pagado** - Paid Amount

### Data Characteristics:
- **100 records** of financial transactions
- **2 platforms**: Nequi (47 transactions) and Daviplata (53 transactions)
- **100 unique clients** (one transaction per client)
- **100 unique invoices** (one invoice per transaction)
- **3 transaction statuses**: Completada (34), Pendiente (33), Fallida (33)
- **1 transaction type**: Pago de Factura (100)

## Normalization Process

### Step 1: First Normal Form (1NF)
**Applied Rules:**
- Ensure atomic values (no repeating groups)
- Eliminate duplicate rows
- Identify primary keys

**Changes Made:**
1. **Client Name Parsing**: Split "Nombre del Cliente" into separate `first_name` and `last_name` fields
2. **Address Parsing**: Separated address into `address` (street), `city`, and `department` fields
3. **Status Mapping**: Converted Spanish statuses to English:
   - "Completada" → "COMPLETED"
   - "Pendiente" → "PENDING"
   - "Fallida" → "FAILED"
4. **Type Mapping**: Converted transaction type:
   - "Pago de Factura" → "PAYMENT"
5. **Client Code Generation**: Created unique client codes from identification numbers
6. **Invoice Status Calculation**: Derived invoice status based on payment amounts:
   - `paid_amount = 0` → "PENDING"
   - `paid_amount < total_amount` → "PARTIAL"
   - `paid_amount = total_amount` → "PAID"

### Step 2: Second Normal Form (2NF)
**Applied Rules:**
- Remove partial dependencies
- Ensure all non-key attributes depend on the entire primary key

**Tables Created:**
1. **clients** - Client information (independent entity)
2. **invoices** - Invoice information (depends on client)
3. **transactions** - Transaction information (depends on invoice and platform)
4. **platforms** - Platform information (independent entity)

### Step 3: Third Normal Form (3NF)
**Applied Rules:**
- Remove transitive dependencies
- Ensure no non-key attributes depend on other non-key attributes

**Final Structure:**
- **clients**: Contains only client-specific information
- **invoices**: Contains only invoice-specific information with client foreign key
- **transactions**: Contains only transaction-specific information with invoice and platform foreign keys
- **platforms**: Contains only platform-specific information

## Final Database Schema

### Clients Table
```sql
CREATE TABLE clients (
    client_id INT PRIMARY KEY AUTO_INCREMENT,
    client_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Platforms Table
```sql
CREATE TABLE platforms (
    platform_id INT PRIMARY KEY AUTO_INCREMENT,
    platform_name VARCHAR(50) NOT NULL UNIQUE,
    platform_type VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Invoices Table
```sql
CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_id INT NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    invoice_id INT NOT NULL,
    platform_id INT NOT NULL,
    transaction_date DATETIME NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type ENUM('PAYMENT', 'REFUND', 'ADJUSTMENT') DEFAULT 'PAYMENT',
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES platforms(platform_id) ON DELETE CASCADE
);
```

## Relationships

1. **clients** (1) ←→ (N) **invoices**
   - One client can have multiple invoices
   - Each invoice belongs to exactly one client

2. **invoices** (1) ←→ (N) **transactions**
   - One invoice can have multiple transactions
   - Each transaction belongs to exactly one invoice

3. **platforms** (1) ←→ (N) **transactions**
   - One platform can have multiple transactions
   - Each transaction is processed through exactly one platform

## Benefits of Normalization

1. **Data Integrity**: Eliminates data redundancy and ensures consistency
2. **Flexibility**: Allows for easy modifications and extensions
3. **Performance**: Optimized queries through proper indexing
4. **Scalability**: Structure supports growth in data volume
5. **Maintainability**: Clear separation of concerns and responsibilities

## Data Loading Process

The normalized data is loaded through a CSV file (`data.csv`) that contains all the necessary information in a denormalized format. The data loading process:

1. **Validates** each row for required fields and data types
2. **Processes** clients first (creates or updates existing clients)
3. **Processes** invoices (creates or updates existing invoices)
4. **Processes** transactions (creates or updates existing transactions)
5. **Handles** platform creation automatically for new platforms
6. **Provides** detailed statistics on the loading process

This approach ensures data consistency while maintaining the flexibility to handle both new data insertion and existing data updates.

