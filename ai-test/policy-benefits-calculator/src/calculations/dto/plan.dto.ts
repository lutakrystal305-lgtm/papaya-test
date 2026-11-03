import { IsOptional, IsString, Matches } from 'class-validator';

import { IsIsoDate } from './is-iso-date.decorator';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class PlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsIsoDate()
  effective_date!: string;

  @IsIsoDate()
  expiry_date!: string;

  @Matches(CURRENCY_PATTERN, { message: 'must be a 3-letter uppercase ISO 4217 code' })
  currency!: string;
}
