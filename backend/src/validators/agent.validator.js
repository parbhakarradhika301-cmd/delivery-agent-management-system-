/**
 * Request validation schemas using Zod for Delivery Agent endpoints.
 * Enforces strict schemas to reject unknown fields and validate formats.
 */
const { z } = require('zod');

// Phone regex: Optional leading '+' followed by 10 to 15 digits
const phoneRegex = /^\+?[0-9]{10,15}$/;

const createAgentSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be between 2 and 100 characters' })
      .max(100, { message: 'Full name must be between 2 and 100 characters' }),
    phone: z
      .string({ required_error: 'Phone is required' })
      .trim()
      .regex(phoneRegex, { message: 'Phone must be 10-15 digits with an optional leading +' }),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .pipe(z.string().email({ message: 'Invalid email address' })),
    serviceArea: z
      .string({ required_error: 'Service area is required' })
      .trim()
      .min(2, { message: 'Service area must be between 2 and 100 characters' })
      .max(100, { message: 'Service area must be between 2 and 100 characters' }),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: "Status must be either 'active' or 'inactive'" }),
      })
      .optional()
      .default('active'),
  })
  .strict({ message: 'Unrecognized field in request body' });

const updateAgentSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be between 2 and 100 characters' })
      .max(100, { message: 'Full name must be between 2 and 100 characters' })
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, { message: 'Phone must be 10-15 digits with an optional leading +' })
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.string().email({ message: 'Invalid email address' }))
      .optional(),
    serviceArea: z
      .string()
      .trim()
      .min(2, { message: 'Service area must be between 2 and 100 characters' })
      .max(100, { message: 'Service area must be between 2 and 100 characters' })
      .optional(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: "Status must be either 'active' or 'inactive'" }),
      })
      .optional(),
  })
  .strict({ message: 'Unrecognized field in request body' })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Update payload cannot be empty; provide at least one field to update',
  });

const agentIdParamSchema = z
  .object({
    id: z.string().uuid({ message: 'Agent ID must be a valid UUID' }),
  })
  .strict();

module.exports = {
  createAgentSchema,
  updateAgentSchema,
  agentIdParamSchema,
};
