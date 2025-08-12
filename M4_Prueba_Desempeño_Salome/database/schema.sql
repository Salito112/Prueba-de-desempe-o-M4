-- Financial Data Management System Database Schema
-- Database: ppd_salome_gonzalez_lovelace 
-- Created for ExpertSoft - Electrical Sector Solutions

-- Create database
CREATE DATABASE IF NOT EXISTS pd_salome_gonzalez_lovelace ;
USE pd_salome_gonzalez_lovelace ;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS platforms;

-- Create platforms table
CREATE TABLE platforms (
    platform_id INT PRIMARY KEY AUTO_INCREMENT,
    platform_name VARCHAR(50) NOT NULL UNIQUE,
    platform_type VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create clients table
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

-- Create invoices table
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

-- Create transactions table
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

-- Insert default platforms
INSERT INTO platforms (platform_name, platform_type) VALUES
('Nequi', 'DIGITAL_WALLET'),
('Daviplata', 'DIGITAL_WALLET'),
('Bancolombia', 'BANK'),
('Banco de Bogotá', 'BANK'),
('BBVA Colombia', 'BANK');

-- Create indexes for better performance
CREATE INDEX idx_client_code ON clients(client_code);
CREATE INDEX idx_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_transaction_reference ON transactions(transaction_reference);
CREATE INDEX idx_invoice_status ON invoices(status);
CREATE INDEX idx_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_platform_name ON platforms(platform_name);

-- Create view for total payments per client
CREATE VIEW client_total_payments AS
SELECT 
    c.client_id,
    c.client_code,
    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
    SUM(t.amount) AS total_paid,
    COUNT(t.transaction_id) AS total_transactions
FROM clients c
LEFT JOIN invoices i ON c.client_id = i.client_id
LEFT JOIN transactions t ON i.invoice_id = t.invoice_id AND t.status = 'COMPLETED'
GROUP BY c.client_id, c.client_code, c.first_name, c.last_name;

-- Create view for pending invoices
CREATE VIEW pending_invoices AS
SELECT 
    i.invoice_id,
    i.invoice_number,
    c.client_code,
    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
    i.billing_period,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount) AS pending_amount,
    i.status,
    i.description
FROM invoices i
JOIN clients c ON i.client_id = c.client_id
WHERE i.status IN ('PENDING', 'PARTIAL', 'OVERDUE');

-- Create view for transactions by platform
CREATE VIEW transactions_by_platform AS
SELECT 
    p.platform_name,
    t.transaction_reference,
    c.client_code,
    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
    i.invoice_number,
    t.transaction_date,
    t.amount,
    t.transaction_type,
    t.status
FROM transactions t
JOIN platforms p ON t.platform_id = p.platform_id
JOIN invoices i ON t.invoice_id = i.invoice_id
JOIN clients c ON i.client_id = c.client_id
ORDER BY t.transaction_date DESC;

