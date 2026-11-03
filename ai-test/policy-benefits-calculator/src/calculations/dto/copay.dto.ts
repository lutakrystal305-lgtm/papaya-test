import { IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CopayDto {
  @IsOptional()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsPositive()
  max_per_visit?: number;

  @IsOptional()
  @IsPositive()
  fixed_per_visit?: number;
}
