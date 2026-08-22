# SocaSob API

SocaSob API adalah backend service untuk sistem monitoring kesehatan mata yang terintegrasi dengan robot ESP32-CAM. Deploy via CapRover. API ini menyediakan endpoint untuk mengelola data log harian, pengaturan pengguna, dan informasi perangkat robot.

---

### 🌐 Live Production Deployment
- **URL Publik API**: [be-socasob.hallojanu.xyz](https://be-socasob.hallojanu.xyz) (Status: 🟢 Active)
- **Frontend App**: [socasob.hallojanu.xyz](https://socasob.hallojanu.xyz)
- **ML Vision Pipeline**: [socasob-ml.hallojanu.xyz](https://socasob-ml.hallojanu.xyz)

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Persyaratan](#persyaratan)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Menjalankan Server](#menjalankan-server)
- [API Documentation](#api-documentation)
- [Endpoint Utama](#endpoint-utama)
- [Model Data](#model-data)
- [Testing](#testing)
- [Seed Data](#seed-data)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur

- Manajemen log harian penggunaan mata (durasi jarak dekat/jauh, kedipan)
- Analitik kesehatan mata (risiko miopia, kelelahan, skor kesehatan)
- Manajemen pengaturan pengguna (IP robot, volume audio, notifikasi)
- Monitoring status dan kesehatan perangkat robot
- Koneksi TCP ke ESP32-CAM
- Socket.IO untuk komunikasi real-time
- Dokumentasi API otomatis dengan Swagger UI

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.IO
- **API Documentation**: Swagger UI + swagger-jsdoc
- **Testing**: Jest + Supertest
- **Environment**: dotenv

## Persyaratan

- Node.js 18.x atau lebih tinggi
- MongoDB 6.x atau lebih tinggi
- npm atau yarn

## Instalasi

1. Clone repository:

```bash
git clone https://github.com/januarsyah901/socasob-api.git
cd socasob-api
```

2. Install dependencies:

```bash
npm install
```

3. Buat file `.env` dari template:

```bash
cp .env.example .env
```

4. Sesuaikan variabel environment di `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/socasob
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Konfigurasi

### Variabel Environment

| Variabel | Deskripsi | Default |
|----------|-----------|---------|
| `PORT` | Port server | 5000 |
| `MONGODB_URI` | URL koneksi MongoDB | mongodb://localhost:27017/socasob |
| `FRONTEND_URL` | URL frontend untuk CORS | http://localhost:3000 |
| `NODE_ENV` | Environment mode | development |

## Menjalankan Server

### Development Mode

```bash
npm run dev
```

Server akan berjalan dengan nodemon untuk auto-restart saat ada perubahan kode.

### Production Mode

```bash
npm start
```

## API Documentation

Dokumentasi API lengkap tersedia di Swagger UI:

```
http://localhost:5000/api-docs
```

Atau kunjungi direktori `/api-docs` saat server berjalan.

## Endpoint Utama

### Health Check

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Cek status server |

### Log Harian

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/log/today` | Ambil rangkuman data hari ini |
| GET | `/api/log/weekly` | Ambil riwayat 7 hari terakhir (dengan query `startDate` dan `endDate`) |
| GET | `/api/log/:date` | Ambil rangkuman untuk tanggal spesifik (format: YYYY-MM-DD) |

### Resume Analitik

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/resume` | Ambil resume analitik 6 bulan terakhir |

### Pengaturan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/settings` | Ambil pengaturan pengguna |
| POST | `/api/settings` | Perbarui pengaturan pengguna |

### Robot

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/robot/connect` | Uji koneksi ke ESP32-CAM |
| GET | `/api/robot/status` | Ambil informasi perangkat aktif |
| GET | `/api/robot/health` | Ambil informasi kesehatan sistem |

## Model Data

### DailyLog

Model untuk menyimpan data log harian:

```javascript
{
  date: String,          // Format: YYYY-MM-DD
  nearDuration: Number,  // Durasi jarak dekat (detik)
  farDuration: Number,   // Durasi jarak jauh (detik)
  blinkCount: Number,    // Jumlah kedipan
  sessions: [{
    startTime: Date,
    endTime: Date,
    peakDistance: String  // 'Dekat' atau 'Jauh'
  }],
  eyeHealthStatus: String, // 'normal', 'risk_myopia', 'risk_fatigue'
  restCompliance: Number   // Persentase 0-100
}
```

### Settings

Model untuk pengaturan pengguna:

```javascript
{
  userId: String,         // ID pengguna
  robotIp: String,        // Alamat IP robot
  audioVolume: Number,    // Volume 0-100
  audioEnabled: Boolean,  // Status audio
  notificationEnabled: Boolean // Status notifikasi
}
```

## Testing

Jalankan test dengan:

```bash
npm test
```

Test menggunakan Jest dengan Supertest untuk HTTP endpoint testing.

## Seed Data

### Cara Menjalankan Seed

1. Pastikan server MongoDB berjalan
2. Jalankan script seed:

```bash
node scripts/seed.js
```

### Data yang akan di-seed

- Pengaturan default (Settings)
- Data log harian contoh untuk 7 hari terakhir (DailyLog)

## Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b fitur/nama-fitur`)
3. Commit perubahan (`git commit -m 'Tambah fitur x'`)
4. Push ke branch (`git push origin fitur/nama-fitur`)
5. Buat Pull Request

## Lisensi

ISC
