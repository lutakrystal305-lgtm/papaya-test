import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ExclusionDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  terms!: string[];
}
