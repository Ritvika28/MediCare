import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { Department } from '../models/Department.js';
import { Hospital } from '../models/Hospital.js';
import { BedAvailability } from '../models/BedAvailability.js';
import { Schedule } from '../models/Schedule.js';
import { Reminder } from '../models/Reminder.js';
import { BloodBank } from '../models/BloodBank.js';
import { Lab } from '../models/Lab.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';
import {
  generateHospital,
  generateDoctor,
  generateDoctorUser,
  generateLab,
  generateBloodBank,
  DEPT_DETAILS,
  SPECIALIZATIONS,
} from './seedIndianData.js';

const HOSPITAL_COUNT = 100;
const DOCTOR_COUNT = 300;
const LAB_COUNT = 100;
const BLOOD_BANK_COUNT = 100;

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Seeding database with Indian healthcare data...');

  const collections = [
    'users', 'patients', 'doctors', 'departments', 'hospitals', 'bedavailabilities', 'schedules',
    'reminders', 'bloodbanks', 'labs', 'healthassessments', 'healthcalculatorhistories',
  ];
  for (const name of collections) {
    try {
      await mongoose.connection.dropCollection(name);
    } catch {
      /* collection may not exist */
    }
  }

  await User.create({
    email: 'admin@hospital.com',
    password: 'Admin123!@#',
    firstName: 'System',
    lastName: 'Admin',
    role: 'admin',
    isEmailVerified: true,
  });

  // --- Hospitals ---
  const hospitals = [];
  for (let i = 0; i < HOSPITAL_COUNT; i++) {
    const h = generateHospital(i);
    const hospital = await Hospital.create({
      name: h.name,
      hospitalCode: h.hospitalCode,
      description: h.description,
      address: h.address,
      location: { type: 'Point', coordinates: h.coordinates },
      phone: h.phone,
      email: `info@${h.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`,
      emergencyServices: true,
      emergencyAvailable: true,
      totalBeds: h.totalBeds,
      availableBeds: h.availableBeds,
      rating: h.rating,
      reviewCount: h.reviewCount,
      facilities: h.facilities,
      specialties: h.specialties,
    });
    hospitals.push(hospital);

    await BedAvailability.create({
      hospitalId: hospital._id,
      icuBeds: Math.floor(h.totalBeds * 0.1),
      icuAvailable: rand(2, 10),
      emergencyBeds: Math.floor(h.totalBeds * 0.15),
      emergencyAvailable: rand(5, 20),
      generalBeds: h.totalBeds,
      generalAvailable: h.availableBeds,
    });

    const depts = [];
    const deptNames = [...new Set([...h.specialties, ...Object.keys(DEPT_DETAILS)])].slice(0, 6);
    for (const name of deptNames) {
      const details = DEPT_DETAILS[name] || { icon: 'Stethoscope', description: `${name} department.` };
      const dept = await Department.create({
        hospitalId: hospital._id,
        name,
        icon: details.icon,
        description: details.description,
      });
      depts.push(dept);
    }
    hospital.departments = depts.map((d) => d._id);
    await hospital.save();
    hospital._depts = depts;
  }
  console.log(`Seeded ${hospitals.length} hospitals`);

  // --- Doctors ---
  const doctors = [];
  const doctorUsers = [];
  for (let i = 0; i < DOCTOR_COUNT; i++) {
    const userData = generateDoctorUser(i);
    const user = await User.create(userData);
    doctorUsers.push(user);

    const hospital = hospitals[i % hospitals.length];
    const dept = hospital._depts[i % hospital._depts.length];
    const docData = generateDoctor(i, hospital, dept, user._id);
    const doctor = await Doctor.create(docData);
    doctors.push(doctor);
  }
  console.log(`Seeded ${doctors.length} doctors`);

  // --- Schedules ---
  const schedulesToCreate = [];
  for (const doc of doctors) {
    if (doc.schedule?.length) {
      for (const s of doc.schedule) {
        schedulesToCreate.push({
          doctorId: doc._id,
          hospitalId: doc.hospitalId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration || 30,
        });
      }
    }
  }
  await Schedule.insertMany(schedulesToCreate);
  console.log(`Seeded ${schedulesToCreate.length} schedules`);

  for (const h of hospitals) {
    const hDocs = doctors.filter((d) => d.hospitalId?.toString() === h._id.toString());
    h.doctors = hDocs.map((d) => d._id);
    await h.save();
  }

  // --- Patient ---
  await User.create({
    email: 'patient@hospital.com',
    password: 'Patient123!',
    firstName: 'Rahul',
    lastName: 'Verma',
    role: 'patient',
    phone: '+91-9876543210',
  });
  const patientUser = await User.findOne({ email: 'patient@hospital.com' });
  const patient = await Patient.create({
    user: patientUser._id,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'male',
    bloodGroup: 'O+',
    emergencyContact: { name: 'Priya Verma', phone: '+91-9876543211', relationship: 'Spouse' },
  });

  // --- Blood Banks ---
  const bloodBanks = [];
  for (let i = 0; i < BLOOD_BANK_COUNT; i++) {
    const hospital = hospitals[i % hospitals.length];
    bloodBanks.push(await BloodBank.create(generateBloodBank(i, hospital)));
  }
  console.log(`Seeded ${bloodBanks.length} blood banks`);

  // --- Labs ---
  const labs = [];
  for (let i = 0; i < LAB_COUNT; i++) {
    const hospital = hospitals[i % hospitals.length];
    labs.push(await Lab.create(generateLab(i, hospital)));
  }
  console.log(`Seeded ${labs.length} labs`);

  // --- Reminders ---
  const today = new Date();
  await Reminder.create({
    patient: patient._id,
    medicineName: 'Metformin',
    dosage: '500mg - 1 tablet',
    frequency: 'twice_daily',
    times: ['09:00', '21:00'],
    instructions: 'with_food',
    startDate: new Date(today.getTime() - 5 * 86400000),
    endDate: new Date(today.getTime() + 10 * 86400000),
    logs: [],
    adherenceRate: 80,
    isActive: true,
  });

  await HealthAssessment.create({
    patient: patient._id,
    answers: {
      age: 36, gender: 'male', height: 178, weight: 82,
      smoking: 'never', alcohol: 'occasional', bloodPressure: 'normal',
      exercise: 'active', sleep: 7, stress: 'moderate', diabetes: false,
      familyHistory: ['diabetes'],
    },
    riskScore: 28,
    healthScore: 72,
    lifestyleAdvice: ['Exercise regularly', 'Reduce sodium intake'],
    recommendedDoctors: [doctors[0]._id],
    recommendedHospitals: [hospitals[0]._id],
  });

  await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'bmi',
    inputs: { height: 178, weight: 82 },
    outputs: { bmi: 25.9, classification: 'overweight' },
    resultSummary: 'BMI: 25.9 (Overweight)',
  });

  console.log('\nSeed complete!');
  console.log(`Hospitals: ${hospitals.length} | Doctors: ${doctors.length} | Labs: ${labs.length} | Blood Banks: ${bloodBanks.length}`);
  console.log('Admin: admin@hospital.com / Admin123!@#');
  console.log('Patient: patient@hospital.com / Patient123!');
  console.log(`Doctors: ${doctorUsers[0].email} / Doctor123!`);
  process.exit(0);
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
