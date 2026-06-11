# Database Schema Design

## Entity Relationship Description

```
User (1) ────── (1) Patient
User (1) ────── (1) Doctor
Doctor (N) ──── (1) Department
Doctor (N) ──── (1) Hospital
Patient (1) ─── (N) Appointment ─── (N) Doctor
Patient (1) ─── (N) MedicalRecord
Patient (1) ─── (N) Prescription ─── (N) Doctor
Patient (1) ─── (N) Review ──────── (N) Doctor
Patient (1) ─── (N) EmergencyRequest
Chat (N) ────── (N) User (participants)
Chat (1) ────── (N) Message
User (1) ────── (N) Notification
User (1) ────── (N) AIChatHistory
Hospital (1) ── (N) Room (embedded)
```

## Collections

### User
- Authentication & base profile
- Fields: email, password (hashed), role, firstName, lastName, phone, avatar
- Indexes: email (unique), role

### Patient
- Extended patient profile linked to User
- Fields: dateOfBirth, gender, bloodGroup, address, emergencyContact, allergies, medicalHistory[]

### Doctor
- Professional profile linked to User
- Fields: specialization, licenseNumber, experience, consultationFee, schedule[], blockedDates[], rating, isVerified
- Indexes: specialization, department, rating, isVerified

### Appointment
- Fields: patient, doctor, scheduledAt, status, type, reason, symptoms, isEmergency
- Indexes: patient+scheduledAt, doctor+scheduledAt, status

### Department
- Fields: name, description, headDoctor, floor, isActive

### Prescription
- Fields: patient, doctor, medications[], diagnosis, pdfUrl, status

### MedicalRecord
- Fields: patient, title, recordType, fileUrl, recordDate, sharedWith[]

### Review
- Fields: patient, doctor, rating (1-5), comment

### Notification
- Fields: user, type, title, message, isRead, data, link

### Chat / Message
- Chat: participants[], patient, doctor, lastMessage
- Message: chat, sender, content, isRead

### Hospital
- GeoJSON location for nearby search
- Embedded rooms with bed counts

### EmergencyRequest
- Fields: patient, type, location, status, priority

### ActivityLog
- System audit trail with level (info/warn/error)

### AIChatHistory
- Embedded messages array with role (user/assistant)

## Validation

All schemas use Mongoose validators:
- Required fields
- Enum constraints
- Min/max values
- Unique constraints where applicable
- Timestamps on all collections
