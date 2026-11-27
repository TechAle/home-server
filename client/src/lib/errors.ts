export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {return error.message;}
  if (error instanceof Error && error.message) {return error.message;}
  return 'Errore inatteso.';
}
