# 📮 Panduan Import & Testing Postman SocaSob

Folder ini berisi file Postman Collection dan Environment yang siap di-import langsung ke aplikasi **Postman**.

---

## 📂 File yang Tersedia

1. **[SocaSob_API_Collection.json](./SocaSob_API_Collection.json)**: Berisi seluruh endpoint API (Health, Settings, Log, Analytics, Resume, ML) lengkap dengan automated test assertions (`pm.test`).
2. **[SocaSob_Production_Environment.json](./SocaSob_Production_Environment.json)**: Variabel environment untuk pengujian **Live Production** (`be-socasob.hallojanu.xyz`).
3. **[SocaSob_Localhost_Environment.json](./SocaSob_Localhost_Environment.json)**: Variabel environment untuk pengujian **Localhost** (`localhost:3001` & `localhost:5000`).

---

## 📥 Cara Import ke Postman

1. Buka aplikasi **Postman**.
2. Klik tombol **Import** (di sudut kiri atas).
3. Drag & drop ketiga file JSON di atas, atau klik **Files** dan pilih:
   - `docs/postman/SocaSob_API_Collection.json`
   - `docs/postman/SocaSob_Production_Environment.json`
   - `docs/postman/SocaSob_Localhost_Environment.json`
4. Di pojok kanan atas Postman, pilih Environment yang ingin digunakan:
   - **SocaSob — Production Environment** (untuk live test), atau
   - **SocaSob — Localhost Environment** (untuk test lokal).

---

## 🚀 Menjalankan Automated Test (Collection Runner)

1. Di sidebar kiri Postman, klik kanan pada koleksi **SocaSob API & Real-time Testing Collection**.
2. Pilih **Run collection**.
3. Klik tombol **Run SocaSob API & Real-time Testing Collection**.
4. Semua request akan dieksekusi secara otomatis dan menampilkan status lolos pengujian (🟢 **Passed**).

---

## ⚡ Testing Real-Time via Postman Socket.IO

Untuk mensimulasikan aliran data dari ML ke Backend dan Frontend:

1. Di Postman, klik **New** ➜ pilih **Socket.IO**.
2. Masukkan URL: `https://be-socasob.hallojanu.xyz` (atau `http://localhost:3001`).
3. Klik **Connect**.
4. Di kolom **Event Name**, ketik: `py-eye-detection`
5. Masukkan JSON Payload:
   ```json
   {
     "robot_id": "fadfa566",
     "distance": "Dekat",
     "confidence": 95,
     "blink_event": true
   }
   ```
6. Klik **Send / Emit**.
7. Buka dashboard web di **[https://socasob.hallojanu.xyz](https://socasob.hallojanu.xyz)** untuk melihat perubahan status secara real-time!
