/** The server responded, but its payload does not match the expected contract. */
export class ApiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiResponseError';
  }
}
