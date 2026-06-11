import PDFDocument from 'pdfkit';
import { uploadFile } from './uploadService.js';

export const generatePrescriptionPDF = async (prescription, doctor, patient, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const url = await uploadFile(buffer, `prescription-${prescription._id}.pdf`, 'prescriptions');
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });
    doc.on('error', reject);

    doc.fontSize(20).text('E-Prescription', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Doctor: Dr. ${user?.firstName} ${user?.lastName}`);
    doc.text(`Specialization: ${doctor.specialization}`);
    doc.text(`License: ${doctor.licenseNumber}`);
    doc.moveDown();
    doc.text(`Patient ID: ${patient._id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    if (prescription.diagnosis) {
      doc.text(`Diagnosis: ${prescription.diagnosis}`);
      doc.moveDown();
    }
    doc.text('Medications:');
    prescription.medications.forEach((med, i) => {
      doc.text(`${i + 1}. ${med.name} - ${med.dosage || ''} - ${med.frequency || ''} - ${med.duration || ''}`);
      if (med.instructions) doc.text(`   Instructions: ${med.instructions}`);
    });
    if (prescription.notes) {
      doc.moveDown();
      doc.text(`Notes: ${prescription.notes}`);
    }
    doc.end();
  });
};
