import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { CopayDto } from './copay.dto';
import { SubBenefitDto } from './sub-benefit.dto';

export class BenefitDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsPositive()
  annual_limit?: number;

  @IsOptional()
  @IsPositive()
  lifetime_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  waiting_period_days?: number;

  @IsOptional()
  @Min(0)
  deductible?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CopayDto)
  copay?: CopayDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubBenefitDto)
  sub_benefits!: SubBenefitDto[];
}
