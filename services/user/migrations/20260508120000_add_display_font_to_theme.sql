UPDATE profiles
SET theme = jsonb_set(
    theme,
    '{font_display}',
    to_jsonb(COALESCE(theme->>'font_display', 'Bricolage Grotesque')),
    true
)
WHERE NOT theme ? 'font_display';

ALTER TABLE profiles
ALTER COLUMN theme SET DEFAULT '{
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
    "font_main": "Plus Jakarta Sans",
    "font_display": "Bricolage Grotesque"
}';
