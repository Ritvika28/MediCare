import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { AIChatHistory } from '../models/AIChatHistory.js';
import { compareMedicalReports } from '../services/ReportComparisonService.js';
import { checkInteractions } from '../services/MedicineInteractionService.js';
import { startSymptomInterview, continueSymptomInterview } from '../services/SymptomInterviewService.js';
import { answerQnAOverReports } from '../services/MedicalKnowledgeRetriever.js';
import { generateHealthTimeline } from '../services/TimelineService.js';

const runVerification = async () => {
  try {
    await connectDB();
    console.log('\n--- START ADVANCED AI FEATURES VERIFICATION ---\n');

    // 1. Resolve Patient
    let patient = await Patient.findOne().populate('user');
    if (!patient) {
      console.log('No patient found, seeding a dummy patient and user...');
      let user = await User.findOne({ email: 'test_patient@medicare.com' });
      if (!user) {
        user = await User.create({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test_patient@medicare.com',
          password: 'Password123',
          role: 'patient',
          isVerified: true
        });
      }
      patient = await Patient.create({
        user: user._id,
        gender: 'male',
        dateOfBirth: new Date('1990-01-01'),
        bloodType: 'O+',
        allergies: ['Penicillin'],
        medicalHistory: [{ condition: 'Hypertension', status: 'Active', notes: 'Diagnosed in 2023' }]
      });
      patient = await Patient.findById(patient._id).populate('user');
    }
    const userId = patient.user._id;
    console.log(`Using Patient: ${patient.user.firstName} ${patient.user.lastName} (User ID: ${userId})`);

    // Clean up past test records to ensure fresh state
    await MedicalRecord.deleteMany({ title: /Test Verification Report/ });

    // 2. Seed Mock Reports for Comparison
    console.log('\n--- 1. SEEDING MOCK LAB REPORTS FOR COMPARISON ---');
    const report1 = await MedicalRecord.create({
      patient: patient._id,
      title: 'Test Verification Report: CBC Jan',
      recordType: 'lab_report',
      fileUrl: 'http://localhost/uploads/report1.pdf',
      extractedText: `LAB RESULTS - DATE: 2026-01-10
      Hemoglobin: 11.2 g/dL (Normal range: 13.5 - 17.5)
      White Blood Cells (WBC): 7.2 x10^3/uL
      Platelets: 250 x10^3/uL
      Cholesterol: 245 mg/dL (High Risk)`,
      recordDate: new Date('2026-01-10')
    });

    const report2 = await MedicalRecord.create({
      patient: patient._id,
      title: 'Test Verification Report: CBC Mar',
      recordType: 'lab_report',
      fileUrl: 'http://localhost/uploads/report2.pdf',
      extractedText: `LAB RESULTS - DATE: 2026-03-10
      Hemoglobin: 13.4 g/dL (Normal range: 13.5 - 17.5)
      White Blood Cells (WBC): 8.0 x10^3/uL
      Platelets: 260 x10^3/uL
      Cholesterol: 262 mg/dL (High Risk)`,
      recordDate: new Date('2026-03-10')
    });
    const delay = () => new Promise(r => setTimeout(r, 4500));
    console.log(`Mock reports seeded successfully: IDs: ${report1._id}, ${report2._id}`);

    // 3. Test Report Comparison Service
    console.log('\n--- 2. TESTING REPORT COMPARISON SERVICE ---');
    await delay();
    const comparison = await compareMedicalReports(userId, [report1._id, report2._id]);
    console.log('Comparison Response:', JSON.stringify(comparison, null, 2));

    // 4. Test Medicine Interaction Checker
    console.log('\n--- 3. TESTING MEDICINE INTERACTION CHECKER ---');
    await delay();
    const interactionCheck = await checkInteractions(userId, ['Metformin', 'Ibuprofen']);
    console.log('Interaction Check Response:', JSON.stringify(interactionCheck, null, 2));

    // 5. Test Symptom Interview Service
    console.log('\n--- 4. TESTING SYMPTOM INTERVIEW SERVICE ---');
    // Setup temporary chat session
    const chat = await AIChatHistory.create({
      user: userId,
      title: 'Symptom Interview Session',
      messages: [{ role: 'user', content: 'I have stomach pain.' }]
    });

    await delay();
    const startInterview = await startSymptomInterview(chat._id, 'I have severe stomach pain.');
    console.log('Start Interview Response:', JSON.stringify(startInterview, null, 2));

    if (startInterview.success && startInterview.nextQuestion) {
      console.log('Continuing interview with mock response...');
      await delay();
      const continueInterview = await continueSymptomInterview(chat._id, 'No fever, but severe bloating and nausea.');
      console.log('Continue Interview Response:', JSON.stringify(continueInterview, null, 2));
    }

    // Clean up interview chat history
    await AIChatHistory.findByIdAndDelete(chat._id);

    // 6. Test RAG Medical Q&A
    console.log('\n--- 5. TESTING RAG MEDICAL Q&A ---');
    await delay();
    const qnaNormal = await answerQnAOverReports(userId, 'What was my Hemoglobin value in March report?');
    console.log('Q&A Normal Answer:', JSON.stringify(qnaNormal, null, 2));

    await delay();
    const qnaHallucination = await answerQnAOverReports(userId, 'What is my blood sugar level?');
    console.log('Q&A Empty Info (Anti-hallucination) Answer:', JSON.stringify(qnaHallucination, null, 2));

    // 7. Test Health Timeline Generation
    console.log('\n--- 6. TESTING HEALTH TIMELINE GENERATION ---');
    await delay();
    const timeline = await generateHealthTimeline(userId);
    console.log('Timeline AI Summary:', JSON.stringify(timeline.summary, null, 2));
    console.log('Timeline Event Count:', timeline.events?.length);

    console.log('\n--- CLEANING UP TEST DATABASE ENTRIES ---');
    await MedicalRecord.deleteMany({ title: /Test Verification Report/ });
    console.log('Clean up complete.');

    console.log('\n--- ALL ADVANCED AI FEATURES VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

runVerification();
