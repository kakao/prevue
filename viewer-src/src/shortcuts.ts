// 단축키 — 표 하나가 디스패치와 `?` 도움말(ShortcutHelp)을 함께 갖는다. 같은 키가 화면마다 다른 일을 하므로 화면을 먼저 본다.
// 하는 일은 기존 모듈의 함수라 actions 로 받는다 — Storybook 은 표만 그린다.
export type ShortcutActions = {
  /** 끊겼으면 화면이 없다(offline) — 탭이 0개인 빈 화면(시작 화면)과 가른다(D-63). */
  screen(): string;
  tabCount(): number;
  moveCursor(d: number): void;
  openCursor(): void;
  exitFocus(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomFit(): void;
  stepTab(d: number): void;
  jumpTab(n: number): void;
  openQuickOpen(opener: Element | null): void;
  helpOpen(): boolean;
  toggleHelp(on: boolean, byKey?: boolean): void;
};

/** keys 는 KeyboardEvent.key, cap 은 도움말에 그릴 키캡. run 이 없는 줄은 마우스 동작이라 도움말에만 있다. */
export type Shortcut = { keys?: string[]; cap: string[]; combo?: boolean; label: string; when?: () => boolean; run?: (e: KeyboardEvent) => void };
export type ShortcutGroup = { group: string; rows: Shortcut[] };

/** when 이 false 면 그 화면에서 그 키는 아무 일도 하지 않는다 — 다음 줄로 넘어가지 않는다. */
export function shortcutTable(phrase: (key: string) => string, a: ShortcutActions): ShortcutGroup[] {
  return [
    { group: phrase('keys.group.board'), rows: [
      { keys: ['ArrowLeft', 'ArrowRight'], cap: ['←', '→'], label: phrase('keys.card.pick'), when: () => a.screen() === 'board',
        run: e => a.moveCursor(e.key === 'ArrowLeft' ? -1 : 1) },
      { keys: ['Enter', 'i'], cap: ['↩', 'I'], label: phrase('keys.card.open'), when: () => a.screen() === 'board', run: () => a.openCursor() },
    ] },
    { group: phrase('keys.group.single'), rows: [
      // ← → 는 비워 둔다 — 이웃 장으로 넘기지 않는다(W3). 나오면 그 카드에 커서가 있어 → ↩ 로 이웃에 든다.
      // I 는 보드에서 카드를 열고 한 장에서 닫는다 — 같은 키로 들고 난다. 한 장은 늘 조작이라 보기 · 조작을 바꾸는 뜻은 없다(D-155).
      { keys: ['Escape', 'i'], cap: ['esc', 'I'], label: phrase('keys.single.back'), when: () => a.screen() === 'focus', run: () => a.exitFocus() },
      { keys: ['+', '-'], cap: ['+', '−'], label: phrase('keys.single.zoom'), when: () => a.screen() === 'focus',
        run: e => (keyOf(e) === '+' ? a.zoomIn : a.zoomOut)() },
      { keys: ['0'], cap: ['0'], label: phrase('keys.single.fit'), when: () => a.screen() === 'focus', run: () => a.zoomFit() },
      { cap: [phrase('keys.cap.twoFingers'), phrase('keys.cap.scroll')], label: phrase('keys.single.scroll') },
      { cap: ['Space', phrase('keys.cap.drag')], combo: true, label: phrase('keys.single.pan') },
      { cap: ['⌥', phrase('keys.cap.click')], combo: true, label: phrase('keys.single.point') },
    ] },
    // 열린 파일이 둘 이상일 때만. 카드 이동(← →)에 Shift 를 더한 "한 단계 큰 이동"이다 — ⌘1~9 · ⌃Tab 은 브라우저가 가져간다. 키로는 닫지 않는다.
    { group: phrase('keys.group.tabs'), rows: [
      { keys: ['⇧ArrowLeft', '⇧ArrowRight'], cap: ['⇧←', '⇧→'], label: phrase('keys.tabs.step'), when: () => a.tabCount() > 1,
        run: e => a.stepTab(e.key === 'ArrowLeft' ? -1 : 1) },
      { keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], cap: ['1', '…', '9'], label: phrase('keys.tabs.jump'), when: () => a.tabCount() > 1,
        run: e => a.jumpTab(Number(keyOf(e))) },
      { cap: ['×'], label: phrase('keys.tabs.close') },
    ] },
    { group: phrase('keys.group.anywhere'), rows: [
      // 파일을 여는 것은 화면과 무관하다 — 보드에서도 작업 공간에서도 같은 패널이다(D-56).
      // 시작 화면(탭 0개)이면 본문의 필드로 간다(D-63).
      { keys: ['/'], cap: ['/', '⌘K'], label: phrase('keys.any.open'), when: () => a.screen() !== 'offline', run: () => a.openQuickOpen(document.activeElement) },
      { cap: [phrase('keys.cap.click')], label: phrase('keys.any.point') },
      { keys: ['?'], cap: ['?'], label: phrase('keys.any.help'), when: () => true, run: () => a.toggleHelp(!a.helpOpen(), true) },
    ] },
  ];
}

/** 입력 중이면 단축키는 죽는다 — 검색창에 `i`를 치면 글자가 들어가야 한다. */
function typing(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

/** 한글 입력 상태면 `i`가 `ㅑ`로 온다. 글자 키는 물리 키(code)로 읽는다. */
export function keyOf(e: KeyboardEvent) {
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return '⇧' + e.key;
  if (/^Digit[1-9]$/.test(e.code) && !e.shiftKey) return e.code.slice(5);
  if (e.code === 'KeyI') return 'i';
  if (e.code === 'Slash' && e.shiftKey) return '?';
  if (e.code === 'Equal') return '+';        // = 와 + 를 가리지 않는다(Shift 를 누르든 말든)
  if (e.code === 'Minus') return '-';
  if (e.code === 'Digit0') return '0';
  return e.key;
}

/**
 * 떠 있는 층이 먼저 Esc 를 먹는다 — 도움말, 그다음 후보 고르기 · 배율 메뉴 · 폴더 팝오버 · 가리킨 카드. 닫은 것이 있으면 true.
 * 카드가 화면의 Esc 보다 먼저라 한 장에서는 첫 Esc 가 카드를 걷고 둘째가 보드로 나간다.
 */
export type EscapeLayers = { chooserOpen(): boolean; cancelChoice(): void; closeZoomMenu(): boolean; closeDeviceMenu(): boolean; closeDirPop(): boolean; closeCard(): boolean };

export function installShortcuts(table: ShortcutGroup[], a: ShortcutActions, layers: EscapeLayers) {
  const keydown = (e: KeyboardEvent) => {
    // ⌘K(Ctrl+K) — 웹 앱 검색의 관용 키. 브라우저의 주소창 검색보다 먼저 받는다. ⌘P(인쇄)는 잡지 않는다.
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.code === 'KeyK' && a.screen() !== 'offline') { e.preventDefault(); a.openQuickOpen(document.activeElement); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    const key = keyOf(e);
    // 버튼의 Enter 는 그 버튼이 받는다 — 키보드로 간 버튼(:focus-visible)만. 마우스로 누른 뒤 남은 포커스가 고른 카드 열기를 가져가면 안 된다(D-63).
    const btn = key === 'Enter' && e.target instanceof Element && e.target.closest('button, [role=button]');
    if (btn && btn.matches(':focus-visible')) return;
    if (key === 'Escape' && a.helpOpen()) { e.preventDefault(); a.toggleHelp(false); return; }
    if (key === 'Escape' && layers.chooserOpen()) { e.preventDefault(); layers.cancelChoice(); return; }
    if (key === 'Escape' && layers.closeZoomMenu()) { e.preventDefault(); return; }
    if (key === 'Escape' && layers.closeDeviceMenu()) { e.preventDefault(); return; }
    if (key === 'Escape' && layers.closeDirPop()) { e.preventDefault(); return; }
    if (key === 'Escape' && layers.closeCard()) { e.preventDefault(); return; }
    if (a.helpOpen() && key !== '?') return;
    for (const g of table) for (const r of g.rows) {
      if (!r.run || !r.keys!.includes(key) || !r.when!()) continue;
      e.preventDefault();
      r.run(e);
      return;
    }
  };
  addEventListener('keydown', keydown);
  return () => removeEventListener('keydown', keydown);
}
