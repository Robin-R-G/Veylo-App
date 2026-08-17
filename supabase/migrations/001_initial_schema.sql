-- ============================================================
-- Vehicle Bill SaaS — Initial Schema Migration
-- Generated from codebase analysis (types, services, mockStorage)
-- ============================================================

-- ========================
-- ORGANIZATIONS
-- ========================
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'FREE' CHECK (plan_tier IN ('FREE','PRO','BUSINESS')),
  business_name TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  default_state TEXT,
  default_city TEXT,
  upi_id TEXT,
  upi_payee_name TEXT,
  upi_enabled BOOLEAN DEFAULT false,
  upi_status TEXT DEFAULT 'NOT_CONFIGURED' CHECK (upi_status IN ('NOT_CONFIGURED','CONFIGURED','VERIFICATION_REQUIRED','ACTIVE','SUSPENDED')),
  upi_verified_at TIMESTAMPTZ,
  upi_updated_at TIMESTAMPTZ,
  tax_enabled BOOLEAN DEFAULT false,
  gstin TEXT,
  cgst_rate NUMERIC DEFAULT 0,
  sgst_rate NUMERIC DEFAULT 0,
  igst_rate NUMERIC DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'VBS',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- PROFILES (auth users ↔ org)
-- ========================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('SUPER_ADMIN','OWNER','STAFF','CUSTOMER')),
  avatar_url TEXT,
  upi_id TEXT,
  upi_payee_name TEXT,
  upi_enabled BOOLEAN DEFAULT false,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ========================
-- ORGANIZATION MEMBERS
-- ========================
CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN','STAFF')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, profile_id)
);

-- ========================
-- VEHICLES
-- ========================
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  secure_public_id TEXT NOT NULL UNIQUE,
  registration_number TEXT NOT NULL,
  normalized_reg_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('MOTORCYCLE','SCOOTER','CAR')),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  manufacturing_year INTEGER,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC')),
  mileage_kmpl NUMERIC DEFAULT 0,
  initial_odometer NUMERIC DEFAULT 0,
  current_odometer NUMERIC DEFAULT 0,
  last_verified_odometer NUMERIC DEFAULT 0,
  estimated_current_odometer NUMERIC DEFAULT 0,
  rate_per_km_rupees NUMERIC DEFAULT 12,
  owner_upi_id TEXT,
  requires_approval BOOLEAN DEFAULT false,
  state TEXT NOT NULL DEFAULT 'Kerala',
  city TEXT NOT NULL DEFAULT 'Kozhikode',
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','IN_USE','MAINTENANCE','INACTIVE','RENTAL_REQUESTED','BLOCKED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_organization_id ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_normalized_reg ON vehicles(normalized_reg_number);

-- ========================
-- RIDES (legacy trip tracking)
-- ========================
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  start_odometer NUMERIC NOT NULL DEFAULT 0,
  end_odometer NUMERIC NOT NULL DEFAULT 0,
  distance_km NUMERIC NOT NULL DEFAULT 0,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC')),
  mileage_kmpl NUMERIC NOT NULL DEFAULT 0,
  price_snapshot JSONB,
  estimated_fuel_litres NUMERIC DEFAULT 0,
  estimated_fuel_cost_paise INTEGER DEFAULT 0,
  price_per_km_paise INTEGER DEFAULT 0,
  pricing_mode TEXT NOT NULL DEFAULT 'FUEL_COST' CHECK (pricing_mode IN ('FUEL_COST','PER_KM','FIXED')),
  per_km_rate_rupees NUMERIC,
  fixed_rate_rupees NUMERIC,
  additional_charges_rupees NUMERIC,
  total_amount_paise INTEGER NOT NULL DEFAULT 0,
  total_amount_rupees NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  issue_reported BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rides_vehicle_id ON rides(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rides_organization_id ON rides(organization_id);
CREATE INDEX IF NOT EXISTS idx_rides_owner_id ON rides(owner_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);

-- ========================
-- RENTAL TRIPS
-- ========================
CREATE TABLE IF NOT EXISTS rental_trips (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organization_id TEXT,
  vehicle_reg_number TEXT NOT NULL DEFAULT '',
  vehicle_model TEXT NOT NULL DEFAULT '',
  vehicle_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT,
  owner_upi_id TEXT NOT NULL DEFAULT '',
  rider_id TEXT NOT NULL,
  rider_name TEXT NOT NULL DEFAULT '',
  rider_phone TEXT NOT NULL DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  start_odometer NUMERIC DEFAULT 0,
  gps_distance_km NUMERIC DEFAULT 0,
  estimated_end_odometer NUMERIC DEFAULT 0,
  actual_end_odometer NUMERIC,
  rate_per_km_rupees NUMERIC DEFAULT 0,
  distance_charge_rupees NUMERIC DEFAULT 0,
  other_charges_rupees NUMERIC DEFAULT 0,
  total_amount_rupees NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','ACTIVE','ENDING','DISTANCE_CALCULATED','CONFIRMATION_PENDING','INVOICE_GENERATED','PAYMENT_PENDING','PAYMENT_PROCESSING','PAYMENT_VERIFIED','COMPLETED','REJECTED','CANCELLED','GPS_ERROR','PAYMENT_FAILED','UNDER_REVIEW','DISPUTED')),
  gps_tracking_status TEXT DEFAULT 'STOPPED' CHECK (gps_tracking_status IN ('ACTIVE','WEAK_SIGNAL','LOST','STOPPED')),
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT,
  start_coordinates JSONB,
  current_coordinates JSONB,
  tracking_points JSONB DEFAULT '[]'::jsonb,
  invoice_id TEXT,
  payment_status TEXT DEFAULT 'PENDING',
  upi_deep_link TEXT,
  upi_transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_trips_vehicle_id ON rental_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_organization_id ON rental_trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_rider_id ON rental_trips(rider_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_owner_id ON rental_trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_status ON rental_trips(status);

-- ========================
-- INVOICES
-- ========================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  ride_id TEXT,
  trip_id TEXT,
  vehicle_id TEXT NOT NULL,
  vehicle_reg_number TEXT NOT NULL DEFAULT '',
  vehicle_make_model TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  title TEXT DEFAULT 'USAGE BILL',
  customer_name TEXT DEFAULT '',
  customer_phone TEXT,
  owner_id TEXT,
  start_odometer NUMERIC DEFAULT 0,
  end_odometer NUMERIC DEFAULT 0,
  distance_km NUMERIC DEFAULT 0,
  mileage_kmpl NUMERIC,
  price_snapshot JSONB,
  estimated_fuel_litres NUMERIC,
  estimated_fuel_cost_rupees NUMERIC,
  pricing_mode TEXT,
  rate_per_km_rupees NUMERIC,
  per_km_rate_rupees NUMERIC,
  additional_charges_rupees NUMERIC,
  subtotal_rupees NUMERIC DEFAULT 0,
  tax_rupees NUMERIC DEFAULT 0,
  total_rupees NUMERIC DEFAULT 0,
  platform_fee_rupees NUMERIC DEFAULT 0,
  payee_upi_id TEXT,
  payee_name TEXT,
  upi_deep_link TEXT,
  status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  provider_reference TEXT,
  trip_start_time TIMESTAMPTZ,
  trip_end_time TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_id ON invoices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON invoices(trip_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ========================
-- PAYMENT ATTEMPTS
-- ========================
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payment_id TEXT NOT NULL UNIQUE,
  trip_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  organization_id TEXT,
  owner_id TEXT NOT NULL,
  rider_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'UPI_DIRECT',
  payment_destination TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider_reference TEXT,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice_id ON payment_attempts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_trip_id ON payment_attempts(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_owner_id ON payment_attempts(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_organization_id ON payment_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON payment_attempts(payment_id);

-- ========================
-- ODOMETER HISTORY
-- ========================
CREATE TABLE IF NOT EXISTS odometer_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  previous_reading NUMERIC NOT NULL DEFAULT 0,
  new_reading NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  updated_by_profile_id TEXT,
  updated_by_name TEXT,
  reason TEXT NOT NULL DEFAULT 'MANUAL_UPDATE' CHECK (reason IN ('RIDE_COMPLETED','GPS_RIDE_COMPLETED','MANUAL_UPDATE','ADMIN_CORRECTION','OWNER_VERIFIED')),
  ride_id TEXT,
  trip_id TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odometer_history_vehicle_id ON odometer_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_odometer_history_timestamp ON odometer_history(timestamp);

-- ========================
-- MAINTENANCE RECORDS
-- ========================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('ENGINE_OIL','BRAKE_SERVICE','TYRE_REPLACEMENT','CHAIN_SERVICE','BATTERY','GENERAL_SERVICE','INSURANCE_RENEWAL','POLLUTION_CERTIFICATE','OTHER')),
  service_date TEXT NOT NULL,
  odometer_reading NUMERIC DEFAULT 0,
  cost_rupees NUMERIC DEFAULT 0,
  cost_paise NUMERIC,
  notes TEXT,
  next_due_date TEXT,
  next_due_odometer NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_service_date ON maintenance_records(service_date);

-- ========================
-- ISSUES
-- ========================
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ride_id TEXT,
  reported_by_profile_id TEXT,
  reporter_name TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('BRAKE','TYRE','ENGINE','ELECTRICAL','ACCIDENT','DAMAGE','FUEL','OTHER')),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED')),
  photo_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_issues_vehicle_id ON issues(vehicle_id);

-- ========================
-- DISPUTES
-- ========================
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trip_id TEXT NOT NULL,
  invoice_id TEXT,
  organization_id TEXT,
  raised_by TEXT NOT NULL CHECK (raised_by IN ('RIDER','OWNER')),
  raised_by_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  claimed_distance_km NUMERIC,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','REJECTED')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_trip_id ON disputes(trip_id);
CREATE INDEX IF NOT EXISTS idx_disputes_organization_id ON disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ========================
-- RIDER PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS rider_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- PLANS
-- ========================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_paise INTEGER DEFAULT 0,
  price_rupees NUMERIC DEFAULT 0,
  billing_interval TEXT DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY','YEARLY')),
  vehicle_limit INTEGER DEFAULT 2,
  staff_limit INTEGER DEFAULT 0,
  gps_enabled BOOLEAN DEFAULT false,
  advanced_reports BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  ads_enabled BOOLEAN DEFAULT true,
  priority_support BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- SUBSCRIPTIONS
-- ========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED','SUSPENDED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  provider TEXT DEFAULT 'MOCK',
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- ========================
-- PLATFORM REVENUE
-- ========================
CREATE TABLE IF NOT EXISTS platform_revenue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  amount_rupees NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('SUBSCRIPTION','PLATFORM_FEE','PREMIUM_FEATURE','ADVERTISING','OTHER')),
  reference_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_organization_id ON platform_revenue(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON platform_revenue(created_at);

-- ========================
-- PAYMENT EVENTS (webhook audit)
-- ========================
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);

-- ========================
-- PLATFORM SETTINGS (key/value)
-- ========================
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- AD CONFIGURATIONS
-- ========================
CREATE TABLE IF NOT EXISTS ad_configurations (
  id TEXT PRIMARY KEY,
  placement TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  provider TEXT NOT NULL DEFAULT '',
  premium_excluded BOOLEAN DEFAULT true,
  banner_title TEXT NOT NULL DEFAULT '',
  banner_text TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '#'
);

-- ========================
-- FUEL PRICES
-- ========================
CREATE TABLE IF NOT EXISTS fuel_prices (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT NOT NULL DEFAULT 'Kerala',
  district TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Kozhikode',
  pincode TEXT DEFAULT '',
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC')),
  price_per_unit_paise INTEGER NOT NULL DEFAULT 0,
  price_rupees NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'LITRE' CHECK (unit IN ('LITRE','KG')),
  currency TEXT DEFAULT 'INR',
  source_name TEXT DEFAULT 'Central Database',
  source_url TEXT,
  effective_date TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'LIVE',
  fallback_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state, district, city, fuel_type)
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_state_city ON fuel_prices(state, city);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_fuel_type ON fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_status ON fuel_prices(status);

-- ========================
-- FUEL PRICE HISTORY
-- ========================
CREATE TABLE IF NOT EXISTS fuel_price_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fuel_price_id TEXT,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC')),
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT NOT NULL DEFAULT 'Kerala',
  district TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Kozhikode',
  pincode TEXT DEFAULT '',
  price_per_unit_paise INTEGER NOT NULL DEFAULT 0,
  price_rupees NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'LITRE' CHECK (unit IN ('LITRE','KG')),
  currency TEXT DEFAULT 'INR',
  source_name TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  effective_date TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_price_history_recorded_at ON fuel_price_history(recorded_at);

-- ========================
-- FUEL PRICE AUDIT LOG
-- ========================
CREATE TABLE IF NOT EXISTS fuel_price_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type TEXT NOT NULL CHECK (event_type IN ('FUEL_PRICE_UPDATED','FUEL_PRICE_UPDATE_FAILED')),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC')),
  country TEXT NOT NULL DEFAULT 'India',
  state TEXT NOT NULL DEFAULT 'Kerala',
  district TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Kozhikode',
  old_price_rupees NUMERIC,
  new_price_rupees NUMERIC,
  source_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS','FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_price_audit_log_created_at ON fuel_price_audit_log(created_at);

-- ========================
-- PAYMENT SETTINGS (per org UPI config)
-- ========================
CREATE TABLE IF NOT EXISTS payment_settings (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  upi_id TEXT,
  payee_name TEXT,
  status TEXT DEFAULT 'NOT_CONFIGURED',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- ROW LEVEL SECURITY
-- ========================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE odometer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- service_role: full access to everything
CREATE POLICY "service_role_all" ON organizations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON organization_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON vehicles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON rides FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON rental_trips FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON invoices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON payment_attempts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON odometer_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON maintenance_records FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON issues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON disputes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON rider_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON platform_revenue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON payment_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON platform_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON ad_configurations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON fuel_prices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON fuel_price_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON fuel_price_audit_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON payment_settings FOR ALL USING (auth.role() = 'service_role');

-- authenticated: read everything, write to own org rows
CREATE POLICY "authenticated_read" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON plans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON platform_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON ad_configurations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON fuel_prices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON fuel_price_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON fuel_price_audit_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON rider_profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_org_write" ON vehicles FOR ALL
  USING (auth.role() = 'authenticated' AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));
CREATE POLICY "authenticated_org_write" ON rental_trips FOR ALL
  USING (auth.role() = 'authenticated' AND (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ) OR owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "authenticated_org_write" ON invoices FOR ALL
  USING (auth.role() = 'authenticated' AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));
CREATE POLICY "authenticated_org_write" ON payment_attempts FOR ALL
  USING (auth.role() = 'authenticated' AND owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));
CREATE POLICY "authenticated_org_write" ON odometer_history FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON maintenance_records FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON issues FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON disputes FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON subscriptions FOR ALL
  USING (auth.role() = 'authenticated' AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));
CREATE POLICY "authenticated_org_write" ON platform_revenue FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON payment_events FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON payment_settings FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON organization_members FOR ALL
  USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_org_write" ON rides FOR ALL
  USING (auth.role() = 'authenticated');

-- anon: read plans, fuel prices, ad configs (public page)
CREATE POLICY "anon_read" ON plans FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON fuel_prices FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON ad_configurations FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON platform_settings FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON organizations FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON vehicles FOR SELECT USING (auth.role() = 'anon');
CREATE POLICY "anon_read" ON rides FOR SELECT USING (auth.role() = 'anon');

-- ========================
-- SEED DATA: DEFAULT ORGANIZATION
-- ========================
INSERT INTO organizations (id, name, slug, plan_tier, business_name, email, phone, default_state, default_city, upi_id, upi_payee_name, upi_enabled, tax_enabled, cgst_rate, sgst_rate, igst_rate, invoice_prefix)
VALUES ('org_demo_1', 'Veylo Fleet Solutions', 'veylo-fleet', 'FREE', 'Veylo Vehicle Rentals', 'owner@veylo.com', '+91 98765 43210', 'Kerala', 'Kozhikode', 'vehicleowner@upi', 'Vehicle Owner', true, false, 0, 0, 0, 'INV')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: PLANS
-- ========================
INSERT INTO plans (id, name, price_paise, price_rupees, billing_interval, vehicle_limit, staff_limit, gps_enabled, advanced_reports, custom_branding, ads_enabled, priority_support)
VALUES
  ('FREE', 'Free Starter Plan', 0, 0.00, 'MONTHLY', 2, 0, false, false, false, true, false),
  ('STARTER', 'Starter Plan', 29900, 299.00, 'MONTHLY', 5, 0, true, false, false, true, false),
  ('PRO', 'Professional Plan', 79900, 799.00, 'MONTHLY', 20, 3, true, true, true, false, true),
  ('BUSINESS', 'Enterprise Business Plan', 149900, 1499.00, 'MONTHLY', 100, 10, true, true, true, false, true)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: DEFAULT SUBSCRIPTION
-- ========================
INSERT INTO subscriptions (id, organization_id, plan_id, status, started_at, current_period_start, current_period_end, provider)
VALUES ('sub_init_free', 'org_demo_1', 'FREE', 'ACTIVE', '2026-08-15T00:00:00Z', '2026-08-15T00:00:00Z', '2026-09-15T00:00:00Z', 'MOCK')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: PLATFORM SETTINGS
-- ========================
INSERT INTO platform_settings (key, value)
VALUES
  ('monetization', '{"platformFeeEnabled": false, "platformFeeType": "NONE", "platformFeeValue": 0, "advertisingEnabled": true, "trialDays": 14}'::jsonb),
  ('feature_flags', '{"onlinePayment": true, "marketplaceSettlement": false, "commission": false, "gst": false, "advertising": true, "subscriptions": true, "aiInsights": true, "maintenance": true, "gpsTracking": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========================
-- SEED DATA: AD CONFIGURATIONS
-- ========================
INSERT INTO ad_configurations (id, placement, enabled, provider, premium_excluded, banner_title, banner_text, banner_url)
VALUES
  ('ad_dash', 'dashboard-bottom', true, 'Veylo Ads Engine', true, 'Vehicle Insurance & RSA', 'Save up to 40% on comprehensive two-wheeler and four-wheeler insurance.', '#'),
  ('ad_veh', 'vehicle-bottom', true, 'Veylo Ads Engine', true, 'Doorstep Battery & Tyre Care', 'Get verified doorstep battery health check and genuine tyres in Kozhikode.', '#')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: FUEL PRICES
-- ========================
INSERT INTO fuel_prices (id, country, state, district, city, fuel_type, price_per_unit_paise, price_rupees, unit, currency, source_name, effective_date, status)
VALUES
  ('fp_init_petrol', 'India', 'Kerala', '', 'Kozhikode', 'PETROL', 10420, 104.20, 'LITRE', 'INR', 'MANUAL', '2026-08-15', 'LIVE'),
  ('fp_init_diesel', 'India', 'Kerala', '', 'Kozhikode', 'DIESEL', 9250, 92.50, 'LITRE', 'INR', 'MANUAL', '2026-08-15', 'LIVE'),
  ('fp_init_cng', 'India', 'Kerala', '', 'Kozhikode', 'CNG', 8500, 85.00, 'KG', 'INR', 'MANUAL', '2026-08-15', 'LIVE')
ON CONFLICT (state, district, city, fuel_type) DO NOTHING;

-- ========================
-- SEED DATA: FUEL PRICE HISTORY
-- ========================
INSERT INTO fuel_price_history (id, fuel_price_id, fuel_type, country, state, district, city, price_per_unit_paise, price_rupees, unit, currency, source_name, effective_date)
VALUES ('h_init_petrol', 'fp_init_petrol', 'PETROL', 'India', 'Kerala', '', 'Kozhikode', 10420, 104.20, 'LITRE', 'INR', 'MANUAL', '2026-08-15')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: DEFAULT VEHICLES
-- ========================
INSERT INTO vehicles (id, organization_id, owner_id, secure_public_id, registration_number, normalized_reg_number, vehicle_type, make, model, manufacturing_year, fuel_type, mileage_kmpl, initial_odometer, current_odometer, last_verified_odometer, estimated_current_odometer, rate_per_km_rupees, owner_upi_id, requires_approval, state, city, status, notes)
VALUES
  ('v_kl08ab1234', 'org_demo_1', 'prof_owner_1', 'pub_kl08ab1234_z77c', 'KL 08 AB 1234', 'KL08AB1234', 'SCOOTER', 'Honda', 'Activa 6G', 2023, 'PETROL', 45, 42000, 42580, 42580, 42580, 12, 'vehicleowner@upi', false, 'Kerala', 'Kozhikode', 'AVAILABLE', 'Available for immediate rental at Kozhikode beach hub.'),
  ('v_kl16p78', 'org_demo_1', 'prof_owner_1', 'pub_kl16p78_x99a', 'KL 16 P 78', 'KL16P78', 'MOTORCYCLE', 'Royal Enfield', 'Classic 350', 2023, 'PETROL', 40, 12500, 12560, 12560, 12560, 15, 'vehicleowner@upi', false, 'Kerala', 'Kozhikode', 'AVAILABLE', 'Primary daily cruiser bike. Kozhikode location.'),
  ('v_mh02ck4321', 'org_demo_1', 'prof_owner_1', 'pub_mh02ck4321_y88b', 'MH 02 CK 4321', 'MH02CK4321', 'CAR', 'Hyundai', 'Creta 1.5', 2024, 'PETROL', 14, 34200, 34850, 34850, 34850, 20, 'vehicleowner@upi', false, 'Maharashtra', 'Mumbai', 'AVAILABLE', 'Family SUV for long trips.')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: ODOMETER HISTORY
-- ========================
INSERT INTO odometer_history (id, vehicle_id, previous_reading, new_reading, difference, updated_by_name, reason, notes, timestamp)
VALUES
  ('odo_0', 'v_kl08ab1234', 42000, 42580, 580, 'Owner Physical Verification', 'OWNER_VERIFIED', 'Verified physical odometer reading', '2026-08-14T08:00:00Z'),
  ('odo_1', 'v_kl16p78', 12500, 12500, 0, 'Vehicle Registration', 'MANUAL_UPDATE', 'Initial registration entry', '2026-08-01T08:00:00Z'),
  ('odo_2', 'v_kl16p78', 12500, 12560, 60, 'Rahul Nair (Customer)', 'RIDE_COMPLETED', 'City trip commute', '2026-08-15T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: MAINTENANCE RECORDS
-- ========================
INSERT INTO maintenance_records (id, vehicle_id, service_type, service_date, odometer_reading, cost_rupees, notes, next_due_odometer, created_at)
VALUES
  ('maint_1', 'v_kl16p78', 'ENGINE_OIL', '2026-07-20', 12000, 1500, 'Full synthetic 15W50 engine oil replacement and filter change', 15000, '2026-07-20T10:00:00Z'),
  ('maint_2', 'v_kl08ab1234', 'GENERAL_SERVICE', '2026-08-05', 40000, 1200, 'Brake pads and CVT belt inspection', 45000, '2026-08-05T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: INVOICES (existing demo invoice)
-- ========================
INSERT INTO invoices (id, organization_id, ride_id, vehicle_id, vehicle_reg_number, vehicle_make_model, invoice_number, title, customer_name, customer_phone, start_odometer, end_odometer, distance_km, mileage_kmpl, pricing_mode, subtotal_rupees, tax_rupees, total_rupees, payee_upi_id, payee_name, upi_deep_link, status, payment_method, provider_reference, issued_at, paid_at, notes)
VALUES ('inv_101', 'org_demo_1', 'ride_101', 'v_kl16p78', 'KL 16 P 78', 'Royal Enfield Classic 350', 'INV-20260814-001', 'USAGE BILL', 'Rahul Nair', '+91 94000 11223', 12500, 12508, 8, 40, 'FUEL_COST', 20.84, 0.00, 20.84, 'owner@upi', 'Vehicle Owner', 'upi://pay?pa=owner@upi&pn=Vehicle%20Owner&am=20.84&cu=INR&tr=INV-20260814-001', 'PAID', 'UPI_INTENT', 'UPI_TXN_98721', '2026-08-14T08:00:00Z', '2026-08-14T08:00:00Z', '8 km test journey at ₹104.20/L petrol price')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- SEED DATA: PAYMENT SETTINGS
-- ========================
INSERT INTO payment_settings (organization_id, upi_id, payee_name, status)
VALUES ('org_demo_1', 'vehicleowner@upi', 'Vehicle Owner', 'ACTIVE')
ON CONFLICT (organization_id) DO NOTHING;

-- ========================
-- RPC: Admin fuel rates upsert
-- ========================
CREATE OR REPLACE FUNCTION admin_update_fuel_rates(
  p_state TEXT,
  p_district TEXT,
  p_city TEXT,
  p_petrol_paise INTEGER,
  p_diesel_paise INTEGER,
  p_cng_paise INTEGER,
  p_source TEXT,
  p_source_url TEXT,
  p_effective_date TEXT
)
RETURNS SETOF fuel_prices AS $$
DECLARE
  now_ts TIMESTAMPTZ := now();
  rec RECORD;
  records fuel_prices[];
BEGIN
  records := ARRAY[
    ROW(NULL, 'India', p_state, p_district, p_city, '', 'PETROL', p_petrol_paise, p_petrol_paise::numeric/100, 'LITRE', 'INR', p_source, p_source_url, p_effective_date, now_ts, 'LIVE', NULL, now_ts, now_ts),
    ROW(NULL, 'India', p_state, p_district, p_city, '', 'DIESEL', p_diesel_paise, p_diesel_paise::numeric/100, 'LITRE', 'INR', p_source, p_source_url, p_effective_date, now_ts, 'LIVE', NULL, now_ts, now_ts),
    ROW(NULL, 'India', p_state, p_district, p_city, '', 'CNG', p_cng_paise, p_cng_paise::numeric/100, 'KG', 'INR', p_source, p_source_url, p_effective_date, now_ts, 'LIVE', NULL, now_ts, now_ts)
  ]::fuel_prices[];

  FOR rec IN
    INSERT INTO fuel_prices (id, country, state, district, city, pincode, fuel_type, price_per_unit_paise, price_rupees, unit, currency, source_name, source_url, effective_date, fetched_at, status, fallback_reason, created_at, updated_at)
    SELECT
      COALESCE(fp.id, 'fp_' || lower(fp.fuel_type) || '_' || replace(lower(p_state), ' ', '_')),
      fp.country, fp.state, fp.district, fp.city, fp.pincode, fp.fuel_type,
      fp.price_per_unit_paise, fp.price_rupees, fp.unit, fp.currency,
      fp.source_name, fp.source_url, fp.effective_date, fp.fetched_at, fp.status,
      fp.fallback_reason, fp.created_at, fp.updated_at
    FROM unnest(records) AS fp(id, country, state, district, city, pincode, fuel_type, price_per_unit_paise, price_rupees, unit, currency, source_name, source_url, effective_date, fetched_at, status, fallback_reason, created_at, updated_at)
    ON CONFLICT (state, district, city, fuel_type) DO UPDATE SET
      price_per_unit_paise = EXCLUDED.price_per_unit_paise,
      price_rupees = EXCLUDED.price_rupees,
      source_name = EXCLUDED.source_name,
      source_url = EXCLUDED.source_url,
      effective_date = EXCLUDED.effective_date,
      fetched_at = EXCLUDED.fetched_at,
      status = EXCLUDED.status,
      updated_at = now_ts
    RETURNING *
  LOOP
    -- history
    INSERT INTO fuel_price_history (fuel_type, country, state, district, city, price_per_unit_paise, price_rupees, unit, currency, source_name, effective_date)
    VALUES (rec.fuel_type, rec.country, rec.state, rec.district, rec.city, rec.price_per_unit_paise, rec.price_rupees, rec.unit, rec.currency, rec.source_name, rec.effective_date);
    -- audit
    INSERT INTO fuel_price_audit_log (event_type, fuel_type, country, state, district, city, new_price_rupees, source_name, status)
    VALUES ('FUEL_PRICE_UPDATED', rec.fuel_type, rec.country, rec.state, rec.district, rec.city, rec.price_rupees, rec.source_name, 'SUCCESS');
    RETURN NEXT rec;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
