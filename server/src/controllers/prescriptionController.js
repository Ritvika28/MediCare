import { Prescription } from '../models/Prescription.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generatePrescriptionPDF } from '../services/prescriptionService.js';
import { createNotification } from '../services/notificationService.js';

export const createPrescription = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw new AppError('Doctor profile not found', 404);

  const prescription = await Prescription.create({
    ...req.body,
    doctor: doctor._id,
  });

  const populated = await prescription.populate([
    { path: 'patient', populate: 'user' },
    { path: 'doctor', populate: 'user' },
  ]);

  const pdfUrl = await generatePrescriptionPDF(prescription, doctor, populated.patient, req.user);
  if (pdfUrl) {
    prescription.pdfUrl = pdfUrl;
    await prescription.save();
  }

  await createNotification({
    userId: populated.patient.user._id,
    type: 'prescription_ready',
    title: 'New Prescription',
    message: 'Your prescription is ready for download.',
    data: { prescriptionId: prescription._id },
    link: '/patient/prescriptions',
  });

  res.status(201).json({ success: true, data: prescription });
});

export const getPrescriptions = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    filter.patient = patient?._id;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    filter.doctor = doctor?._id;
  } else if (req.query.patientId) {
    filter.patient = req.query.patientId;
  }

  const prescriptions = await Prescription.find(filter)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
    .sort('-createdAt');

  res.json({ success: true, data: prescriptions });
});

export const getPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate({ path: 'doctor', populate: 'user' })
    .populate({ path: 'patient', populate: 'user' });
  if (!prescription) throw new AppError('Prescription not found', 404);
  res.json({ success: true, data: prescription });
});
