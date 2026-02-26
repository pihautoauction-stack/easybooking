-- Добавление новых колонок для Stage 5 (CRM: Теги, Тихий сервис, Фото)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS photos_before_after JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
