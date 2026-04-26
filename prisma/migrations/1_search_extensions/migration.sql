-- Postgres extensions for accent-insensitive Arabic search and trigram fuzzy matching.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- GIN trigram indexes on the most-searched business name + slug fields.
CREATE INDEX IF NOT EXISTS business_name_ar_trgm_idx
  ON "business_profiles" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS business_name_en_trgm_idx
  ON "business_profiles" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS business_slug_trgm_idx
  ON "business_profiles" USING gin ("slug" gin_trgm_ops);

-- Trigram index on category names for category browsing/search.
CREATE INDEX IF NOT EXISTS category_name_ar_trgm_idx
  ON "categories" USING gin ("nameAr" gin_trgm_ops);
