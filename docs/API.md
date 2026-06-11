# API Documentation

Base URL: `http://localhost:5000/api` (development)

All protected routes require: `Authorization: Bearer <accessToken>`

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register patient/doctor |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user + profile |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset password |
| PATCH | `/auth/password` | Update password |

## Doctors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/doctors` | Public | List doctors (filter, search, paginate) |
| GET | `/doctors/:id` | Public | Doctor details + reviews |
| GET | `/doctors/:id/slots?date=YYYY-MM-DD` | Public | Available time slots |
| PATCH | `/doctors/profile/me` | Doctor | Update profile |
| POST | `/doctors` | Admin | Create doctor |
| PATCH | `/doctors/:id` | Admin | Update doctor |
| PATCH | `/doctors/:id/verify` | Admin | Verify doctor |

**Query params:** `page`, `limit`, `sort`, `search`, `specialization`, `minExperience`, `minRating`, `department`

## Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | List (role-filtered) |
| GET | `/appointments/:id` | Get one |
| POST | `/appointments` | Book appointment |
| PATCH | `/appointments/:id` | Update status/schedule |
| POST | `/appointments/:id/cancel` | Cancel |

## Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/patients/profile/me` | Patient | Get profile |
| PATCH | `/patients/profile/me` | Patient | Update profile |
| GET | `/patients` | Admin/Doctor | List patients |
| GET | `/patients/:id` | Admin/Doctor | Patient details |

## Medical Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/records/upload` | Upload file (multipart) |
| GET | `/records/patient/:patientId` | List records |
| GET | `/records/:id` | Get record |
| POST | `/records/:id/share` | Share with doctor |
| DELETE | `/records/:id` | Delete record |

## Prescriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/prescriptions` | All | List prescriptions |
| GET | `/prescriptions/:id` | All | Get prescription |
| POST | `/prescriptions` | Doctor | Create e-prescription |

## Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews/doctor/:doctorId` | Doctor reviews |
| POST | `/reviews` | Create review (patient) |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat` | List chats |
| POST | `/chat` | Create/get chat |
| GET | `/chat/:chatId/messages` | Get messages |
| POST | `/chat/:chatId/messages` | Send message |

## AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Send message |
| POST | `/ai/suggest-doctors` | Symptom-based doctor suggestions |
| GET | `/ai/conversations` | List conversations |
| GET | `/ai/conversations/:id` | Get conversation |
| DELETE | `/ai/conversations/:id` | Delete conversation |

## Analytics (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/admin/dashboard` | Admin dashboard stats |
| GET | `/analytics/doctor` | Doctor analytics |
| GET | `/analytics/doctors/performance` | Top doctors |
| GET | `/analytics/logs/activity` | Activity logs |
| GET | `/analytics/logs/errors` | Error logs |

## Departments & Hospitals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments` | List departments |
| POST/PATCH/DELETE | `/departments/:id` | Admin CRUD |
| GET | `/hospitals` | List hospitals |
| GET | `/hospitals/nearby?lat=&lng=` | Nearby hospitals |
| POST | `/hospitals/emergency` | Emergency request |

## Response Format

```json
{
  "success": true,
  "data": {},
  "pagination": { "page": 1, "limit": 10, "total": 100 }
}
```

## Error Format

```json
{
  "success": false,
  "message": "Error description"
}
```
