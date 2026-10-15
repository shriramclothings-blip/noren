-- Insert test invoice directly into database so QR code works
-- This creates the exact invoice that matches our generated QR code

-- First, ensure we have a test business and store
INSERT INTO src_businesses (id, name, email, phone, address, created_at)
VALUES (999, 'Test Business', 'test@example.com', '+91 9999999999', 'Test Address', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO src_stores (id, business_id, name, location, created_at)  
VALUES (999, 999, 'Mumbai Test Store', 'Mumbai', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert POS device
INSERT INTO src_pos_devices (
  id, business_id, store_id, device_fingerprint, device_name, 
  status, api_key_hash, api_key_prefix, last_seen_at, 
  registered_at, created_at
) VALUES (
  999, 999, 999, 'test-device-fingerprint', 'Test Counter - Main',
  'active', '$2a$10$dummyhash', 'POS_test', NOW(),
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert the test invoice that matches our QR code
INSERT INTO src_erp_sales (
  id, sale_id, business_id, store_id, customer_name, customer_email, 
  customer_phone, items, subtotal, discount_amount, tax_amount,
  total_amount, payment_method, payment_status, notes, created_at, updated_at
) VALUES (
  999999, 'TEST_INV_1791566464730', 999, 999, 'Rahul Sharma', 'rahul.test@example.com',
  '+91 9876543210', 
  '[
    {"name":"Cotton Shirt - Navy Blue","sku":"SHIRT-NVY-M","size":"M","quantity":2,"price":1200.00,"discount":0,"tax":5,"total":2520.00},
    {"name":"Denim Jeans - Black","sku":"JEANS-BLK-32","size":"32","quantity":1,"price":1500.00,"discount":10,"tax":5,"total":1417.50},
    {"name":"Leather Belt - Brown","sku":"BELT-BRN-L","size":"L","quantity":1,"price":500.00,"discount":0,"tax":5,"total":525.00}
  ]'::jsonb,
  3200.00, 150.00, 212.50, 3262.50, 'Cash', 'paid',
  'Test invoice for POS integration - Generated on October 9, 2026',
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert the invoice token that matches our QR code
INSERT INTO src_pos_invoice_tokens (
  id, invoice_id, token_hash, status, created_at, expires_at
) VALUES (
  999, 999999,
  -- SHA-256 hash of: INV_1mxvumF5xQ7-DpI9yISqwD7ahV3DkcdO83LX8e-zDLU
  encode(digest('INV_1mxvumF5xQ7-DpI9yISqwD7ahV3DkcdO83LX8e-zDLU', 'sha256'), 'hex'),
  'active', NOW(), NOW() + INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Invoice created:' as message, sale_id, customer_name, total_amount 
FROM src_erp_sales WHERE id = 999999;

SELECT 'Token created:' as message, token_hash 
FROM src_pos_invoice_tokens WHERE id = 999;

-- This should make the QR code work:
-- https://www.norenfastion.shop/my-billing/invoice/INV_1mxvumF5xQ7-DpI9yISqwD7ahV3DkcdO83LX8e-zDLU