/**
 * Standard API response wrapper — shared between backend and extension.
 * Every backend controller response should conform to this shape.
 *
 * @template TData  - Shape of `data` on success (e.g. UserPublic)
 * @template TErrors - Shape of `errors` on failure (e.g. ZodFlattenedError)
 */
export type ApiResponse<TData = never, TErrors = never> =
  | {
      success: true;
      data?: TData;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errors?: TErrors;
    };
