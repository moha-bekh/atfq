INSERT INTO role_permissions (role_name, permission_slug) VALUES
('admin', 'wiki:submit'),
('moderator', 'profile:write'),
('moderator', 'wiki:submit')
ON CONFLICT DO NOTHING;
