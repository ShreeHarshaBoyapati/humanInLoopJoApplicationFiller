import * as z from 'zod';

/**
 * Converts a ZodFlattenedError into a single human-readable string.
 * Processes formErrors first, then fieldErrors (key: messages).
 *
 * Example output: "Invalid input. email: Invalid email address. password: Must be at least 8 characters, Must contain a number."
 */
export function flattenZodErrorToString(error: z.ZodError): string {
  const flat: { formErrors: string[]; fieldErrors: Record<string, string[]> } =
    z.flattenError(error);
  const parts: string[] = [];

  // Form-level errors first
  if (flat.formErrors.length > 0) {
    parts.push(flat.formErrors.join('. '));
  }

  // Field-level errors: "fieldName: error1, error2"
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (messages && messages.length > 0) {
      parts.push(`${field}: ${messages.join(', ')}`);
    }
  }

  return parts.join('. ');
}
