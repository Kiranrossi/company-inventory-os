-- Put this SQL directly into your Supabase SQL Editor and click 'Run'.

-- 1) Create Categories Table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL
);

-- 2) Create Products Table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  product_name TEXT NOT NULL UNIQUE,
  available_quantity NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 10
);

-- 3) Create Projects Table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  project_name TEXT NOT NULL UNIQUE,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT
);

-- 4) Create Project Materials Table (for consumption log)
CREATE TABLE project_materials (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  product_id INTEGER REFERENCES products(id),
  quantity_used NUMERIC NOT NULL
);

-- Optional: Add some constraints or initial seed data if you wish
-- INSERT INTO categories (category_name) VALUES ('Raw Materials'), ('Packaging');
