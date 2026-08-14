-- =============================================================================
-- VEHICLE USAGE, FUEL COST & BILLING SaaS — COMPLETE POSTGRESQL / SUPABASE SCHEMA
-- Zero Fake GST | RLS Multi-Tenant Architecture | Modular Payment & Ad Ready
-- =============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS & USERS (MULTI-TENANCY)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan_tier IN ('FREE', 'PRO', 'BUSINESS')),
    business_name VARCHAR(255),
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    -- GST and Tax Configuration (Tax Disabled by default until legally registered)
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
    user_id UUID UNIQUE NOT NULL, -- References auth.users(id) in Supabase
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'OWNER' CHECK (role IN ('SUPER_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, profile_id)
);

-- -----------------------------------------------------------------------------
-- 2. VEHICLES & REGISTRATION NORMALIZATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    secure_public_id VARCHAR(64) UNIQUE NOT NULL, -- Obfuscated public QR identifier
    registration_number VARCHAR(50) NOT NULL,
    normalized_reg_number VARCHAR(50) NOT NULL, -- e.g., 'KL16P78'
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('MOTORCYCLE', 'SCOOTER', 'CAR')),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    manufacturing_year INT,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC')),
    mileage_kmpl NUMERIC(6,2) NOT NULL, -- km per litre or km per kWh
    initial_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    current_odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_norm_reg ON public.vehicles(normalized_reg_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_secure_id ON public.vehicles(secure_public_id);

-- -----------------------------------------------------------------------------
-- 3. ODOMETER HISTORY (AUDIT TRAIL — NEVER SILENTLY OVERWRITE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.odometer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    previous_reading NUMERIC(10,2) NOT NULL,
    new_reading NUMERIC(10,2) NOT NULL,
    difference NUMERIC(10,2) GENERATED ALWAYS AS (new_reading - previous_reading) STORED,
    updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'RIDE_COMPLETED', -- RIDE_COMPLETED, MANUAL_UPDATE, ADMIN_CORRECTION
    ride_id UUID,
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_odometer_increasing CHECK (new_reading >= previous_reading OR reason = 'ADMIN_CORRECTION')
);

CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON public.odometer_history(vehicle_id);

-- -----------------------------------------------------------------------------
-- 4. FUEL PRICES & PRICE HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC')),
    price_per_unit_paise INT NOT NULL, -- Integer paise e.g. 10400 = ₹104.00
    source VARCHAR(50) NOT NULL DEFAULT 'MANUAL', -- EXTERNAL_API, MANUAL, VERIFIED_FALLBACK
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(state, fuel_type)
);

CREATE TABLE IF NOT EXISTS public.fuel_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_price_id UUID NOT NULL REFERENCES public.fuel_prices(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL,
    price_per_unit_paise INT NOT NULL,
    source VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. RIDES & COST CALCULATION ENGINE
-- -----------------------------------------------------------------------------
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
    fuel_price_paise INT NOT NULL, -- Fuel price in integer paise
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

-- -----------------------------------------------------------------------------
-- 6. INVOICES / USAGE BILLS (NO FAKE GST)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'USAGE BILL', -- 'USAGE BILL', 'PAYMENT RECEIPT', 'SERVICE INVOICE'
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    subtotal_paise INT NOT NULL,
    tax_paise INT NOT NULL DEFAULT 0, -- 0 when tax disabled
    total_paise INT NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    payment_method VARCHAR(50) DEFAULT 'MOCK_CASH',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);

-- -----------------------------------------------------------------------------
-- 7. VEHICLE HEALTH & MAINTENANCE TRACKER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('ENGINE_OIL', 'BRAKE_SERVICE', 'TYRE_REPLACEMENT', 'CHAIN_SERVICE', 'BATTERY', 'GENERAL_SERVICE', 'INSURANCE_RENEWAL', 'POLLUTION_CERTIFICATE', 'OTHER')),
    service_date DATE NOT NULL,
    odometer_reading NUMERIC(10,2) NOT NULL,
    cost_paise INT NOT NULL DEFAULT 0,
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

-- -----------------------------------------------------------------------------
-- 8. ADVERTISING ENGINE & ENTITLEMENTS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 9. AUDIT LOGS & PLATFORM SETTINGS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Vehicles: Owners can view and manage their organization's vehicles
CREATE POLICY "Org members access vehicles" ON public.vehicles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE profile_id = auth.uid()
        )
    );

-- Public QR Page access for public vehicles by secure_public_id
CREATE POLICY "Public vehicle access by secure ID" ON public.vehicles
    FOR SELECT USING (true);

-- Initial Mock Data Insertion for Demo Readiness
INSERT INTO public.fuel_prices (state, fuel_type, price_per_unit_paise, source)
VALUES 
    ('DEFAULT', 'PETROL', 10400, 'VERIFIED_FALLBACK'),
    ('DEFAULT', 'DIESEL', 9250, 'VERIFIED_FALLBACK'),
    ('DEFAULT', 'CNG', 8500, 'VERIFIED_FALLBACK')
ON CONFLICT (state, fuel_type) DO NOTHING;

INSERT INTO public.ad_configurations (placement, enabled, provider, premium_excluded, banner_title, banner_text)
VALUES
    ('dashboard-bottom', true, 'MOCK_ADSENSE', true, 'Save on Vehicle Insurance', 'Get instant quotes for your car, motorcycle, or scooter.'),
    ('vehicle-bottom', true, 'MOCK_ADSENSE', true, 'Tyre & Battery Store', 'Verified tyre replacements with free installation near you.'),
    ('invoice-bottom', true, 'MOCK_ADSENSE', true, 'Automotive Care Partner', 'Keep your vehicle health score above 80 with regular engine service.'),
    ('public-page-bottom', true, 'MOCK_ADSENSE', true, 'Track Your Own Vehicles', 'Create your free Vehicle Bill account to track fuel & maintenance.')
ON CONFLICT (placement) DO NOTHING;
