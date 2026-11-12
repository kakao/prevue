import { useLayoutEffect } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';

// 외부 빌드가 끝나기를 기다린다는 작은 안내. 마지막 정상 그림은 흐리지 않고 그대로 둔다.
export function BuildNotice({ pending, host }: { pending: boolean; host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  useLayoutEffect(() => { if (element) element.hidden = !pending; }, [element, pending]);
  return place(phrase('build.notice'), (ref, children) => <aside className="build-notice" id="buildNotice" role="status" ref={ref} hidden>{children}</aside>);
}
