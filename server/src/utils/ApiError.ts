export class ApiError extends Error {
  code: number;
  details?: Record<string, string>;
  constructor(code: number, message: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}