import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { CalculationsModule } from '../calculations/calculations.module';
import { cliLoggerParams } from '../config/logger.config';
import { CalcCommand } from './calc.command';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(cliLoggerParams()),
    CalculationsModule,
  ],
  providers: [CalcCommand],
})
export class CliModule {}
