# 🧪 Panduan Testing End-to-End SocaSob (Localhost)

Dokumen ini menjelaskan cara menjalankan dan menguji seluruh sistem SocaSob (ML + Backend + Frontend + Robot Simulator) di lingkungan lokal (**localhost**).

---

## 🗂️ Alokasi Port Lokal (Mencegah Port Collision)

| Layanan | Port Lokal | Konfigurasi File |
|---|---|---|
| **Frontend (Next.js)** | `http://localhost:3000` | Default Next.js (`npm run dev`) |
| **Backend (Node.js)** | `http://localhost:3001` | `be/.env` ➜ `PORT=3001` |
| **ML Server (Flask)** | `http://localhost:5000` | `ml/.env` ➜ `PORT=5000`, `BE_URL=http://localhost:3001` |
| **Robot Simulator** | Client | Menembak ke `http://localhost:5000` |

---

## ⚙️ Step 1 — Setup Environment

### 1. Backend (BE)
```bash
cd be
cp .env.example .env
```
> ⚠️ **Penting:** Pastikan isi `be/.env`:
> ```env
> PORT=3001
> FRONTEND_URL=http://localhost:3000
> MONGO_URI=mongodb://localhost:27017/socasob  # atau URI MongoDB Anda
> NODE_ENV=development
> ```
Install dependencies:
```bash
npm install
```

---

### 2. ML Server (Python)
```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
> ⚠️ **Penting:** Pastikan isi `ml/.env`:
> ```env
> PORT=5000
> FLASK_HOST=0.0.0.0
> BE_URL=http://localhost:3001
> ```

---

### 3. Frontend (FE)
```bash
cd fe
npm install
cp .env.example .env.local
```
> ⚠️ **Penting:** Pastikan isi `fe/.env.local`:
> ```env
> NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
> ```

---

## 🚀 Step 2 — Menjalankan Service (Buka 4 Terminal)

### Terminal 1 — Backend (BE)
```bash
cd be
npm run dev
# Output: Server running in development mode on port 3001
```

### Terminal 2 — ML Server
```bash
cd ml
source .venv/bin/activate
python3 app.py
# Output:
# === Memulai SocaSob ML Server ===
# [BE Client] Menghubungkan ke http://localhost:3001 ...
# [BE Client] Terhubung ke Backend di http://localhost:3001
# Server siap. Robot dapat connect ke ws://0.0.0.0:5000
```

### Terminal 3 — Frontend (FE)
```bash
cd fe
npm run dev
# Output: Ready on http://localhost:3000
```

### Terminal 4 — Robot Simulator
```bash
cd ml
source .venv/bin/activate

# Jalankan simulator dengan custom ID robot
python3 robot_simulator.py \
  --ml-url http://localhost:5000 \
  --robot-id fadfa566 \
  --fps 10 \
  --duration 120
```

---

## 🖥️ Step 3 — Verifikasi di Dashboard Frontend

1. Buka browser: **[http://localhost:3000](http://localhost:3000)**.
2. Buka menu **Settings** (Pengaturan).
3. Masukkan ID Robot: `fadfa566` lalu klik **Hubungkan / Simpan**.
4. Kembali ke tab **Home / Monitoring**:
   - [ ] Status robot terhubung (🟢 Connected).
   - [ ] Jarak berganti antara **Dekat** dan **Jauh** setiap ~10 detik.
   - [ ] **Timer** bertambah setiap 1 detik.
   - [ ] **Eye Health Score & Risk** diperbarui setiap 5 detik.
5. Buka tab **Log**:
   - [ ] Setelah 60 detik, verifikasi summary masuk ke database & tabel riwayat.

---

## 📊 Event Log di Browser Console (F12)

Buka DevTools Console di browser (`F12`), pastikan event berikut masuk:
```javascript
[Socket] eye-distance   -> { distance: "Dekat", confidence: 95, timestamp: "..." }
[Socket] timer-update   -> { hours: 0, minutes: 1, seconds: 23, timestamp: "..." }
[Socket] eye-status     -> { status: "normal", score: 87, indicators: {...} }
[Socket] minute-summary -> { near_duration_sec: 42, far_duration_sec: 18, ... }
```

---

## 🔧 Troubleshooting Lokal

| Gejala | Penyebab | Solusi |
|---|---|---|
| `EADDRINUSE: port 5000` | Port bentrok (BE & ML sama-sama 5000) | Set `PORT=3001` di `be/.env` |
| `[BE Client] Gagal connect` | BE belum aktif saat ML start | Biarkan saja (reconnect otomatis) atau jalankan BE terlebih dahulu |
| Dashboard tidak update | FE belum subscribe `robot_id` | Input ID `fadfa566` di Settings FE |
