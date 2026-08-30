# 🏗️ SocaSob — Spesifikasi Arsitektur & Payload Final

## Alur Data Lengkap

```
┌─────────────────────────────────────────────────────────────────────┐
│  Robot (ESP32-CAM) / Tester Client                                  │
│  Option A: Kirim via WebSocket tiap frame (15-20fps)                │
│  { robot_id, frame (binary JPEG), distance_json }                  │
│  Option B: Kirim via HTTP REST POST (POST /api/frame)               │
└────────────────────────┬────────────────────────────────────────────┘
                         │ WebSocket / HTTP REST
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ML Server (Flask + Flask-SocketIO)                                 │
│                                                                     │
│  Tugas:                                                             │
│  1. Terima frame + robot_id + distance_json                         │
│  2. Proses frame → EAR, blink detection, blink_rate, eye_status    │
│  3. Gabungkan hasil ML + distance_json robot                        │
│                                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  CHANNEL A (Real-time)  │  │  CHANNEL B (Aggregated 1 menit) │ │
│  │  emit tiap frame:       │  │  emit tiap 60 detik:            │ │
│  │  py-eye-detection       │  │  py-minute-summary              │ │
│  └────────────┬────────────┘  └────────────┬─────────────────────┘ │
└───────────────┼────────────────────────────┼───────────────────────┘
                │ Socket.io (ML sebagai client)
                ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend Server (Node.js + Socket.io + MongoDB)                     │
│                                                                     │
│  Channel A → forward ke FE room robot_id (latensi rendah, in-memory)│
│  Channel B → simpan ke MongoDB (Single Source of Truth) + forward  │
└────────────────────────┬────────────────────────────────────────────┘
                         │ Socket.io (room: robot:{robot_id})
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                                 │
│  User input robot_id → join room → terima data dari robot itu saja │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Payload Detail di Setiap Hop

### 1. Robot → ML (WebSocket atau HTTP REST `POST /api/frame`)
```json
{
  "robot_id": "fadfa566",
  "frame_base64": "<base64 JPEG>",
  "distance_json": {
    "distance": "Dekat",
    "confidence": 95
  }
}
```
> Robot yang mengukur & menentukan jarak. ML hanya meneruskan nilai ini.

---

### 2A. ML → BE | Channel A: Real-time (Socket.io, tiap frame)
**Event:** `py-eye-detection`
```json
{
  "robot_id": "fadfa566",
  "distance": "Dekat",
  "confidence": 95,
  "blink_event": false,
  "timestamp": "2026-08-22T18:00:00+07:00"
}
```

---

### 2B. ML → BE | Channel B: Aggregated (Socket.io, tiap 1 menit)
**Event:** `py-minute-summary`
```json
{
  "robot_id": "fadfa566",
  "period_start": "2026-08-22T18:00:00+07:00",
  "period_end":   "2026-08-22T18:01:00+07:00",
  "near_duration_sec": 42,
  "far_duration_sec":  18,
  "near_percentage":   70.0,
  "blink_count":       14,
  "avg_blink_rate":    14.0,
  "dominant_distance": "Dekat",
  "health_status":     "Peringatan",
  "eye_conditions":    ["Risiko Mata Kering (Instabilitas Tear Film)"],
  "recommendations":   ["Tingkatkan frekuensi kedipan Anda secara sadar."]
}
```
> Data agregasi 1 menit ini yang disimpan ke MongoDB per `robot_id`.

---

---

### 2C. ML Socket.IO Events Tambahan
* **Event Inbound (`esp32_frame`)**:
  * Menerima frame biner JPEG atau payload dictionary dari ESP32-CAM:
    ```json
    {
      "robot_id": "fadfa566",
      "frame": "<binary bytes atau base64>",
      "distance_json": { "distance": "Dekat", "confidence": 95 }
    }
    ```
* **Event Inbound (`request_telemetry`)** & Outbound (`telemetry`):
  * Client meminta fitur telemetri terakhir yang diproses oleh ML feature store.

* **Mode Adapter Kamera ML (`ESP32Camera`)**:
  * Menggunakan `VIDEO_SOURCE=esp32` dengan konfigurasi `ESP32_STREAM_URL` atau `ESP32_CAM_URL` (HTTP/MJPEG stream atau push WebSocket buffer).

---

### 3. Medical Reports & Certification API (`/api/reports`)

#### A. Generate Laporan Baru: `POST /api/reports`
* **Request Body**:
```json
{
  "robotId": "fadfa566",
  "patientName": "Bang Jan",
  "period": "7days" // "today" | "7days" | "30days" | "6months"
}
```
* **Response Body (201 Created)**:
```json
{
  "success": true,
  "message": "Laporan medis berhasil dibuat.",
  "data": {
    "reportId": "SOCA-882104",
    "robotId": "fadfa566",
    "patientName": "Bang Jan",
    "title": "Evaluasi Mingguan Kesehatan Penglihatan",
    "period": "7days",
    "periodLabel": "7 Hari Terakhir",
    "dateRange": "18 Agustus 2026 – 25 Agustus 2026",
    "eyeHealthScore": 86,
    "myopiaRisk": "Rendah",
    "fatigueRisk": "Sedang",
    "cvsRisk": "Rendah",
    "restCompliance": 84,
    "nearDurationMin": 112,
    "farDurationMin": 428,
    "totalHours": 9.0,
    "avgDistanceCm": 38.5,
    "blinkRatePerMin": 14.8,
    "clinicalNotes": [
      "Jarak rata-rata mata terhadap layar monitor berada pada batas aman yang dianjurkan (38.5 cm ≥ 30 cm).",
      "Frekuensi berkedip tercatat 14.8 kedipan/menit, sangat baik dalam menjaga stabilitas hidrasi tear film kornea."
    ],
    "examinerNotes": "Pasien menunjukkan indeks kesehatan penglihatan 86/100 dengan risiko miopia Rendah."
  }
}
```

#### B. Daftar Laporan Tersimpan: `GET /api/reports?robotId=fadfa566`
* Mengembalikan seluruh dokumen laporan yang telah dibuat dan tersimpan di database MongoDB.

#### C. Detail & Hapus Dokumen: `GET /api/reports/:id` & `DELETE /api/reports/:id`

---

### 4. Teman Soca AI Companion API (`/api/companion`)

#### A. Chat Interaktif dengan Konteks Telemetri: `POST /api/companion/chat`
* **Request Body**:
```json
{
  "message": "Bagaimana kondisi kesehatan mata dan durasi layarku hari ini?",
  "conversationId": "conv-1724578921",
  "robotId": "fadfa566",
  "patientName": "Bang Jan"
}
```
* **Response Body (200 OK)**:
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-1724578921",
    "title": "Kondisi Mata Hari Ini",
    "reply": "Halo Bang Jan! Berdasarkan telemetri pemantauan mata Anda hari ini: Tatap Dekat: 35 menit, Tatap Aman: 140 menit, Kepatuhan 20-20-20: 84%...",
    "messages": [...],
    "source": "clinical_ai_engine"
  }
}
```

#### B. Riwayat Percakapan: `GET /api/companion/conversations` & `DELETE /api/companion/conversations/:id`

---

### 5. Micro-Break & Senam Mata Logging (`POST /api/log/break`)

* **Request Body**:
```json
{
  "robotId": "fadfa566",
  "duration": 20
}
```
* **Response Body (200 OK)**:
  * Mencatat sesi tatap jauh 20 detik ke model `DailyLog`, mengkalkulasi ulang `restCompliance`, dan memperbarui metrik ke room socket real-time.

---

## 🔑 Identitas Perangkat Unik (`robotId`)

* Alamat IP lokal (`robotIp`) dapat berbeda atau bertabrakan antar Wi-Fi lokal.
* **`robotId` (Unique Hardware ID)** adalah identitas unik tunggal yang mengikat sesi socket room, data settings, dan histori MongoDB.

---

## 🧪 Collection Bruno API Testing

Seluruh endpoint HTTP REST (GET, POST, PUT, DELETE) terdokumentasi dan dapat diuji secara otomatis melalui koleksi Bruno di folder [`docs/bruno`](file:///Users/mrfrog/Documents/Lomba/PKM/docs/bruno).
