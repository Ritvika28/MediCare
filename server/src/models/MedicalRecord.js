import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, trim: true },
    description: String,
    recordType: {
      type: String,
      enum: ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'bill', 'insurance', 'vaccination', 'other'],
      default: 'other',
    },
    fileUrl: { type: String, required: true },
    fileName: String,
    fileSize: Number,
    mimeType: String,
    recordDate: Date,
    doctor: { type: String, default: '' },
    hospital: { type: String, default: '' },
    tags: [{ type: String }],
    detectedMedicines: [{ type: String }],
    isShared: { type: Boolean, default: false },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patient: 1, recordDate: -1 });
medicalRecordSchema.index({ recordType: 1 });

export const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
