import { z } from 'zod';

export const recordsQuerySchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  tradeId: z.string().optional()
});

export const createRecordsSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  notes: z.string().max(5000).optional(),
  chartImage: z.string().url().optional()
});

export const updateNotesSchema = z.object({
  tradeId: z.string(),
  notes: z.string().max(1000)
});

export type RecordsQuery = z.infer<typeof recordsQuerySchema>;
export type CreateRecords = z.infer<typeof createRecordsSchema>;
export type UpdateNotes = z.infer<typeof updateNotesSchema>;