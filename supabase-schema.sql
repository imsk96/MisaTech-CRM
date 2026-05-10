-- =====================================================
-- SUPABASE DATABASE SCHEMA
-- Multi-Tenant CRM with External Storage Mode
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COMPANIES TABLE
-- Each company is a tenant
-- =====================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- 2. USERS TABLE
-- All users belong to a company
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 3. APPROVALS TABLE
-- Stores all pending/approved/rejected actions
-- This is the core of the approval workflow
-- =====================================================
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    rejected_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookups
CREATE INDEX idx_approvals_company_status ON approvals(company_id, status);
CREATE INDEX idx_approvals_created_at ON approvals(created_at DESC);

-- =====================================================
-- 4. INTEGRATIONS TABLE
-- Stores external storage configurations
-- =====================================================
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('google_sheets', 'excel', 'onedrive')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    sheet_id VARCHAR(255),
    file_path VARCHAR(500),
    mapping_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, type)
);

-- =====================================================
-- 5. SYNC_LOGS TABLE
-- Audit trail for all sync operations
-- =====================================================
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    response JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_sync_logs_company_created ON sync_logs(company_id, created_at DESC);

-- =====================================================
-- 6. STAFF TABLE (Optional - extends users)
-- Additional staff-specific information
-- =====================================================
CREATE TABLE staff (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100),
    department VARCHAR(100),
    manager_id UUID REFERENCES users(id),
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. EXCEL_DATA TABLE (Fallback for Excel uploads)
-- =====================================================
CREATE TABLE excel_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    module VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    file_reference VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Critical for multi-tenant isolation
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMPANIES POLICIES
-- =====================================================
-- Users can only see their own company
CREATE POLICY company_isolation ON companies
    FOR ALL
    USING (id IN (
        SELECT company_id FROM users 
        WHERE users.id = auth.uid()
    ));

-- =====================================================
-- USERS POLICIES
-- =====================================================
-- Users can only see users in their company
CREATE POLICY user_company_isolation ON users
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users 
        WHERE users.id = auth.uid()
    ));

-- Users can update their own profile
CREATE POLICY user_update_own ON users
    FOR UPDATE
    USING (id = auth.uid());

-- =====================================================
-- APPROVALS POLICIES
-- =====================================================
-- Staff can create approvals
CREATE POLICY approvals_staff_create ON approvals
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Staff can view their own approvals
CREATE POLICY approvals_staff_view ON approvals
    FOR SELECT
    USING (created_by = auth.uid());

-- Admins can view all approvals in their company
CREATE POLICY approvals_admin_view ON approvals
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
            AND role = 'admin'
        )
    );

-- Admins can approve/reject
CREATE POLICY approvals_admin_update ON approvals
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- INTEGRATIONS POLICIES
-- =====================================================
-- Only admins can manage integrations
CREATE POLICY integrations_admin_only ON integrations
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- SYNC_LOGS POLICIES
-- =====================================================
-- Admins can view sync logs
CREATE POLICY sync_logs_admin_view ON sync_logs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
            AND role = 'admin'
        )
    );

-- System can insert sync logs (via service role)
CREATE POLICY sync_logs_insert ON sync_logs
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- STAFF POLICIES
-- =====================================================
CREATE POLICY staff_company_isolation ON staff
    FOR ALL
    USING (
        id IN (
            SELECT id FROM users 
            WHERE company_id IN (
                SELECT company_id FROM users 
                WHERE users.id = auth.uid()
            )
        )
    );

-- =====================================================
-- EXCEL_DATA POLICIES
-- =====================================================
CREATE POLICY excel_data_company_isolation ON excel_data
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_excel_data_updated_at
    BEFORE UPDATE ON excel_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (FOR TESTING)
-- =====================================================

-- Create a test company
INSERT INTO companies (id, name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Demo Company');

-- Create test admin user (password: demo123)
-- Note: In production, use proper password hashing
INSERT INTO users (id, email, password_hash, company_id, role, full_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@demo.com', '$2b$10$demo123hash', '00000000-0000-0000-0000-000000000001', 'admin', 'Admin User');

-- Create test staff user
INSERT INTO users (id, email, password_hash, company_id, role, full_name) VALUES
    ('22222222-2222-2222-2222-222222222222', 'staff@demo.com', '$2b$10$demo123hash', '00000000-0000-0000-0000-000000000001', 'staff', 'Staff User');

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for pending approvals count by module
CREATE VIEW pending_approvals_summary AS
SELECT 
    module_name,
    COUNT(*) as pending_count
FROM approvals
WHERE status = 'pending'
GROUP BY module_name;

-- View for sync success rate
CREATE VIEW sync_success_rate AS
SELECT 
    module,
    COUNT(*) as total_syncs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
    ROUND(
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 
        2
    ) as success_rate_percent
FROM sync_logs
GROUP BY module;

-- =====================================================
-- API USAGE NOTES
-- =====================================================
-- 
-- 1. Authentication: Use Supabase Auth or custom JWT
-- 2. All queries automatically filtered by RLS based on auth.uid()
-- 3. Service role key bypasses RLS (use for sync engine)
-- 4. For Google Sheets OAuth, store tokens in integrations table
--
-- Example query from client:
-- SELECT * FROM approvals WHERE status = 'pending';
-- (Automatically filtered to user's company and permissions)
-- =====================================================
