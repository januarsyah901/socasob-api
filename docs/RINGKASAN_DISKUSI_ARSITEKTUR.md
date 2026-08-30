# 📝 Ringkasan Diskusi & Keputusan Arsitektur SocaSob

Dokumen ini merangkum alur diskusi dan keputusan teknis yang telah disepakati untuk pengembangan sistem SocaSob (Smart Eye Health Monitoring System).

---

## 1. Latar Belakang & Masalah Awal
Diskusi dimulai dengan temuan adanya **gap antara kode yang ada dan PRD (Product Requirement Document)**:
*   **Mekanisme Komunikasi:** PRD mengharapkan ML menjadi Socket.io *client* yang melakukan *push* data ke Backend (BE). Namun, kode ML eksisting bertindak sebagai HTTP Flask server statis yang menunggu untuk di-*poll* (diambil datanya).
*   **Perhitungan Jarak:** Kode ML belum secara aktif menghasilkan status jarak fisik ("Dekat" atau "Jauh"), padahal BE sangat bergantung pada data ini.
*   **Alur Robot:** Terdapat rencana bahwa Robot ESP32-CAM akan mengirim gambar 20fps via HTTP POST beserta `robot_id`.

---

## 2. Isu Latency & Resolusi Komunikasi Robot → ML
*   **Masalah:** Mengirim gambar via HTTP POST pada 20fps (tiap 50ms) akan menimbulkan *overhead* tinggi (TCP Handshake berulang, header HTTP). Jika proses *inference* ML memakan waktu 30-80ms, frame akan menumpuk dan menyebabkan *delay* kumulatif.
*   **Keputusan:** Beralih dari HTTP POST ke **WebSocket** untuk komunikasi Robot ke ML. 
*   **Keuntungan:** Koneksi persisten (tetap terbuka), latensi turun menjadi 5-15ms, hemat *bandwidth*, dan menghilangkan proses buka-tutup koneksi berulang. ML juga akan menerapkan *frame-dropping* (mengabaikan frame baru jika masih sibuk memproses frame sebelumnya) agar performa tetap responsif.

---

## 3. Pembagian Tugas Perhitungan Jarak (Distance)
*   **Masalah:** Awalnya diasumsikan ML harus menghitung jarak dari rasio pixel wajah (Inter-pupillary distance).
*   **Fakta Baru:** Robot ESP32-CAM ternyata sudah mampu mengirimkan data perhitungan jaraknya sendiri dalam bentuk `json jarak`.
*   **Keputusan:** Beban komputasi dibagi. **Robot mengukur jarak fisik**, sementara **ML murni fokus menganalisa kedipan mata** (EAR, Blink Rate, Eye Health). ML tinggal meneruskan status jarak dari Robot ke Backend.

---

## 4. Efisiensi Data & Pencegahan Redundansi (Single-Source-of-Truth)
*   **Masalah:** Jika ML melakukan *push* ke BE (dan diteruskan ke FE) setiap frame (puluhan kali per detik), server Node.js dan *database* MongoDB akan kelebihan beban (overload). Selain itu, jika Channel Real-time ikut menyimpan ke DB tiap detik, akan terjadi *double counting* (perhitungan ganda) saat Channel Agregasi dikirim.
*   **Keputusan (Hybrid Approach & Strict DB Isolation):** Dibuat 2 jalur pengiriman data dari ML ke BE menggunakan Socket.io:
    1.  **Channel Real-time (Tiap frame):** Mengirim event `py-eye-detection` berisi `{distance, confidence, blink_event}` murni *in-memory* untuk memicu UI/notifikasi secara instan (tanpa disimpan ke DB).
    2.  **Channel Aggregated (Tiap 1 menit):** Mengirim event `py-minute-summary` berisi rekap statistik komprehensif (rata-rata blink, persentase durasi dekat/jauh, skor kesehatan). Data inilah yang menjadi **Single Source of Truth yang disimpan ke MongoDB**.

---

## 5. Identitas Unik Perangkat (`robot_id` vs `robotIp`)
*   **Masalah:** `robotIp` (seperti `192.168.1.100`) adalah IP lokal di balik NAT jaringan Wi-Fi. Beberapa perangkat ESP32 di jaringan Wi-Fi yang berbeda bisa memiliki IP lokal yang sama, sehingga IP tidak valid jika dijadikan *identifier* unik.
*   **Keputusan:** **`robotId` (Unique Hardware ID / MAC ID)** disepakati sebagai *primary identifier* tunggal di seluruh layer (ML Server, Backend DB, Socket Room, Frontend Dashboard, dan Bruno Testing).
*   **Room Socket.io:** Backend memasukkan koneksi Frontend ke dalam Room khusus (`robot:{robot_id}`). Dengan demikian, pengguna hanya menerima pembaruan data dari `robot_id` miliknya sendiri.

---

## 6. Dual-Transport ML Server & Standardisasi Bruno API Testing
*   **Dukungan Dual-Transport di ML Server:**
    *   **WebSocket Stream:** Jalur utama pengiriman frame 15-20fps dari ESP32-CAM.
    *   **HTTP REST POST (`POST /api/frame` & `POST /api/summary/trigger`):** Disediakan pada Flask ML Server untuk memfasilitasi pengujian REST API, cURL, serta perangkat IoT legacy. Endpoint `POST /api/frame` mendukung payload JSON Base64 maupun Multipart Form-Data (dengan dukungan auto-synthetic frame jika binary kosong).
*   **Native Bruno API Collection:** Dibuat folder [`docs/bruno`](file:///Users/mrfrog/Documents/Lomba/PKM/docs/bruno) yang mencakup suite pengujian **GET, POST, PUT, DELETE** lengkap untuk BE, ML, dan FE.
*   **Production Environment Default:** Menggunakan environment [`Production.bru`](file:///Users/mrfrog/Documents/Lomba/PKM/docs/bruno/environments/Production.bru) (`https://be-socasob.hallojanu.xyz`, `https://socasob-ml.hallojanu.xyz`, `https://socasob.hallojanu.xyz`).

---

## 🎯 Kesimpulan Alur (End-to-End)
1.  **Robot (ESP32)** ➜ (via *WebSocket* / *HTTP POST*) ➜ Kirim `frame`, `robot_id`, dan `distance_json`.
2.  **ML (Flask)** ➜ Terima frame, analisa *blink rate*, gabungkan dengan `distance_json`.
3.  **ML (Flask)** ➜ (via *Socket.io Client*) ➜ *Push* data Real-time (tiap frame ke UI) & Rekap Data (tiap 1 menit) ke Backend.
4.  **Backend (Node.js)** ➜ Simpan rekap bulanan/harian ke MongoDB berdasarkan `robotId`, lalu alirkan data ke Room Socket.io `robot:{robot_id}`.
5.  **Frontend (Next.js)** ➜ User input `robot_id` manual, masuk ke Room, tampilkan *timer*, metrik, dan peringatan secara *live*.

*Dokumen ini diperbarui secara berkala sebagai pedoman kesepakatan arsitektur dan teknis sistem SocaSob.*
