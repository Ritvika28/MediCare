import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { APIFeatures } from '../utils/apiFeatures.js';
import { notifyAppointmentUpdate, createNotification } from '../services/notificationService.js';
import { sendAppointmentReminder } from '../services/emailService.js';
import { syncDoctorQueue } from '../services/queueService.js';

const populateAppointment = (query) =>
  query
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone avatar' } })
    .populate({ path: 'doctor', populate: [{ path: 'user', select: 'firstName lastName' }, { path: 'department', select: 'name' }] })
    .populate('hospital', 'name phone address')
    .populate('department', 'name');

export const createAppointment = asyncHandler(async (req, res) => {
  if (req.user.role === 'patient') {
    throw new AppError('Online appointment booking is disabled. View doctor profiles to find contact details.', 403);
  }
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  const doctor = await Doctor.findById(req.body.doctorId);
  if (!doctor || !doctor.isVerified) throw new AppError('Doctor not available', 400);

  const scheduledAt = new Date(req.body.scheduledAt || req.body.appointmentDate);
  const conflict = await Appointment.findOne({
    doctor: doctor._id,
    scheduledAt,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) throw new AppError('Time slot not available', 400);

  let type = req.body.type || 'physical';
  if (type === 'regular') type = 'physical';
  if (req.body.isEmergency) type = 'physical';

  const hospitalId = req.body.hospitalId || doctor.hospitalId || doctor.hospital;
  const departmentId = req.body.departmentId || doctor.departmentId || doctor.department;



  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    hospital: hospitalId,
    hospitalId,
    department: departmentId,
    departmentId,
    scheduledAt,
    appointmentDate: scheduledAt,
    reason: req.body.reason,
    symptoms: req.body.symptoms,
    type,
    isEmergency: req.body.isEmergency || false,
    duration: doctor.averageConsultationTime || 30,
    endAt: new Date(scheduledAt.getTime() + (doctor.averageConsultationTime || 30) * 60000),
  });



  await syncDoctorQueue(doctor._id);

  const doctorUser = await User.findById((await Doctor.findById(doctor._id).populate('user')).user._id);
  await createNotification({
    userId: doctorUser._id,
    type: 'appointment_confirmed',
    title: 'New Appointment Request',
    message: `New appointment request for ${scheduledAt.toLocaleString()}`,
    data: { appointmentId: appointment._id },
    link: '/doctor/appointments',
  });

  res.status(201).json({ success: true, data: await populateAppointment(Appointment.findById(appointment._id)) });
});

export const getAppointments = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    filter.patient = patient?._id;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id });
    filter.doctor = doctor?._id;
  }

  if (req.query.status) filter.status = req.query.status;

  const features = new APIFeatures(populateAppointment(Appointment.find(filter)), req.query).sort().paginate();
  const appointments = await features.query;
  const total = await Appointment.countDocuments(filter);

  res.json({ success: true, data: appointments, pagination: { page: features.page, limit: features.limit, total } });
});

export const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await populateAppointment(Appointment.findById(req.params.id));
  if (!appointment) throw new AppError('Appointment not found', 404);
  res.json({ success: true, data: appointment });
});

export const updateAppointment = asyncHandler(async (req, res) => {
  let appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new AppError('Appointment not found', 404);

  if (req.body.scheduledAt) {
    appointment.scheduledAt = new Date(req.body.scheduledAt);
    appointment.endAt = new Date(appointment.scheduledAt.getTime() + appointment.duration * 60000);
  }

  if (req.body.status) {
    const oldStatus = appointment.status;
    appointment.status = req.body.status;
    if (req.body.cancellationReason) appointment.cancellationReason = req.body.cancellationReason;
    if (req.body.notes) appointment.notes = req.body.notes;

    if (oldStatus !== req.body.status) {
      const populated = await appointment.populate([
        { path: 'patient', populate: 'user' },
        { path: 'doctor', populate: 'user' },
      ]);
      await notifyAppointmentUpdate(populated.patient.user._id, appointment, req.body.status);
      if (req.body.status === 'confirmed') {
        await sendAppointmentReminder(populated.patient.user, appointment);
      }
    }
  }

  await appointment.save();
  res.json({ success: true, data: await populateAppointment(Appointment.findById(appointment._id)) });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  req.body = { status: 'cancelled', cancellationReason: req.body.reason };
  return updateAppointment(req, res);
});

import PDFDocument from 'pdfkit';

export const downloadAppointmentPDF = asyncHandler(async (req, res) => {
  const appointment = await populateAppointment(Appointment.findById(req.params.id));
  if (!appointment) throw new AppError('Appointment not found', 404);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=booking-${appointment._id}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // Styled PDF Confirmation
  doc.rect(0, 0, 612, 120).fill('#0f766e');

  doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('MEDICARE CLINICS', 50, 40);
  doc.fontSize(10).font('Helvetica').text('Premium Healthcare Network', 50, 70);

  doc.fillColor('#334155').fontSize(16).font('Helvetica-Bold').text('APPOINTMENT CONFIRMATION', 50, 150);
  doc.rect(50, 175, 512, 2).fill('#cbd5e1');

  doc.fillColor('#334155').fontSize(11).font('Helvetica');
  doc.text(`Booking Reference:`, 50, 200).font('Helvetica-Bold').text(`${appointment._id}`, 180, 200);
  doc.font('Helvetica').text(`Booking Date & Time:`, 50, 220).font('Helvetica-Bold').text(`${new Date(appointment.scheduledAt).toLocaleString()}`, 180, 220);
  doc.font('Helvetica').text(`Consultation Type:`, 50, 240).font('Helvetica-Bold').text(`${appointment.type.toUpperCase()}`, 180, 240);
  doc.font('Helvetica').text(`Status:`, 50, 260).font('Helvetica-Bold').text(`${appointment.status.toUpperCase()}`, 180, 260);

  doc.rect(50, 290, 512, 1).fill('#e2e8f0');

  // Doctor Details
  doc.fillColor('#0f766e').fontSize(13).font('Helvetica-Bold').text('DOCTOR INFORMATION', 50, 310);
  doc.fillColor('#334155').fontSize(11).font('Helvetica');
  doc.text(`Doctor Name:`, 50, 335).font('Helvetica-Bold').text(`Dr. ${appointment.doctor?.user?.firstName || ''} ${appointment.doctor?.user?.lastName || ''}`, 180, 335);
  doc.font('Helvetica').text(`Specialty:`, 50, 355).font('Helvetica-Bold').text(`${appointment.doctor?.specialization || 'General'}`, 180, 355);

  // Clinic Details
  doc.fillColor('#0f766e').fontSize(13).font('Helvetica-Bold').text('CLINIC / HOSPITAL DETAILS', 50, 390);
  doc.fillColor('#334155').fontSize(11).font('Helvetica');
  doc.text(`Hospital Name:`, 50, 415).font('Helvetica-Bold').text(`${appointment.hospital?.name || 'MediCare Center'}`, 180, 415);
  doc.font('Helvetica').text(`Address:`, 50, 435).font('Helvetica-Bold').text(`${appointment.hospital?.address?.street || ''}, ${appointment.hospital?.address?.city || ''}`, 180, 435);
  if (appointment.hospital?.phone) {
    doc.font('Helvetica').text(`Hospital Contact:`, 50, 455).font('Helvetica-Bold').text(`${appointment.hospital.phone}`, 180, 455);
  }

  doc.rect(50, 490, 512, 1).fill('#e2e8f0');

  // Patient Details
  doc.fillColor('#0f766e').fontSize(13).font('Helvetica-Bold').text('PATIENT INFORMATION', 50, 510);
  doc.fillColor('#334155').fontSize(11).font('Helvetica');
  doc.text(`Patient Name:`, 50, 535).font('Helvetica-Bold').text(`${appointment.patient?.user?.firstName || ''} ${appointment.patient?.user?.lastName || ''}`, 180, 535);
  if (appointment.reason) {
    doc.font('Helvetica').text(`Reason for Visit:`, 50, 555).font('Helvetica-Bold').text(`${appointment.reason}`, 180, 555);
  }

  // Footer / Disclaimer
  doc.rect(50, 680, 512, 1).fill('#cbd5e1');
  doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique')
     .text('Please arrive 15 minutes prior to your scheduled time. In case of cancellation or reschedule, contact the hospital directly.', 50, 700, { align: 'center', width: 512 });

  doc.end();
});
