# Ruflo Lab

[Ruflo](https://github.com/ruvnet/ruflo) çok-ajanlı orkestrasyon aracını **elle denemek ve izlemek** için küçük bir laboratuvar. İçinde ruflo ile geliştirilmiş gerçek bir Todo uygulaması da var.

Bağımlılık yok, sadece Node.js 20+ gerekir.

## Projenin mantığı

Ruflo bir **koordinasyon defteri**: ajanları, görevleri ve hafızayı kaydeder, görev için uygun ajanı önerir, güvenlik taraması yapar. Kodu yazan ise bir yürütücü ajandır (burada Claude Code). Yani ruflo "kim ne yapıyor" bilgisini tutar, iş yürütücüde olur.

Bu repo üç parçadan oluşur:

| Parça | Yol | Ne işe yarar |
|---|---|---|
| **Ruflo Lab** | `src/ruflo-lab/` | Her butonu gerçek bir `ruflo` komutu çalıştıran web paneli. Üstte **canlı Monitor** swarm, hive, ajan, görev ve hafıza durumunu gösterir. |
| **Todo uygulaması** | `src/todo-app/` | Ruflo ile geliştirilmiş gerçek iş: REST API, JSON dosya depolama, web arayüzü. |
| **Testler** | `tests/` | Todo API'si ve Lab sunucusu için `node:test` testleri. |

### Todo nasıl ruflo ile yapıldı?
1. Ruflo'da 3 ajan kaydedildi: `todo-coder`, `todo-tester`, `todo-reviewer`.
2. 5 görev açıldı ve ajanlara atandı: API, testler, arayüz, Monitor paneli, inceleme.
3. Kod yazıldıkça görevler tamamlandı olarak işaretlendi.
4. `security scan` ve `security secrets` ile tarama yapıldı (0 bulgu).

Lab'ın Monitor paneli bu kayıtları canlı gösterir.

## Çalıştırma

```bash
npm run lab    # http://127.0.0.1:4173  -> Lab + Monitor
npm run todo   # http://127.0.0.1:4200  -> Todo uygulaması
npm test       # 9 test
```

Lab komutları `npx @claude-flow/cli@latest` üzerinden çalışır, ilk çalıştırma birkaç saniye sürebilir. Ruflo'yu bu klasörde `npx ruflo@latest init` ile başlatmış olmanız gerekir.

## Lab'daki gruplar

- **Swarm**: ajan sürüsü kaydı oluşturur (topoloji ve ajan sayısı seçilir).
- **Hive-Mind**: Queen + worker yapısı, oylamalı karar katmanı.
- **Ajanlar ve Görevler**: kayıt oluşturma, listeleme, göreve uygun ajan önerisi (`hooks route`).
- **Hafıza**: anlamsal arama yapan kalıcı vektör hafıza.
- **Güvenlik**: prompt injection, gizli anahtar ve kod taraması, tehdit modeli.
- **Altyapı**: sağlayıcılar, eklentiler, embedding ve neural durumu.

> Not: "Swarm başlat" ve "Ajan oluştur" gerçek çalışan ajan başlatmaz, ruflo'nun defterine kayıt açar. Token harcayan komutlar (`--claude`, daemon) bilinçli olarak Lab'da yok.

## Güvenlik

- Sunucular yalnızca `127.0.0.1`'e bağlanır.
- Lab yalnızca `server.js` içindeki beyaz listedeki komutları çalıştırır, kabuk kullanmaz (`execFile`), girdiler argüman olarak geçer.
- Todo girdileri doğrulanır (başlık 1-200 karakter, `done` boolean), veri atomik yazılır.

## API (Todo)

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/todos` | Listele |
| POST | `/api/todos` | `{title}` ile ekle |
| PATCH | `/api/todos/:id` | `{title?, done?}` güncelle |
| DELETE | `/api/todos/:id` | Sil |
