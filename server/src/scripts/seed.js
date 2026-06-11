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
import { Facility } from '../models/Facility.js';
import { HealthAssessment } from '../models/HealthAssessment.js';
import { HealthCalculatorHistory } from '../models/HealthCalculatorHistory.js';

const hospitalsData = [
  {
    name: 'MediCare Central Hospital',
    hospitalCode: 'MCH-NYC-001',
    logo: 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?auto=format&fit=crop&w=150&h=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    description: 'A state-of-the-art tertiary care hospital located in the heart of New York City, providing world-class patient services for over 25 years.',
    address: { street: '123 Health Ave', city: 'New York', state: 'NY', zipCode: '10001', pincode: '10001' },
    coordinates: [-73.9857, 40.7484],
    phone: '+1-555-0100',
    rating: 4.8,
    reviewCount: 154,
    totalBeds: 200,
    availableBeds: 45,
    facilities: {
      ICU: true,
      Ambulance: true,
      Emergency: true,
      Pharmacy: true,
      Lab: true
    }
  },
  {
    name: 'City General Hospital',
    hospitalCode: 'CGH-NYC-002',
    logo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=150&h=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    description: 'City General is committed to providing affordable, compassionate, and high-quality clinical healthcare to our metropolitan community.',
    address: { street: '456 Medical Blvd', city: 'New York', state: 'NY', zipCode: '10016', pincode: '10016' },
    coordinates: [-73.9762, 40.7451],
    phone: '+1-555-0200',
    rating: 4.5,
    reviewCount: 92,
    totalBeds: 150,
    availableBeds: 30,
    facilities: {
      ICU: true,
      Ambulance: true,
      Emergency: true,
      Pharmacy: true,
      Lab: false
    }
  },
  {
    name: 'St. Mary Emergency Center',
    hospitalCode: 'SME-BKL-003',
    logo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&h=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    description: 'St. Mary specializes in rapid emergency medicine, minor surgeries, and general outpatient clinics, offering round-the-clock intensive care.',
    address: { street: '789 Emergency Ln', city: 'Brooklyn', state: 'NY', zipCode: '11201', pincode: '11201' },
    coordinates: [-73.9896, 40.7024],
    phone: '+1-555-0300',
    rating: 4.6,
    reviewCount: 68,
    totalBeds: 80,
    availableBeds: 12,
    emergencyAvailable: true,
    facilities: {
      ICU: true,
      Ambulance: true,
      Emergency: true,
      Pharmacy: false,
      Lab: true
    }
  },
];

const deptDetails = {
  'Cardiology': { icon: 'HeartPulse', description: 'Advanced cardiology center for heart health, angiography, and pacemakers.' },
  'Dermatology': { icon: 'Sparkles', description: 'Expert clinical and cosmetic dermatology, skin pathology, and allergen diagnostics.' },
  'Orthopedics': { icon: 'Activity', description: 'Bones, joints, and skeletal system surgeries, physiotherapy, and trauma care.' },
  'Pediatrics': { icon: 'Baby', description: 'Comprehensive childcare, immunizations, developmental pediatrics, and pediatric ICU.' },
  'Neurology': { icon: 'Brain', description: 'Comprehensive brain, spine, and nervous system diagnoses and therapeutic services.' },
  'General Medicine': { icon: 'Stethoscope', description: 'Routine diagnostic consultations, physical checkups, fever treatment, and wellness plans.' }
};

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Seeding database...');

  const collections = [
    'users', 'patients', 'doctors', 'departments', 'hospitals', 'bedavailabilities', 'schedules',
    'reminders', 'bloodbanks', 'labs', 'facilities', 'healthassessments', 'healthcalculatorhistories'
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

  const hospitals = [];
  for (const h of hospitalsData) {
    const hospital = await Hospital.create({
      name: h.name,
      hospitalCode: h.hospitalCode,
      logo: h.logo,
      coverImage: h.coverImage,
      description: h.description,
      address: h.address,
      location: { type: 'Point', coordinates: h.coordinates },
      phone: h.phone,
      email: `info@${h.name.toLowerCase().replace(/\s/g, '')}.com`,
      emergencyServices: true,
      emergencyAvailable: h.emergencyAvailable !== false,
      totalBeds: h.totalBeds,
      availableBeds: h.availableBeds,
      rating: h.rating,
      reviewCount: h.reviewCount,
      facilities: h.facilities,
      images: [h.coverImage],
    });
    hospitals.push(hospital);

    await BedAvailability.create({
      hospitalId: hospital._id,
      icuBeds: 10,
      icuAvailable: 3,
      emergencyBeds: 20,
      emergencyAvailable: 8,
      generalBeds: h.totalBeds,
      generalAvailable: h.availableBeds,
    });

    const depts = [];
    for (const [name, details] of Object.entries(deptDetails)) {
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
  }

  const doctorUsers = await User.insertMany([
    {
      email: 'dr.smith@hospital.com',
      password: 'Doctor123!',
      firstName: 'Sarah',
      lastName: 'Smith',
      role: 'doctor',
      phone: '+1-555-0101',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=250&h=250&q=80',
    },
    {
      email: 'dr.jones@hospital.com',
      password: 'Doctor123!',
      firstName: 'Michael',
      lastName: 'Jones',
      role: 'doctor',
      phone: '+1-555-0102',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&h=250&q=80',
    },
    {
      email: 'dr.patel@hospital.com',
      password: 'Doctor123!',
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'doctor',
      phone: '+1-555-0103',
      avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&w=250&h=250&q=80',
    },
    {
      email: 'dr.lee@hospital.com',
      password: 'Doctor123!',
      firstName: 'David',
      lastName: 'Lee',
      role: 'doctor',
      phone: '+1-555-0104',
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=250&h=250&q=80',
    },
  ]);

  const h0Depts = await Department.find({ hospitalId: hospitals[0]._id });
  const h1Depts = await Department.find({ hospitalId: hospitals[1]._id });

  const doctors = await Doctor.insertMany([
    {
      user: doctorUsers[0]._id,
      hospitalId: hospitals[0]._id,
      departmentId: h0Depts.find((d) => d.name === 'Cardiology')._id,
      specialization: 'Cardiology',
      qualification: 'MBBS, MD - Cardiology, FACC',
      licenseNumber: 'MD-CARD-001',
      registrationNumber: 'MD-CARD-001',
      experience: 15,
      consultationFee: 150,
      onlineConsultationFee: 120,
      isVerified: true,
      rating: 4.8,
      reviewCount: 42,
      averageConsultationTime: 30,
      currentQueue: 2,
      waitingTime: 60,
      languages: ['English', 'Spanish'],
      schedule: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      ],
    },
    {
      user: doctorUsers[1]._id,
      hospitalId: hospitals[0]._id,
      departmentId: h0Depts.find((d) => d.name === 'Dermatology')._id,
      specialization: 'Dermatology',
      qualification: 'MBBS, DDVL (Skin & VD)',
      licenseNumber: 'MD-DERM-002',
      registrationNumber: 'MD-DERM-002',
      experience: 10,
      consultationFee: 120,
      onlineConsultationFee: 100,
      isVerified: true,
      rating: 4.6,
      reviewCount: 28,
      languages: ['English', 'German'],
      schedule: [{ dayOfWeek: 2, startTime: '10:00', endTime: '18:00', slotDuration: 30 }],
    },
    {
      user: doctorUsers[2]._id,
      hospitalId: hospitals[1]._id,
      departmentId: h1Depts.find((d) => d.name === 'General Medicine')._id,
      specialization: 'General Medicine',
      qualification: 'MBBS, MD - Internal Medicine',
      licenseNumber: 'MD-GEN-003',
      registrationNumber: 'MD-GEN-003',
      experience: 8,
      consultationFee: 100,
      onlineConsultationFee: 80,
      isVerified: true,
      rating: 4.9,
      reviewCount: 65,
      languages: ['English', 'Hindi', 'Gujarati'],
      schedule: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
        { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      ],
    },
    {
      user: doctorUsers[3]._id,
      hospitalId: hospitals[2]._id,
      departmentId: (await Department.findOne({ hospitalId: hospitals[2]._id, name: 'Neurology' }))._id,
      specialization: 'Neurology',
      qualification: 'MBBS, DM - Neurology',
      licenseNumber: 'MD-NEUR-004',
      registrationNumber: 'MD-NEUR-004',
      experience: 12,
      consultationFee: 180,
      onlineConsultationFee: 150,
      isVerified: true,
      rating: 4.7,
      reviewCount: 35,
      languages: ['English', 'French'],
      schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '15:00', slotDuration: 30 }],
    },
  ]);

  const schedulesToCreate = [];
  for (const doc of doctors) {
    if (doc.schedule && doc.schedule.length > 0) {
      for (const s of doc.schedule) {
        schedulesToCreate.push({
          doctorId: doc._id,
          hospitalId: doc.hospitalId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration,
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

  await User.create({
    email: 'patient@hospital.com',
    password: 'Patient123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'patient',
    phone: '+1-555-0200',
  });

  const patientUser = await User.findOne({ email: 'patient@hospital.com' });
  const patient = await Patient.create({
    user: patientUser._id,
    dateOfBirth: new Date('1990-05-15'),
    gender: 'male',
    bloodGroup: 'O+',
    emergencyContact: { name: 'Jane Doe', phone: '+1-555-0201', relationship: 'Spouse' },
  });

  console.log('Seeding facilities...');
  const facilityNames = ['ICU', 'MRI Scan', 'CT Scan', 'Dialysis', 'Ventilator', 'Ambulance Service', 'Parking Lot', 'Emergency Care'];
  for (const h of hospitals) {
    for (const name of facilityNames) {
      if (Math.random() > 0.3) {
        await Facility.create({
          name,
          description: `State of the art ${name} facility at ${h.name}.`,
          type: name === 'Parking Lot' ? 'amenity' : (name === 'MRI Scan' || name === 'CT Scan' ? 'diagnostic' : 'medical'),
          hospital: h._id
        });
      }
    }
  }

  console.log('Seeding blood banks...');
  await BloodBank.insertMany([
    {
      name: 'MediCare Blood Bank NYC',
      hospital: hospitals[0]._id,
      address: {
        street: '125 Health Ave',
        city: 'New York',
        state: 'NY',
        pincode: '10001'
      },
      location: {
        type: 'Point',
        coordinates: [-73.9850, 40.7480]
      },
      bloodGroups: [
        { group: 'A+', unitsAvailable: 15 },
        { group: 'A-', unitsAvailable: 5 },
        { group: 'B+', unitsAvailable: 22 },
        { group: 'B-', unitsAvailable: 4 },
        { group: 'AB+', unitsAvailable: 10 },
        { group: 'AB-', unitsAvailable: 2 },
        { group: 'O+', unitsAvailable: 30 },
        { group: 'O-', unitsAvailable: 8 }
      ],
      emergencyContact: '+1-555-0199',
      timings: '24x7',
      rating: 4.7,
      volunteers: [
        { name: 'Alice Smith', bloodGroup: 'O+', phone: '+1-555-0220', email: 'alice@example.com', lastDonatedAt: new Date('2026-03-10') },
        { name: 'Bob Johnson', bloodGroup: 'A-', phone: '+1-555-0221', email: 'bob@example.com', lastDonatedAt: new Date('2026-04-15') }
      ]
    },
    {
      name: 'Brooklyn Community Blood Bank',
      address: {
        street: '400 Fulton St',
        city: 'Brooklyn',
        state: 'NY',
        pincode: '11201'
      },
      location: {
        type: 'Point',
        coordinates: [-73.9880, 40.7000]
      },
      bloodGroups: [
        { group: 'A+', unitsAvailable: 8 },
        { group: 'B+', unitsAvailable: 12 },
        { group: 'AB+', unitsAvailable: 4 },
        { group: 'O+', unitsAvailable: 15 },
        { group: 'O-', unitsAvailable: 3 }
      ],
      emergencyContact: '+1-555-0299',
      timings: '8:00 AM - 10:00 PM',
      rating: 4.5,
      volunteers: [
        { name: 'Charlie Brown', bloodGroup: 'B+', phone: '+1-555-0222', email: 'charlie@example.com', lastDonatedAt: new Date('2026-02-20') }
      ]
    }
  ]);

  console.log('Seeding diagnostic labs...');
  await Lab.insertMany([
    {
      name: 'Quest Diagnostics Manhattan',
      address: {
        street: '250 W 57th St',
        city: 'New York',
        state: 'NY',
        pincode: '10019'
      },
      location: {
        type: 'Point',
        coordinates: [-73.9813, 40.7667]
      },
      rating: 4.6,
      contactNumber: '+1-555-0900',
      testsAvailable: [
        { name: 'Complete Blood Count (CBC)', category: 'blood_test', price: 45, durationHours: 12 },
        { name: 'Lipid Profile', category: 'blood_test', price: 60, durationHours: 24 },
        { name: 'Brain MRI Scan', category: 'mri', price: 450, durationHours: 48 },
        { name: 'Chest CT Scan', category: 'ct_scan', price: 300, durationHours: 36 },
        { name: 'X-Ray Chest', category: 'x_ray', price: 80, durationHours: 4 }
      ],
      operatingHours: '7:00 AM - 6:00 PM',
      isOpenNow: true
    },
    {
      name: 'Labcorp Brooklyn Heights',
      address: {
        street: '120 Court St',
        city: 'Brooklyn',
        state: 'NY',
        pincode: '11201'
      },
      location: {
        type: 'Point',
        coordinates: [-73.9912, 40.6908]
      },
      rating: 4.4,
      contactNumber: '+1-555-0901',
      testsAvailable: [
        { name: 'Complete Blood Count (CBC)', category: 'blood_test', price: 40, durationHours: 12 },
        { name: 'HbA1c (Diabetes)', category: 'blood_test', price: 35, durationHours: 12 },
        { name: 'Abdominal Ultrasound', category: 'ultrasound', price: 150, durationHours: 24 },
        { name: 'Spine MRI Scan', category: 'mri', price: 500, durationHours: 48 }
      ],
      operatingHours: '8:00 AM - 5:00 PM',
      isOpenNow: true
    }
  ]);

  console.log('Seeding medicine reminders...');
  const today = new Date();
  const startDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  const endDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

  await Reminder.create({
    patient: patient._id,
    medicineName: 'Atorvastatin (Lipitor)',
    dosage: '10mg - 1 tablet',
    frequency: 'once_daily',
    times: ['21:00'],
    instructions: 'before_food',
    startDate,
    endDate,
    logs: [
      { date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'taken' },
      { date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'taken' },
      { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'skipped' },
      { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'taken' }
    ],
    adherenceRate: 75,
    isActive: true
  });

  await Reminder.create({
    patient: patient._id,
    medicineName: 'Metformin (Glucophage)',
    dosage: '500mg - 1 tablet',
    frequency: 'twice_daily',
    times: ['09:00', '21:00'],
    instructions: 'with_food',
    startDate,
    endDate,
    logs: [
      { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '09:00', status: 'taken' },
      { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'taken' },
      { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '09:00', status: 'taken' },
      { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], time: '21:00', status: 'missed' }
    ],
    adherenceRate: 75,
    isActive: true
  });

  console.log('Seeding health assessments...');
  await HealthAssessment.create({
    patient: patient._id,
    answers: {
      age: 36,
      gender: 'male',
      height: 178,
      weight: 82,
      smoking: 'former',
      alcohol: 'occasional',
      diabetes: false,
      bloodPressure: 'prehypertension',
      exercise: 'occasional',
      sleep: 7,
      stress: 'moderate',
      familyHistory: ['diabetes']
    },
    riskScore: 28,
    healthScore: 72,
    lifestyleAdvice: [
      'Increase cardiorespiratory exercise to 30 mins, 4 days a week to lower resting blood pressure.',
      'Reduce processed sodium and simple carbs to prevent insulin spikes and stage-1 hypertension.',
      'Practice mindfulness or set work boundaries to decrease cortisol stress triggers.'
    ],
    recommendedDoctors: [doctors[0]._id, doctors[2]._id],
    recommendedHospitals: [hospitals[0]._id]
  });

  console.log('Seeding health calculator histories...');
  await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'bmi',
    inputs: { height: 178, weight: 85 },
    outputs: { bmi: 26.8, classification: 'overweight' },
    resultSummary: 'BMI: 26.8 (Overweight). Target weight: 58.6kg - 79.2kg.'
  });
  await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'bmi',
    inputs: { height: 178, weight: 82 },
    outputs: { bmi: 25.9, classification: 'overweight' },
    resultSummary: 'BMI: 25.9 (Overweight). Target weight: 58.6kg - 79.2kg.'
  });

  await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'water_intake',
    inputs: { amount: 250 },
    outputs: { waterIntakeLiters: 0.25 },
    resultSummary: 'Logged 250ml water intake'
  });
  await HealthCalculatorHistory.create({
    patient: patient._id,
    calculatorType: 'water_intake',
    inputs: { amount: 500 },
    outputs: { waterIntakeLiters: 0.5 },
    resultSummary: 'Logged 500ml water intake'
  });

  console.log('Seed complete!');
  console.log(`Hospitals: ${hospitals.length}`);
  console.log('Admin: admin@hospital.com / Admin123!@#');
  console.log('Patient: patient@hospital.com / Patient123!');
  console.log('Doctors: dr.smith@hospital.com / Doctor123!');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
