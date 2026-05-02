ALTER TABLE reviews ADD COLUMN purchase_state TEXT NOT NULL DEFAULT 'unknown' CHECK (purchase_state IN ('unknown', 'not_detected', 'appears_purchased'));
