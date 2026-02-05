# Panduan Keamanan Supabase

Halo! Sangat wajar jika Anda khawatir melihat API Key dan request database muncul di tab Network browser (F12).

**Jangan khawatir, ini adalah perilaku normal dan aman JIKA Anda telah mengaktifkan Row Level Security (RLS).**

Berikut penjelasannya:

## 1. Mengapa API Key terlihat?
Key yang Anda lihat (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) disebut **Anonymous Key**.
- Key ini **MEMANG DIRANCANG UNTUK PUBLIK**.
- Key ini tugasnya hanya untuk memberitahu server Supabase: "Halo, saya adalah pengunjung website (tanpa hak akses khusus)".
- Key ini **TIDAK BISA** digunakan untuk mengubah struktur database, menghapus tabel, atau membypass aturan keamanan (RLS).

Key yang **HARUS RAHASIA** adalah `SERVICE_ROLE_KEY`. Jangan pernah menaruh service role key di kode frontend (`src/**/*`).

## 2. Bagaimana agar data tidak "bocor"?
Supabase menggunakan sistem keamanan bernama **Row Level Security (RLS)**. Ini seperti satpam di gerbang database Anda. Walaupun orang punya Anon Key, mereka tetap harus melewati pemeriksaan RLS.

Jika RLS **mati (disabled)**:
- ⚠️ Siapapun yang punya Anon Key bisa melihat, mengedit, dan menghapus semua data. **INI BERBAHAYA.**

Jika RLS **hidup (enabled)**:
- ✅ Anon Key hanya bisa melakukan apa yang Anda izinkan secara eksplisit melalui "Policy".

## 3. Langkah Pengamanan (Wajib Dilakukan!)

Untuk mengamankan tabel `seismic_dc_user` (dan tabel lainnya), jalankan perintah SQL berikut di **Supabase Dashboard > SQL Editor**:

```sql
-- 1. Aktifkan RLS pada tabel (Wajib)
ALTER TABLE seismic_dc_user ENABLE ROW LEVEL SECURITY;

-- 2. Buat aturan: "Siapapun (publik) boleh MEMBACA data"
-- Karena ini adalah dashboard komunitas publik, kita izinkan SELECT (baca) untuk anonim.
CREATE POLICY "Public Read Access"
ON seismic_dc_user
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Pastikan TIDAK ADA aturan untuk INSERT/UPDATE/DELETE untuk role 'anon'
-- Secara default, jika tidak ada policy yang dibuat untuk INSERT/UPDATE, maka Supabase akan MENOLAK request tersebut secara otomatis.
-- Jadi data Anda aman dari pengubahan oleh orang iseng.
```

## Ringkasan
1. **API Key di frontend itu aman**, asalkan itu adalah Anon Key.
2. **Keamanan ada di sisi Database (RLS)**, bukan di sisi Frontend.
3. **Pastikan RLS aktif** di Supabase Dashboard untuk mencegah orang luar mengutak-atik data Anda.

Jika RLS sudah aktif dan policy `SELECT` sudah dibuat, maka apa yang Anda lihat di Network Tab hanyalah data publik yang memang ditampilkan di website Anda. Data sensitif tidak akan bisa diubah atau dihapus.
