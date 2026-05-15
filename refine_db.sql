-- Refined QLab Database Schema

-- 1. Mock "Existing" Production Data
CREATE TABLE IF NOT EXISTS product_qualities (
    quality_id SERIAL PRIMARY KEY,
    quality_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_schedule (
    schedule_id SERIAL PRIMARY KEY,
    lot_number VARCHAR(50) NOT NULL,
    quality_number VARCHAR(50) REFERENCES product_qualities(quality_number),
    scheduled_date DATE,
    status VARCHAR(20) DEFAULT 'Scheduled' -- Scheduled, Running, Completed
);

-- 2. New QLab Tables
ALTER TABLE test_methods ADD COLUMN IF NOT EXISTS test_code VARCHAR(20) UNIQUE;
ALTER TABLE test_methods ADD COLUMN IF NOT EXISTS reference_standard VARCHAR(100);

-- Ensure observation_result is consistent
-- (The previous table already has observation_result VARCHAR(10))

-- 3. Initial Mock Data for Production
INSERT INTO product_qualities (quality_number, description) VALUES 
('Q100', 'High Strength Industrial Textile'),
('Q200', 'Premium Soft-Touch Fabric'),
('Q300', 'Weather-Resistant Membrane')
ON CONFLICT (quality_number) DO NOTHING;

INSERT INTO production_schedule (lot_number, quality_number, scheduled_date) VALUES 
('LOT-2026-001', 'Q100', '2026-05-15'),
('LOT-2026-002', 'Q200', '2026-05-16'),
('LOT-2026-003', 'Q300', '2026-05-17')
ON CONFLICT DO NOTHING;

-- 4. Update Test Methods with codes
UPDATE test_methods SET test_code = 'TS-01', reference_standard = 'ASTM D5034' WHERE name = 'Tensile Strength';
UPDATE test_methods SET test_code = 'EL-01', reference_standard = 'ASTM D5035' WHERE name = 'Elongation';
UPDATE test_methods SET test_code = 'TH-01', reference_standard = 'ISO 5084' WHERE name = 'Thickness';
UPDATE test_methods SET test_code = 'CM-01', reference_standard = 'In-house Lab-01' WHERE name = 'Color Match';
UPDATE test_methods SET test_code = 'VC-01', reference_standard = 'In-house Lab-02' WHERE name = 'Visual Surface Check';
