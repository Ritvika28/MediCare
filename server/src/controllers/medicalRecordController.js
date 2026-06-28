import { MedicalRecord } from '../models/MedicalRecord.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { performOCR, analyzeReportText } from '../services/ocrService.js';
import { cloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';

export const uploadRecord = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File required', 400);

  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw new AppError('Patient profile not found', 404);

  let fileUrl = '';

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'medical-records',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    fileUrl = uploadResult.secure_url;
    console.log('[Cloudinary] Successfully uploaded file, URL:', fileUrl);
  } catch (cloudinaryError) {
    console.warn('[Cloudinary] Upload failed/offline. Falling back to local storage:', cloudinaryError.message);
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'application/pdf' ? '.pdf' : '.png');
      const filename = `${req.file.fieldname}-${uniqueSuffix}${ext}`;
      
      const uploadDir = path.join(process.cwd(), 'uploads/medical-records');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), req.file.buffer);
      
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/medical-records/${filename}`;
      console.log('[Local Upload] Successfully saved file locally, URL:', fileUrl);
    } catch (localWriteError) {
      console.error('[Local Upload Error] Failed to write file locally:', localWriteError);
      throw new AppError(`File storage failed: ${localWriteError.message}`, 500);
    }
  }

  // Trigger OCR extraction & Gemini structured analysis
  const recordType = req.body.recordType || 'other';
  let extractedText = '';
  let insights = {};
  try {
    extractedText = await performOCR(req.file.buffer, req.file.mimetype);
    insights = await analyzeReportText(extractedText, recordType);
  } catch (ocrErr) {
    console.error('[Upload] OCR/Analysis failed, saving record without AI insights:', ocrErr.message);
    extractedText = '';
    insights = { summary: 'AI analysis could not be performed. The file has been securely stored.' };
  }

  const tags = req.body.tags
    ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  let detectedMedicines = req.body.detectedMedicines
    ? (Array.isArray(req.body.detectedMedicines) ? req.body.detectedMedicines : req.body.detectedMedicines.split(',').map(m => m.trim()).filter(Boolean))
    : [];

  let doctor = req.body.doctor || '';
  let hospital = req.body.hospital || '';

  if (recordType === 'prescription' && insights) {
    if (!doctor && insights.doctor) doctor = insights.doctor;
    if (!hospital && insights.hospital) hospital = insights.hospital;
    if (insights.medicines && detectedMedicines.length === 0) {
      detectedMedicines = insights.medicines.map(m => m.name);
    }
  } else if (recordType === 'lab_report' && insights) {
    if (!doctor && insights.suggestedSpecialist) {
      doctor = `Consult: ${insights.suggestedSpecialist}`;
    }
  }

  const record = await MedicalRecord.create({
    patient: patient._id,
    uploadedBy: req.user._id,
    title: req.body.title || req.file.originalname,
    description: req.body.description || insights.summary || '',
    recordType,
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    recordDate: req.body.recordDate ? new Date(req.body.recordDate) : new Date(),
    doctor,
    hospital,
    tags,
    detectedMedicines,
    extractedText,
    aiSummary: insights.summary || (recordType === 'prescription' ? 'Auto-extracted prescription medicines.' : ''),
    medicalInsights: insights,
  });

  // Save health metrics automatically to update Health Analytics
  if (insights && Array.isArray(insights.metrics) && insights.metrics.length > 0) {
    try {
      const { saveHealthMetric } = await import('../services/healthMetricService.js');
      for (const m of insights.metrics) {
        if (m.type && m.outputs) {
          await saveHealthMetric({
            userId: req.user._id,
            patientId: patient._id,
            metricType: m.type,
            inputs: m.inputs || { source: 'medical_report', recordId: record._id },
            outputs: m.outputs,
            resultSummary: m.resultSummary || `${m.type} updated from medical report.`,
            historyId: record._id
          });
        }
      }
      
      // Update background predictions/health twin models asynchronously
      const { runMLSuiteForUser } = await import('../services/HealthTwinService.js');
      runMLSuiteForUser(req.user._id).catch(err => {
        console.error('Error running ML predictions suite after report upload:', err);
      });
    } catch (metricErr) {
      console.error('Failed to import or save health metrics from uploaded report:', metricErr);
    }
  }

  res.status(201).json({ success: true, data: record });
});

export const getRecords = asyncHandler(async (req, res) => {
  let patientId = req.params.patientId;

  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    patientId = patient?._id;
  } else if (req.user.role === 'doctor' && patientId) {
    const doctor = await Doctor.findOne({ user: req.user._id });
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
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw new AppError('Record not found', 404);

  if (record.fileUrl) {
    if (record.fileUrl.includes('/uploads/medical-records/')) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filename = record.fileUrl.split('/uploads/medical-records/')[1];
        if (filename) {
          const filepath = path.join(process.cwd(), 'uploads/medical-records', filename);
          await fs.unlink(filepath);
          console.log('[Local Delete] Deleted local file:', filepath);
        }
      } catch (err) {
        console.error('[Local Delete Error] Failed to delete local file:', err.message);
      }
    } else {
      const publicId = getPublicIdFromUrl(record.fileUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
  }

  await record.deleteOne();
  res.json({ success: true, message: 'Record deleted' });
});
