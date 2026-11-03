import { IsArray, IsObject } from 'class-validator';

// Envelope only: individual expenses are validated one by one so a bad item cannot fail the request.
export class CalculateBenefitsRequestDto {
  @IsObject()
  policy!: Record<string, unknown>;

  @IsArray()
  expenses!: unknown[];
}
