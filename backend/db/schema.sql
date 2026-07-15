-- CrisisConnect Database Schema
-- PostgreSQL 14+
-- Matches docs/erd/erd.svg

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid() if needed later

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(30),
    role          VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'volunteer', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: the proposal ERD modelled incident provenance as a separate
-- `incident_sources` table. For the MVP we denormalised this to a `source`
-- text column on `incidents` (see below) to keep ingestion simple; the
-- column still records where each incident came from.

-- ============================================================
-- shelters
-- ============================================================
CREATE TABLE shelters (
    id                     SERIAL PRIMARY KEY,
    name                   VARCHAR(150) NOT NULL,
    address                VARCHAR(255) NOT NULL,
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    capacity               INTEGER NOT NULL DEFAULT 0,
    occupied_beds          INTEGER NOT NULL DEFAULT 0,
    available_beds         INTEGER GENERATED ALWAYS AS (capacity - occupied_beds) STORED,
    medical_support        BOOLEAN NOT NULL DEFAULT false,
    pet_friendly           BOOLEAN NOT NULL DEFAULT false,
    accessibility_support  BOOLEAN NOT NULL DEFAULT false,
    status                 VARCHAR(20) NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'full', 'closed'))
);

-- ============================================================
-- incidents
-- ============================================================
CREATE TABLE incidents (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    type         VARCHAR(30) NOT NULL
                 CHECK (type IN ('earthquake', 'weather', 'wildfire', 'flood', 'road_closure',
                                  'transportation', 'evacuation', 'air_quality', 'other')),
    description  TEXT,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    severity     VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'verified', 'assigned', 'in_progress', 'resolved', 'closed')),
    source       VARCHAR(150),
    external_id  VARCHAR(200),   -- provider's own id (USGS/BCWS/ECCC) for idempotent ingest
    verified_by  INTEGER REFERENCES users(id),
    verified_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);
-- One row per (source, external_id): a re-fetch UPDATEs rather than duplicates.
CREATE UNIQUE INDEX ux_incidents_source_extid ON incidents(source, external_id) WHERE external_id IS NOT NULL;

-- ============================================================
-- requests (citizen assistance requests)
-- ============================================================
CREATE TABLE requests (
    id             SERIAL PRIMARY KEY,
    incident_id    INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
    citizen_id     INTEGER NOT NULL REFERENCES users(id),
    shelter_id     INTEGER REFERENCES shelters(id),
    request_type   VARCHAR(30) NOT NULL
                   CHECK (request_type IN ('medical', 'shelter', 'transportation', 'food',
                                            'water', 'information', 'other')),
    description    TEXT NOT NULL,
    address        VARCHAR(255),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    affected_count INTEGER NOT NULL DEFAULT 1,
    priority_score INTEGER CHECK (priority_score BETWEEN 0 AND 100),
    ai_category    VARCHAR(30),
    ai_summary     TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'reviewed', 'assigned', 'in_progress', 'resolved', 'closed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_incident ON requests(incident_id);
CREATE INDEX idx_requests_citizen ON requests(citizen_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_priority ON requests(priority_score DESC);

-- ============================================================
-- volunteers
-- ============================================================
CREATE TABLE volunteers (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    skills              TEXT[] NOT NULL DEFAULT '{}', -- e.g. {first_aid, driving, translation}
    availability        VARCHAR(20) NOT NULL DEFAULT 'unavailable'
                        CHECK (availability IN ('available', 'busy', 'unavailable')),
    vehicle_available   BOOLEAN NOT NULL DEFAULT false,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- ============================================================
-- assignments (volunteer <-> request)
-- ============================================================
CREATE TABLE assignments (
    id            SERIAL PRIMARY KEY,
    request_id    INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    volunteer_id  INTEGER NOT NULL REFERENCES volunteers(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'assigned'
                  CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed', 'cancelled')),
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_assignments_request ON assignments(request_id);
CREATE INDEX idx_assignments_volunteer ON assignments(volunteer_id);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(30) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- attachments
-- ============================================================
CREATE TABLE attachments (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    file_path   VARCHAR(500) NOT NULL,
    file_type   VARCHAR(50),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- reports
-- ============================================================
CREATE TABLE reports (
    id           SERIAL PRIMARY KEY,
    incident_id  INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    summary      TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
