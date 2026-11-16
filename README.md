# EventSphere Management Platform

Real-time expo and trade show management platform connecting **Organizers (Admin)**, **Exhibitors**, and **Attendees** around an interactive 3D expo hall floor plan, live WebSocket synchronization, analytics dashboard, and offline-capable Progressive Web App (PWA) experience.

---

## 1. Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React, Three.js WebGL 3D Expo Hall & Orbital Dome (`vite` + `vite-plugin-pwa`).
- **Backend**: Node.js + Express (`server.ts`) with Socket.io WebSocket real-time synchronization (`state:sync`, `booth:updated`, `schedule:updated`, `application:updated`, `chat:message`, `notification:new`, `presence:count`).
- **Persistence & Backups**: Atomic JSON storage in `.data/eventsphere-db.json` and `.data/sync-vault.json`, plus automated rotating daily backups in `.data/backups/eventsphere-YYYY-MM-DD.json` (retaining the latest 7 snapshots).
- **Security & Privacy**:
  - Passwords hashed with `bcryptjs` (salt rounds: 10).
  - Stateless JWT bearer authentication (`jsonwebtoken`, 7-day expiry) with server-side RBAC (`requireAuth`, `requireRole`).
  - Explicit GDPR data-processing consent validation during user registration.
  - One-time password reset tokens with 15-minute expiration.

---

## 2. Core Functional Modules

1. **Authentication & RBAC (`/api/auth/*`)**:
   - Registration with role assignment (`attendee` | `exhibitor`) and mandatory GDPR consent.
   - Sign-in, profile editing, and one-time token password reset flow.
   - Demo credentials for evaluation:
     - **Organizer Admin**: `organizer@eventsphere.io` / `ExpoAdmin2026!`
     - **Exhibitor Partner**: `exhibitor@lumina-robotics.io` / `Exhibitor2026!`
     - **Attendee Visitor**: `attendee@eventsphere.io` / `Attendee2026!`
2. **Admin / Organizer Console**:
   - Create, edit, and delete expos (`POST/PUT/DELETE /api/expos`).
   - Review exhibitor applications (`approved` / `rejected` with optional rejection reason).
   - Configure and allocate expo floor booths (`PUT /api/booths/:id`).
   - Publish and edit live sessions with real-time attendee notification broadcasts (`POST/PUT/DELETE /api/sessions`).
   - Manage incoming support and feedback tickets (`PUT /api/feedback/:id`).
3. **Exhibitor Portal**:
   - Submit exhibitor applications and documents (`POST /api/applications`).
   - Atomically reserve or release available floor booths (`POST /api/booths/:id/reserve`, `/release`) with conflict protection (`409 Conflict` against double booking).
   - Customize company profile, brand swatch color, products, staff, website, and contact email (`PUT /api/exhibitors/:id`).
   - Real-time Organizer & Neighbor Booth chat (`POST /api/messages`).
4. **Attendee Hub & 3D Expo Hall**:
   - Interactive Three.js 3D Expo Floor Plan with orbit/pan/zoom controls, booth inspection, and search hotkey (`/`).
   - Browse & filter exhibitors, inspect booth locations, record profile views (`POST /api/exhibitors/:id/view`), and submit inquiries/appointments.
   - Register for expos/sessions and bookmark sessions with automatic reminder notifications.
5. **Analytics, Monitoring & Offline PWA**:
   - Engagement & booth-traffic analytics dashboard with date-range filtering and CSV export.
   - Server health and telemetry endpoints (`GET /api/health`, `GET /api/metrics`).
   - Service worker precaching + cross-device cloud sync backup key vault (`/api/sync/:syncKey`).

---

## 3. Hardware & Software Requirements

- **Runtime**: Node.js `>= 20` (tested on Node 22 LTS)
- **Client Browser**: Modern Chromium, Firefox, or Safari with WebGL 2.0 enabled
- **Ports**: HTTP & WebSocket server on port `3000` (configurable via `PORT`)

---

## 4. API Reference Summary

| Endpoint | Method | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | Public | Liveness & concurrent user check |
| `/api/metrics` | GET | Public | Uptime, avg API latency, error count, backups |
| `/api/state` | GET | Public | Full public snapshot of expos, booths, sessions |
| `/api/auth/register` | POST | Public | Register user with bcrypt + GDPR consent |
| `/api/auth/login` | POST | Public | Authenticate and issue JWT |
| `/api/auth/forgot-password` | POST | Public | Issue 15-min one-time reset token |
| `/api/auth/reset-password` | POST | Public | Complete password reset |
| `/api/auth/profile` | PUT | Auth | Update signed-in user profile |
| `/api/expos` | POST | Admin | Create new expo |
| `/api/expos/:id` | PUT / DELETE | Admin | Update or remove an expo |
| `/api/expos/:id/register` | POST | Auth | Register attendee for an expo |
| `/api/booths/:id` | PUT | Admin | Update booth size, price, status, assignment |
| `/api/booths/:id/reserve` | POST | Auth | Atomically reserve an available booth |
| `/api/booths/:id/release` | POST | Owner/Admin | Release a reserved booth |
| `/api/applications` | POST | Exhibitor/Admin | Submit exhibitor application |
| `/api/applications/:id` | PUT | Admin | Approve or reject exhibitor application |
| `/api/exhibitors/:id` | PUT | Owner/Admin | Update exhibitor showcase & brand color |
| `/api/exhibitors/:id/view` | POST | Public | Increment exhibitor profile view analytics |
| `/api/sessions` | POST | Admin | Create expo session |
| `/api/sessions/:id` | PUT / DELETE | Admin | Update schedule or delete session |
| `/api/sessions/:id/register` | POST | Auth | Toggle session registration |
| `/api/sessions/:id/bookmark` | POST | Auth | Toggle session bookmark & reminder |
| `/api/messages` | POST | Auth | Send real-time message to Organizer/Neighbors |
| `/api/feedback` | POST | Public | Submit support ticket or suggestion |
| `/api/feedback/:id` | PUT | Admin | Resolve or reopen feedback entry |
| `/api/sync/:syncKey` | GET / PUT | Public | Retrieve or save cross-device bookmark backup |

---

## 5. Development, Build & Automated Testing

```bash
# Install dependencies
npm install

# Run full-stack development server (port 3000)
npm run dev

# Type-check & production Vite bundle
npm run lint
npm run build

# Run automated end-to-end API & RBAC test suite
npm test
```
