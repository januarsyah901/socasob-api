# 📊 Diagram Arsitektur & Alur Data Final SocaSob

Berikut adalah visualisasi arsitektur dan alur data dari sistem SocaSob berdasarkan keputusan final.

---

## 1. Diagram Arsitektur Sistem (System Architecture)

Diagram ini menunjukkan bagaimana setiap komponen saling terhubung dan protokol apa yang digunakan.

```mermaid
graph TD
    subgraph IoT Device
        R[Robot ESP32-CAM]
    end

    subgraph AI / Computer Vision
        ML[Flask ML Server<br/>WS Server + Socket.io Client]
    end

    subgraph Backend Server
        BE[Node.js Server<br/>Socket.io Server]
        DB[(MongoDB)]
    end

    subgraph User Interface
        FE[Next.js Dashboard]
    end

    %% Koneksi dan Aliran Data
    R -- "WebSocket (Tiap frame)<br/>{robot_id, frame, distance_json}" --> ML
    ML -- "Socket.io (Tiap frame)<br/>py-eye-detection" --> BE
    ML -- "Socket.io (Tiap 1 menit)<br/>py-minute-summary" --> BE
    BE -- "Simpan Data<br/>Tiap 1 menit" --> DB
    FE -- "Subscribe Room<br/>robot:{robot_id}" --> BE
    BE -- "Socket.io (Tiap frame)<br/>eye-distance" --> FE
    BE -- "Socket.io (Tiap 5 dtk)<br/>eye-status" --> FE
    BE -- "Socket.io (Tiap 1 mnt)<br/>minute-summary" --> FE

    %% Styling
    style R fill:#ff9999,stroke:#333,stroke-width:2px
    style ML fill:#99ccff,stroke:#333,stroke-width:2px
    style BE fill:#99ff99,stroke:#333,stroke-width:2px
    style DB fill:#ffff99,stroke:#333,stroke-width:2px
    style FE fill:#ffcc99,stroke:#333,stroke-width:2px
```

---

## 2. Diagram Urutan (Sequence Diagram)

Diagram ini menunjukkan urutan waktu kapan data dikirim dari satu titik ke titik lainnya, terbagi menjadi siklus frame (real-time) dan siklus menit (agregasi).

```mermaid
sequenceDiagram
    autonumber
    participant R as Robot (ESP32-CAM)
    participant ML as ML Server (Flask)
    participant BE as Backend (Node.js)
    participant DB as MongoDB
    participant FE as Frontend (Next.js)

    Note over R, FE: FASE INISIALISASI
    FE->>BE: User input robot_id & join room "robot:{robot_id}"
    R->>ML: Connect WebSocket (ws://ml-server)
    ML->>BE: Connect Socket.io (sebagai client)

    Note over R, FE: FASE REAL-TIME (Tiap Frame / 15-20fps)
    R->>ML: WS Send: {robot_id, frame, distance_json}
    ML->>ML: Analisa Frame (Deteksi Kedipan, EAR)
    ML->>BE: Emit 'py-eye-detection' (robot_id, distance, blink_event)
    BE->>FE: Emit 'eye-distance' (ke room robot_id spesifik)

    Note over BE, FE: SIKLUS INTERNAL BACKEND
    BE->>FE: Emit 'timer-update' (Tiap 1 detik)
    BE->>FE: Emit 'eye-status' (Tiap 5 detik)

    Note over ML, FE: FASE AGREGASI (Tiap 1 Menit)
    ML->>ML: Kalkulasi Summary 1 Menit (Durasi, Blink Rate, dll)
    ML->>BE: Emit 'py-minute-summary' (Full JSON summary)
    BE->>DB: Save data agregat ke database
    BE->>FE: Emit 'minute-summary' (ke room robot_id spesifik)
```
