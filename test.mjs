// 스모크 테스트: node test.mjs [BASE_URL]  (기본 http://localhost:3000)
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://localhost:3000';
const api = (p, opts) => fetch(`${BASE}/api/${p}`, {
  ...opts,
  headers: { 'content-type': 'application/json' },
}).then(async (r) => [r.status, await r.json()]);

let [, jokes] = await api('jokes');
assert.ok(Array.isArray(jokes) && jokes.length > 0, '논문 목록이 비어 있음');

const [, created] = await api('jokes', {
  method: 'POST',
  body: JSON.stringify({ category: '음운론', question: '테스트 개그?', answer: '테스트', author: '스모크봇' }),
});
assert.ok(created.id, '논문 등록 실패: ' + JSON.stringify(created));
assert.ok(created.temperature < 0, '냉각 온도가 음수가 아님');

const [, frozen] = await api('jokes', { method: 'PATCH', body: JSON.stringify({ id: created.id }) });
assert.equal(frozen.freezes, 1, '🧊 카운트 증가 실패');

const [status, bad] = await api('jokes', { method: 'POST', body: JSON.stringify({ question: '' }) });
assert.equal(status, 400, '빈 입력이 통과됨');
assert.ok(bad.error);

const [, logs] = await api('logs');
assert.ok(Array.isArray(logs), '임상일지 목록 실패');

console.log('통과: 논문 조회/등록/냉각, 입력 검증, 임상일지 조회');
