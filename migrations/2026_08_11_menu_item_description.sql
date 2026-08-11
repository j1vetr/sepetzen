-- Mega menü sol panel açıklaması: admin panelden düzenlenebilir menü öğesi açıklaması
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description text;
