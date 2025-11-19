-- Setup script untuk tabel load_plans dan load_plan_items di Supabase
-- Jalankan script ini di SQL Editor di Supabase Dashboard

-- Pastikan extension uuid-ossp sudah diaktifkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buat tabel load_plans
CREATE TABLE IF NOT EXISTS public.load_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  flight_number character varying(50) NOT NULL,
  flight_date date NOT NULL,
  aircraft_type character varying(20) NULL,
  aircraft_registration character varying(20) NULL,
  header_version integer NULL DEFAULT 1,
  route_origin character varying(10) NULL,
  route_destination character varying(10) NULL,
  route_full character varying(20) NULL,
  std_time time without time zone NULL,
  prepared_by character varying(50) NULL,
  total_planned_uld character varying(100) NULL,
  uld_version character varying(100) NULL,
  prepared_on timestamp with time zone NULL,
  sector character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT load_plans_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Buat index untuk load_plans
CREATE INDEX IF NOT EXISTS idx_load_plans_flight_number ON public.load_plans USING btree (flight_number) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_load_plans_flight_date ON public.load_plans USING btree (flight_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_load_plans_sector ON public.load_plans USING btree (sector) TABLESPACE pg_default;

-- Buat tabel load_plan_items
CREATE TABLE IF NOT EXISTS public.load_plan_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  load_plan_id uuid NOT NULL,
  serial_number integer NULL,
  awb_number character varying(50) NULL,
  origin_destination character varying(20) NULL,
  pieces integer NULL,
  weight numeric(10, 2) NULL,
  volume numeric(10, 2) NULL,
  load_volume numeric(10, 2) NULL,
  special_handling_code character varying(50) NULL,
  manual_description text NULL,
  product_code_pc character varying(50) NULL,
  total_handling_charge numeric(10, 2) NULL,
  additional_total_handling_charge numeric(10, 2) NULL,
  booking_status character varying(20) NULL,
  priority_indicator character varying(20) NULL,
  flight_in character varying(50) NULL,
  arrival_date_time timestamp with time zone NULL,
  quantity_aqnn character varying(50) NULL,
  payment_terms character varying(50) NULL,
  warehouse_code character varying(50) NULL,
  special_instructions text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  uld_allocation character varying(50) NULL,
  CONSTRAINT load_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT load_plan_items_load_plan_id_fkey FOREIGN KEY (load_plan_id) REFERENCES load_plans (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Buat index untuk load_plan_items
CREATE INDEX IF NOT EXISTS idx_load_plan_items_load_plan_id ON public.load_plan_items USING btree (load_plan_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_load_plan_items_awb_number ON public.load_plan_items USING btree (awb_number) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_load_plan_items_uld_allocation ON public.load_plan_items USING btree (uld_allocation) TABLESPACE pg_default;

-- Buat function untuk update updated_at (jika belum ada)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Buat trigger untuk update updated_at pada load_plans
DROP TRIGGER IF EXISTS update_load_plans_updated_at ON public.load_plans;
CREATE TRIGGER update_load_plans_updated_at
    BEFORE UPDATE ON public.load_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Buat trigger untuk update updated_at pada load_plan_items
DROP TRIGGER IF EXISTS update_load_plan_items_updated_at ON public.load_plan_items;
CREATE TRIGGER update_load_plan_items_updated_at
    BEFORE UPDATE ON public.load_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.load_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_plan_items ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk allow all operations (sesuaikan dengan kebutuhan keamanan Anda)
-- Untuk development, bisa menggunakan policy ini:
CREATE POLICY "Allow all operations on load_plans" ON public.load_plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all operations on load_plan_items" ON public.load_plan_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Atau untuk production, gunakan policy yang lebih ketat:
-- CREATE POLICY "Allow authenticated users to read load_plans" ON public.load_plans
--     FOR SELECT
--     USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated users to insert load_plans" ON public.load_plans
--     FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated users to update load_plans" ON public.load_plans
--     FOR UPDATE
--     USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated users to delete load_plans" ON public.load_plans
--     FOR DELETE
--     USING (auth.role() = 'authenticated');

