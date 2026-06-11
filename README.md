# AI-Powered Hospital Management System (MediCare)

Enterprise-grade hospital management platform with patient, doctor, and admin portals, AI health assistant, appointments, medical records, prescriptions, real-time chat, and analytics.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, React Router, TanStack Query, Tailwind CSS, ShadCN-style UI, Recharts, Framer Motion |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT + Refresh Tokens, RBAC |
| AI | OpenAI API |
| Storage | Cloudinary |
| Real-time | Socket.io |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# Install all dependencies
npm run install:all

# Configure environment
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env with your MongoDB URI and secrets

# Seed database (optional)
cd server && node src/scripts/seed.js

# Run development servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api

### Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | Admin123!@# |
| Patient | patient@hospital.com | Patient123! |
| Doctor | dr.smith@hospital.com | Doctor123! |

## Project Structure

```
hospital app/
├── client/                 # React frontend
│   └── src/
│       ├── api/            # Axios client
│       ├── components/     # UI & shared components
│       ├── context/        # Auth & Theme
│       ├── layouts/        # Dashboard & Public layouts
│       ├── pages/          # Route pages by role
│       └── routes/         # React Router config
├── server/                 # Express backend
│   └── src/
│       ├── config/         # DB, Cloudinary
│       ├── controllers/    # Route handlers
│       ├── middleware/     # Auth, validation, errors
│       ├── models/         # Mongoose schemas
│       ├── routes/         # API routes
│       ├── services/       # Email, AI, uploads
│       └── validators/     # Zod schemas
└── docs/                   # Architecture & API docs
```

## Features

### Patient
- Sign up / login / password reset
- Book, reschedule, cancel appointments
- Medical records upload & download
- Prescriptions & PDF download
- AI health assistant
- Doctor search & reviews
- Emergency ambulance request
- In-app notifications

### Doctor
- Appointment management (accept/reject/complete)
- Patient list & medical history
- Schedule & time slot management
- E-prescription generation
- Analytics dashboard

### Admin
- System dashboard with analytics
- Doctor verification & management
- Patient management
- Department CRUD
- Hospital room/bed management
- Activity & error logs

## API Documentation

See [docs/API.md](docs/API.md)

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Testing

```bash
cd server && npm test
```

## License

MIT
