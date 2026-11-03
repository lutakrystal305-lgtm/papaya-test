import Ajv2020 from 'ajv/dist/2020';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { APP_ROOT } from './fixtures';

const ajv = new Ajv2020({ allErrors: true, strict: true });

export function schemaErrors(schemaFile: string, data: unknown): string[] {
  if (!ajv.getSchema(schemaFile)) {
    const text = fs.readFileSync(path.join(APP_ROOT, 'contracts', schemaFile), 'utf8');
    ajv.addSchema(JSON.parse(text) as object, schemaFile);
  }
  const validate = ajv.getSchema(schemaFile);
  if (!validate) throw new Error(`schema ${schemaFile} did not compile`);
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
}
