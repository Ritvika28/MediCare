import { MedicalRecord } from '../models/MedicalRecord.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadFile } from '../services/uploadService.js';

export const uploadRecord = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File required', 400);

  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const fileUrl = await uploadFile(req.file.buffer, req.file.originalname, 'medical-records');

  const tags = req.body.tags
    ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];
  const detectedMedicines = req.body.detectedMedicines
    ? (Array.isArray(req.body.detectedMedicines) ? req.body.detectedMedicines : req.body.detectedMedicines.split(',').map(m => m.trim()).filter(Boolean))
    : [];

  const record = await MedicalRecord.create({
    patient: patient._id,
    uploadedBy: req.user._id,
    title: req.body.title || req.file.originalname,
    description: req.body.description,
    recordType: req.body.recordType || 'other',
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    recordDate: req.body.recordDate ? new Date(req.body.recordDate) : new Date(),
    doctor: req.body.doctor || '',
    hospital: req.body.hospital || '',
    tags,
    detectedMedicines,
  });

  res.status(201).json({ success: true, data: record });
});

export const getRecords = asyncHandler(async (req, res) => {
  let patientId = req.params.patientId;

  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    patientId = patient?._id;
  } else if (req.user.role === 'doctor' && patientId) {
    const doctor = await Doctor.findOne({ user: req.user._id });
    // Doctor can view assigned patients' records
  }

  const records = await MedicalRecord.find({ patient: patientId }).sort('-recordDate');
  res.json({ success: true, data: records });
});

export const getRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw new AppError('Record not found', 404);
  res.json({ success: true, data: record });
});

export const shareRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw new AppError('Record not found', 404);

  record.isShared = true;
  if (req.body.doctorId) {
    record.sharedWith = [...new Set([...record.sharedWith.map(String), req.body.doctorId])];
  }
  await record.save();
  res.json({ success: true, data: record });
});

export const deleteRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findByIdAndDelete(req.params.id);
  if (!record) throw new AppError('Record not found', 404);
  res.json({ success: true, message: 'Record deleted' });
});
