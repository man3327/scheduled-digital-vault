import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('foundation', () => {
  it('GET /health reports degraded (503) when the database is not connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('unknown routes return the standard error shape with a requestId', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('malformed JSON returns 400, not a stack trace', async () => {
    const res = await request(app)
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
  });
});