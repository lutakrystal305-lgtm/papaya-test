import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { CopayDto } from './copay.dto';

export class SubBenefitDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsPositive()
  limit_per_visit?: number;

  @IsOptional()
  @IsPositive()
  limit_per_event?: number;

  @IsOptional()
  @IsPositive()
  limit_per_day?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_days?: number;

  @IsOptional()
  @IsPositive()
  limit_per_year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  visits_per_year?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CopayDto)
  copay?: CopayDto;
}
