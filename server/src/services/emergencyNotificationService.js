import { User } from '../models/User.js';
import { EmergencyContact } from '../models/EmergencyContact.js';
import { EmergencyNotificationLog } from '../models/EmergencyNotificationLog.js';
import { sendEmail } from './emailService.js';
import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const sendEmergencyAlerts = async (patient, { latitude, longitude, emergencyType, hospital }) => {
  const user = await User.findById(patient.user);
  const patientName = user ? `${user.firstName} ${user.lastName}` : 'A patient';
  const hospitalName = hospital?.name || 'Nearest emergency trauma center';

  console.log('[Emergency Notifications] Initiating emergency alerts for:', patientName);

  const mapsUrl = (latitude && longitude)
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
    : 'Unknown location';

  const alertMessage = `🚨 EMERGENCY ALERT: ${patientName} has triggered an SOS! 
📍 Live Location: ${mapsUrl}
🏥 Assigned Hospital: ${hospitalName}
📞 Emergency contact number: ${user?.phone || 'Not available'}
Please contact emergency services (112 / 108) immediately.`;

  // 1. Notify User via Email (Nodemailer)
  if (user?.email) {
    let success = false;
    let attempts = 0;
    let errorMessage = '';

    while (attempts < 3 && !success) {
      attempts++;
      try {
        await sendEmail({
          to: user.email,
          subject: `🚨 CRITICAL EMERGENCY SOS - ${patientName}`,
          html: `
            <div style="font-family: sans-serif; border: 3px solid #dc2626; border-radius: 12px; padding: 20px; max-width: 600px; margin: auto;">
              <h2 style="color: #dc2626; margin-top: 0;">🚨 Critical SOS Triggered</h2>
              <p>Hi ${user.firstName},</p>
              <p>An emergency SOS alert has been triggered from your device.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Patient Name:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${patientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Emergency Type:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: uppercase;">${emergencyType || 'General Alert'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Assigned Facility:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${hospitalName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Coordinates:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${latitude ? `${latitude}, ${longitude}` : 'Unavailable'}</td>
                </tr>
              </table>
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px; margin: 15px 0; text-align: center;">
                <a href="${mapsUrl}" style="color: #dc2626; font-weight: bold; text-decoration: none;">📍 View Live Location on OpenStreetMap</a>
              </div>
              <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">Emergency services and registered contacts have been notified of this trigger.</p>
            </div>
          `,
        });
        success = true;
      } catch (err) {
        errorMessage = err.message;
        console.error(`[Emergency Notifications] Email send failed (attempt ${attempts}):`, err.message);
      }
    }

    await EmergencyNotificationLog.create({
      recipient: user.email,
      type: 'email',
      emergencyType: emergencyType || 'emergency_alert',
      latitude,
      longitude,
      hospital: hospital?._id,
      deliveryStatus: success ? 'success' : 'failed',
      success,
      retryCount: attempts - 1,
      errorMessage: success ? undefined : errorMessage,
    });
  }

  // 2. Notify Contacts (SMS / Twilio)
  const contacts = await EmergencyContact.find({ patient: patient._id, notifyOnSOS: true });

  // Add the profile emergencyContact if not present in the sub-collection
  if (patient.emergencyContact?.phone && !contacts.some(c => c.phone === patient.emergencyContact.phone)) {
    contacts.push({
      name: patient.emergencyContact.name,
      phone: patient.emergencyContact.phone,
      relationship: patient.emergencyContact.relationship
    });
  }

  for (const contact of contacts) {
    let success = false;
    let attempts = 0;
    let errorMessage = '';

    console.log(`[Emergency Notifications] Dispatching SMS alert to contact: ${contact.name} (${contact.phone})`);

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      while (attempts < 3 && !success) {
        attempts++;
        try {
          await twilioClient.messages.create({
            body: alertMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone,
          });
          success = true;
          console.log(`[Emergency Notifications] Twilio SMS successfully sent to ${contact.name}`);
        } catch (err) {
          errorMessage = err.message;
          console.error(`[Emergency Notifications] Twilio SMS failed to ${contact.phone} (attempt ${attempts}):`, err.message);
        }
      }
    } else {
      // Simulation / Dry-run Mode
      attempts = 1;
      success = true;
      errorMessage = 'Twilio credentials not configured in environment. Simulated success.';
      console.log(`[Emergency Notifications] [SIMULATED SMS TO ${contact.name} (${contact.phone})]:\n${alertMessage}`);
    }

    await EmergencyNotificationLog.create({
      recipient: contact.phone,
      type: 'sms',
      emergencyType: emergencyType || 'emergency_alert',
      latitude,
      longitude,
      hospital: hospital?._id,
      deliveryStatus: success ? 'success' : 'failed',
      success,
      retryCount: attempts - 1,
      errorMessage: success ? (twilioClient ? undefined : 'Twilio simulated') : errorMessage,
    });
  }
};
