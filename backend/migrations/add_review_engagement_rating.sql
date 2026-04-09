-- Критерии отзывов (PostgreSQL). При старте API те же шаги выполняются в backend/main.py.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS engagement_rating INTEGER;
UPDATE reviews SET engagement_rating = rating WHERE engagement_rating IS NULL;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS organization_rating INTEGER;
UPDATE reviews SET organization_rating = rating WHERE organization_rating IS NULL;
