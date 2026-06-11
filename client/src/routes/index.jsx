import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Home from '@/pages/public/Home';
import About from '@/pages/public/About';
import Contact from '@/pages/public/Contact';
import Doctors from '@/pages/Doctors/DoctorList';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

import PatientDashboard from '@/pages/patient/Dashboard';
import HospitalList from '@/pages/Hospitals/HospitalList';
import HospitalDetails from '@/pages/Hospitals/HospitalDetails';
import DepartmentDoctors from '@/pages/patient/DepartmentDoctors';
import DoctorProfile from '@/pages/Doctors/DoctorProfile';
import CompareHospitals from '@/pages/patient/CompareHospitals';
import PatientAppointments from '@/pages/patient/Appointments';
import BookingPage from '@/pages/Appointments/BookingPage';
import PatientRecords from '@/pages/patient/Records';
import PatientPrescriptions from '@/pages/patient/Prescriptions';
import AIAssistant from '@/pages/patient/AIAssistant';
import PatientNotifications from '@/pages/patient/Notifications';
import PatientProfile from '@/pages/patient/Profile';
import Emergency from '@/pages/patient/Emergency';
import HealthScore from '@/pages/patient/HealthScore';

// New features
import MedicineReminder from '@/pages/MedicineReminder';
import HealthAnalytics from '@/pages/HealthAnalytics';
import HealthCalculators from '@/pages/HealthCalculators';
import HealthRiskAssessment from '@/pages/HealthRiskAssessment';
import BloodBankFinder from '@/pages/BloodBankFinder';
import NearbyLabs from '@/pages/NearbyLabs';
import FacilityFinder from '@/pages/FacilityFinder';
import EmergencyHub from '@/pages/EmergencyHub';

import DoctorOverview from '@/pages/doctor/Overview';
import DoctorAppointments from '@/pages/doctor/Appointments';
import DoctorPatients from '@/pages/doctor/Patients';
import DoctorSchedule from '@/pages/doctor/Schedule';
import DoctorSelfProfile from '@/pages/doctor/Profile';
import QueueManagement from '@/pages/doctor/QueueManagement';

import AdminOverview from '@/pages/admin/Overview';
import AdminDoctors from '@/pages/admin/Doctors';
import AdminPatients from '@/pages/admin/Patients';
import AdminDepartments from '@/pages/admin/Departments';
import AdminAnalytics from '@/pages/admin/Analytics';
import AdminSettings from '@/pages/admin/Settings';
import HospitalManagement from '@/pages/admin/HospitalManagement';
import BedManagement from '@/pages/admin/BedManagement';
import EmergencyMonitor from '@/pages/admin/EmergencyMonitor';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
        <Route path="patient" element={<DashboardLayout role="patient" />}>
          <Route index element={<PatientDashboard />} />
          <Route path="hospitals" element={<HospitalList />} />
          <Route path="hospitals/:id" element={<HospitalDetails />} />
          <Route path="hospitals/:hospitalId/departments/:departmentId" element={<DepartmentDoctors />} />
          <Route path="hospitals/:hospitalId/doctors/:doctorId" element={<DoctorProfile />} />
          <Route path="compare" element={<CompareHospitals />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="book/:doctorId" element={<BookingPage />} />
          <Route path="records" element={<PatientRecords />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="health-score" element={<HealthScore />} />
          <Route path="medicine-reminder" element={<MedicineReminder />} />
          <Route path="health-analytics" element={<HealthAnalytics />} />
          <Route path="health-calculators" element={<HealthCalculators />} />
          <Route path="health-risk-assessment" element={<HealthRiskAssessment />} />
          <Route path="blood-banks" element={<BloodBankFinder />} />
          <Route path="nearby-labs" element={<NearbyLabs />} />
          <Route path="facility-finder" element={<FacilityFinder />} />
          <Route path="emergency-hub" element={<EmergencyHub />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
        <Route path="doctor" element={<DashboardLayout role="doctor" />}>
          <Route index element={<DoctorOverview />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="queue" element={<QueueManagement />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="schedule" element={<DoctorSchedule />} />
          <Route path="profile" element={<DoctorSelfProfile />} />
          <Route path="notifications" element={<PatientNotifications />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="hospitals" element={<HospitalManagement />} />
          <Route path="beds" element={<BedManagement />} />
          <Route path="emergency" element={<EmergencyMonitor />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<PatientNotifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
