import { Module } from '@nestjs/common';

import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { InputParserService } from './input-parser.service';
import { ReportRendererService } from './report-renderer.service';

@Module({
  controllers: [CalculationsController],
  providers: [CalculationsService, InputParserService, ReportRendererService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
