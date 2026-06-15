/**
 * Programmatic Indian healthcare seed data generator.
 * Produces realistic hospitals, doctors, labs, and blood banks across major Indian cities.
 */

export const CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', lng: 72.8777, lat: 19.0760 },
  { city: 'Delhi', state: 'Delhi', lng: 77.2090, lat: 28.6139 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lng: 80.9462, lat: 26.8467 },
  { city: 'Pune', state: 'Maharashtra', lng: 73.8567, lat: 18.5204 },
  { city: 'Bangalore', state: 'Karnataka', lng: 77.5946, lat: 12.9716 },
  { city: 'Hyderabad', state: 'Telangana', lng: 78.4867, lat: 17.3850 },
  { city: 'Chennai', state: 'Tamil Nadu', lng: 80.2707, lat: 13.0827 },
  { city: 'Kolkata', state: 'West Bengal', lng: 88.3639, lat: 22.5726 },
  { city: 'Ahmedabad', state: 'Gujarat', lng: 72.5714, lat: 23.0225 },
  { city: 'Jaipur', state: 'Rajasthan', lng: 75.7873, lat: 26.9124 },
  { city: 'Bhopal', state: 'Madhya Pradesh', lng: 77.4126, lat: 23.2599 },
];

export const CHAIN_PREFIXES = ['Apollo', 'Fortis', 'Max', 'Manipal', 'Narayana', 'Medanta', 'AIIMS', 'Columbia Asia', 'Global', 'Care'];
export const HOSPITAL_SUFFIXES = ['Hospital', 'Multi-Specialty Hospital', 'Super Speciality Hospital', 'Medical Centre', 'Health City', 'Institute of Medical Sciences'];

export const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics', 'Pediatrics',
  'General Medicine', 'Gastroenterology', 'Ophthalmology', 'Psychiatry', 'Pulmonology',
];

export const DEPT_DETAILS = {
  Cardiology: { icon: 'HeartPulse', description: 'Advanced cardiology centre for heart health and cardiac surgery.' },
  Neurology: { icon: 'Brain', description: 'Brain, spine, and nervous system diagnosis and treatment.' },
  Dermatology: { icon: 'Sparkles', description: 'Clinical and cosmetic dermatology services.' },
  Orthopedics: { icon: 'Activity', description: 'Bone, joint, and musculoskeletal care.' },
  Pediatrics: { icon: 'Baby', description: 'Comprehensive childcare and pediatric ICU.' },
  'General Medicine': { icon: 'Stethoscope', description: 'Routine consultations and general health checkups.' },
  Gastroenterology: { icon: 'Activity', description: 'Digestive system and liver care.' },
  Ophthalmology: { icon: 'Eye', description: 'Eye care and vision correction.' },
  Psychiatry: { icon: 'Brain', description: 'Mental health and counselling services.' },
  Pulmonology: { icon: 'Wind', description: 'Respiratory and lung disease treatment.' },
};

export const FACILITY_KEYS = ['ICU', 'MRI', 'CTScan', 'Ventilator', 'Dialysis', 'BloodBank', 'Emergency', 'NICU', 'OperationTheatre', 'Ambulance', 'Pharmacy', 'Lab'];

export const FIRST_NAMES = ['Rajesh', 'Priya', 'Amit', 'Sunita', 'Anil', 'Kavita', 'Vikram', 'Neha', 'Rahul', 'Deepa', 'Sanjay', 'Meera', 'Arjun', 'Pooja', 'Suresh', 'Anita'];
export const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Mehta', 'Rao', 'Iyer', 'Nair', 'Joshi', 'Verma', 'Malhotra', 'Chopra', 'Desai', 'Pillai'];

export const LAB_TESTS = [
  { name: 'Complete Blood Count (CBC)', category: 'blood_test', price: 350, durationHours: 8 },
  { name: 'Lipid Profile', category: 'blood_test', price: 550, durationHours: 12 },
  { name: 'HbA1c (Diabetes)', category: 'blood_test', price: 450, durationHours: 8 },
  { name: 'Thyroid Profile (TSH, T3, T4)', category: 'blood_test', price: 600, durationHours: 12 },
  { name: 'Liver Function Test', category: 'blood_test', price: 500, durationHours: 12 },
  { name: 'Kidney Function Test', category: 'blood_test', price: 480, durationHours: 12 },
  { name: 'Brain MRI Scan', category: 'mri', price: 4500, durationHours: 24 },
  { name: 'Spine MRI Scan', category: 'mri', price: 4800, durationHours: 24 },
  { name: 'Chest CT Scan', category: 'ct_scan', price: 3200, durationHours: 12 },
  { name: 'Abdominal CT Scan', category: 'ct_scan', price: 3500, durationHours: 12 },
  { name: 'Chest X-Ray', category: 'x_ray', price: 400, durationHours: 2 },
  { name: 'Abdominal Ultrasound', category: 'ultrasound', price: 900, durationHours: 6 },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const jitter = (base, range = 0.05) => base + (Math.random() - 0.5) * range;

export function generateHospital(index) {
  const loc = CITIES[index % CITIES.length];
  const chain = pick(CHAIN_PREFIXES);
  const suffix = pick(HOSPITAL_SUFFIXES);
  const name = index < 11
    ? `${loc.city} ${chain} ${suffix}`
    : `${chain} ${loc.city} ${suffix}`;

  const facilities = {};
  FACILITY_KEYS.forEach((key) => {
    facilities[key] = Math.random() > 0.35;
  });
  facilities.Emergency = true;
  facilities.Ambulance = true;

  const specialties = SPECIALIZATIONS.filter(() => Math.random() > 0.5);
  if (specialties.length === 0) specialties.push('General Medicine');

  return {
    name,
    hospitalCode: `HSP-${loc.city.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    description: `${name} is a leading multi-specialty healthcare institution in ${loc.city}, ${loc.state}, offering comprehensive medical services.`,
    address: {
      street: `${rand(1, 200)} ${pick(['MG Road', 'Ring Road', 'Station Road', 'Civil Lines', 'Sector', 'Main Road'])}`,
      city: loc.city,
      state: loc.state,
      pincode: String(rand(100000, 999999)),
      country: 'India',
    },
    coordinates: [jitter(loc.lng), jitter(loc.lat)],
    phone: `+91-${rand(70, 99)}-${rand(10000000, 99999999)}`,
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    reviewCount: rand(20, 500),
    totalBeds: rand(80, 400),
    availableBeds: rand(10, 80),
    facilities,
    specialties,
  };
}

export function generateDoctor(index, hospital, department, userId) {
  const spec = department.name;
  return {
    user: userId,
    hospitalId: hospital._id,
    departmentId: department._id,
    specialization: spec,
    qualification: `MBBS, MD - ${spec}`,
    licenseNumber: `MD-${spec.slice(0, 4).toUpperCase()}-${String(index + 1).padStart(4, '0')}`,
    experience: rand(3, 25),
    consultationFee: rand(300, 1500),
    onlineConsultationFee: rand(200, 1000),
    isVerified: true,
    rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
    reviewCount: rand(5, 150),
    averageConsultationTime: 30,
    languages: pick([['English', 'Hindi'], ['English', 'Hindi', 'Marathi'], ['English', 'Hindi', 'Tamil'], ['English', 'Hindi', 'Telugu']]),
    gender: pick(['male', 'female']),
    consultationModes: ['physical', 'video'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
  };
}

export function generateLab(index, hospital) {
  const loc = CITIES[index % CITIES.length];
  const testCount = rand(4, 8);
  const tests = [];
  const used = new Set();
  while (tests.length < testCount) {
    const t = pick(LAB_TESTS);
    if (!used.has(t.name)) {
      used.add(t.name);
      tests.push({ ...t, price: t.price + rand(-50, 200) });
    }
  }

  return {
    name: `${pick(['Dr Lal PathLabs', 'SRL Diagnostics', 'Metropolis', 'Thyrocare', 'Suburban Diagnostics'])} ${loc.city}${hospital ? ` - ${hospital.name.split(' ')[0]}` : ''}`,
    address: {
      street: `${rand(1, 150)} ${pick(['Commercial Complex', 'Health Plaza', 'Diagnostic Centre'])}`,
      city: loc.city,
      state: loc.state,
      pincode: String(rand(100000, 999999)),
    },
    location: {
      type: 'Point',
      coordinates: [jitter(loc.lng, 0.03), jitter(loc.lat, 0.03)],
    },
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    contactNumber: `+91-${rand(70, 99)}-${rand(10000000, 99999999)}`,
    testsAvailable: tests,
    operatingHours: '7:00 AM - 9:00 PM',
    isOpenNow: Math.random() > 0.2,
  };
}

export function generateBloodBank(index, hospital) {
  const loc = CITIES[index % CITIES.length];
  const bloodGroups = BLOOD_GROUPS.map((group) => ({
    group,
    unitsAvailable: rand(0, 60),
  }));

  return {
    name: `${pick(['Rotary', 'Red Cross', 'LifeLine', 'Central', 'City'])} Blood Bank ${loc.city}${hospital ? ` - ${hospital.name.split(' ')[0]}` : ''}`,
    hospital: hospital?._id,
    address: {
      street: `${rand(1, 100)} ${pick(['Hospital Road', 'Civil Lines', 'Medical Campus'])}`,
      city: loc.city,
      state: loc.state,
      pincode: String(rand(100000, 999999)),
    },
    location: {
      type: 'Point',
      coordinates: hospital?.location?.coordinates || [jitter(loc.lng, 0.02), jitter(loc.lat, 0.02)],
    },
    bloodGroups,
    emergencyContact: `+91-${rand(70, 99)}-${rand(10000000, 99999999)}`,
    timings: Math.random() > 0.3 ? '24x7' : '8:00 AM - 10:00 PM',
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    volunteers: [],
  };
}

export function generateDoctorUser(index) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  return {
    email: `dr.${fn.toLowerCase()}.${ln.toLowerCase()}${index}@medicare.in`,
    password: 'Doctor123!',
    firstName: fn,
    lastName: ln,
    role: 'doctor',
    phone: `+91-${rand(70, 99)}-${rand(10000000, 99999999)}`,
  };
}
