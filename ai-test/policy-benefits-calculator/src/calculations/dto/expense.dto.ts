import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { MAX_AMOUNT_MAJOR, MAX_EXPENSE_DAYS } from '../calculations.constants';
import { IsIsoDate } from './is-iso-date.decorator';

export class ExpenseDto {
  @IsString()
  @IsNotEmpty()
  expense_id!: string;

  @IsIsoDate()
  date!: string;

  @IsString()
  @IsNotEmpty()
  benefit_type!: string;

  @IsString()
  @IsNotEmpty()
  sub_benefit!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(MAX_AMOUNT_MAJOR)
  amount!: number;

  @IsString()
  diagnosis!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPENSE_DAYS)
  days?: number;
}
