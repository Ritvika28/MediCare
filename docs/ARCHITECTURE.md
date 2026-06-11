# System Architecture

## Overview

MediCare follows a **3-tier architecture** with clear separation between presentation (React SPA), application (Express API), and data (MongoDB) layers.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)                    │
│  Public Pages │ Patient Dashboard │ Doctor │ Admin │ AI Chat │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                   API SERVER (Express.js)                      │
│  Auth │ RBAC │ Validation │ Rate Limit │ Controllers │ Services│
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   MongoDB Atlas      Cloudinary          OpenAI API
```

## Backend Architecture

### Layered Design

1. **Routes** — HTTP endpoint definitions, middleware chaining
2. **Controllers** — Request/response handling, orchestration
3. **Services** — Business logic (email, AI, PDF, uploads)
4. **Models** — Data persistence with Mongoose
5. **Middleware** — Cross-cutting concerns (auth, validation, logging)

### Authentication Flow

```
Login → JWT Access Token (15m) + Refresh Token (7d, httpOnly cookie)
Request → Bearer token → protect middleware → req.user
401 → Refresh token → New access token → Retry request
```

### Role-Based Access Control

| Role | Access |
|------|--------|
| patient | Own data, book appointments, AI chat |
| doctor | Own patients, appointments, prescriptions |
| admin | Full system management |

## Frontend Architecture

### State Management

- **AuthContext** — User session, login/logout
- **ThemeContext** — Dark/light mode
- **TanStack Query** — Server state, caching, mutations
- **Local Storage** — JWT tokens

### Component Hierarchy

```
App
├── Providers (Query, Theme, Auth, Toast)
└── Router
    ├── PublicLayout → Marketing pages
    └── DashboardLayout (per role)
        └── Feature pages
```

## Database Design (ER Overview)

### Core Entities

- **User** ←1:1→ Patient | Doctor
- **Doctor** →N:1→ Department
- **Appointment** → Patient, Doctor
- **Prescription** → Patient, Doctor, Appointment
- **MedicalRecord** → Patient
- **Review** → Patient, Doctor
- **Chat** → Participants (User), Messages
- **Hospital** → Rooms, GeoLocation (2dsphere)
- **EmergencyRequest** → Patient, Hospital

### Key Indexes

- User: email, role
- Doctor: specialization, rating, isVerified
- Appointment: patient+scheduledAt, doctor+scheduledAt, status
- Hospital: location (2dsphere)
- Notification: user+isRead+createdAt

## Security

- bcrypt password hashing (12 rounds)
- JWT with short-lived access tokens
- express-rate-limit (200 req/15min)
- helmet security headers
- express-mongo-sanitize (NoSQL injection)
- Zod input validation
- CORS with credentials
- File upload type/size restrictions

## Real-time (Socket.io)

- Authenticated via JWT in handshake
- Events: `join_chat`, `send_message`, `new_message`
- Room-based messaging per chat ID

## External Integrations

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Primary database |
| Cloudinary | Avatar, records, prescription PDFs |
| OpenAI | AI health assistant |
| Nodemailer | Password reset, reminders |
| Google Maps | Hospital locator (frontend) |
