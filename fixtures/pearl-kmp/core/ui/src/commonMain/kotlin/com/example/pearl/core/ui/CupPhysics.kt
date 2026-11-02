package com.example.pearl.core.ui

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/*
 * 컵 안의 물리 — 100×140 칸(컵 그림과 같은 좌표)에서 펄 · 얼음 · 젤리를 입자로 굴린다.
 * 중력 · 부력(밀도 비) · 점성 저항 · 물체끼리와 컵 벽 충돌 · 수면 스프링 물결 · 물방울 · 잠긴 부피만큼 오르는 수면.
 * 고정 시간 간격(1/240초)으로 나눠 적분해 프레임 간격이 달라도 같은 조작이면 같은 결과다. 랜덤은 넣은 차례가 씨앗이다.
 * 넣고 뺄 때 뚜껑이 열린다 — 빼는 것은 저항을 받으며 떠올라 수면을 뚫고 들려 나간다.
 * 다 멎으면 asleep이 되고, 화면은 그때 루프를 끝낸다 — 끝없이 도는 애니메이션이 없어야 정착을 기다리는 쪽이 멈춘다.
 */

enum class BodyKind { PEARL, ICE, JELLY }

private const val G = 1500f                 // 칸/초² — 실제보다 느리게, 눈으로 따라갈 만큼
private const val LIQUID = 1.03f             // 밀크티 밀도
private const val STEP = 1f / 240f
private const val MOUTH = 42f                // 컵 입구(뚜껑 자리)
private const val FLOOR = 135.5f             // 안쪽 바닥
private const val OFFSCREEN = -80f           // 화면 위 밖 — 넣는 것은 여기서 떨어져 들어오고, 빼는 것은 여기까지 올라가 사라진다
private const val ADD_SPAN = 0.18f            // 넣기 시차의 총 폭 — 한 단계(얼음 셋 · 펄 다섯)와 같다
private const val LIFT_SPAN = 0.24f           // 빼기 시차의 총 폭

/** 그 높이에서 컵 안쪽 반폭 — 위가 넓고 아래가 좁은 사다리꼴. */
fun cupHalfWidth(y: Float): Float = 32f - 9f * ((y.coerceIn(MOUTH, 130f) - MOUTH) / 88f)

class Body(
    val kind: BodyKind,
    var x: Float,
    var y: Float,
    val r: Float,
    val density: Float,
    val tone: Int = 0,
) {
    var vx = 0f
    var vy = 0f
    var angle = 0f
    var spin = 0f
    var squash = 0f
    var squashV = 0f
    var delay = 0f
    var wet = false
    var alpha = 1f
    var lifting = false
    // 공중 구간 — 곡선 경로(2차 베지에)를 이징으로 따라간다. ≥0 이면 진행 중(0~1)
    var flight = -1f
    var fx0 = 0f; var fy0 = 0f; var fcx = 0f; var fcy = 0f; var fx1 = 0f; var fy1 = 0f; var fdur = 0.3f
    var liftWait = 0f
    var dead = false
    var px = x
    var py = y
    val area: Float get() = if (kind == BodyKind.PEARL) (PI * r * r).toFloat() else (r * 1.8f).let { it * it }
    val active: Boolean get() = !dead && delay <= 0f
}

class Droplet(var x: Float, var y: Float, var vx: Float, var vy: Float, val r: Float) {
    var life = 0f
}

class CupWorld(private val seedBase: Int = 0) {
    val bodies = mutableListOf<Body>()
    val droplets = mutableListOf<Droplet>()
    private val live = ArrayList<Body>()
    // 수면 스프링 물결 — 컵 폭을 칸 24개로 나눠 이웃끼리 퍼지게 한다
    private val cols = 24
    private val h = FloatArray(cols)
    private val hv = FloatArray(cols)
    var fill = 0.72f
    var tilt = 0f
    var wave = 0f
    var phase = 0f
    var rise = 0f
        private set
    var lid = 0f
        private set
    private var lidV = 0f
    private var lidTarget = 0f
    private var calm = 0f
    private var awake = 0f
    private var adds = 0
    var asleep = true
        private set
    private var quiet = false
    private var acc = 0f
    private var window = 0f
    private var stillBodies = false

    private fun col(x: Float): Float = ((x - 16f) / 68f * (cols - 1)).coerceIn(0f, cols - 1f)

    fun ripple(x: Float): Float {
        val c = col(x)
        val i = c.toInt().coerceAtMost(cols - 2)
        val t = c - i
        return h[i] * (1 - t) + h[i + 1] * t
    }

    fun surface(x: Float): Float =
        138f - fill * 96f - rise + tilt * (x - 50f) + wave * sin(x * 0.11f + phase) + ripple(x)

    private fun random(): Random = Random(seedBase * 7919 + adds++)

    private fun wake() { asleep = false; calm = 0f; awake = 0f; stillBodies = false; window = 0f }

    private fun open() { lidTarget = 1f; wake() }

    /** 위에서 하나씩 떨어뜨린다 — 자리 · 시차 · 회전 · 크기가 랜덤이다. */
    fun add(kind: BodyKind, n: Int) {
        if (n <= 0) return
        val rnd = random()
        open()
        val gap = stagger(if (kind == BodyKind.PEARL) 0.04f else 0.09f, ADD_SPAN, n)
        repeat(n) { i ->
            val b = when (kind) {
                BodyKind.PEARL -> Body(kind, 36f + rnd.nextFloat() * 28f, OFFSCREEN - rnd.nextFloat() * 24f, 5.2f + rnd.nextFloat() * 0.8f, 1.22f)
                BodyKind.ICE -> Body(kind, 32f + rnd.nextFloat() * 36f, OFFSCREEN - rnd.nextFloat() * 16f, 7.2f + rnd.nextFloat() * 1.2f, 0.917f)
                BodyKind.JELLY -> Body(kind, 34f + rnd.nextFloat() * 32f, OFFSCREEN - rnd.nextFloat() * 20f, 4.6f + rnd.nextFloat() * 0.6f, 1.05f, tone = i % 3)
            }
            b.delay = 0.1f + i * gap + rnd.nextFloat() * 0.04f
            val side = if (rnd.nextBoolean()) 1f else -1f
            b.fx1 = 34f + rnd.nextFloat() * 32f; b.fy1 = MOUTH - 4f
            b.fx0 = b.fx1 + side * (40f + rnd.nextFloat() * 20f); b.fy0 = b.y
            b.fcx = b.fx1 + side * (26f + rnd.nextFloat() * 14f); b.fcy = b.fy1 - 60f - rnd.nextFloat() * 20f
            b.x = b.fx0; b.px = b.x; b.py = b.y
            b.fdur = 0.26f + rnd.nextFloat() * 0.08f
            b.flight = 0f
            b.angle = rnd.nextFloat() * 1.6f - 0.8f
            b.spin = (rnd.nextFloat() - 0.5f) * 9f
            bodies += b
        }
    }

    /** 뺀다 — 뚜껑이 열리고, 위에 있는 것부터 떠올라 수면을 뚫고 들려 나간다. */
    fun remove(kind: BodyKind, n: Int) {
        val rnd = random()
        val pick = bodies.filter { it.kind == kind && !it.dead && !it.lifting }.sortedBy { it.y }.take(n)
        if (pick.isEmpty()) return
        open()
        val gap = stagger(if (kind == BodyKind.PEARL) 0.06f else 0.12f, LIFT_SPAN, pick.size)
        pick.forEachIndexed { i, b ->
            b.lifting = true
            b.liftWait = i * gap + rnd.nextFloat() * 0.04f
            b.spin += (rnd.nextFloat() - 0.5f) * 6f
        }
    }

    // 한꺼번에 많이 넣고 빼도 한 단계 바꿀 때와 같은 시간 안에 끝나도록 간격을 좁힌다
    private fun stagger(base: Float, span: Float, n: Int): Float = if (n <= 1) 0f else minOf(base, span / (n - 1))

    fun count(kind: BodyKind): Int = bodies.count { it.kind == kind && !it.dead && !it.lifting }

    /** 컵을 흔들었다 — 물체도 같이 밀리게 깨운다. */
    fun stir() = wake()

    /** 처음 모습 — 넣은 것을 컵 안에 흩어 놓고 멎을 때까지 미리 굴린다(효과 없이). */
    fun settled(pearls: Int, ice: Int, jelly: Int = 0): CupWorld {
        val rnd = random()
        fun put(kind: BodyKind, n: Int) = repeat(n) { i ->
            val b = when (kind) {
                BodyKind.PEARL -> Body(kind, 34f + rnd.nextFloat() * 32f, 100f + rnd.nextFloat() * 30f, 5.2f + rnd.nextFloat() * 0.8f, 1.22f)
                BodyKind.ICE -> Body(kind, 32f + rnd.nextFloat() * 36f, 64f + rnd.nextFloat() * 16f, 7.2f + rnd.nextFloat() * 1.2f, 0.917f)
                BodyKind.JELLY -> Body(kind, 34f + rnd.nextFloat() * 32f, 90f + rnd.nextFloat() * 30f, 4.6f + rnd.nextFloat() * 0.6f, 1.05f, tone = i % 3)
            }
            b.angle = rnd.nextFloat() * 0.6f - 0.3f
            bodies += b
        }
        put(BodyKind.PEARL, pearls); put(BodyKind.ICE, ice); put(BodyKind.JELLY, jelly)
        quiet = true
        asleep = false
        var n = 0
        while (!asleep && n++ < 2400) step(STEP)
        quiet = false
        h.fill(0f); hv.fill(0f); droplets.clear()
        asleep = true
        return this
    }

    /** 프레임 하나만큼 — 고정 간격으로 나눠 굴린다. */
    fun advance(dt: Float) {
        if (asleep) return
        acc += dt.coerceAtMost(0.05f)
        while (acc >= STEP && !asleep) { step(STEP); acc -= STEP }
    }

    private fun splash(x: Float, speed: Float, size: Float) {
        if (quiet) return
        val c = col(x).toInt()
        val push = min(speed, 600f) * 0.012f * size
        for (d in -2..2) {
            val i = (c + d).coerceIn(0, cols - 1)
            hv[i] += push * (1f - abs(d) * 0.3f)
        }
        val rnd = Random((x * 1000).toInt() + adds * 31)
        val drops = (speed / 90f * size).toInt().coerceIn(2, 9)
        repeat(drops) {
            val a = (rnd.nextFloat() - 0.5f) * 2.2f
            val v = 110f + rnd.nextFloat() * 140f * size
            droplets += Droplet(x + (rnd.nextFloat() - 0.5f) * 8f, surface(x) - 1f, sin(a) * v, -cos(a) * v, 1.1f + rnd.nextFloat() * 1.1f)
        }
    }

    // 잠긴 비율 — 얼음 · 젤리는 그림의 네모(한 변 1.8r) 기준이라 보이는 것과 부력이 같다
    private fun submerged(b: Body): Float {
        val half = if (b.kind == BodyKind.PEARL) b.r else b.r * 0.9f
        return (((b.y + half) - surface(b.x)) / (2f * half)).coerceIn(0f, 1f)
    }

    private fun step(dt: Float) {
        awake += dt
        // 뚜껑 — 스프링으로 튕겨 열리고 닫힌다
        lidV += ((lidTarget - lid) * 160f - lidV * (if (lidTarget > 0f) 13f else 26f)) * dt
        lid = (lid + lidV * dt).coerceIn(-0.05f, 1.15f)

        // 수면 물결
        for (i in 0 until cols) { hv[i] += (-h[i] * 55f - hv[i] * 4.2f) * dt }
        for (pass in 0..1) for (i in 0 until cols) {
            val l = if (i > 0) h[i - 1] - h[i] else 0f
            val r = if (i < cols - 1) h[i + 1] - h[i] else 0f
            hv[i] += (l + r) * 32f * dt
        }
        for (i in 0 until cols) h[i] += hv[i] * dt

        var moving = abs(lid - lidTarget) > 0.01f || abs(lidV) > 0.05f
        for (b in bodies) {
            if (b.dead) continue
            if (b.delay > 0f) { b.delay -= dt; moving = true; continue }
            if (b.flight >= 0f) { fly(b, dt); moving = true; continue }
            val f = submerged(b)
            // 들려 나가는 것은 컵 입구를 지나면 옆으로 휘며 가속해 화면 밖으로 — 속도가 끊기지 않는다
            val bend = if (b.lifting && b.liftWait <= 0f && b.y < MOUTH) (if (b.x < 50f) -1f else 1f) * 1400f else 0f
            val ax = -tilt * 1100f * f + bend
            var ay = G - G * (LIQUID / b.density) * f
            if (b.lifting) { if (b.liftWait > 0f) b.liftWait -= dt else ay -= 3400f }
            b.vx += ax * dt
            b.vy += ay * dt
            // 얼음은 잠길 때 세게 잡고 떠오를 때는 덜 잡는다 — 깊이 박혀도 금방 수면으로 돌아온다
            val drag = 0.15f + f * (if (b.kind == BodyKind.ICE) (if (b.vy > 0f) 20f else 6f) else 6.5f)
            val k = exp(-drag * dt)
            b.vx *= k; b.vy *= k
            b.x += b.vx * dt
            b.y += b.vy * dt
            b.angle += b.spin * dt
            b.spin *= exp(-(0.8f + f * 15f) * dt)
            if (b.kind == BodyKind.ICE) b.spin += -sin(4f * b.angle) * 22f * f * dt
            b.squashV += (-b.squash * 900f - b.squashV * 18f) * dt
            b.squash += b.squashV * dt
            // 수면을 뚫는 순간 — 들어갈 때 · 나올 때 둘 다 철벅
            val isWet = f > 0.2f
            if (isWet != b.wet) {
                val speed = abs(b.vy)
                if (speed > 60f) splash(b.x, speed, if (b.kind == BodyKind.ICE) 1.2f else 0.7f)
                b.wet = isWet
            }
            if (b.lifting) { moving = true; if (b.y < OFFSCREEN - 30f || b.x < -40f || b.x > 140f) b.dead = true }
        }

        // 겹침 풀기 — 무게(넓이 × 밀도)에 반비례해 민다
        // 1/240초마다 도는 자리라 목록을 새로 만들지 않고 하나를 다시 쓴다
        live.clear()
        for (b in bodies) if (b.active && b.flight < 0f && (!b.lifting || b.liftWait > 0f)) live += b
        repeat(3) {
            for (i in live.indices) for (j in i + 1 until live.size) {
                val a = live[i]; val c = live[j]
                // 얼음과 펄 · 젤리는 깊이가 달라 앞뒤로 지나간다 — 2차원 원끼리 막으면 펄이 얼음을 바닥에 가둔다
                if ((a.kind == BodyKind.ICE) != (c.kind == BodyKind.ICE)) continue
                val dx = c.x - a.x; val dy = c.y - a.y
                val d = sqrt(dx * dx + dy * dy)
                val reach = a.r + c.r
                if (d >= reach || d < 0.0001f) continue
                val nx = dx / d; val ny = dy / d
                val ma = a.area * a.density; val mc = c.area * c.density
                val over = reach - d
                a.x -= nx * over * mc / (ma + mc); a.y -= ny * over * mc / (ma + mc)
                c.x += nx * over * ma / (ma + mc); c.y += ny * over * ma / (ma + mc)
                val rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny
                if (rel < 0f) {
                    val imp = -(1.18f) * rel / (1f / ma + 1f / mc)
                    a.vx -= imp * nx / ma; a.vy -= imp * ny / ma
                    c.vx += imp * nx / mc; c.vy += imp * ny / mc
                    val tang = (c.vx - a.vx) * -ny + (c.vy - a.vy) * nx
                    a.spin -= tang * 0.008f; c.spin += tang * 0.008f
                    if (-rel > 40f) { a.squashV += -rel * 0.5f; c.squashV += -rel * 0.5f }
                }
            }
            for (b in live) walls(b)
        }
        // 멎었는지는 0.1초 동안 실제로 옮겨 간 거리로 본다 — 쌓인 것은 단계마다 아주 작게 떨려 한 단계로 재면 늘 움직인다
        window += dt
        if (window >= 0.1f) {
            stillBodies = live.all { hypot(it.x - it.px, it.y - it.py) < 0.4f && (it.kind != BodyKind.ICE || abs(it.spin) < 0.5f) }
            live.forEach { it.px = it.x; it.py = it.y }
            window = 0f
        }
        if (!stillBodies) moving = true

        // 물방울 — 포물선을 그리다 수면에 닿으면 사라지며 작은 물결을 남긴다
        val drops = droplets.iterator()
        while (drops.hasNext()) {
            val d = drops.next()
            d.life += dt
            d.vy += G * dt
            d.x += d.vx * dt; d.y += d.vy * dt
            if ((d.vy > 0f && d.y > surface(d.x)) || d.life > 1.4f) {
                val i = col(d.x).toInt(); hv[i] += 0.8f
                drops.remove()
            }
        }
        if (droplets.isNotEmpty()) moving = true

        // 잠긴 부피만큼 수면이 오른다(2차원이라 실제보다 줄여 쓴다)
        var displaced = 0f
        for (b in bodies) if (b.active && b.flight < 0f) displaced += submerged(b) * b.area
        val target = displaced * 0.0034f
        rise += (target - rise) * min(1f, dt * 12f)
        if (abs(target - rise) > 0.05f) moving = true
        if (h.any { abs(it) > 0.12f } || hv.any { abs(it) > 0.6f }) moving = true
        if (bodies.any { it.dead }) bodies.removeAll { it.dead }

        if (moving) calm = 0f else calm += dt
        // 모두 컵 안으로 들어가고 물방울이 가라앉으면 뚜껑을 닫는다 — 안에서 출렁이는 동안 내려앉는다
        if (lidTarget > 0f && droplets.isEmpty() && bodies.none { it.delay > 0f || it.lifting || it.flight >= 0f || it.y < MOUTH + it.r }) lidTarget = 0f
        if ((calm > 0.15f && lidTarget == 0f && abs(lid) < 0.01f) || awake > 7f) {
            h.fill(0f); hv.fill(0f); droplets.clear(); lid = 0f; lidV = 0f; lidTarget = 0f
            bodies.forEach { it.vx = 0f; it.vy = 0f; it.spin = 0f; it.squash = 0f; it.squashV = 0f }
            asleep = true
        }
    }

    private fun fly(b: Body, dt: Float) {
        b.flight = min(1f, b.flight + dt / b.fdur)
        val p = b.flight
        // 날아들 때는 점점 빨라진다(ease-in)
        val t = p * p
        val u = 1f - t
        b.x = u * u * b.fx0 + 2f * u * t * b.fcx + t * t * b.fx1
        b.y = u * u * b.fy0 + 2f * u * t * b.fcy + t * t * b.fy1
        b.angle += b.spin * dt
        if (p >= 1f) {
            // 도착한 순간의 곡선 방향 · 속도로 물리에 넘긴다 — 너무 세면 줄인다
            val dx = 2f * (b.fx1 - b.fcx) * 2f / b.fdur
            val dy = 2f * (b.fy1 - b.fcy) * 2f / b.fdur
            val sp = hypot(dx, dy)
            val k = if (sp > 520f) 520f / sp else 1f
            b.vx = dx * k * 0.35f; b.vy = dy * k
            b.flight = -1f
        }
    }

    private fun walls(b: Body) {
        if (b.y < MOUTH - 6f) return
        val hw = cupHalfWidth(b.y) - 2f
        val left = 50f - hw + b.r
        val right = 50f + hw - b.r
        if (b.x < left) { b.x = left; if (b.vx < 0f) b.vx = -b.vx * 0.2f }
        if (b.x > right) { b.x = right; if (b.vx > 0f) b.vx = -b.vx * 0.2f }
        val floor = FLOOR - b.r * (if (b.kind == BodyKind.ICE) 0.9f else 1f)
        if (b.y > floor) {
            b.y = floor
            if (b.vy > 0f) { if (b.vy > 50f) b.squashV += b.vy * 0.4f; b.vy = if (b.vy > 40f) -b.vy * 0.18f else 0f }
            b.vx *= 0.9f
            b.spin *= 0.8f
        }
    }

    companion object {
        // 빨대 — 위 끝에서 컵 바닥 가까이까지 비스듬히. t 0 = 아래 입구, 1 = 위 끝
        fun strawAt(t: Float): Pair<Float, Float> = (57f + 6f * t) to (128f - 132f * t)
    }
}
