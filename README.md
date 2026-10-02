# VocabLoop PWA

Bu sürüm Mac gerektirmez.

## iPhone'da kullanım
1. Bu klasörü HTTPS üzerinden yayınlayın.
2. iPhone'da Safari ile açın.
3. Paylaş > Ana Ekrana Ekle.
4. Uygulama ayrı ikonla, standalone modda açılır.

## Dahil olanlar
- A1-A2-B1-B2-C1 seviye seçimi
- Günlük en fazla 10 yeni kelime
- Tekrar havuzu
- Yaklaşık 30 dakikalık kelime döngüsü
- Günlük quiz
- Pazar yeni kelime yok
- Haftalık tekrar + quiz
- Yanlış kelimeler sonraki gün/haftalarda tekrar gelir
- 3 farklı günde doğru cevaplanan kelime 'öğrenildi' sayılır
- İlerleme localStorage'da tutulur
- Service worker ile çevrimdışı kullanım

## Önemli PWA/iOS sınırı
Native iOS uygulaması olmadığı için:
- Gerçek iOS kilit ekranı widget'ı yoktur.
- Uygulama tamamen kapalıyken 30 dakikada bir ana ekran içeriği değiştirilemez.
- Kesin saatli yerel bildirim native uygulama kadar güvenilir değildir.

Uygulamayı açtığınızda mevcut 30 dakikalık slot otomatik hesaplanır ve doğru kelime gösterilir.

## Kelime verisi
words.json şu an test için 100 kelimelik örnek paket içerir.
Mimari 2000+ kelimeyi destekler; aynı şemada words.json büyütülebilir.

- 3 aşamalı öğrenme kartı: kelime + İngilizce örnek → görsel → Türkçe anlam
