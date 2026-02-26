-- Добавление новых колонок для Stage 5 (CRM: Теги, Тихий сервис, Фото)
ALTER TABLE appointments ADD COLUMN preferences JSONB;
ALTER TABLE appointments ADD COLUMN photos_before_after JSONB;
ALTER TABLE appointments ADD COLUMN photo_notes JSONB;
ALTER TABLE clients ADD COLUMN tags JSONB;
