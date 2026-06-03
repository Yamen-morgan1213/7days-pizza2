-- 1. CREATE TABLES FIRST (SO THEY DEFINITELY EXIST)
CREATE TABLE IF NOT EXISTS menu (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'classics',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rating NUMERIC(3,1) NOT NULL DEFAULT 5,
  text TEXT DEFAULT '',
  date TEXT DEFAULT 'Just now',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Received',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CLEAN UP OLD POLICIES
DROP POLICY IF EXISTS "Allow all on menu" ON menu;
DROP POLICY IF EXISTS "Allow all on reviews" ON reviews;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
DROP POLICY IF EXISTS "Allow all on inventory" ON inventory;

-- 3. ENABLE SECURITY
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 3b. ENABLE FULL REPLICA IDENTITY (required for Supabase Realtime UPDATE/DELETE broadcasts)
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;

-- 4. RE-CREATE POLICIES
CREATE POLICY "Allow all on menu" ON menu FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- 5. SAFELY ADD TO REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication p 
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'menu'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication p 
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication p 
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication p 
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;
END $$;

-- 6. SEED INVENTORY DATA
INSERT INTO inventory (item_name, stock) VALUES
  ('Dough', 100),
  ('Cheese', 100),
  ('Sauce', 100),
  ('Pepperoni', 100),
  ('Mushrooms', 100),
  ('Onions', 100),
  ('Olives', 100),
  ('Basil', 100),
  ('Tomatoes', 100),
  ('Jalapenos', 100)
ON CONFLICT (item_name) DO NOTHING;