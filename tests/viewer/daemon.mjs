// 데몬이 없으면 연결 거부 스택이 테스트 실패처럼 읽힌다 — 첫 접속에서 한 줄로 끝낸다. 종료 3은 1(테스트 실패)과 가르려고.
// Chrome을 띄우기 전에 부른다 — 뒤에서 끝내면 Chrome과 임시 프로필이 남는다. 연결 거부가 아닌 오류는 스택 그대로 둔다.
export async function requireDaemon(viewer) {
  try {
    await fetch(new URL('/status', viewer));
  } catch (error) {
    if (error?.cause?.code !== 'ECONNREFUSED') throw error;
    console.error(`데몬이 떠 있지 않다 — prevue status 확인 (${viewer})`);
    process.exit(3);
  }
}

// 앞 테스트가 인터랙티브 카드를 켠 채로 죽으면 다음 테스트가 그 화면에서 시작해 연쇄로 깨진다 — 보드로 되돌리고 그리기가 끝나길 기다린다.
// 이미 보드면 아무것도 보내지 않는다(나가기는 보드를 다시 채운다). 보드가 없는 데몬(단건 프리뷰 · 파일 없이 띄움)은 그대로 둔다.
export async function toBoard(viewer) {
  const read = () => fetch(new URL('/viewer/state', viewer)).then(response => response.json());
  let state = await read();
  if (!state.board || (!state.focus && !state.busy)) return state;
  if (state.focus) await fetch(new URL('/viewer/exit', viewer), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  for (const end = Date.now() + 30_000; (state.focus || state.busy) && Date.now() < end; state = await read()) await new Promise(resolve => setTimeout(resolve, 100));
  if (state.focus || state.busy) throw Error('데몬을 보드로 되돌리지 못했다');
  return state;
}
