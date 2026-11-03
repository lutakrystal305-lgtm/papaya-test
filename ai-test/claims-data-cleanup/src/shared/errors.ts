export class InputFormatError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(details.join('; '));
    this.name = 'InputFormatError';
    this.details = details;
  }
}

export class GeneratorSelfCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorSelfCheckError';
  }
}
