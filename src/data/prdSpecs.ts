export const SYSTEM_PRD_DOCUMENT = {
  title: "PDRRMO Inventory Management - Disaster Preparedness & Logistics Platform",
  version: "v2.4.0-Production",
  author: "Principal Product Manager & Lead Systems Architect",
  executiveSummary: "PDRRMO Inventory Management is an enterprise-grade, mobile-first logistics and inventory management system designed for disaster preparedness and response operations, featuring extreme operational speed, offline resilience, and strict audit compliance.",

  architectureOverview: {
    frontend: "React 19, TypeScript 5.8, Tailwind CSS v4, Motion for liquid UI transitions, Lucide Icons, Canvas/WebAudio API, Recharts for analytics, QR & Barcode generation/decoding.",
    backend: "Express Node.js full-stack container service running on Cloud Run with high-concurrency REST endpoints.",
    database: "PostgreSQL relational backend (or Cloud SQL/Firestore hybrid) with indexed SKU/Barcode fields and transactional foreign keys.",
    authAndRbac: "Role-Based Access Control (RBAC) with granular permission flags (Admin, Inventory Manager, Staff, Auditor).",
    offlineSync: "IndexedDB / LocalStorage queue engine with automatic retry sync mechanism when network connectivity is restored."
  },

  databaseSchemaSql: `-- Complete SQL DDL Schema for SmartStock Engine

-- 1. Roles & Permissions Table
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE RESTRICT,
    department VARCHAR(100),
    assigned_location_id VARCHAR(36),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Locations Table (Hierarchical Aisle / Bin Mapping)
CREATE TABLE locations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(30) CHECK (type IN ('Warehouse', 'Aisle', 'Bin', 'Department', 'Vehicle')),
    parent_location_id VARCHAR(36) REFERENCES locations(id) ON DELETE CASCADE,
    capacity INT DEFAULT 0,
    current_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Vendors Table
CREATE TABLE vendors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(30),
    lead_time_days INT DEFAULT 3,
    rating DECIMAL(2,1) DEFAULT 5.0
);

-- 5. Inventory Items Table
CREATE TABLE items (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_type VARCHAR(20) NOT NULL DEFAULT 'CODE128',
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    safety_stock INT NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    location_id VARCHAR(36) REFERENCES locations(id) ON DELETE SET NULL,
    vendor_id VARCHAR(36) REFERENCES vendors(id) ON DELETE SET NULL,
    serial_numbers JSONB DEFAULT '[]',
    batch_lot_number VARCHAR(100),
    expiry_date DATE,
    condition VARCHAR(30) DEFAULT 'Good',
    tags JSONB DEFAULT '[]',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Transactions Table (Check-In / Check-Out / Loss / Adjustments)
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CHECK_OUT', 'CHECK_IN', 'ADJUSTMENT', 'LOSS', 'TRANSFER')),
    item_id VARCHAR(36) REFERENCES items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE RESTRICT,
    location_id VARCHAR(36) REFERENCES locations(id) ON DELETE SET NULL,
    assignee_or_project VARCHAR(150),
    condition VARCHAR(30) DEFAULT 'Good',
    notes TEXT,
    signature_data_url TEXT,
    synced_offline BOOLEAN DEFAULT FALSE,
    serial_number VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Purchase Orders Table
CREATE TABLE purchase_orders (
    id VARCHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(36) REFERENCES vendors(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Received', 'Cancelled')),
    items JSONB NOT NULL,
    expected_delivery_date DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs Table (Immutable Log)
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    severity VARCHAR(20) DEFAULT 'info'
);

-- Indexes for ultra-fast barcode lookup
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_transactions_item_timestamp ON transactions(item_id, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
`,

  apiEndpointSpecs: [
    {
      method: "POST",
      path: "/api/v1/scan/lookup",
      description: "Fast multi-format barcode or QR code lookup with stock status.",
      requestBody: { barcode: "885909384912", scannerSource: "CAMERA | HARDWARE" },
      responseExample: {
        success: true,
        data: {
          itemId: "itm-101",
          sku: "LAP-MBP-16",
          name: "MacBook Pro 16\" M3 Max",
          availableQty: 14,
          location: "Bin A1-04 (Laptops & Displays)",
          reorderAlert: false
        }
      }
    },
    {
      method: "POST",
      path: "/api/v1/inventory/checkout",
      description: "Processes item check-out with assignee tracking and digital signature.",
      requestBody: {
        itemId: "itm-101",
        quantity: 1,
        assigneeOrProject: "Project Titan",
        notes: "Field survey kit",
        signatureDataUrl: "data:image/png;base64,..."
      },
      responseExample: {
        success: true,
        transactionId: "txn-901",
        newStockQty: 13,
        auditLogCreated: true
      }
    },
    {
      method: "POST",
      path: "/api/v1/inventory/checkin",
      description: "Processes item check-in, condition inspection, and bin allocation.",
      requestBody: {
        itemId: "itm-105",
        quantity: 2,
        condition: "Good",
        locationId: "loc-5",
        notes: "Recalibrated post-test"
      },
      responseExample: {
        success: true,
        transactionId: "txn-902",
        newStockQty: 18
      }
    },
    {
      method: "POST",
      path: "/api/v1/sync/offline-batch",
      description: "Batch synchronization endpoint for offline queued transactions.",
      requestBody: {
        transactions: [
          { type: "CHECK_OUT", itemId: "itm-101", quantity: 1, timestamp: "2026-08-12T18:00:00Z" }
        ]
      },
      responseExample: {
        success: true,
        syncedCount: 1,
        failedCount: 0
      }
    }
  ],

  wireframes: [
    { name: "Mobile Dashboard", description: "Minimal top stats cards (Stock Value, Low Stock Alert Count, Active Checked Out Assets) + Quick Scan floating action button." },
    { name: "Continuous Batch Camera Scanner", description: "Live camera stream viewport with targeted overlay box, audio feedback trigger, continuous queuing table with instant swipe-to-delete." },
    { name: "Check-In / Check-Out Drawer", description: "Modal step form with live QR preview, assignee/project dropdown, condition check, and HTML5 canvas digital signature draw pad." },
    { name: "Admin RBAC Matrix", description: "Permission grid table toggling granular capability checkmarks across Admin, Manager, Staff, and Auditor roles in real time." },
    { name: "Labels & PO Generator", description: "Instant Avery / Zebra printable sticker grid preview & 1-click Purchase Order PDF layout generator." }
  ]
};
