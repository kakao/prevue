import { createResizeScene } from "./resize-scene.js";
import { post, viewerStream } from "./api.js";
import { phrase } from "./strings.js";
import { flash } from "./capsule.js";
import { reduced, motionToken, motionMs } from "./motion.js";

const sizeKey = size => {
  if (!size) return "original";
  if (size.kind === "device") return `${size.device === "duo" ? "ipduo" : size.device}:${size.folded ? "cover" : "open"}${size.landscape ? ":rot" : ""}`;
  return size.preset || `custom:${size.widthDp}x${size.heightDp}`;
};

// 가장자리 색 — 틀에서 그림이 덮지 못한 띠를 빈칸이 아니라 앱의 바탕으로 잇는다. 오른쪽 끝 세로줄과 아래 끝 가로줄의 가장 흔한 색.
function edgeOf(src, w, h) {
  try {
    const c = document.createElement("canvas"); c.width = 132; c.height = 132;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(src, w - 3, 0, 3, h, 0, 0, 4, 128);
    g.drawImage(src, 0, h - 3, w, 3, 4, 128, 128, 4);
    // JPEG · 그러데이션의 잡음에 흔들리지 않게 4단위로 묶어 세고, 가장 많은 묶음의 평균을 쓴다.
    const count = new Map(), take = d => { for (let i = 0; i < d.length; i += 4) {
      const k = `${d[i] >> 2},${d[i + 1] >> 2},${d[i + 2] >> 2}`, c = count.get(k) || [0, 0, 0, 0];
      c[0]++; c[1] += d[i]; c[2] += d[i + 1]; c[3] += d[i + 2]; count.set(k, c); } };
    take(g.getImageData(0, 0, 4, 128).data); take(g.getImageData(4, 128, 128, 4).data);
    const [n, r, gr, b] = [...count.values()].sort((a, b) => b[0] - a[0])[0];
    return `rgb(${Math.round(r / n)},${Math.round(gr / n)},${Math.round(b / n)})`;
  } catch { return "var(--surface-container)"; }
}

export function createResizeController({ shot, stage, wrap, layout, dimensions, originalSize, zoomState, preparation, firstFrame }) {
  const root = document.getElementById("resizeScene"), geometry = document.getElementById("resizeGeometry");
  const placeholder = document.getElementById("workspaceLoading"), loadingText = document.getElementById("workspaceLoadingText");
  let frameRect = null;
  let active = false, preview = null, current = null, key = null, stream = null, loading = null, epoch = 0;
  let original = null, shown = false, pending = false;
  let preparing = false, arrival = null;
  const decoded = new Map(), edges = new Map();
  const edgeOfUrl = img => { if (!edges.has(img.src)) edges.set(img.src, edgeOf(img, img.naturalWidth, img.naturalHeight)); return edges.get(img.src); };
  const scene = createResizeScene(root, {
    request: sel => {
      if (preparing) return Promise.resolve(false);
      const [dev, state, turn] = sel.split(":"), device = scene.devices.has(dev);
      const body = device ? { device: dev === "ipduo" ? "duo" : dev, folded: state === "cover", landscape: turn === "rot" }
        : { size: sel.startsWith("custom:") ? sel.slice(7) : sel };
      // 장면이 실패를 알아야 끌던 틀을 지금 크기로 되돌린다 — 성공 여부로 답한다
      return post("/viewer/resize", body).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return true; })
        .catch(e => { flash(phrase("resize.failed", { why: e.message })); return false; });
    },
    layout: (rect, moving) => {
      if (!active) return;
      // 확대의 기준점은 틀의 왼쪽 위다. 접기 · 돌리기 · 크기로 틀이 옮겨 가면 기준점이 따라 뛰어 화면이 튀었다 —
      // 옮겨 간 만큼 이동값을 되돌려 geometry 변환을 그대로 두면, 보는 자리는 가만있고 기기만 그 안에서 바뀐다.
      const zoom = zoomState();
      if (frameRect && zoom.z !== 1) {
        zoom.x += (1 - zoom.z) * ((frameRect.cx - frameRect.w / 2) - (rect.cx - rect.w / 2));
        zoom.y += (1 - zoom.z) * (frameRect.y - rect.y);
      }
      frameRect = rect;
      layout(rect);
      transform();
      stage.classList.toggle("resize-hidden", moving || (!shown && !preparing));
      root.classList.toggle("await-live", !shown);
    },
  });
  function prepare(on, failed = false) {
    preparing = on;
    root.classList.toggle("preparing", on);
    shot.setAttribute("aria-busy", String(on && !failed));
    placeholder.hidden = !on;
    placeholder.classList.toggle("failed", failed);
    loadingText.textContent = failed ? phrase("workspace.loading.failed") : phrase("workspace.loading");
    for (const el of root.querySelectorAll("input")) el.disabled = on;
    for (const el of document.querySelectorAll("#pnPick button, #devCtl button")) el.disabled = on;
    scene.sliderOff(on);
    preparation(on, failed);
  }
  function spec(img, st) {
    const k = current?.pxPerDp || 2.625;
    return { url: img.src, dpW: st?.widthDp || img.naturalWidth / k, dpH: st?.heightDp || img.naturalHeight / k, edge: edgeOfUrl(img) };
  }
  function snapshot() {
    if (!shot.naturalWidth || !current || !shown) return;
    try {
      const c = document.createElement("canvas");
      c.width = shot.naturalWidth; c.height = shot.naturalHeight;
      c.getContext("2d").drawImage(shot, 0, 0);
      const d = dimensions();
      scene.image(key, { url: c.toDataURL("image/jpeg", .92), dpW: current.size?.widthDp || d.w / (current.pxPerDp || 2.625), dpH: current.size?.heightDp || d.h / (current.pxPerDp || 2.625), edge: edgeOf(c, c.width, c.height) });
    } catch { /* 스트림이 이미 바뀌었으면 마지막 PNG를 쓴다 */ }
  }
  function load(url) {
    if (!decoded.has(url)) {
      const img = new Image(); img.src = url;
      decoded.set(url, img.decode().then(() => img).catch(e => { decoded.delete(url); throw e; }));
    }
    return decoded.get(url);
  }
  // 디코드한 그림은 지금 상태가 가리키는 것(라이브 첫 장 + 미리 그린 자세, 최대 10장)만 붙든다 — 개수로 밀어내면 쓰는 그림이 빠진다.
  function prune(f) {
    const keep = new Set([f.imageUrl, ...(f.postures || []).map(p => p.imageUrl)]);
    for (const url of decoded.keys()) if (!keep.has(url)) decoded.delete(url);
    const abs = new Set([...keep].map(u => new URL(u, location.href).href));
    for (const url of edges.keys()) if (!abs.has(url)) edges.delete(url);
  }
  function target(f) {
    const s = f.size;
    return { sel: sizeKey(s), w: s?.widthDp || original?.w || 411, h: s?.heightDp || original?.h || 891 };
  }
  function update(f, error) {
    if (!f?.interactive) { disable(); return false; }
    const changed = preview !== f.previewId;
    if (changed) disable();
    active = true;
    if (stage.parentElement !== geometry) geometry.append(stage);
    document.body.classList.add("resizing-ui"); wrap.classList.add("resize-wrap");
    if (changed || !preview) {
      preview = f.previewId;
      prepare(true);
      shot.removeAttribute("src"); shot.dataset.url = "";
      const base = originalSize(), d = dimensions(), k = f.pxPerDp || 2.625;
      const originalKnown = !!((base?.w && base?.h) || (d.w && d.h));
      original = { w: base?.w || d.w / k || 411, h: base?.h || d.h / k || 891, img: null };
      root.classList.toggle("measuring", !f.size && !originalKnown);
      scene.setOriginal(original.w, original.h, null);
      scene.enable(true);
    }
    const next = sizeKey(f.size), sized = current && next !== key;
    if (sized) { snapshot(); pending = true; shown = false; stage.classList.add("resize-hidden"); }
    const previous = current;
    current = f; key = next;
    if (previous && !sized && f.imageUrl !== previous.imageUrl) scene.clearImages();
    for (const p of f.postures || []) {
      const gen = epoch;
      load(p.imageUrl).then(img => { if (active && gen === epoch && current?.postures?.some(x => x.imageUrl === p.imageUrl)) scene.image(sizeKey(p.size), spec(img, p.size)); }).catch(() => {});
    }
    if (original) scene.update(target(f), !previous);
    if (preparing) prepare(true, !!error);
    // 렌더가 끝난 상태만 읽어 옛 PNG를 새 크기의 첫 장으로 쓰지 않는다.
    const attached = !error && !document.hidden && !!f.streamUrl && (!pending || f.streamUrl !== stream || f.imageUrl !== previous?.imageUrl);
    if (attached && (f.streamUrl !== stream || !shown || sized)) {
      const token = `${epoch}:${next}:${f.streamUrl}:${f.imageUrl}`;
      if (loading !== token) {
        loading = token;
        const gen = epoch;
        load(f.imageUrl).then(img => {
          if (!active || document.hidden || gen !== epoch || loading !== token || key !== next) return;
          const st = f.size;
          if (!st) {
            const k = f.pxPerDp || 2.625;
            original = { w: img.naturalWidth / k, h: img.naturalHeight / k, img: spec(img, st) };
            scene.setOriginal(original.w, original.h, original.img);
            if (preparing) scene.update(target(f), true);
          }
          scene.image(next, spec(img, st));
          stream = f.streamUrl; pending = false;
          dimensions(img.naturalWidth, img.naturalHeight);
          // MJPEG를 복제하지 않는다. 정지 그림을 디코드한 뒤 같은 img를 새 스트림에 붙인다.
          shot.onload = () => {
            shot.onload = null;
            if (!active || document.hidden || gen !== epoch || key !== next || stream !== f.streamUrl) return;
            shown = true;
            const first = preparing;
            prepare(false);
            root.classList.remove("await-live", "measuring");
            stage.classList.toggle("resize-hidden", scene.moving());
            shot.dataset.still = f.imageUrl;   // 스트림의 첫 프레임이 아직이면 나가는 모프가 이 그림을 담는다
            shot.src = shot.dataset.url = viewerStream(f.streamUrl);
            // 진입 모프가 카드 그림을 자리 표시로 들고 있으면 그 틀이 위에서 흐려진다 — 둘 다 페이드하면 가운데서 바탕이 비친다.
            if (first && !firstFrame() && !reduced.matches) arrival = shot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: motionMs("--duration-short3"), easing: motionToken("--easing-decelerate") });
          };
          shot.src = f.imageUrl; shot.dataset.url = f.imageUrl;
        }).catch(e => { if (gen === epoch) { loading = null; if (preparing) prepare(true, true); flash(phrase("resize.image.failed", { why: e.message })); } });
      }
    }
    prune(f);
    return true;
  }
  function disable() {
    if (!active && !preview) return;
    epoch++; active = false; preview = current = key = stream = loading = original = null; shown = pending = false;
    arrival?.cancel(); arrival = null;
    prepare(false);
    wrap.append(stage);
    scene.enable(false); decoded.clear(); edges.clear();
    root.classList.remove("measuring");
    geometry.style.transform = "";
    document.body.classList.remove("resizing-ui"); wrap.classList.remove("resize-wrap"); stage.classList.remove("resize-hidden");
    shot.onload = null;
    for (const name of ["left", "top", "width", "height", "border-radius"]) stage.style.removeProperty(name);
  }
  function transform() {
    if (!frameRect) return;
    const zoom = zoomState();
    const left = frameRect.cx - frameRect.w / 2, top = frameRect.y;
    geometry.style.transform = `translate(${zoom.x + (1-zoom.z)*left}px, ${zoom.y + (1-zoom.z)*top}px) scale(${zoom.z})`;
  }
  return {
    update, disable,
    preparing: () => preparing,
    suspend() { epoch++; stream = loading = null; shot.onload = null; },
    zoom(animate) { if (!active) return false; geometry.classList.toggle("zoom-anim",!!animate); transform(); return true; },
    relayout: () => { if (active) scene.relayout(); },
    // 장면이 그린 1dp 의 CSS px — 배율 숫자의 기준. 스트림 그림의 해상도 · 밀도와 무관하다
    pxPerDp: () => active && frameRect ? frameRect.s : null,
    moving: () => active && (!shown || scene.moving()),
  };
}
