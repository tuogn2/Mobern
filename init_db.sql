-- QLab Database Initialization Script

-- 1. Create Tables

-- Mock TP table (Production Lots)
CREATE TABLE IF NOT EXISTS tp_lots (
    tp_skid SERIAL PRIMARY KEY,
    quality_code VARCHAR(50),
    lot_number VARCHAR(50),
    datains TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Methods
CREATE TABLE IF NOT EXISTS test_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    method_type VARCHAR(20) DEFAULT 'Numeric', -- 'Numeric' or 'Observation'
    is_active BOOLEAN DEFAULT TRUE
);

-- Specifications
CREATE TABLE IF NOT EXISTS specifications (
    id SERIAL PRIMARY KEY,
    quality_code VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mapping Tests to Specifications
CREATE TABLE IF NOT EXISTS spec_tests (
    id SERIAL PRIMARY KEY,
    spec_id INT REFERENCES specifications(id) ON DELETE CASCADE,
    test_method_id INT REFERENCES test_methods(id),
    min_value FLOAT,
    max_value FLOAT
);

-- Test Plans (One per Lot)
CREATE TABLE IF NOT EXISTS test_plans (
    id SERIAL PRIMARY KEY,
    tp_skid INT NOT NULL, -- References tp_lots.tp_skid
    spec_id INT REFERENCES specifications(id),
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, In Progress, Pass, Failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Results
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    test_plan_id INT REFERENCES test_plans(id) ON DELETE CASCADE,
    test_method_id INT REFERENCES test_methods(id),
    numeric_result FLOAT,
    observation_result VARCHAR(10), -- 'Pass' or 'Fail'
    result_status VARCHAR(10), -- 'Pass' or 'Fail' (Auto-calculated)
    test_status VARCHAR(20) DEFAULT 'Pending', -- Pending, In Progress, Completed
    tested_by VARCHAR(100),
    tested_at TIMESTAMP,
    comments TEXT,
    is_override BOOLEAN DEFAULT FALSE,
    overridden_by VARCHAR(100),
    overridden_at TIMESTAMP,
    override_reason TEXT
);

-- 2. Insert Mock Data

-- Mock Lots
INSERT INTO tp_lots (quality_code, lot_number) VALUES 
('Q100', 'LOT-A-001'),
('Q100', 'LOT-A-002'),
('Q200', 'LOT-B-001');

-- Test Methods
INSERT INTO test_methods (name, unit, method_type) VALUES 
('Tensile Strength', 'kg/cm2', 'Numeric'),
('Elongation', '%', 'Numeric'),
('Thickness', 'mm', 'Numeric'),
('Color Match', NULL, 'Observation'),
('Visual Surface Check', NULL, 'Observation');

-- Specifications
INSERT INTO specifications (quality_code, version) VALUES 
('Q100', 1),
('Q200', 1);

-- Spec Tests for Q100
INSERT INTO spec_tests (spec_id, test_method_id, min_value, max_value) VALUES 
(1, 1, 10.0, 20.0), -- Tensile Strength
(1, 2, 5.0, 15.0),  -- Elongation
(1, 4, NULL, NULL); -- Color Match

-- Spec Tests for Q200
INSERT INTO spec_tests (spec_id, test_method_id, min_value, max_value) VALUES 
(2, 1, 12.0, 25.0), -- Tensile Strength
(2, 3, 0.5, 1.0),   -- Thickness
(2, 5, NULL, NULL); -- Visual Surface Check

-- Test Plans
INSERT INTO test_plans (tp_skid, spec_id, status) VALUES 
(1, 1, 'In Progress'),
(2, 1, 'Pending'),
(3, 2, 'Pending');

-- Test Results for Lot 1 (In Progress)
INSERT INTO test_results (test_plan_id, test_method_id, numeric_result, result_status, test_status, tested_by, tested_at) VALUES 
(1, 1, 15.5, 'Pass', 'Completed', 'john_doe', CURRENT_TIMESTAMP);
