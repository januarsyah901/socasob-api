# SocaSob Frontend - Documentation Index

Complete guide untuk semua dokumentasi yang tersedia dalam proyek ini.

## 📚 Documentation Guide

### Start Here 👈

**[QUICK_START.md](./QUICK_START.md)** ⚡
- 30 detik untuk mulai development
- Commands dasar
- Quick troubleshooting
- **Baca ini terlebih dahulu jika Anda baru**

---

### Main Documentation

**[PRODUCT_REQUIREMENT_DOCUMENT.md](./PRODUCT_REQUIREMENT_DOCUMENT.md)** 📋
- Product vision & goals
- Functional & Non-functional requirements
- System architecture & data flow
- Integration details & future roadmap
- **Baca untuk memahami kebutuhan & arah produk**

---

**[README.md](./README.md)** 📖
- Overview lengkap proyek
- Feature description
- Tech stack details
- Project structure
- Development setup
- Deployment instructions
- Browser compatibility
- **Baca untuk pemahaman lengkap**

---

### Architecture & Specifications

**[RINGKASAN_DISKUSI_ARSITEKTUR.md](./RINGKASAN_DISKUSI_ARSITEKTUR.md)** 📝
- Ringkasan alur diskusi dan keputusan teknis final
- Keputusan latency, robot_id, dual-transport ML, dan single-source-of-truth DB
- **Baca untuk memahami keputusan arsitektur utama**

**[SPESIFIKASI_ARSITEKTUR_DAN_PAYLOAD.md](./SPESIFIKASI_ARSITEKTUR_DAN_PAYLOAD.md)** 🏗️
- Alur data lengkap & payload detail di setiap hop
- Spesifikasi Channel A (real-time) vs Channel B (aggregated)
- Spesifikasi REST HTTP POST & WebSocket

**[PANDUAN_KONEKSI_ROBOT.md](./PANDUAN_KONEKSI_ROBOT.md)** 🤖
- Panduan integrasi hardware ESP32-CAM ke ML Server & Backend
- Protokol WebSocket (`robot-frame`) dan HTTP POST (`/api/frame`)
- Contoh kode C++ Arduino ESP32-CAM & Python Simulator
- Troubleshooting & security gate registration

**[DIAGRAM_ARSITEKTUR_FINAL.md](./DIAGRAM_ARSITEKTUR_FINAL.md)** 📊
- Diagram arsitektur sistem (System Architecture Mermaid)
- Sequence Diagram urutan komunikasi data

---

### Backend Integration & Testing

**[bruno/README.md](./bruno/README.md)** 🐶
- Panduan koleksi pengujian API otomatis dengan Bruno
- Coverage GET, POST, PUT, DELETE untuk BE, ML, dan FE
- Environment Production (`Production.bru`) & Localhost

**[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** 🔌
- Architecture diagram
- Socket.io events reference
- Example Express server
- REST API integration points
- TypeScript type definitions
- Integration checklist
- **Baca sebelum implement backend**

**[API_SPECIFICATION.md](./API_SPECIFICATION.md)** 📋
- Complete API reference
- All endpoints documented
- Request/response examples
- Socket.io events detail
- Error handling
- Rate limiting info
- Data types & enums
- **Baca untuk API details**

---

### Project Overview

**[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** 📊
- File yang telah dibuat
- Architecture overview
- Key features implemented
- Responsive breakpoints
- Performance optimizations
- Testing status
- Known limitations
- **Baca untuk project status**

---

### Deployment

**[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** 🚀
- Pre-deployment checklist
- Code quality checks
- Testing requirements
- Security checklist
- Step-by-step deployment guides
- Vercel, Docker, Node.js options
- Post-deployment testing
- Troubleshooting guide
- **Baca sebelum deploy ke production**

**[DOKUMEN_DEPLOYMENT_DAN_INTEGRASI.md](./DOKUMEN_DEPLOYMENT_DAN_INTEGRASI.md)** 📋
- Dokumen gabungan lengkap integrasi backend
- Titik integrasi API & Socket.io
- Contoh payload request/response
- Panduan deployment (Vercel, Docker, VPS PM2+Nginx)


---

### Configuration

**[.env.example](./.env.example)** ⚙️
- Environment variables template
- Development setup
- Production setup
- Optional features
- **Copy ke .env.local dan edit**

---

## 📖 How to Use This Documentation

### Scenario 1: Saya baru dengan proyek ini
1. Baca: **QUICK_START.md** (5 menit)
2. Baca: **README.md** (15 menit)
3. Jalankan: `pnpm dev`
4. Explore: Lihat file-file di `app/` dan `components/`

### Scenario 2: Saya ingin integrate dengan backend
1. Baca: **BACKEND_INTEGRATION.md** (10 menit)
2. Baca: **API_SPECIFICATION.md** (20 menit)
3. Follow: Integration checklist
4. Test: Socket.io events

### Scenario 3: Saya ingin deploy ke production
1. Baca: **DEPLOYMENT_CHECKLIST.md** (15 menit)
2. Pilih: Deployment method (Vercel/Docker/Node)
3. Follow: Step-by-step instructions
4. Test: Post-deployment checklist

### Scenario 4: Saya ingin understand architecture
1. Baca: **PROJECT_SUMMARY.md** - Architecture Overview
2. Baca: **README.md** - Component Hierarchy
3. Lihat: `app/`, `components/`, `lib/` folders
4. Check: Code comments dan TypeScript types

---

## 🔍 Quick Navigation

| Need | Read |
|------|------|
| Product Specs / PRD | PRODUCT_REQUIREMENT_DOCUMENT.md |
| Quick setup | QUICK_START.md |
| Full overview | README.md |
| Backend setup | BACKEND_INTEGRATION.md |
| API details | API_SPECIFICATION.md |
| Deployment | DEPLOYMENT_CHECKLIST.md |
| Architecture | PROJECT_SUMMARY.md |
| Environment | .env.example |

---

## 📁 Project Structure

```
socasob-frontend/
├── 📄 QUICK_START.md              ← Start here!
├── 📄 README.md                   ← Main docs
├── 📄 BACKEND_INTEGRATION.md      ← Backend setup
├── 📄 API_SPECIFICATION.md        ← API reference
├── 📄 DEPLOYMENT_CHECKLIST.md     ← Deploy guide
├── 📄 PROJECT_SUMMARY.md          ← Project status
├── 📄 DOCUMENTATION_INDEX.md      ← This file
├── 📄 .env.example                ← Config template
│
├── 📂 app/                        ← Pages & layout
│   ├── page.tsx                   ← Homepage
│   ├── log/page.tsx               ← Log page
│   ├── resume/page.tsx            ← Resume page
│   ├── settings/page.tsx          ← Settings page
│   └── layout.tsx                 ← Root layout
│
├── 📂 components/                 ← Reusable components
│   ├── dashboard-layout.tsx       ← Main layout + sidebar
│   ├── timer-display.tsx          ← Timer component
│   └── eye-metrics.tsx            ← Metrics display
│
├── 📂 lib/                        ← Utilities & services
│   ├── socket-context.tsx         ← Socket.io provider
│   ├── test-socket.ts             ← Testing helpers
│   └── utils.ts                   ← Utility functions
│
└── 📂 public/                     ← Static files
```

---

## 🎯 Feature Overview

### Homepage
- Real-time timer countdown
- Eye distance detection (Dekat/Jauh)
- Eye health status indicator
- Greeting message

**Related files:**
- `app/page.tsx`
- `components/timer-display.tsx`
- `components/eye-metrics.tsx`

### Log Page
- Today's monitoring summary
- Last 7 days history
- Expandable sections
- Status indicators

**Related files:**
- `app/log/page.tsx`

### Resume Page
- 6-month health summary
- Eye health score
- Risk assessments
- Distribution chart

**Related files:**
- `app/resume/page.tsx`

### Settings Page
- Robot/device connection
- Volume control
- Notification toggle
- Settings persistence

**Related files:**
- `app/settings/page.tsx`

### Navigation
- Responsive sidebar
- Mobile hamburger menu
- Active state indicator

**Related files:**
- `components/dashboard-layout.tsx`

---

## 💻 Development Commands

```bash
# Start development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

---

## 🔗 External Resources

### Official Documentation
- [Next.js 16 Docs](https://nextjs.org)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Socket.io Client Docs](https://socket.io/docs/v4/client-api/)
- [TypeScript Docs](https://www.typescriptlang.org)

### Tools & Services
- [Vercel Deployment](https://vercel.com)
- [Docker Documentation](https://docs.docker.com)
- [Nginx Configuration](https://nginx.org)

---

## 🐛 Troubleshooting

**Socket.io not connecting?**
→ See: BACKEND_INTEGRATION.md → Troubleshooting

**Build fails?**
→ See: QUICK_START.md → Common Issues

**Performance issues?**
→ See: DEPLOYMENT_CHECKLIST.md → Post-Deployment

**API integration issues?**
→ See: API_SPECIFICATION.md → Error Responses

---

## 📞 Support

### For Development Issues
- Check console logs: `pnpm dev`
- Use browser DevTools: F12
- Read error messages carefully

### For Backend Integration
- See: BACKEND_INTEGRATION.md
- See: API_SPECIFICATION.md
- Check example server code

### For Deployment Issues
- See: DEPLOYMENT_CHECKLIST.md
- Check logs: `vercel logs` (for Vercel)
- Verify environment variables

---

## ✅ Checklist

### First Time Setup
- [ ] Read QUICK_START.md
- [ ] Run `pnpm install`
- [ ] Copy `.env.example` to `.env.local`
- [ ] Run `pnpm dev`
- [ ] Open http://localhost:3000

### Before Development
- [ ] Read README.md
- [ ] Explore project structure
- [ ] Check TypeScript types
- [ ] Read code comments

### Before Backend Integration
- [ ] Read BACKEND_INTEGRATION.md
- [ ] Read API_SPECIFICATION.md
- [ ] Understand Socket.io events
- [ ] Prepare backend endpoints

### Before Deployment
- [ ] Read DEPLOYMENT_CHECKLIST.md
- [ ] Complete all checks
- [ ] Test thoroughly
- [ ] Setup monitoring

---

## 📈 Project Metrics

| Metric | Value |
|--------|-------|
| Documentation Pages | 7 |
| Component Files | 3 |
| Page Files | 4 |
| TypeScript Types | 15+ |
| CSS Classes | 350+ |
| Lines of Code | 1,200+ |
| Status | Production Ready |

---

## 🎓 Learning Path

1. **Beginner**
   - QUICK_START.md
   - Run `pnpm dev`
   - Explore pages

2. **Intermediate**
   - README.md
   - Understand architecture
   - Modify components

3. **Advanced**
   - BACKEND_INTEGRATION.md
   - Implement backend
   - Deploy to production

---

## 📝 Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| PRODUCT_REQUIREMENT_DOCUMENT.md | 1.0.0 | 2026-07-10 |
| README.md | 1.0.0 | 2026-01-10 |
| BACKEND_INTEGRATION.md | 1.0.0 | 2026-01-10 |
| API_SPECIFICATION.md | 1.0.0 | 2026-01-10 |
| DEPLOYMENT_CHECKLIST.md | 1.0.0 | 2026-01-10 |
| PROJECT_SUMMARY.md | 1.0.0 | 2026-01-10 |
| QUICK_START.md | 1.0.0 | 2026-01-10 |

---

**Documentation Index** v1.0.0
Last Updated: 2026-01-10

Start with: **[QUICK_START.md](./QUICK_START.md)** 🚀
