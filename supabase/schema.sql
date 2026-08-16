-- =============================================================================
-- VEHICLE USAGE, FUEL COST & BILLING SaaS — COMPLETE POSTGRESQL / SUPABASE SCHEMA
-- Zero Fake GST | RLS Multi-Tenant Architecture | Modular Payment & Ad Ready
-- Single canonical schema (supabase/migrations/ was merged here on 2026-08-15).
-- =============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('SUPER_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE org_member_role AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'RENTAL_REQUESTED', 'IN_USE', 'MAINTENANCE', 'BLOCKED', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM (
    'REQUESTED', 'APPROVED', 'ACTIVE', 'ENDING', 'DISTANCE_CALCULATED',
    'CONFIRMATION_PENDING', 'INVOICE_GENERATED', 'PAYMENT_PENDING',
    'PAYMENT_PROCESSING', 'PAYMENT_VERIFIED', 'COMPLETED', 'REJECTED',
    'CANCELLED', 'GPS_ERROR', 'PAYMENT_FAILED', 'UNDER_REVIEW', 'DISPUTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
   CREATE TYPE payment_status AS ENUM (
     'PENDING', 'PAYMENT_INITIATED', 'PAYMENT_SUBMITTED', 'PAYMENT_PROCESSING',
     'PAID', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'UNDER_REVIEW',
     'CASH_PENDING', 'CASH_REPORTED', 'CASH_CONFIRMED', 'CASH_REJECTED'
   );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE revenue_type AS ENUM ('SUBSCRIPTION', 'PLATFORM_FEE', 'PREMIUM_FEATURE', 'ADVERTISING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE odometer_source AS ENUM ('GPS', 'MANUAL', 'OWNER', 'RIDER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE upi_status AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'VERIFICATION_REQUIRED', 'ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gps_sync_status AS ENUM ('PENDING', 'SYNCED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 1. ORGANIZATIONS & PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan_tier IN ('FREE', 'STARTER', 'PRO', 'BUSINESS')),
    business_name VARCHAR(255),
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    -- UPI Payment Settings
    upi_id VARCHAR(100),
    upi_payee_name VARCHAR(255),
    upi_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    upi_status upi_status NOT NULL DEFAULT 'NOT_CONFIGURED',
    upi_verified_at TIMESTAMPTZ,
    upi_updated_at TIMESTAMPTZ,
    -- Tax Configuration
    tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    gstin VARCHAR(20),
    cgst_rate NUMERIC(5,2) DEFAULT 0.00,
    sgst_rate NUMERIC(5,2) DEFAULT 0.00,
    igst_rate NUMERIC(5,2) DEFAULT 0.00,
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'VBS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role app_role NOT NULL DEFAULT 'OWNER',
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role org_member_role NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, profile_id)
);

-- =============================================================================
-- 2. VEHICLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    secure_public_id VARCHAR(64) UNIQUE NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    normalized_reg_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('MOTORCYCLE', 'SCOOTER', 'CAR')),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    manufacturing_year INT,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC')),
    mileage_kmpl NUMERIC(6,2) NOT NULL,
    initial_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    current_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    last_verified_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estimated_current_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    rate_per_km_rupees NUMERIC(8,2) NOT NULL DEFAULT 12.00,
    owner_upi_id VARCHAR(100) DEFAULT 'vehicleowner@upi',
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
    state VARCHAR(100),
    city VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_norm_reg ON public.vehicles(normalized_reg_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_secure_id ON public.vehicles(secure_public_id);

-- =============================================================================
-- 3. ODOMETER HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.odometer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    previous_reading NUMERIC(10,2) NOT NULL,
    new_reading NUMERIC(10,2) NOT NULL,
    difference NUMERIC(10,2) GENERATED ALWAYS AS (new_reading - previous_reading) STORED,
    updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'RIDE_COMPLETED',
    ride_id UUID,
    trip_id VARCHAR(100),
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_odometer_increasing CHECK (new_reading >= previous_reading OR reason = 'ADMIN_CORRECTION')
);

CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON public.odometer_history(vehicle_id);

-- =============================================================================
-- 4. FUEL PRICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fuel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NOT NULL DEFAULT 'Kerala',
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL DEFAULT 'Kozhikode',
    pincode VARCHAR(20),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC')),
    price_per_unit_paise INT NOT NULL,
    price_rupees NUMERIC(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'LITRE' CHECK (unit IN ('LITRE', 'KG')),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_name VARCHAR(100) NOT NULL DEFAULT 'MANUAL',
    source_url VARCHAR(255),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'RECENT', 'STALE', 'UNAVAILABLE', 'SOURCE_ERROR', 'VALIDATION_ERROR')),
    fallback_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(state, district, city, fuel_type)
);

CREATE TABLE IF NOT EXISTS public.fuel_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_price_id UUID REFERENCES public.fuel_prices(id) ON DELETE SET NULL,
    fuel_type VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    price_per_unit_paise INT NOT NULL,
    price_rupees NUMERIC(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    effective_date DATE NOT NULL,
    source_name VARCHAR(100) NOT NULL,
    source_url VARCHAR(255),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fuel_price_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    old_price_rupees NUMERIC(10,2),
    new_price_rupees NUMERIC(10,2),
    source_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_location ON public.fuel_prices(state, district, city);
CREATE INDEX IF NOT EXISTS idx_fuel_price_history_recorded ON public.fuel_price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_fuel_price_audit_event ON public.fuel_price_audit_log(event_type, status);

-- =============================================================================
-- 5. RIDES (manual odometer-based rides)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    start_odometer NUMERIC(10,2) NOT NULL,
    end_odometer NUMERIC(10,2) NOT NULL,
    distance_km NUMERIC(10,2) GENERATED ALWAYS AS (end_odometer - start_odometer) STORED,
    fuel_type VARCHAR(20) NOT NULL,
    mileage_kmpl NUMERIC(6,2) NOT NULL,
    fuel_price_paise INT NOT NULL,
    estimated_fuel_litres NUMERIC(8,3) NOT NULL,
    estimated_fuel_cost_paise INT NOT NULL,
    price_per_km_paise INT NOT NULL,
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'FUEL_COST' CHECK (pricing_model IN ('FUEL_COST', 'PER_KM', 'FIXED_RENTAL', 'FUEL_PLUS_KM')),
    total_amount_paise INT NOT NULL,
    notes TEXT,
    issue_reported BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rides_vehicle ON public.rides(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rides_org ON public.rides(organization_id);

-- =============================================================================
-- 5B. TRIPS (public QR usage-bill drafts)
-- Created by the anonymous public QR flow; finalized into invoices by the
-- /api/billing/calculate route. Keep the column set minimal — it mirrors the
-- QR client's insert, everything else lives on the generated invoice.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    start_odometer NUMERIC(10,2) NOT NULL,
    end_odometer NUMERIC(10,2) NOT NULL,
    fuel_price_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    pricing_mode VARCHAR(20) NOT NULL DEFAULT 'FUEL_COST' CHECK (pricing_mode IN ('FUEL_COST', 'PER_KM', 'FUEL_PLUS_PER_KM', 'FIXED', 'CUSTOM')),
    per_km_rate_rupees NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_org ON public.trips(organization_id);

-- =============================================================================
-- 6. RENTAL TRIPS & GPS TELEMETRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rental_trips (
    id VARCHAR(100) PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    rider_id VARCHAR(100) NOT NULL,
    rider_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rider_name VARCHAR(255) NOT NULL,
    rider_phone VARCHAR(50) NOT NULL,
    -- Denormalized vehicle/owner snapshot (baked at trip start, like the invoice snapshot)
    vehicle_reg_number VARCHAR(50),
    vehicle_model VARCHAR(200),
    vehicle_type VARCHAR(20),
    owner_name VARCHAR(255),
    owner_upi_id VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INT NOT NULL DEFAULT 0,
    start_odometer NUMERIC(10,2) NOT NULL,
    gps_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estimated_end_odometer NUMERIC(10,2) NOT NULL,
    actual_end_odometer NUMERIC(10,2),
    rate_per_km_rupees NUMERIC(8,2) NOT NULL,
    distance_charge_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    other_charges_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status trip_status NOT NULL DEFAULT 'ACTIVE',
    gps_tracking_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    suspicious_reason TEXT,
    invoice_id UUID,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    upi_deep_link TEXT,
    upi_transaction_ref VARCHAR(100),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gps_tracking_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id VARCHAR(100) NOT NULL REFERENCES public.rental_trips(id) ON DELETE CASCADE,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    accuracy NUMERIC(8,2) NOT NULL,
    speed NUMERIC(8,2),
    heading NUMERIC(8,2),
    distance_from_last_km NUMERIC(8,3) DEFAULT 0.000,
    timestamp BIGINT NOT NULL,
    sync_status gps_sync_status NOT NULL DEFAULT 'SYNCED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_rental_trips_vehicle ON public.rental_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_org ON public.rental_trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_rider ON public.rental_trips(rider_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_rider_profile ON public.rental_trips(rider_profile_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_status ON public.rental_trips(status);
CREATE INDEX IF NOT EXISTS idx_gps_points_trip ON public.gps_tracking_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_points_trip_time ON public.gps_tracking_points(trip_id, timestamp);

-- =============================================================================
-- 7. INVOICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID,
    ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
    trip_id VARCHAR(100) REFERENCES public.rental_trips(id) ON DELETE SET NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    rider_id VARCHAR(100),
    vehicle_reg_number VARCHAR(50),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'USAGE BILL',
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    start_odometer NUMERIC(10,2),
    end_odometer NUMERIC(10,2),
    distance_km NUMERIC(10,2),
    mileage_kmpl NUMERIC(6,2),
    rate_per_km_rupees NUMERIC(8,2),
    subtotal_rupees NUMERIC(10,2) NOT NULL,
    platform_fee_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_rupees NUMERIC(10,2) NOT NULL,
    payee_name VARCHAR(255),
    payee_upi_id VARCHAR(100),
    upi_deep_link TEXT,
    provider_reference VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    trip_start_time TIMESTAMPTZ,
    trip_end_time TIMESTAMPTZ,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle ON public.invoices(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_rider ON public.invoices(rider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- =============================================================================
-- 8. PAYMENT SETTINGS (Owner UPI)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    upi_id VARCHAR(100) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    status upi_status NOT NULL DEFAULT 'CONFIGURED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- =============================================================================
-- 9. PAYMENTS (app-canonical payment record — PaymentAttempt type)
-- The single record a payment provider webhook transitions to PAID. Owner money
-- routing is resolved from the invoice snapshot; never from a rider payload.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    trip_id VARCHAR(100) NOT NULL,
    invoice_id VARCHAR(100) NOT NULL,
    owner_id UUID,
    rider_id VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI_DIRECT',
    payment_destination VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAYMENT_INITIATED', 'PAYMENT_SUBMITTED', 'PAYMENT_PROCESSING', 'PAID', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'UNDER_REVIEW', 'CASH_PENDING', 'CASH_REPORTED', 'CASH_CONFIRMED', 'CASH_REJECTED')),
    provider_reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice ON public.payment_attempts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_trip ON public.payment_attempts(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_owner ON public.payment_attempts(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_rider ON public.payment_attempts(rider_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created ON public.payment_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_trips_owner ON public.rental_trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_trips_created ON public.rental_trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_odometer_history_timestamp ON public.odometer_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_date ON public.maintenance_records(vehicle_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_issues_vehicle_status ON public.issues(vehicle_id, status);

-- =============================================================================
-- 10. PAYMENT EVENTS (immutable audit log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_type ON public.payment_events(event_type);

-- =============================================================================
-- 11. MAINTENANCE & ISSUES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('ENGINE_OIL', 'BRAKE_SERVICE', 'TYRE_REPLACEMENT', 'CHAIN_SERVICE', 'BATTERY', 'GENERAL_SERVICE', 'INSURANCE_RENEWAL', 'POLLUTION_CERTIFICATE', 'OTHER')),
    service_date DATE NOT NULL,
    odometer_reading NUMERIC(10,2) NOT NULL,
    cost_paise INT NOT NULL DEFAULT 0,
    cost_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    next_due_date DATE,
    next_due_odometer NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
    reported_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_name VARCHAR(255),
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('BRAKE', 'TYRE', 'ENGINE', 'ELECTRICAL', 'ACCIDENT', 'DAMAGE', 'FUEL', 'OTHER')),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    photo_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 12. RIDER PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rider_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    total_trips INT NOT NULL DEFAULT 0,
    total_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_spent_paise BIGINT NOT NULL DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_profiles_phone ON public.rider_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rider_profiles_user ON public.rider_profiles(user_id);

-- =============================================================================
-- 13. DISPUTES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id VARCHAR(100) NOT NULL REFERENCES public.rental_trips(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    rider_id VARCHAR(100),
    raised_by UUID,
    raised_by_name VARCHAR(255),
    created_by UUID NOT NULL DEFAULT uuid_generate_v4(),
    reason TEXT NOT NULL,
    claimed_distance_km NUMERIC(10,2),
    evidence TEXT,
    status dispute_status NOT NULL DEFAULT 'OPEN',
    resolution TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_trip ON public.disputes(trip_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_org ON public.disputes(organization_id);
CREATE INDEX IF NOT EXISTS idx_disputes_rider ON public.disputes(rider_id);

-- =============================================================================
-- 14. ADVERTISING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ad_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    placement VARCHAR(50) NOT NULL CHECK (placement IN ('dashboard-bottom', 'vehicle-bottom', 'reports-bottom', 'invoice-bottom', 'public-page-bottom')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    provider VARCHAR(50) NOT NULL DEFAULT 'MOCK_ADSENSE',
    premium_excluded BOOLEAN NOT NULL DEFAULT TRUE,
    banner_title VARCHAR(255) DEFAULT 'Sponsored Vehicle Maintenance',
    banner_text TEXT DEFAULT 'Compare insurance & maintenance plans from top verified partners.',
    banner_url TEXT DEFAULT '#',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(placement)
);

-- =============================================================================
-- 15. PLATFORM & ADMIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID,
    recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('OWNER', 'RIDER', 'ADMIN')),
    channel VARCHAR(20) NOT NULL DEFAULT 'APP' CHECK (channel IN ('APP', 'EMAIL', 'SMS', 'PUSH')),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON public.notification_queue(recipient_id, status);

-- =============================================================================
-- 15B. APP SESSIONS (server-side auth migration target)
-- Mirrors the localStorage session the client currently uses; enables moving
-- auth onto Supabase without losing the OWNER/RIDER/ADMIN role model.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    role VARCHAR(10) NOT NULL CHECK (role IN ('OWNER', 'RIDER', 'ADMIN')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    token VARCHAR(255) UNIQUE,             -- Session token (JWT or random secret)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON public.app_sessions(token);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON public.app_sessions(user_id);

-- =============================================================================
-- 16. SAAS PLANS & SUBSCRIPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_paise INT NOT NULL DEFAULT 0,
    price_rupees NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    vehicle_limit INT NOT NULL DEFAULT 2,
    staff_limit INT NOT NULL DEFAULT 0,
    gps_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    advanced_reports BOOLEAN NOT NULL DEFAULT FALSE,
    custom_branding BOOLEAN NOT NULL DEFAULT FALSE,
    ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES public.plans(id),
    status subscription_status NOT NULL DEFAULT 'TRIAL',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancelled_at TIMESTAMPTZ,
    provider VARCHAR(50) NOT NULL DEFAULT 'MOCK',
    provider_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id)
);

CREATE TABLE IF NOT EXISTS public.feature_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id VARCHAR(50) NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    limit_value INT,
    UNIQUE(plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    amount_paise INT NOT NULL,
    amount_rupees NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    revenue_type revenue_type NOT NULL,
    reference_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON public.platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created ON public.platform_revenue(created_at);

-- =============================================================================
-- 17. SEED DATA
-- =============================================================================

INSERT INTO public.plans (id, name, price_paise, price_rupees, vehicle_limit, staff_limit, gps_enabled, advanced_reports, custom_branding, ads_enabled, priority_support)
VALUES
    ('FREE', 'Free Starter Plan', 0, 0.00, 2, 0, false, false, false, true, false),
    ('STARTER', 'Starter Plan', 29900, 299.00, 5, 0, true, false, false, true, false),
    ('PRO', 'Professional Plan', 79900, 799.00, 20, 3, true, true, true, false, true),
    ('BUSINESS', 'Enterprise Business Plan', 149900, 1499.00, 100, 10, true, true, true, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.feature_entitlements (plan_id, feature_key, enabled, limit_value)
VALUES
    ('FREE', 'GPS_TRACKING', false, null),
    ('FREE', 'ADVANCED_GPS', false, null),
    ('FREE', 'ADVANCED_REPORTS', false, null),
    ('FREE', 'CUSTOM_INVOICE', false, null),
    ('FREE', 'CUSTOM_BRANDING', false, null),
    ('FREE', 'MULTI_STAFF', false, 0),
    ('FREE', 'MULTI_LOCATION', false, null),
    ('FREE', 'ANALYTICS', false, null),
    ('FREE', 'WHITE_LABEL', false, null),
    ('STARTER', 'GPS_TRACKING', true, null),
    ('STARTER', 'ADVANCED_GPS', false, null),
    ('STARTER', 'ADVANCED_REPORTS', false, null),
    ('STARTER', 'CUSTOM_INVOICE', false, null),
    ('STARTER', 'CUSTOM_BRANDING', false, null),
    ('STARTER', 'MULTI_STAFF', false, 0),
    ('STARTER', 'MULTI_LOCATION', false, null),
    ('STARTER', 'ANALYTICS', false, null),
    ('STARTER', 'WHITE_LABEL', false, null),
    ('PRO', 'GPS_TRACKING', true, null),
    ('PRO', 'ADVANCED_GPS', true, null),
    ('PRO', 'ADVANCED_REPORTS', true, null),
    ('PRO', 'CUSTOM_INVOICE', true, null),
    ('PRO', 'CUSTOM_BRANDING', true, null),
    ('PRO', 'MULTI_STAFF', true, 3),
    ('PRO', 'MULTI_LOCATION', false, null),
    ('PRO', 'ANALYTICS', true, null),
    ('PRO', 'WHITE_LABEL', false, null),
    ('BUSINESS', 'GPS_TRACKING', true, null),
    ('BUSINESS', 'ADVANCED_GPS', true, null),
    ('BUSINESS', 'ADVANCED_REPORTS', true, null),
    ('BUSINESS', 'CUSTOM_INVOICE', true, null),
    ('BUSINESS', 'CUSTOM_BRANDING', true, null),
    ('BUSINESS', 'MULTI_STAFF', true, 10),
    ('BUSINESS', 'MULTI_LOCATION', true, null),
    ('BUSINESS', 'ANALYTICS', true, null),
    ('BUSINESS', 'WHITE_LABEL', true, null)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO public.platform_settings (key, value)
VALUES ('monetization', '{"platform_fee_enabled": false, "platform_fee_type": "NONE", "platform_fee_value": 0, "advertising_enabled": true, "trial_days": 14}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.ad_configurations (placement, enabled, provider, premium_excluded, banner_title, banner_text)
VALUES
    ('dashboard-bottom', true, 'MOCK_ADSENSE', true, 'Save on Vehicle Insurance', 'Get instant quotes for your car, motorcycle, or scooter.'),
    ('vehicle-bottom', true, 'MOCK_ADSENSE', true, 'Tyre & Battery Store', 'Verified tyre replacements with free installation near you.'),
    ('invoice-bottom', true, 'MOCK_ADSENSE', true, 'Automotive Care Partner', 'Keep your vehicle health score above 80 with regular engine service.'),
    ('public-page-bottom', true, 'MOCK_ADSENSE', true, 'Track Your Own Vehicles', 'Create your free Vehicle Bill account to track fuel & maintenance.')
ON CONFLICT (placement) DO NOTHING;

-- =============================================================================
-- 18. RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_price_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND profile_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get user profile id
CREATE OR REPLACE FUNCTION public.get_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- ORGANIZATIONS ---
CREATE POLICY "Org members read own org" ON public.organizations
    FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "Org admins update own org" ON public.organizations
    FOR UPDATE USING (
        public.is_org_member(id) AND
        EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = id AND profile_id = public.get_profile_id() AND role = 'ADMIN')
    );

-- --- PROFILES ---
CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- --- ORGANIZATION MEMBERS ---
CREATE POLICY "Org members view members" ON public.organization_members
    FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins manage members" ON public.organization_members
    FOR ALL USING (
        public.is_org_member(organization_id) AND
        EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id AND profile_id = public.get_profile_id() AND role = 'ADMIN')
    );

-- --- VEHICLES ---
CREATE POLICY "Org members access vehicles" ON public.vehicles
    FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "Public vehicle access by secure ID" ON public.vehicles
    FOR SELECT USING (true);

-- --- ODOMETER HISTORY ---
CREATE POLICY "Org members access odometer" ON public.odometer_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND public.is_org_member(organization_id))
    );

-- --- RIDES ---
CREATE POLICY "Org members access rides" ON public.rides
    FOR ALL USING (public.is_org_member(organization_id));

-- --- TRIPS (public QR flow) ---
-- Anonymous creation by design (QR flow needs no login); read-back restricted to org members.
CREATE POLICY "Anyone can create trips" ON public.trips
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members access trips" ON public.trips
    FOR SELECT USING (public.is_org_member(organization_id));

-- --- RENTAL TRIPS ---
CREATE POLICY "Org members access their trips" ON public.rental_trips
    FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "Riders read own trips" ON public.rental_trips
    FOR SELECT USING (rider_id = auth.uid());

-- --- GPS TRACKING POINTS ---
CREATE POLICY "Org members access GPS for their trips" ON public.gps_tracking_points
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.rental_trips WHERE id = trip_id AND public.is_org_member(organization_id))
    );
CREATE POLICY "Riders read GPS for own trips" ON public.gps_tracking_points
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.rental_trips WHERE id = trip_id AND rider_id = auth.uid())
    );

-- --- INVOICES ---
CREATE POLICY "Org members access invoices" ON public.invoices
    FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "Riders read own invoices" ON public.invoices
    FOR SELECT USING (rider_id = auth.uid());

-- --- PAYMENT SETTINGS ---
CREATE POLICY "Org members access payment settings" ON public.payment_settings
    FOR ALL USING (public.is_org_member(organization_id));

-- --- PAYMENTS ---
-- (payment records live in payment_attempts below; legacy public.payments removed)

-- --- PAYMENT EVENTS ---
CREATE POLICY "Admins read payment events" ON public.payment_events
    FOR SELECT USING (public.is_admin());

-- --- PAYMENT ATTEMPTS (app-canonical payment record) ---
CREATE POLICY "Org members access payment attempts" ON public.payment_attempts
    FOR ALL USING (
        public.is_org_member(organization_id) OR
        public.is_admin()
    );
CREATE POLICY "Riders read own payment attempts" ON public.payment_attempts
    FOR SELECT USING (rider_id = auth.uid()::text);

-- --- APP SESSIONS ---
CREATE POLICY "Users read own session" ON public.app_sessions
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own session" ON public.app_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- --- MAINTENANCE RECORDS ---
CREATE POLICY "Org members access maintenance" ON public.maintenance_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND public.is_org_member(organization_id))
    );

-- --- ISSUES ---
CREATE POLICY "Org members access issues" ON public.issues
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.vehicles WHERE id = vehicle_id AND public.is_org_member(organization_id))
    );

-- --- RIDER PROFILES ---
CREATE POLICY "Riders read own profile" ON public.rider_profiles
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Riders update own profile" ON public.rider_profiles
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Org members read riders who rented from them" ON public.rider_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rental_trips
            WHERE rider_id = rider_profiles.user_id AND public.is_org_member(organization_id)
        )
    );

-- --- DISPUTES ---
CREATE POLICY "Org members access disputes for their trips" ON public.disputes
    FOR ALL USING (public.is_org_member(organization_id));
CREATE POLICY "Riders read own disputes" ON public.disputes
    FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "Riders create disputes" ON public.disputes
    FOR INSERT WITH CHECK (rider_id = auth.uid());

-- --- PLANS ---
CREATE POLICY "Plans readable by authenticated users" ON public.plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- --- FEATURE ENTITLEMENTS ---
CREATE POLICY "Feature entitlements readable by authenticated users" ON public.feature_entitlements
    FOR SELECT USING (auth.role() = 'authenticated');

-- --- SUBSCRIPTIONS ---
CREATE POLICY "Org members access own subscription" ON public.subscriptions
    FOR ALL USING (public.is_org_member(organization_id));

-- --- PLATFORM REVENUE ---
CREATE POLICY "Admins read platform revenue" ON public.platform_revenue
    FOR SELECT USING (public.is_admin());

-- --- AUDIT LOGS ---
CREATE POLICY "Admins read audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());
CREATE POLICY "System inserts audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- --- FUEL PRICES ---
CREATE POLICY "Public and users read fuel prices" ON public.fuel_prices
    FOR SELECT USING (true);
CREATE POLICY "Admins manage fuel prices" ON public.fuel_prices
    FOR ALL USING (public.is_admin());

-- --- FUEL PRICE HISTORY ---
CREATE POLICY "Authenticated users read fuel price history" ON public.fuel_price_history
    FOR SELECT USING (auth.role() = 'authenticated' OR public.is_admin());
CREATE POLICY "Admins manage fuel price history" ON public.fuel_price_history
    FOR ALL USING (public.is_admin());

-- --- FUEL PRICE AUDIT LOG ---
CREATE POLICY "Admins read fuel price audit log" ON public.fuel_price_audit_log
    FOR SELECT USING (public.is_admin());
CREATE POLICY "System and admins insert fuel price audit log" ON public.fuel_price_audit_log
    FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- =============================================================================
-- 19. TRIGGERS & FUNCTIONS
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_rental_trips_updated_at BEFORE UPDATE ON public.rental_trips FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_payment_attempts_updated_at BEFORE UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_rider_profiles_updated_at BEFORE UPDATE ON public.rider_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_fuel_prices_updated_at BEFORE UPDATE ON public.fuel_prices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'OWNER')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Free-subscription auto-create: every organization starts on the FREE plan.
-- Paid plans are ONLY activated after the payment is verified; FREE needs no
-- payment so it is allocated automatically at org creation.
CREATE OR REPLACE FUNCTION public.ensure_free_subscription_on_org()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (organization_id, plan_id, status, provider)
    VALUES (NEW.id, 'FREE', 'ACTIVE', 'SYSTEM')
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_free_subscription_on_org ON public.organizations;
CREATE TRIGGER trg_ensure_free_subscription_on_org
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.ensure_free_subscription_on_org();

-- Server-side billing function: calculate trip final amount
CREATE OR REPLACE FUNCTION public.calculate_trip_billing(
    p_trip_id VARCHAR(100)
) RETURNS TABLE (
    gps_distance NUMERIC(10,2),
    odometer_distance NUMERIC(10,2),
    final_distance NUMERIC(10,2),
    rate_per_km NUMERIC(8,2),
    distance_charge NUMERIC(10,2),
    is_suspicious BOOLEAN,
    suspicious_reason TEXT
) AS $$
DECLARE
    v_trip RECORD;
    v_vehicle RECORD;
    v_gps_dist NUMERIC(10,2);
    v_odo_dist NUMERIC(10,2);
    v_final_dist NUMERIC(10,2);
    v_suspicious BOOLEAN := FALSE;
    v_reason TEXT;
BEGIN
    SELECT * INTO v_trip FROM public.rental_trips WHERE id = p_trip_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;

    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = v_trip.vehicle_id;

    -- GPS distance
    v_gps_dist := v_trip.gps_distance_km;

    -- Odometer distance
    IF v_trip.actual_end_odometer IS NOT NULL THEN
        v_odo_dist := v_trip.actual_end_odometer - v_trip.start_odometer;
    ELSE
        v_odo_dist := v_gps_dist; -- fallback
    END IF;

    -- Final distance: use GPS if available and reasonable
    IF v_gps_dist > 0 THEN
        v_final_dist := v_gps_dist;
    ELSE
        v_final_dist := v_odo_dist;
    END IF;

    -- Suspicious check: >20% discrepancy between GPS and odometer
    IF v_odo_dist > 0 AND v_gps_dist > 0 THEN
        IF ABS(v_gps_dist - v_odo_dist) / v_odo_dist > 0.20 THEN
            v_suspicious := TRUE;
            v_reason := format('GPS (%s km) vs Odometer (%s km) discrepancy > 20%%', v_gps_dist, v_odo_dist);
        END IF;
    END IF;

    -- Sanity: distance can't be negative
    IF v_final_dist < 0 THEN v_final_dist := 0; END IF;

    gps_distance := v_gps_dist;
    odometer_distance := v_odo_dist;
    final_distance := v_final_dist;
    rate_per_km := v_trip.rate_per_km_rupees;
    distance_charge := ROUND(v_final_dist * v_trip.rate_per_km_rupees, 2);
    is_suspicious := v_suspicious;
    suspicious_reason := v_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record audit log
CREATE OR REPLACE FUNCTION public.log_audit(
    p_org_id UUID,
    p_actor_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, details)
    VALUES (p_org_id, p_actor_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 20. TRANSACTIONAL PLATFORM ADMIN FUEL RATE UPDATE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_fuel_rates(
    p_state TEXT,
    p_district TEXT,
    p_city TEXT,
    p_petrol_paise INT,
    p_diesel_paise INT,
    p_cng_paise INT,
    p_source TEXT DEFAULT 'MANUAL_ADMIN',
    p_source_url TEXT DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    fuel_type VARCHAR(20),
    price_rupees NUMERIC(10,2),
    price_per_unit_paise INT,
    unit VARCHAR(10),
    status VARCHAR(30),
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_petrol_rupees NUMERIC(10,2);
    v_diesel_rupees NUMERIC(10,2);
    v_cng_rupees NUMERIC(10,2);
    v_old_petrol NUMERIC(10,2);
    v_old_diesel NUMERIC(10,2);
    v_old_cng NUMERIC(10,2);
    v_petrol_id UUID;
    v_diesel_id UUID;
    v_cng_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Validate inputs (positive integer paise required)
    IF p_petrol_paise <= 0 OR p_diesel_paise <= 0 OR p_cng_paise <= 0 THEN
        RAISE EXCEPTION 'Fuel rates must be greater than zero.';
    END IF;

    v_petrol_rupees := ROUND(p_petrol_paise::NUMERIC / 100.0, 2);
    v_diesel_rupees := ROUND(p_diesel_paise::NUMERIC / 100.0, 2);
    v_cng_rupees := ROUND(p_cng_paise::NUMERIC / 100.0, 2);

    -- 2. Read previous values for audit trail
    SELECT price_rupees INTO v_old_petrol FROM public.fuel_prices WHERE fuel_type = 'PETROL' AND state = p_state AND city = p_city;
    SELECT price_rupees INTO v_old_diesel FROM public.fuel_prices WHERE fuel_type = 'DIESEL' AND state = p_state AND city = p_city;
    SELECT price_rupees INTO v_old_cng FROM public.fuel_prices WHERE fuel_type = 'CNG' AND state = p_state AND city = p_city;

    -- 3. Upsert PETROL
    INSERT INTO public.fuel_prices (
        country, state, district, city, fuel_type,
        price_per_unit_paise, price_rupees, unit, currency,
        effective_date, source_name, source_url, fetched_at, status, updated_at
    ) VALUES (
        'India', p_state, p_district, p_city, 'PETROL',
        p_petrol_paise, v_petrol_rupees, 'LITRE', 'INR',
        p_effective_date, p_source, p_source_url, v_now, 'LIVE', v_now
    )
    ON CONFLICT (state, district, city, fuel_type) DO UPDATE SET
        price_per_unit_paise = EXCLUDED.price_per_unit_paise,
        price_rupees = EXCLUDED.price_rupees,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        effective_date = EXCLUDED.effective_date,
        fetched_at = EXCLUDED.fetched_at,
        status = 'LIVE',
        updated_at = v_now
    RETURNING id INTO v_petrol_id;

    -- 4. Upsert DIESEL
    INSERT INTO public.fuel_prices (
        country, state, district, city, fuel_type,
        price_per_unit_paise, price_rupees, unit, currency,
        effective_date, source_name, source_url, fetched_at, status, updated_at
    ) VALUES (
        'India', p_state, p_district, p_city, 'DIESEL',
        p_diesel_paise, v_diesel_rupees, 'LITRE', 'INR',
        p_effective_date, p_source, p_source_url, v_now, 'LIVE', v_now
    )
    ON CONFLICT (state, district, city, fuel_type) DO UPDATE SET
        price_per_unit_paise = EXCLUDED.price_per_unit_paise,
        price_rupees = EXCLUDED.price_rupees,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        effective_date = EXCLUDED.effective_date,
        fetched_at = EXCLUDED.fetched_at,
        status = 'LIVE',
        updated_at = v_now
    RETURNING id INTO v_diesel_id;

    -- 5. Upsert CNG
    INSERT INTO public.fuel_prices (
        country, state, district, city, fuel_type,
        price_per_unit_paise, price_rupees, unit, currency,
        effective_date, source_name, source_url, fetched_at, status, updated_at
    ) VALUES (
        'India', p_state, p_district, p_city, 'CNG',
        p_cng_paise, v_cng_rupees, 'KG', 'INR',
        p_effective_date, p_source, p_source_url, v_now, 'LIVE', v_now
    )
    ON CONFLICT (state, district, city, fuel_type) DO UPDATE SET
        price_per_unit_paise = EXCLUDED.price_per_unit_paise,
        price_rupees = EXCLUDED.price_rupees,
        source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url,
        effective_date = EXCLUDED.effective_date,
        fetched_at = EXCLUDED.fetched_at,
        status = 'LIVE',
        updated_at = v_now
    RETURNING id INTO v_cng_id;

    -- 6. Insert History Records
    INSERT INTO public.fuel_price_history (
        fuel_price_id, fuel_type, country, state, district, city,
        price_per_unit_paise, price_rupees, unit, currency,
        effective_date, source_name, source_url, recorded_at
    ) VALUES
    (v_petrol_id, 'PETROL', 'India', p_state, p_district, p_city, p_petrol_paise, v_petrol_rupees, 'LITRE', 'INR', p_effective_date, p_source, p_source_url, v_now),
    (v_diesel_id, 'DIESEL', 'India', p_state, p_district, p_city, p_diesel_paise, v_diesel_rupees, 'LITRE', 'INR', p_effective_date, p_source, p_source_url, v_now),
    (v_cng_id, 'CNG', 'India', p_state, p_district, p_city, p_cng_paise, v_cng_rupees, 'KG', 'INR', p_effective_date, p_source, p_source_url, v_now);

    -- 7. Insert Audit Log
    INSERT INTO public.fuel_price_audit_log (
        event_type, fuel_type, country, state, district, city,
        old_price_rupees, new_price_rupees, source_name, status, created_at
    ) VALUES
    ('FUEL_PRICE_UPDATED', 'PETROL', 'India', p_state, p_district, p_city, v_old_petrol, v_petrol_rupees, p_source, 'SUCCESS', v_now),
    ('FUEL_PRICE_UPDATED', 'DIESEL', 'India', p_state, p_district, p_city, v_old_diesel, v_diesel_rupees, p_source, 'SUCCESS', v_now),
    ('FUEL_PRICE_UPDATED', 'CNG', 'India', p_state, p_district, p_city, v_old_cng, v_cng_rupees, p_source, 'SUCCESS', v_now);

    -- 8. Return updated records
    RETURN QUERY
    SELECT fp.fuel_type, fp.price_rupees, fp.price_per_unit_paise, fp.unit, fp.status, fp.updated_at
    FROM public.fuel_prices fp
    WHERE fp.state = p_state AND fp.city = p_city AND fp.fuel_type IN ('PETROL', 'DIESEL', 'CNG');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime Publication for fuel_prices table
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_prices;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

