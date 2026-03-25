const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 500) {
  return json({ error: msg }, status);
}

// ── Notion API 헬퍼 ────────────────────────────────────────────────

async function notionRequest(env, path, method = 'GET', body = null) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization':  `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Notion 페이지 생성 헬퍼 ────────────────────────────────────────

function textProp(value) {
  return { rich_text: [{ text: { content: String(value ?? '') } }] };
}

function numProp(value) {
  return { number: typeof value === 'number' ? value : null };
}

function dateProp(isoString) {
  return { date: { start: isoString } };
}

function selectProp(value) {
  return { select: { name: String(value) } };
}

function titleProp(value) {
  return { title: [{ text: { content: String(value ?? '') } }] };
}

// ── Gemini AI 영양 분석 ────────────────────────────────────────────

async function analyzeNutrition(env, menuName) {
  const prompt = `당신은 영양 전문가입니다. 아래 음식의 총 칼로리(kcal)와 단백질(g)을 계산하세요.

음식: "${menuName}"

규칙:
- 콤마(,)로 구분된 경우 각각 계산 후 합산
- 숫자는 그램(g) 기준. 예: 닭가슴살150 = 닭가슴살 150g
- 단백질 과대 추정 금지. 실제 식품 영양성분표 기준으로 보수적으로 계산

주요 기준치 (100g당):
- 닭가슴살(생): 110kcal, 22g 단백질
- 흰쌀밥: 130kcal, 2.5g 단백질
- 소고기(등심): 250kcal, 18g 단백질
- 돼지고기(삼겹살): 395kcal, 17g 단백질
- 달걀 1개(50g): 75kcal, 6g 단백질
- 두부: 80kcal, 8g 단백질
- 햄버거(패스트푸드): 1개당 500kcal, 25g 단백질
- 규동(소고기덮밥): 1인분 650kcal, 22g 단백질
- 라면(1봉): 500kcal, 10g 단백질
- 고구마: 100g당 130kcal, 1.5g 단백질
- 단백질바: 1개 200kcal, 20g 단백질
- 프로틴쉐이크: 1스쿱 120kcal, 25g 단백질

주의: 단백질은 반드시 실제 식품영양성분표 기준으로 계산. 절대 과대 추정하지 말 것.
일반 혼합밥류(덮밥, 볶음밥 등)의 단백질은 20~30g 이하임.

JSON만 출력. 설명 없이.
출력 형식: {"calories": 정수, "protein": 정수}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: '당신은 영양 계산 전문가입니다. 반드시 {"calories": 정수, "protein": 정수} 형태의 JSON만 출력하세요. 수식이나 계산식은 절대 포함하지 말고, 계산이 완료된 최종 정수 숫자만 넣으세요.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API 오류 ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  // JSON 파싱 (마크다운 코드블록 제거 + 중괄호 추출)
  const cleaned = text.replace(/```json?/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`JSON 추출 실패: ${text}`);
  const parsed = JSON.parse(match[0]);

  // 최상위에 calories/protein 있으면 그대로, 아니면 첫 번째 중첩 객체에서 찾기
  let calories = Number(parsed.calories);
  let protein  = Number(parsed.protein);
  if (!calories && !protein) {
    const nested = Object.values(parsed).find(v => v && typeof v === 'object');
    if (nested) { calories = Number(nested.calories); protein = Number(nested.protein); }
  }

  return { calories: Math.round(calories) || 0, protein: Math.round(protein) || 0 };
}

// ── 라우터 ─────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // ── 운동 기록 저장 ──────────────────────────────────────────
      if (path === '/api/workouts' && method === 'POST') {
        const { session } = await request.json();

        const pages = [];
        for (const bpl of session.bodyPartLogs) {
          for (const ex of bpl.exercises) {
            const maxWeight = Math.max(...ex.sets.map(s => s.weight));
            const totalVol  = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);
            const setRecord = ex.sets.map(s => `${s.weight}x${s.reps}`).join(' / ');

            pages.push(notionRequest(env, '/pages', 'POST', {
              parent: { database_id: env.NOTION_WORKOUT_DB_ID },
              properties: {
                '운동명':   titleProp(ex.exercise.name),
                '날짜':     dateProp(session.date),
                '부위':     selectProp(bpl.bodyPart),
                '세트기록': textProp(setRecord),
                '최대중량': numProp(maxWeight),
                '총볼륨':   numProp(totalVol),
                '세션ID':   textProp(session.id),
              },
            }));
          }
        }

        await Promise.all(pages);
        return json({ success: true, message: '운동 기록 저장 완료' });
      }

      // ── 운동 기록 조회 ──────────────────────────────────────────
      if (path === '/api/workouts' && method === 'GET') {
        const data = await notionRequest(env, `/databases/${env.NOTION_WORKOUT_DB_ID}/query`, 'POST', {
          sorts: [{ property: '날짜', direction: 'descending' }],
          page_size: 200,
        });

        // Notion rows → WorkoutSession[] 변환 (세션ID 기준 그룹핑)
        const sessionMap = new Map();
        for (const page of data.results) {
          const p = page.properties;
          const sessionId = p['세션ID']?.rich_text?.[0]?.text?.content ?? page.id;
          const date      = p['날짜']?.date?.start ?? '';
          const bodyPart  = p['부위']?.select?.name ?? '';
          const exName    = p['운동명']?.title?.[0]?.text?.content ?? '';
          const setRecord = p['세트기록']?.rich_text?.[0]?.text?.content ?? '';
          const maxWeight = p['최대중량']?.number ?? 0;

          // 세트기록 "80x5 / 90x3" → sets 배열
          const sets = setRecord.split('/').map((s, i) => {
            const [w, r] = s.trim().split('x').map(Number);
            return { id: `s${i}`, weight: w || 0, reps: r || 0 };
          });

          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, {
              id: sessionId,
              date,
              bodyPartLogs: [],
            });
          }
          const session = sessionMap.get(sessionId);
          let bpl = session.bodyPartLogs.find(b => b.bodyPart === bodyPart);
          if (!bpl) {
            bpl = { bodyPart, exercises: [] };
            session.bodyPartLogs.push(bpl);
          }
          bpl.exercises.push({
            id: page.id,
            exercise: { id: page.id, name: exName, bodyPart, target: '' },
            sets,
            note: '',
            maxWeight,
          });
        }

        return json([...sessionMap.values()]);
      }

      // ── 식단 AI 분석 + 저장 ────────────────────────────────────
      if (path === '/api/diet/analyze' && method === 'POST') {
        const { menuName, timestamp } = await request.json();
        if (!menuName) return err('menuName 필요', 400);

        // Gemini로 영양 분석
        const { calories, protein } = await analyzeNutrition(env, menuName);

        // Notion 저장
        const page = await notionRequest(env, '/pages', 'POST', {
          parent: { database_id: env.NOTION_DIET_DB_ID },
          properties: {
            '메뉴명':   textProp(menuName),
            '날짜':     dateProp(timestamp ?? new Date().toISOString()),
            '칼로리':   numProp(calories),
            '단백질':   numProp(protein),
          },
        });

        return json({
          id:        page.id,
          menuName,
          calories,
          protein,
          timestamp: timestamp ?? new Date().toISOString(),
        });
      }

      // ── 식단 목록 조회 ──────────────────────────────────────────
      if (path === '/api/diet' && method === 'GET') {
        const data = await notionRequest(env, `/databases/${env.NOTION_DIET_DB_ID}/query`, 'POST', {
          sorts: [{ property: '날짜', direction: 'descending' }],
          page_size: 100,
        });

        const entries = data.results.map(page => ({
          id:        page.id,
          menuName:  page.properties['메뉴명']?.title?.[0]?.text?.content ?? 
                     page.properties['메뉴명']?.rich_text?.[0]?.text?.content ?? 
                     page.properties['이름']?.title?.[0]?.text?.content ?? 
                     page.properties['Name']?.title?.[0]?.text?.content ?? '',
          calories:  page.properties['칼로리']?.number ?? 0,
          protein:   page.properties['단백질']?.number ?? 0,
          timestamp: page.properties['날짜']?.date?.start ?? '',
        }));

        return json(entries);
      }

      // ── 식단 삭제 ───────────────────────────────────────────────
      if (path.startsWith('/api/diet/') && method === 'DELETE') {
        const pageId = path.replace('/api/diet/', '');
        await notionRequest(env, `/pages/${pageId}`, 'PATCH', { archived: true });
        return json({ success: true });
      }

      // ── 식단 수동 저장 ───────────────────────────────────────────
      if (path === '/api/diet' && method === 'POST') {
        const entry = await request.json();
        if (!entry.menuName) return err('menuName 필요', 400);

        const page = await notionRequest(env, '/pages', 'POST', {
          parent: { database_id: env.NOTION_DIET_DB_ID },
          properties: {
            '메뉴명':   textProp(entry.menuName), // DB 설정에 따라 textProp 또는 titleProp일 수 있음
            '날짜':     dateProp(entry.timestamp ?? new Date().toISOString()),
            '칼로리':   numProp(entry.calories),
            '단백질':   numProp(entry.protein),
          },
        });

        return json({
          id:        page.id,
          menuName:  entry.menuName,
          calories:  entry.calories,
          protein:   entry.protein,
          timestamp: entry.timestamp ?? new Date().toISOString(),
        });
      }

      return err('Not found', 404);

    } catch (e) {
      console.error(e);
      return err(e.message ?? '서버 오류');
    }
  },
};
