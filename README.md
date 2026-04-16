# 🚀 Legacyver

🌐 Website: https://legac.vercel.app<br>
📚 Docs: https://legac.vercel.app/docs

**AI-powered CLI tool** untuk generate dokumentasi teknis secara otomatis dari codebase yang sudah ada (legacy) atau tidak memiliki dokumentasi. Menggunakan parsing AST yang mendalam dikombinasikan dengan LLM (Groq, Gemini, Ollama, dll.) untuk menjelaskan struktur, logika, dan pola kode kamu.

---

## ⚡ Panduan Cepat (Step-by-Step)

Ikuti urutan ini untuk membuat dokumentasi kamu siap dalam hitungan menit:

### 1. Instalasi
Instal package secara global melalui npm:
```bash
npm install -g legacyver
```
*Atau gunakan `npx legacyver` jika kamu tidak ingin menginstalnya secara global.*

### 2. Login (Cloud Sync)
Masuk ke akun Legacyver kamu untuk mengaktifkan sinkronisasi cloud dan menyimpan dokumentasi di dashboard:
```bash
legacyver login
```

### 3. Inisialisasi Konfigurasi
Jalankan wizard setup untuk menyimpan API key (Groq, Gemini, dll.) dan membuat file konfigurasi `.legacyverrc`:
```bash
legacyver init
```

### 4. Analisis & Generate
Jalankan perintah utama untuk menganalisis folder project kamu:
```bash
legacyver analyze ./src --incremental
```
*Flag `--incremental` memastikan hanya file yang dimodifikasi yang akan diproses ulang di jalankan berikutnya (lebih cepat & hemat).*

---

## 🛠️ Daftar Perintah (CLI Commands)

### `legacyver analyze [target]`
Perintah utama untuk memindai codebase dan membuat dokumentasi.

| Flag | Default | Deskripsi |
|------|---------|-----------|
| `--out <dir>` | `./legacyver-docs` | Folder output hasil dokumentasi |
| `--format <fmt>` | `markdown` | Format output: `markdown`, `html`, `json` |
| `--provider <p>` | `groq` | Provider AI: `groq`, `gemini`, `ollama`, `openrouter` |
| `--incremental` | `false` | Hanya proses file yang berubah (lebih cepat) |
| `--dry-run` | `false` | Estimasi penggunaan token tanpa memanggil AI |
| `--no-confirm` | — | Lewati konfirmasi estimasi biaya |

### `legacyver init`
Wizard interaktif untuk setup API key dan preferensi lokal.

### `legacyver providers`
Cek status API key dan daftar model AI yang tersedia.

### `legacyver login / logout`
Kelola sesi untuk sinkronisasi dokumentasi ke cloud.

---

## 🏗️ Dukungan Framework & Bahasa

| Kategori | Item yang Didukung |
|----------|--------------------|
| **Bahasa** | JavaScript, TypeScript, PHP, Python, Java, Go |
| **Framework** | **Laravel** (Deteksi Otomatis Routes, Models, ERD), **Express** |
| **Integrasi** | GitHub Actions, GitBook, Docusaurus |

### 🐘 Integrasi Mendalam Laravel
Jika file `artisan` terdeteksi, Legacyver otomatis mengekstrak:
- **Route Maps**: Daftar lengkap method, URI, dan Controller.
- **ER Diagrams**: Membuat diagram Mermaid otomatis untuk Model kamu.
- **Service Providers**: Mendokumentasikan binding dependency yang kompleks.

---

## ⚙️ Konfigurasi (`.legacyverrc`)
Sesuaikan alur kerja kamu dengan file konfigurasi:

```json
{
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "format": "markdown",
  "incremental": true,
  "out": "./legacyver-docs"
}
```

---

## 📄 Lisensi
MIT License. Dibuat dengan ❤️ untuk developer yang berjuang melawan legacy code.
