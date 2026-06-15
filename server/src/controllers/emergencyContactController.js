import { EmergencyContact } from '../models/EmergencyContact.js';
import { Patient } from '../models/Patient.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function getPatient(req) {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);
  return patient;
}

export const listContacts = asyncHandler(async (req, res) => {
  const patient = await getPatient(req);
  const contacts = await EmergencyContact.find({ patient: patient._id }).sort('-isPrimary -createdAt');
  res.json({ success: true, data: contacts });
});

export const createContact = asyncHandler(async (req, res) => {
  const patient = await getPatient(req);
  const { name, phone, relationship, isPrimary, notifyOnSOS } = req.body;
  if (!name?.trim() || !phone?.trim()) throw new AppError('Name and phone are required', 400);

  if (isPrimary) {
    await EmergencyContact.updateMany({ patient: patient._id }, { isPrimary: false });
  }

  const contact = await EmergencyContact.create({
    patient: patient._id,
    name: name.trim(),
    phone: phone.trim(),
    relationship: relationship || 'Family',
    isPrimary: !!isPrimary,
    notifyOnSOS: notifyOnSOS !== false,
  });

  res.status(201).json({ success: true, data: contact });
});

export const updateContact = asyncHandler(async (req, res) => {
  const patient = await getPatient(req);
  const contact = await EmergencyContact.findOne({ _id: req.params.id, patient: patient._id });
  if (!contact) throw new AppError('Contact not found', 404);

  const { name, phone, relationship, isPrimary, notifyOnSOS } = req.body;
  if (name) contact.name = name.trim();
  if (phone) contact.phone = phone.trim();
  if (relationship) contact.relationship = relationship;
  if (notifyOnSOS !== undefined) contact.notifyOnSOS = notifyOnSOS;
  if (isPrimary) {
    await EmergencyContact.updateMany({ patient: patient._id }, { isPrimary: false });
    contact.isPrimary = true;
  }
  await contact.save();

  res.json({ success: true, data: contact });
});

export const deleteContact = asyncHandler(async (req, res) => {
  const patient = await getPatient(req);
  const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, patient: patient._id });
  if (!contact) throw new AppError('Contact not found', 404);
  res.json({ success: true, message: 'Contact deleted' });
});
