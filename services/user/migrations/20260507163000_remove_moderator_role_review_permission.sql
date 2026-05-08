DELETE FROM role_permissions
WHERE role_name = 'moderator'
  AND permission_slug = 'requests:review';
