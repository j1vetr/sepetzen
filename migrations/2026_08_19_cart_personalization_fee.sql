-- cart_items tablosuna kişiselleştirme ücreti kolonu ekleniyor.
-- Ücret sepete eklenirken / güncellenirken ürünün o anki ayarından hesaplanır
-- ve burada saklanır; böylece ürün ayarı sonradan değişse bile sepet satırı
-- doğru ücreti göstermeye devam eder.

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS personalization_fee DECIMAL(10, 2);
