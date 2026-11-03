import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '@/app.module';

const ROOT = join(__dirname, '..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

describe('POST /calculations (e2e)', () => {
  let app: INestApplication<App>;
  const policy = readJson('data/policy.sample.json');
  const expenses = readJson('data/expenses.sample.json');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the calculation output as JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .send({ policy, expenses })
      .expect(200);

    expect(response.body.results).toHaveLength(20);
    expect(response.body.summary.totals).toEqual({
      submitted: 124000,
      covered: 90600,
      copay: 4600,
      deductible: 1000,
      member_pays: 33400,
    });
  });

  it('returns the Markdown report', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations/report')
      .send({ policy, expenses })
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^text\/markdown/);
    expect(response.text).toMatch(/^# Benefits Calculation — POL-2024-TH-00789\n/);
  });

  it('returns 400 listing every policy error', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .send({ policy: readJson('test/fixtures/policy.invalid.json'), expenses })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Invalid policy',
      errors: expect.arrayContaining(['plan.expiry_date: must be after plan.effective_date']),
    });
    expect(response.body.errors).toHaveLength(4);
  });

  it('returns 400 when expenses is not an array', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .send({ policy, expenses: {} })
      .expect(400);

    expect(response.body.message).toEqual(['expenses must be an array']);
  });

  it('denies invalid expenses without failing the request', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .send({ policy, expenses: readJson('test/fixtures/expenses.mixed.json') })
      .expect(200);

    const decisions = response.body.results.map((result: { decision: string }) => result.decision);
    expect(decisions.filter((decision: string) => decision === 'DENIED')).toHaveLength(2);
  });

  it('denies an oversized expense without failing the others', async () => {
    const [first, second] = expenses as Record<string, unknown>[];
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .send({ policy, expenses: [{ ...first, amount: 1e20 }, second] })
      .expect(200);

    expect(response.body.results.map((result: { decision: string }) => result.decision)).toEqual([
      'DENIED',
      'COVERED',
    ]);
    expect(response.body.results[0].reason).toContain(
      'amount: must not be greater than 100000000000',
    );
  });

  it('echoes the request id', async () => {
    const response = await request(app.getHttpServer())
      .post('/calculations')
      .set('x-request-id', 'calc-42')
      .send({ policy, expenses: [] })
      .expect(200);

    expect(response.headers['x-request-id']).toBe('calc-42');
  });
});
