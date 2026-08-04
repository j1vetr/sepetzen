-- Task 52: Ürün açıklamalarındaki eski özellik listelerini temizle
-- Eski 📐 Teknik Özellikler / 🔩 Materyal / 🎯 Kullanım Alanları HTML bloklarını
-- description alanından kaldırır (akıcı tanıtım metni bırakır) ve ölçü/materyal
-- bilgilerini products.specs jsonb alanına taşır.
-- 2026-08-04 tarihinde development veritabanına uygulandı. Idempotent'tir.

BEGIN;

-- Ahşap Saplı İşlemeli Katlanır Çakı – Kamp, Outdoor ve Günlük Kullanım için Şık Tasarım
UPDATE products SET
  description = '<p>El işçiliğiyle üretilmiş, özel sert ahşap saplı katlanır çakı. İşlemeli paslanmaz çelik bıçak yüzeyi ve pirinç pim detayları, dayanıklı yapısını zarif bir görünümle birleştirir.</p><p>Güvenli katlanır mekanizması sayesinde kamp, doğa ve günlük taşınabilir kullanım için idealdir; işlemeli tasarımıyla koleksiyon ve dekoratif kullanım için de öne çıkar. Erkekler için şık ve anlamlı bir hediye, özellikle Babalar Günü ve kamp tutkunları için özel bir seçenektir.</p>',
  specs = '{"sapCinsi":"Sert ahşap","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"23 cm","namluUzunlugu":"9,5 cm"}'::jsonb
WHERE id = '98f5f31b-411e-4917-b96d-b0d9afcb7f18';

-- El Yapımı Epoksi Saplı Katlanır Çakı – Paslanmaz Çelik Outdoor Tasarım
UPDATE products SET
  description = '<p>Hassas işlenmiş, işlemeli paslanmaz çelik bıçak ve ergonomik konturlu epoksi reçine saplı el yapımı katlanır çakı. Her parça doğal damar yapısını koruyacak şekilde özenle üretilir; pirinç pim detaylı cilalı yüzey işçiliği tamamlar.</p><p>Damla uçlu katlanır tasarımı kamp ve outdoor aktivitelerinde olduğu kadar günlük taşınabilir kullanımda da konfor sağlar. Outdoor tutkunları ve kamp ekipmanı arayanlar için ideal bir hediyedir.</p>',
  specs = '{"sapCinsi":"Epoksi reçine","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"21 cm","namluUzunlugu":"9 cm"}'::jsonb
WHERE id = 'cee9f639-3670-4f0c-b873-371b8e3fdf6a';

-- El Yapımı Oymalı Katlanır Çakı – Keklik Desenli Sert Ahşap Saplı Özel Tasarım
UPDATE products SET
  description = '<p>Keklik motifiyle el oyması yapılmış sert ahşap sap ve dayanıklı paslanmaz çelik bıçağın buluştuğu özel tasarım katlanır çakı. Pirinç pim donanımı ve dekoratif oyma işçiliği her parçayı benzersiz kılar.</p><p>Kompakt katlanır cep tasarımı sayesinde kamp ve doğa aktivitelerinde olduğu kadar günlük kullanımda da pratiktir; özgün keklik deseniyle koleksiyon ve dekoratif kullanım için de değerli bir parçadır.</p>',
  specs = '{"sapCinsi":"Keklik oymalı sert ahşap","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"23 cm","namluUzunlugu":"9,5 cm"}'::jsonb
WHERE id = 'c70ece06-707f-447e-a92a-45c83428436c';

-- Epoksi Saplı El Yapımı Çakı Bıçağı
UPDATE products SET
  description = '<p>Stabilize epoksi sert ağaç sap ve dekoratif oymalı paslanmaz çelik bıçağıyla tamamen el işçiliğiyle üretilen, tek tek kontrol edilen bir çakı. Pirinç pimler sapın yapısal bütünlüğünü desteklerken oymalı yüzey detayı her parçaya karakter katar.</p><p>Damla uçlu katlanır tasarımı, kamp alanı hazırlıklarından açık hava aktivitelerine ve günlük kullanıma kadar geniş bir alanda şık ve kullanışlı bir yardımcıdır. Kılıf dahil değildir.</p>',
  specs = '{"sapCinsi":"Stabilize epoksi sert ağaç","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"17,5 cm","namluUzunlugu":"8 cm"}'::jsonb
WHERE id = '8e24eebf-1771-40e9-b241-a79cad1f79f5';

-- Oymalı Paslanmaz Çelik Detaylı, Reçine Saplı El Yapımı Katlanır Çakı
UPDATE products SET
  description = '<p>Oyma detaylı paslanmaz çelik bıçak ile turkuaz reçine detaylı doğal sert ahşap sapın buluştuğu, tamamen el yapımı bir katlanır çakı. Saten görünümlü çelik kaplama ve pirinç pim detayları, klasik el işçiliğini modern bir şıklıkla tamamlar.</p><p>Damla uçlu bıçak formu ve güvenli katlanır mekanizması sayesinde kamp ve outdoor aktivitelerinde olduğu kadar günlük taşınabilir kullanımda da pratiktir. Özgün oyma işçiliğiyle koleksiyonerler için de dekoratif bir değer taşır.</p>',
  specs = '{"sapCinsi":"Turkuaz reçine detaylı doğal sert ahşap","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"18 cm","namluUzunlugu":"8 cm"}'::jsonb
WHERE id = '22280bff-c2b2-4fad-a197-c5629ca79663';

-- Paslanmaz Çelik Katlanır Çakı – Kamp ve Outdoor Kullanım için El Yapımı Tasarım
UPDATE products SET
  description = '<p>Saten görünümlü paslanmaz çelik bıçak ve dayanıklı, mavi kaplamalı ergonomik sapın kombinasyonundan doğan el yapımı katlanır çakı. İnce gravür bıçak detayı ve paracord aksesuarı, outdoor kimliğini öne çıkarır.</p><p>Damla uçlu katlanır tasarımı ve kompakt yapısıyla kamp, yürüyüş ve doğa aktivitelerinde olduğu kadar günlük taşınabilir kullanımda da pratiktir. Kılıf dahil değildir.</p>',
  specs = '{"sapCinsi":"Ergonomik mavi kaplama sap, paracord detaylı","urunCinsi":"Katlanır Çakı","celikCinsi":"Paslanmaz Çelik","tamUzunluk":"18 cm","namluUzunlugu":"8 cm"}'::jsonb
WHERE id = 'e9f3c19f-a6ee-433a-8e51-96fd27bdb608';

-- Premium El Yapımı Katlanır Çakı – Sert Ağaç Saplı Outdoor ve Günlük Kullanım Tasarımı
UPDATE products SET
  description = '<p>Görünür katmanlı Şam çeliği görünümlü özel bıçak yüzeyi ve masif sert ahşap sapıyla tamamen el işçiliğiyle hazırlanan premium katlanır çakı. Her sap, doğal ahşap damar yapısı sayesinde benzersiz bir görünüme sahiptir; pirinç pim donanımı detayları tamamlar.</p><p>Katlanır mekanizması ve dengeli yapısıyla kamp ve outdoor aktivitelerinden günlük taşınabilir kullanıma kadar geniş bir alanda güvenle kullanılır; outdoor koleksiyonların da aranan parçasıdır.</p>',
  specs = '{"sapCinsi":"Masif sert ahşap","urunCinsi":"Katlanır Çakı","celikCinsi":"Şam çeliği görünümlü özel kaplama","tamUzunluk":"21,5 cm","namluUzunlugu":"9 cm"}'::jsonb
WHERE id = '90d40404-03fa-4bd4-b959-d86139dd36ab';

COMMIT;
