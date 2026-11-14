export class LibraryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
