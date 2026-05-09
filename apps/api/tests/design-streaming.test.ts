import { describe, expect, it } from 'bun:test';

const serverSource = await Bun.file(new URL('../src/server.ts', import.meta.url)).text();

describe('/design streaming and CORS regression guards', () => {
  it('uses Fastify-managed stream send instead of raw socket writes', () => {
    expect(serverSource.includes("app.post<{ Body: { url?: string } }>('/design'")).toBe(true);
    expect(serverSource.includes('return reply.send(stream);')).toBe(true);
    expect(serverSource.includes('reply.raw.write(chunk)')).toBe(false);
    expect(serverSource.includes('reply.raw.end()')).toBe(false);
  });

  it('keeps CORS centralized in plugin config rather than route-level ACAO headers', () => {
    expect(serverSource.includes('await app.register(cors,')).toBe(true);
    expect(serverSource.includes('Access-Control-Allow-Origin')).toBe(false);
  });
});
