import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string(),
    hospitalId: z.string().optional(),
    departmentId: z.string().optional(),
    scheduledAt: z.union([z.string().datetime(), z.coerce.date()]).transform((v) =>
      v instanceof Date ? v.toISOString() : v
    ),
    reason: z.string().max(500).optional(),
    symptoms: z.array(z.string()).optional(),
    type: z.enum(['physical', 'video', 'audio', 'chat', 'regular', 'follow_up', 'emergency']).optional(),
    isEmergency: z.boolean().optional(),
  }),
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    scheduledAt: z.union([z.string().datetime(), z.coerce.date()]).optional(),
    status: z.enum(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show']).optional(),
    cancellationReason: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string() }),
});
