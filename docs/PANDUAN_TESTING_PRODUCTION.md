# 🚀 Panduan & Rencana Pengujian Live Production SocaSob

Dokumen ini memuat rencana pengujian (*test plan*) langsung terhadap infrastruktur **Live Production Deployment** SocaSob di CapRover / Cloud.

---

## 🌐 Informasi Endpoint Live Production

Berdasarkan `README.md` repositori:

| Layanan | URL Publik Production | Status |
|---|---|:---:|
| **Frontend App** | [https://socasob.hallojanu.xyz](https://socasob.hallojanu.xyz) | 🟢 Active |
| **Backend API (Express + Socket.io)** | [https://be-socasob.hallojanu.xyz](https://be-socasob.hallojanu.xyz) | 🟢 Active |
| **ML Vision Pipeline (Flask + Socket.io)** | [https://socasob-ml.hallojanu.xyz](https://socasob-ml.hallojanu.xyz) | 🟡 Ready for Eventlet Deployment |

---

## 🧪 Tahapan Eksekusi Pengujian Production

### 1. Verifikasi API & Database Backend (Live)
Jalankan perintah berikut di terminal untuk memastikan backend production merespons normal:

```bash
# 1. Health check backend
curl -i https://be-socasob.hallojanu.xyz/health

# 2. Status perangkat robot
curl -s https://be-socasob.hallojanu.xyz/api/robot/status

# 3. Log hari ini dari database MongoDB production
curl -s https://be-socasob.hallojanu.xyz/api/log/today
```

---

### 2. Konfigurasi ML Container di CapRover
Sebelum menjalankan simulator ke ML production, pastikan ML container di CapRover sudah dibangun dengan Dockerfile terbaru (worker `eventlet`):
```dockerfile
# ml/Dockerfile
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```
Dan pastikan Environment Variables di CapRover ML sudah tersetting:
- `BE_URL=https://be-socasob.hallojanu.xyz`
- `PORT=5000`

---

### 3. Eksekusi Pengujian dengan Simulator Robot ke Production

Jalankan script simulator dari komputer/laptop lokal yang menembak langsung ke server ML production:

```bash
# Masuk ke folder ML
cd ml

# Jalankan simulator mengarah ke ML Server Production
python3 robot_simulator.py \
  --ml-url https://socasob-ml.hallojanu.xyz \
  --robot-id fadfa566 \
  --fps 10 \
  --duration 120
```

> 💡 **Opsi Alternatif (Hybrid Test):** Jika ML di cloud masih dalam proses deployment/rebuild, Anda dapat menjalankan ML secara lokal (`python app.py` dengan `BE_URL=https://be-socasob.hallojanu.xyz`) untuk langsung menguji aliran data dari simulator ➜ ML lokal ➜ Backend Cloud ➜ Frontend Cloud.

---

### 4. Verifikasi di Dashboard Frontend Production

1. Buka browser ke **[https://socasob.hallojanu.xyz](https://socasob.hallojanu.xyz)**.
2. Buka menu **Settings** / Pengaturan.
3. Masukkan ID Robot: `fadfa566`.
4. Klik **Hubungkan / Simpan**.
5. Buka tab **Home / Monitoring**:
   - [ ] Indikator status terhubung (🟢 Connected).
   - [ ] Status Jarak berganti antara **Dekat** dan **Jauh** secara berkala (setiap 10 detik).
   - [ ] **Timer** sesi aktif bertambah setiap detik.
   - [ ] **Eye Health Status** dan **Risk Score** diperbarui setiap 5 detik.
6. Buka tab **Log / Riwayat**:
   - [ ] Setelah 60 detik, verifikasi ringkasan 1 menit masuk ke riwayat monitoring.

---

### 5. Verifikasi Data Persistence di Production

Setelah simulator berjalan selama > 60 detik, cek kembali endpoint backend:

```bash
curl -s https://be-socasob.hallojanu.xyz/api/log/today
```

Pastikan nilai `nearDuration`, `farDuration`, dan `blinkCount` mengalami kenaikan sesuai durasi simulasi.
