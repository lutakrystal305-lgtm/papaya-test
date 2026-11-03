import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { BenefitDto } from './benefit.dto';
import { ExclusionDto } from './exclusion.dto';
import { PlanDto } from './plan.dto';

export class PolicyDto {
  @IsString()
  @IsNotEmpty()
  policy_number!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PlanDto)
  plan!: PlanDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BenefitDto)
  benefits!: BenefitDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExclusionDto)
  exclusions?: ExclusionDto[];
}
