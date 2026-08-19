-- Mega menü alt menü öğelerine esnek ölçü / boyut rehberi GIF alanı ekleniyor
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS measurement_gif_url TEXT;
