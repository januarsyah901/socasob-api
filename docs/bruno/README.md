# 🐶 Panduan Pengujian API SocaSob dengan Bruno

Folder ini merupakan **Native Bruno Collection** yang mencakup pengujian komprehensif seluruh endpoint **HTTP REST (GET, POST, PUT, DELETE)** untuk **Backend Server**, **ML Server**, **Admin Management**, **Auth & User Profile**, **Web Push Notification**, dan **Frontend Server**.

---

## 📂 Struktur Folder Koleksi Bruno

```
docs/bruno/
├── bruno.json                              # Konfigurasi Utama Koleksi Bruno
├── environments/
│   ├── Production.bru                     # Env Utama: Live Cloud (hallojanu.xyz)
│   ├── Localhost.bru                      # Env: Localhost (FE:3000, BE:3001, ML:5000)
│   └── Docker-Local.bru                   # Env: Docker Container Local
├── 1. Health & System Status/
│   ├── Backend Health Check.bru            # GET {{baseUrl}}/health
│   ├── Frontend Health Check.bru           # GET {{feUrl}}/health
│   ├── Get Robot Device Status.bru         # GET {{baseUrl}}/api/robot/status
│   ├── Get Robot System Health.bru         # GET {{baseUrl}}/api/robot/health
│   ├── Connect Robot Device.bru            # POST {{baseUrl}}/api/robot/connect
│   └── Trigger Robot Test Alert.bru        # POST {{baseUrl}}/api/robot/alert
├── 2. Auth & Profile API/
│   ├── 1. Register User (POST).bru         # POST {{baseUrl}}/api/auth/register
│   ├── 2. Login User (POST).bru            # POST {{baseUrl}}/api/auth/login (Auto-sets {{authToken}})
│   ├── 3. Get Logged In User Profile.bru   # GET {{baseUrl}}/api/auth/me
│   ├── 4. Update User Profile.bru          # PUT {{baseUrl}}/api/auth/profile
│   ├── 5. Pair Robot via Serial.bru        # POST {{baseUrl}}/api/auth/pair-robot
│   └── 6. Unpair Robot.bru                 # DELETE {{baseUrl}}/api/auth/unpair-robot
├── 3. Robot Management API/
│   ├── 1. Get All Robots (GET).bru         # GET {{baseUrl}}/api/robots
│   ├── 2. Register Robot (POST).bru        # POST {{baseUrl}}/api/robots
│   ├── 3. Validate Robot ID (GET).bru      # GET {{baseUrl}}/api/robots/validate/:robotId
│   ├── 4. Get Robot Detail (GET).bru       # GET {{baseUrl}}/api/robots/:robotId
│   ├── 5. Update Robot (PUT).bru           # PUT {{baseUrl}}/api/robots/:robotId
│   └── 6. Delete Robot (DELETE).bru        # DELETE {{baseUrl}}/api/robots/:robotId
├── 4. Settings API/
│   ├── Get User Settings (GET).bru         # GET {{baseUrl}}/api/settings
│   ├── Update User Settings (POST).bru     # POST {{baseUrl}}/api/settings
│   └── Update User Settings (PUT).bru      # PUT {{baseUrl}}/api/settings
├── 5. Log & Analytics API/
│   ├── Get Today Log.bru                   # GET {{baseUrl}}/api/log/today
│   ├── Get Weekly Logs.bru                 # GET {{baseUrl}}/api/log/weekly
│   ├── Get Specific Date Log.bru           # GET {{baseUrl}}/api/log/:date
│   ├── Get 6-Month Resume Analytics.bru    # GET {{baseUrl}}/api/resume
│   ├── Record Micro Break (POST).bru       # POST {{baseUrl}}/api/log/break
│   ├── Create Manual Log Entry (POST).bru  # POST {{baseUrl}}/api/log/manual
│   ├── Delete Specific Date Log (DELETE).bru # DELETE {{baseUrl}}/api/log/:date
│   └── Reset All Daily Logs (DELETE).bru   # DELETE {{baseUrl}}/api/log
├── 6. Reports API/
│   ├── Get All Medical Reports (GET).bru   # GET {{baseUrl}}/api/reports
│   ├── Generate Medical Report (POST).bru  # POST {{baseUrl}}/api/reports
│   ├── Get Medical Report by ID (GET).bru  # GET {{baseUrl}}/api/reports/:id
│   └── Delete Medical Report (DELETE).bru  # DELETE {{baseUrl}}/api/reports/:id
├── 7. Companion API/
│   ├── Get All Conversations (GET).bru     # GET {{baseUrl}}/api/companion/conversations
│   ├── Get Conversation Detail (GET).bru   # GET {{baseUrl}}/api/companion/conversations/:id
│   ├── Send Companion Chat Message.bru     # POST {{baseUrl}}/api/companion/chat
│   └── Delete Conversation (DELETE).bru    # DELETE {{baseUrl}}/api/companion/conversations/:id
├── 8. Web Push API/
│   ├── 1. Subscribe Web Push (POST).bru    # POST {{baseUrl}}/api/push/subscribe
│   ├── 2. Send Web Push (POST).bru         # POST {{baseUrl}}/api/push/send
│   └── 3. Test Delayed Web Push (POST).bru # POST {{baseUrl}}/api/push/test-delay
├── 9. ML Server/
│   ├── 1. ML Server Health Check (GET).bru # GET {{mlUrl}}/health
│   ├── 2. Get ML Config (GET).bru          # GET {{mlUrl}}/api/config
│   ├── 3. Update ML Config (POST).bru      # POST {{mlUrl}}/api/config
│   ├── 4. Get Pipeline Status (GET).bru    # GET {{mlUrl}}/api/pipeline/status
│   ├── 5. Get Latest Extracted Features.bru # GET {{mlUrl}}/api/features
│   ├── 6. Send Frame Base64-JSON (POST).bru # POST {{mlUrl}}/api/frame
│   ├── 7. Send Frame Multipart-Form (POST).bru # POST {{mlUrl}}/api/frame
│   └── 8. Trigger Minute Summary (POST).bru # POST {{mlUrl}}/api/summary/trigger
└── 10. Admin API/
    ├── 1. Get Admin System Stats (GET).bru # GET {{baseUrl}}/api/admin/stats
    ├── 2. Get All Users (GET).bru          # GET {{baseUrl}}/api/admin/users
    ├── 3. Get User Detail (GET).bru        # GET {{baseUrl}}/api/admin/users/:id
    ├── 4. Update User (PUT).bru            # PUT {{baseUrl}}/api/admin/users/:id
    ├── 5. Change User Role (PUT).bru       # PUT {{baseUrl}}/api/admin/users/:id/role
    ├── 6. Delete User (DELETE).bru         # DELETE {{baseUrl}}/api/admin/users/:id
    ├── 7. Get All Admin Robots (GET).bru   # GET {{baseUrl}}/api/admin/robots
    ├── 8. Create Robot (POST).bru          # POST {{baseUrl}}/api/admin/robots
    ├── 9. Unpair Robot (PUT).bru           # PUT {{baseUrl}}/api/admin/robots/:robotId/unpair
    ├── 10. Update Robot Detail (PUT).bru   # PUT {{baseUrl}}/api/admin/robots/:robotId
    ├── 11. Delete Admin Robot (DELETE).bru # DELETE {{baseUrl}}/api/admin/robots/:robotId
    ├── 12. Get ML Config via Proxy.bru     # GET {{baseUrl}}/api/admin/ml-config
    └── 13. Update ML Config via Proxy.bru  # POST {{baseUrl}}/api/admin/ml-config
```

---

## 🔑 Fitur Otomatisasi JWT Token (`authToken`)

Request yang membutuhkan autentikasi (Auth Profile, Settings, Companion Chat, Admin Dashboard) telah dikonfigurasi menggunakan **Bearer Token** `{{authToken}}`.

* Saat eksekusi `2. Auth & Profile API / 2. Login User (POST)`, script `post-response` Bruno secara otomatis menangkap token JWT dari response body dan menyimpannya ke variabel `authToken`.
* Semua request terproteksi akan langsung terotorisasi secara otomatis!

---

## 🌐 Parameter Environment

| Variabel | Deskripsi | Default Localhost |
|---|---|---|
| `baseUrl` | Endpoint utama Backend Node.js Express | `http://localhost:3001` |
| `mlUrl` | Endpoint ML Server Python Flask | `http://localhost:5000` |
| `feUrl` | Endpoint Frontend Next.js / React | `http://localhost:3000` |
| `robotId` | ID Unik Robot ESP32-CAM | `fadfa566` |
| `robotIp` | Alamat IP Perangkat Robot | `192.168.1.100` |
| `testDate` | Tanggal Pengujian Format YYYY-MM-DD | `2026-08-22` |
| `authToken` | Token Bearer JWT Otomatis dari Login | `(Diisi otomatis via Login)` |

---

## 🚀 Cara Penggunaan di Bruno

1. Buka aplikasi **Bruno**.
2. Pilih **"Open Collection"** dan arahkan ke folder `docs/bruno`.
3. Di pojok kanan atas aplikasi Bruno, pilih Environment (`Localhost`, `Docker-Local`, atau `Production`).
4. Jalankan `2. Auth & Profile API -> 2. Login User` terlebih dahulu agar `authToken` terisi otomatis.
5. Anda dapat menguji request secara individual atau mengeksekusi seluruh koleksi menggunakan tombol **Run Collection**!
