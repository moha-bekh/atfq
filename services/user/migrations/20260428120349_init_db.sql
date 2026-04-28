CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    profile_picture_url TEXT,
    theme JSONB NOT NULL DEFAULT '{
        "is_preset": true, 
        "name": "default", 
        "colors": {
            "color-bg": "#7766BD",
            "color-main": "#F4EFFA",
            "color-caret": "#F4EFFA",
            "color-text": "#F4EFFA",
            "color-sub": "#4B3A91",
            "color-sub-alt": "#4B3A91",
            "color-error": "#00F5FF",
            "color-extra-error": "#20C2CC"
        },
        "font_main": "Plus Jakarta Sans"
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(50) PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    slug VARCHAR(50) PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_name VARCHAR(50) REFERENCES roles(name) ON DELETE CASCADE,
    permission_slug VARCHAR(50) REFERENCES permissions(slug) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_slug)
);

CREATE TABLE IF NOT EXISTS profile_roles (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_name VARCHAR(50) REFERENCES roles(name) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, role_name)
);

CREATE TABLE IF NOT EXISTS role_change_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    requested_role VARCHAR(50) NOT NULL REFERENCES roles(name),
    reason TEXT,
    status request_status DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_roles_user ON profile_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_change_requests(status);

INSERT INTO roles (name) VALUES ('admin'), ('moderator'), ('user') ON CONFLICT DO NOTHING;

INSERT INTO permissions (slug) VALUES 
('profile:write'), 
('roles:assign'), 
('requests:review'), 
('wiki:submit'), 
('wiki:publish') 
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_name, permission_slug) VALUES 
('admin', 'profile:write'),
('admin', 'roles:assign'),
('admin', 'requests:review'),
('admin', 'wiki:publish'),
('moderator', 'requests:review'),
('moderator', 'wiki:publish'),
('user', 'profile:write'),
('user', 'wiki:submit')
ON CONFLICT DO NOTHING;
