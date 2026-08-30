# SocaSob — System Architecture & Design Documentation

**SocaSob** — Smart Eye Health Monitoring System  
*IoT Hardware (ESP32-CAM) + Machine Learning (MediaPipe CV) + Backend (Node.js/Express & Socket.io) + Frontend (Next.js Dashboard)*

> **Version**: 1.0.0  
> **Last Updated**: 2026-08-19  
> **Owner**: Tim Pengembang SocaSob (PKM)  
> **Status**: Active / Approved  

---

## 1. Project Overview

| Attribute | Value |
|-----------|-------|
| **Project Name** | SocaSob (Smart Eye Health Monitoring System) |
| **Domain / Focus** | Preventative Health & Ergonomics IoT / Computer Vision |
| **Target Problem** | Computer Vision Syndrome (CVS), Risiko Miopia akibat jarak layar terlalu dekat (< 30 cm), kebiasaan jarang berkedip, dan kurang istirahat layar |
| **Core Architecture** | Quad-Layer: Hardware (ESP32-CAM) → ML/CV Service (Python) → Central Backend (Node.js/Socket.io/MongoDB) → Client Dashboard (Next.js SPA) |
| **Realtime Protocol** | WebSockets (Socket.io) for bidirectional & real-time telemetry streaming (< 200 ms latency) |

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   ESP32-CAM / Webcam                   │
│          (MJPEG HTTP Video Stream / USB Cam)           │
└───────────────────────────┬────────────────────────────┘
                            │ Raw Video Frames
                            ▼
┌────────────────────────────────────────────────────────┐
│          Machine Learning & CV Service (Python)        │
│  - MediaPipe Face Mesh (468/478 Landmarks)             │
│  - Eye Aspect Ratio (EAR) & Blink Detector/Counter     │
│  - Distance Estimation (Dekat <30cm vs Jauh >=30cm)    │
│  - Eye Condition & Risk Analyzer                       │
│  - Socket.io Client / Stream Server                    │
└───────────────────────────┬────────────────────────────┘
                            │ Socket Event: `py-eye-detection`
                            ▼
┌────────────────────────────────────────────────────────┐
│             Central Backend Server (Node.js)           │
│  - Express REST API & Socket.io Gateway Server         │
│  - Session Timer Engine (Active/Close tracking)        │
│  - Eye Health Scoring & Dynamic Risk Evaluation Engine │
│  - MongoDB Persistence (DailyLog, Session, Settings)   │
└─────────────┬────────────────────────────┬─────────────┘
              │ Socket.io Events:          │ REST APIs:
              │ - `timer-update`           │ - `/api/log/*`
              │ - `eye-distance`           │ - `/api/resume`
              │ - `eye-status`             │ - `/api/settings`
              │                            │ - `/api/robot/*`
              ▼                            ▼
┌────────────────────────────────────────────────────────┐
│               Frontend Dashboard (Next.js)             │
│  - Realtime Monitoring Dashboard & Countdown Timer     │
│  - Dynamic Status Indicators (normal, myopia, fatigue) │
│  - Daily & Weekly Activity Logs                        │
│  - Health Analytics Resume (Score, Risk & Doughnut)    │
│  - Settings & Hardware Robot Configuration             │
└────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack Matrix

| Layer | Technologies & Libraries |
|-------|--------------------------|
| **Frontend (`fe`)** | Next.js 14/15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Socket.io-client, Radix UI Primitives |
| **Backend (`be`)** | Node.js (v18+), Express.js, Socket.io, Mongoose (MongoDB), Swagger UI, CORS, Dotenv |
| **ML & CV (`ml`)** | Python 3.10+, OpenCV (`cv2`), MediaPipe (`mediapipe`), NumPy, Flask, Socket.io Client (`python-socketio`) |
| **Hardware** | ESP32-CAM Module / Integrated USB Webcam, WiFi 802.11 b/g/n, OV2640 Camera Sensor |

---

## 4. Frontend Architecture (`fe`)

### 4.1 Folder & Route Structure
```
fe/
├── app/
│   ├── layout.tsx                # Root layout, Theme provider, Socket provider
│   ├── page.tsx                  # Home: Realtime monitoring dashboard, timer & mascot
│   ├── log/
│   │   └── page.tsx              # Log: Daily summary & 7-day weekly history
│   ├── resume/
│   │   └── page.tsx              # Resume: Health score, risk assessment & analytics
│   └── settings/
│       └── page.tsx              # Settings: Robot IP config, volume & notifications
├── components/
│   ├── dashboard-layout.tsx      # Main wrapper with responsive navigation sidebar
│   ├── timer-display.tsx         # Live session countdown & elapsed timer
│   ├── eye-metrics.tsx           # Real-time eye distance & status badges
│   ├── connection-banner.tsx     # Connection state feedback banner
│   ├── layout/                   # Header, Sidebar, Avatar, Theme switcher
│   └── ui/                       # Base UI atomic components (Button, Modal, Card, etc.)
└── lib/
    ├── socket-context.tsx        # React Context for global Socket.io state management
    ├── utils.ts                  # Helper formatting & CSS merge functions
    └── test-socket.ts            # Socket mock & development testing helper
```

### 4.2 State Management & Real-time Flow
* **`SocketProvider` (`lib/socket-context.tsx`)**: Menginisialisasi koneksi Socket ke `NEXT_PUBLIC_SOCKET_URL` (default: `http://localhost:3001`).
* **Exposed Context Values**:
  * `isConnected`: Status koneksi socket (`true`/`false`).
  * `timer`: Object `{ hours, minutes, seconds }` tersinkronisasi tiap detik.
  * `eyeDistance`: `'Dekat'` | `'Jauh'`.
  * `eyeStatus`: `'normal'` | `'risk_myopia'` | `'risk_fatigue'` | `'disconnected'`.
  * `confidence`: Nilai keyakinan deteksi (0 - 100%).
  * `eyeScore`: Skor kesehatan mata saat ini (0 - 100).

---

## 5. Backend Architecture (`be`)

### 5.1 Architecture & Services
```
be/src/
├── app.js                        # Express app config, CORS, routes & global error handler
├── server.js                     # HTTP server initialization & Socket.io server bootstrap
├── config/
│   ├── db.js                     # MongoDB connection via Mongoose
│   ├── constants.js              # Application constants & thresholds
│   └── swagger.js                # Swagger API documentation setup
├── models/
│   ├── DailyLog.js               # Schema for daily & session monitoring history
│   └── Settings.js               # Schema for user preferences & robot connection
├── routes/
│   ├── log.routes.js             # Routes for daily and weekly logs
│   ├── resume.routes.js          # Routes for analytical health score & risk summaries
│   ├── settings.routes.js        # Routes for settings CRUD
│   └── robot.routes.js           # Routes for robot connectivity & testing
├── services/
│   ├── timerService.js           # Real-time session timer ticking & synchronization
│   ├── eyeHealthEngine.js        # Rule engine for calculating Eye Score & Risk Categories
│   └── logService.js             # Session recording and database aggregation logic
└── sockets/
    ├── index.js                  # Socket.io instance creation & client listener
    ├── pythonHandler.js          # Inbound socket listener from Python ML (`py-eye-detection`)
    └── frontendEmitter.js        # Outbound broadcaster to Frontend clients
```

### 5.2 Business Logic & Eye Health Scoring Engine
* **Aturan Status Kesehatan Mata:**
  * `normal`: Kondisi sehat, jarak mata dominan aman (>= 30 cm) dan kedipan normal.
  * `risk_myopia`: Durasi tatap dekat (< 30 cm) melebihi 60% dari sesi aktif berjalan.
  * `risk_fatigue`: Akumulasi monitoring melebihi 1 jam dengan durasi tatap dekat > 40% atau *blink rate* sangat rendah.
  * `disconnected`: Tidak ada data deteksi yang masuk dari ML Pipeline selama > 5 detik (Watchdog Timeout).

---

## 6. Machine Learning & Computer Vision (`ml`)

### 6.1 Pipeline Architecture
```
Camera Frame (ESP32-CAM / Webcam)
       │
       ▼
[FaceMeshDetector] (MediaPipe Face Mesh: Refined 468/478 Landmarks)
       │
       ├─► [EyeLandmarksExtractor] -> 6 Coordinates per eye
       │         │
       │         ▼
       │   [EAR Calculator] -> EAR (Eye Aspect Ratio)
       │         │
       │         ▼
       │   [BlinkDetector & Counter] -> Blink Count, Blink Rate (blinks/min), Closure Duration
       │
       ├─► [DistanceEstimator] -> Interpupillary Distance (IPD) / Focal Length Formula
       │         │
       │         ▼
       │   Distance (cm) & Classification ('Dekat' vs 'Jauh')
       │
       ▼
[FeatureExtractor / PayloadBuilder]
       │
       ├─► [StreamService] (MJPEG `/video_feed` for visual debug UI)
       └─► [SocketEmitter] (Emits `py-eye-detection` to Node.js Backend)
```

### 6.2 Formula & Algorithms
1. **Eye Aspect Ratio (EAR):**
   $$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \cdot \|p_1 - p_4\|}$$
   Digunakan untuk mendeteksi kedipan mata dan durasi penutupan mata.

2. **Distance Estimation (Jarak Mata ke Layar):**
   Memanfaatkan jarak Euclidean antara kedua pupil/mata (Inter-pupillary distance) pada bidang proyeksi kamera:
   $$\text{Distance (cm)} = \frac{\text{Known Pupil Distance (e.g. 6.3 cm)} \times \text{Focal Length}}{\text{Pixel Distance in Frame}}$$
   - Jarak < 30 cm -> Dekat
   - Jarak >= 30 cm -> Jauh

---

## 7. Socket.io Event Specification

| Event Name | Direction | Payload Schema | Description |
|------------|-----------|----------------|-------------|
| `py-eye-detection` | ML → BE | `{ distance: 'Dekat' \| 'Jauh', confidence: number }` | Transmisi deteksi jarak dari ML |
| `py-blink-detected` | ML → BE | `{ blinkRate: number, timestamp: string }` | Notifikasi event kedipan pengguna |
| `timer-update` | BE → FE | `{ hours: number, minutes: number, seconds: number, timestamp: string }` | Update timer deteksi per detik |
| `eye-distance` | BE → FE | `{ distance: 'Dekat' \| 'Jauh', confidence: number, timestamp: string }` | Broadcast status jarak ke UI |
| `eye-status` | BE → FE | `{ status: 'normal' \| 'risk_myopia' \| 'risk_fatigue' \| 'disconnected', score: number, indicators: { eyeFatigue: number, myopiaRisk: number, postureWarning: boolean, blinkRate: number }, timestamp: string }` | Broadcast metrik kesehatan berkala |

---

## 8. REST API Specifications

### 8.1 Monitoring & Log Endpoints
* **`GET /api/log/today`**  
  Mengambil rekap total durasi tatap dekat vs jauh serta sesi hari ini.
* **`GET /api/log/weekly`**  
  Mengambil data riwayat 7 hari terakhir beserta status risiko dan rasio kepatuhan.
* **`POST /api/log/session`**  
  Menyimpan atau menutup rekaman sesi aktif secara eksplisit.

### 8.2 Resume & Analytics Endpoints
* **`GET /api/resume`**  
  Mengambil nilai akumulatif Eye Health Score, kategori risiko, rata-rata jarak, blink rate, dan rasio distribusi dekat vs jauh.

### 8.3 Settings & Robot Endpoints
* **`GET /api/settings`**  
  Mengambil konfigurasi preferensi pengguna dan parameter robot.
* **`POST /api/settings`**  
  Memperbarui konfigurasi preferensi (volume audio, alarm toggle, notifikasi).
* **`POST /api/robot/connect`**  
  Memvalidasi dan menginisialisasi koneksi ke alamat IP ESP32-CAM.
* **`POST /api/robot/disconnect`**  
  Memutuskan sesi koneksi robot.
* **`GET /api/robot/status`**  
  Memeriksa status sinyal, latency, dan kesehatan modul kamera robot.

---

## 9. Database Schema (MongoDB Mongoose)

### 9.1 `DailyLog` Model
```javascript
{
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
  totalDurationMinutes: { type: Number, default: 0 },
  nearDistanceMinutes: { type: Number, default: 0 },
  farDistanceMinutes: { type: Number, default: 0 },
  sessions: [
    {
      startTime: { type: Date, default: Date.now },
      endTime: { type: Date },
      durationSeconds: { type: Number, default: 0 },
      nearDurationSeconds: { type: Number, default: 0 },
      farDurationSeconds: { type: Number, default: 0 },
      averageConfidence: { type: Number, default: 100 }
    }
  ],
  eyeHealthStatus: {
    type: String,
    enum: ['normal', 'risk_myopia', 'risk_fatigue'],
    default: 'normal'
  },
  complianceRate: { type: Number, default: 100 } // Persentase kepatuhan jarak aman
}
```

### 9.2 `Settings` Model
```javascript
{
  userId: { type: String, default: 'default_user', unique: true },
  robotIp: { type: String, default: '' },
  audioAlerts: { type: Boolean, default: true },
  audioVolume: { type: Number, min: 0, max: 100, default: 80 },
  browserNotifications: { type: Boolean, default: true },
  nearDistanceThresholdCm: { type: Number, default: 30 },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 10. Deployment & Environment Setup

### Environment Variables
* **Frontend (`fe/.env.local`)**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
  ```
* **Backend (`be/.env`)**:
  ```env
  PORT=3001
  FRONTEND_URL=http://localhost:3000
  MONGODB_URI=mongodb://localhost:27017/socasob
  NODE_ENV=development
  ```
* **ML Service (`ml/.env`)**:
  ```env
  PORT=5000
  BACKEND_SOCKET_URL=http://localhost:3001
  CAMERA_SOURCE=0 # 0 for Webcam, or http://<ESP32_IP>:81/stream for ESP32-CAM
  ```
