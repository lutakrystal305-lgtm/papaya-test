import { AdjudicationContext, isDenial, Step, StepResult } from './adjudication-context';

// Runs the rule steps in order; the first denial wins and later steps are skipped (FR-009).
export const runPipeline = (start: AdjudicationContext, steps: readonly Step[]): StepResult =>
  steps.reduce<StepResult>((current, step) => (isDenial(current) ? current : step(current)), start);
