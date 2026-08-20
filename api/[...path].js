import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CATEGORIES = ['음운론', '영문-한글 혼용', '생활밀착형', '조류/동물학', 'IT/비즈니스'];

// 신뢰 경계: 클라이언트 입력은 전부 여기서 검증한다.
function str(v, max, required = true) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s && required) throw new Error('필수 항목이 비어 있습니다.');
  if (s.length > max) throw new Error(`입력이 너무 깁니다 (최대 ${max}자).`);
  return s;
}

const toJoke = (r) => ({
  id: r.id, category: r.category, question: r.question, answer: r.answer,
  analysis: r.analysis, author: r.author, temperature: r.temperature,
  freezes: r.freezes, revealed: false,
});

const toLog = (r) => ({
  id: r.id, jokeUsed: r.joke_used, targetGroup: r.target_group, location: r.location,
  resultStatus: r.result_status, observation: r.observation,
  researcher: r.researcher, recoveryTime: r.recovery_time,
});

export default async function handler(req, res) {
  const [resource] = [].concat(req.query.path || []);
  try {
    if (resource === 'jokes') {
      if (req.method === 'GET') {
        const { rows } = await db.execute('SELECT * FROM jokes ORDER BY id');
        return res.json(rows.map(toJoke));
      }
      if (req.method === 'POST') {
        const b = req.body || {};
        const category = CATEGORIES.includes(b.category) ? b.category : CATEGORIES[0];
        const { rows } = await db.execute({
          sql: `INSERT INTO jokes (category, question, answer, analysis, author, temperature)
                VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
          args: [
            category,
            str(b.question, 200),
            str(b.answer, 200),
            str(b.analysis, 1000, false) || '분석 대기 중인 신규 논문.',
            str(b.author, 40, false) || '익명 연구원',
            // 제출 개그의 냉각 온도는 서버가 매긴다 (클라이언트 조작 방지)
            Math.floor(Math.random() * -40) - 10,
          ],
        });
        return res.json(toJoke(rows[0]));
      }
      if (req.method === 'PATCH') {
        const id = Number(req.body?.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: '잘못된 id' });
        const { rows } = await db.execute({
          sql: 'UPDATE jokes SET freezes = freezes + 1 WHERE id = ? RETURNING freezes',
          args: [id],
        });
        if (!rows.length) return res.status(404).json({ error: '없는 논문' });
        return res.json({ freezes: rows[0].freezes });
      }
    }

    if (resource === 'logs') {
      if (req.method === 'GET') {
        const { rows } = await db.execute('SELECT * FROM clinical_logs ORDER BY id DESC');
        return res.json(rows.map(toLog));
      }
      if (req.method === 'POST') {
        const b = req.body || {};
        const { rows } = await db.execute({
          sql: `INSERT INTO clinical_logs (joke_used, target_group, location, result_status, observation, researcher, recovery_time)
                VALUES (?, ?, ?, '실전 현장', ?, ?, '현장 연구원', '약 10분') RETURNING *`,
          args: [
            str(b.jokeUsed, 200),
            str(b.targetGroup, 100, false) || '미상',
            b.resultStatus === 'FAIL' ? 'FAIL' : 'SUCCESS',
            str(b.observation, 1000),
          ],
        });
        return res.json(toLog(rows[0]));
      }
    }

    if (resource === 'ai' && req.method === 'POST') {
      const topic = str(req.body?.topic, 50, false) || '일상생활';
      const temperature = str(req.body?.temperature, 20, false) || '-40°C';
      return res.json(await generateJoke(topic, temperature));
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function generateJoke(topic, temperature) {
  // ponytail: 키 없으면 로컬 폴백. 진짜 생성이 필요하면 ANTHROPIC_API_KEY만 넣으면 된다.
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      question: `${topic} 관련 연구: 세상에서 가장 빠른 ${topic}은?`,
      answer: `번개 ${topic}`,
      analysis: `단어 '${topic}'와 과속 기상 현상인 '번개'의 결합을 통한 기초 음운 유희 분석. (AI 미연결 상태의 임시 논문)`,
      temperature,
    };
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: '당신은 국립 아재개그연구소의 AI 수석연구원입니다. JSON 객체 하나만 출력하세요.',
      messages: [{
        role: 'user',
        content: `주제 '${topic}'에 관한 썰렁하고 참신한 한국어 아재개그 1개를 만드세요.
{"question":"개그 질문","answer":"정답","analysis":"음운론적/학술적 구조 분석 2문장","temperature":"${temperature}"}`,
      }],
    }),
  });
  if (!r.ok) throw new Error(`AI 연구원 응답 실패 (${r.status})`);
  const data = await r.json();
  const text = data.content?.[0]?.text ?? '';
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
