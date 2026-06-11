import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string(),
    scheduledAt: z.string().datetime(),
    reason: z.string().max(500).optional(),
    symptoms: z.array(z.string()).optional(),
    type: z.enum(['regular', 'follow_up', 'emergency']).optional(),
    isEmergency: z.boolean().optional(),
  }),
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    scheduledAt: z.string().datetime().optional(),
    status: z.enum(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show']).optional(),
    cancellationReason: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string() }),
});
