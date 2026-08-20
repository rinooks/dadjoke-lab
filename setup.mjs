// 1회 실행: 테이블 생성 + 초기 논문 시딩. `node --env-file=.env setup.mjs`
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.batch([
  `CREATE TABLE IF NOT EXISTS jokes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     category TEXT NOT NULL,
     question TEXT NOT NULL,
     answer TEXT NOT NULL,
     analysis TEXT NOT NULL,
     author TEXT NOT NULL,
     temperature INTEGER NOT NULL,
     freezes INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS clinical_logs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     joke_used TEXT NOT NULL,
     target_group TEXT NOT NULL,
     location TEXT NOT NULL,
     result_status TEXT NOT NULL CHECK (result_status IN ('SUCCESS','FAIL')),
     observation TEXT NOT NULL,
     researcher TEXT NOT NULL,
     recovery_time TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
], 'write');

const { rows } = await db.execute('SELECT count(*) AS n FROM jokes');
if (Number(rows[0].n) > 0) {
  console.log('이미 시딩됨. 스키마만 확인하고 종료.');
  process.exit(0);
}

const jokes = [
  ['조류/동물학', '참새가 집을 잃었을 때 발생하는 경제적 현상은?', '새 패 (전세 역전이 아닌 새 패배)', '조류 명칭 "새"와 카드의 "패", "전세"의 음운적 중의성을 이용한 주거 부동산 경제학적 고찰.', '김냉동 석좌교수', -35, 42],
  ['영문-한글 혼용', '왕이 넘어질 때 나는 소리는?', '킹콩', '영단어 King(왕)과 물리적 충격 의성어 "콩"의 고난도 음운 결합 유희.', '이빙하 수석연구원', -18, 89],
  ['IT/비즈니스', '신발이 화가 나면 무엇이 되는가?', '신발끈 (신발 끈/분노)', '일상적 착용 용품의 명칭에 감정 상태인 "끈(끊다/화내다)"의 은유적 구조를 투영.', '박썰렁 연구원', -45, 112],
  ['생활밀착형', '세상에서 가장 가난한 왕은?', '최저임금 (최저 킹-금)', '최저임금제도의 사회경제적 개념과 왕(King)의 어원을 풍자적 기법으로 결합.', '최극지 연구소장', -22, 64],
  ['음운론', '바나나가 웃으면 무엇인가?', '바나나킥', '과일 바나나와 희극적 웃음(Kick/비웃음)의 과자 브랜드 융합 연구.', '정동결 연구원', -12, 31],
];

const logs = [
  ['신발이 화나면 신발끈', '직장 마케팅 팀원 5인', '주간 아이디어 회의실', 'FAIL', '투약 즉시 회의실 기온 약 5도 감소. 팀장님이 안경을 고쳐 쓰며 3초간 정적 유지함. 커피 한 모금으로 수습.', '김인턴 연구원', '약 15분 소요'],
  ['왕이 넘어지면 킹콩', '초등학교 조카 2인', '명절 친척집 거실', 'SUCCESS', '폭소 유발 성공. 조카들이 학교에 가져가서 쓰겠다며 노트북 메모장에 기재함. 높은 임상 가치 인정.', '이삼촌 수석원', '수습 필요 없음'],
];

await db.batch([
  ...jokes.map((args) => ({
    sql: 'INSERT INTO jokes (category, question, answer, analysis, author, temperature, freezes) VALUES (?,?,?,?,?,?,?)',
    args,
  })),
  ...logs.map((args) => ({
    sql: 'INSERT INTO clinical_logs (joke_used, target_group, location, result_status, observation, researcher, recovery_time) VALUES (?,?,?,?,?,?,?)',
    args,
  })),
], 'write');

console.log(`시딩 완료: 논문 ${jokes.length}편, 임상일지 ${logs.length}건`);
