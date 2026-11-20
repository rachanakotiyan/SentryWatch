/** A scanner could not complete (network, rate limit, bad target). Never turned into fake findings. */
export class ScanError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ScanError';
    this.status = status;
  }
}
