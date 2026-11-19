package prevue.application.domain.rule

import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt
import prevue.application.domain.model.CameraCutout
import prevue.application.domain.model.CameraHole
import prevue.application.domain.model.CameraSpec
import prevue.application.domain.model.ChromeLayout
import prevue.application.domain.model.ChromeMark
import prevue.application.domain.model.DeviceInsetInputs
import prevue.application.domain.model.CameraEdge
import prevue.application.domain.model.DeviceOrientation
import prevue.application.domain.model.DpBox
import prevue.application.domain.model.IconSet
import prevue.application.domain.model.InkBand
import prevue.application.domain.model.IosStatusLayout
import prevue.application.domain.model.BarLook
import prevue.application.domain.model.ScreenSize

object DeviceChrome {
    private const val DUO_ID = "duo"
    private const val DUO_BAND = 64.0

    fun of(device: ScreenSize.Device): ChromeLayout {
        val cutouts = ChromeCamera.cutouts(device)
        val bars = barsOf(device, cutouts)
        val marks = buildList {
            if (bars.statusDp > 0 || bars.side != null) addAll(statusMarks(device, bars))
            if (!bars.duo && bars.navDp > 0) add(handle(bars))
        }
        val regions = buildMap {
            if (marks.any { it.band == InkBand.STATUS }) put(InkBand.STATUS, statusRegion(bars))
            if (marks.any { it.band == InkBand.NAVIGATION }) put(InkBand.NAVIGATION, DpBox(0.0, bars.h - bars.navDp, bars.w, bars.navDp))
        }
        return ChromeLayout(bars.w, bars.h, ChromeCamera.turnedRadius(device), cutouts.map { it.second }, ChromeCamera.cameras(device), marks, regions)
    }

    internal data class Bars(
        val w: Double,
        val h: Double,
        val statusDp: Double,
        val navDp: Double,
        val side: Side?,
        val sideDp: Double,
        val duo: Boolean,
        val ios: Boolean,
        val cut: Pair<Double, Double>,
        val radius: Double,
        val topCam: TopCam?,
        val lowCam: Pair<Double, Double>?,
    )

    internal data class TopCam(val x0: Double, val x1: Double, val cy: Double)

    internal enum class Side { LEFT, RIGHT }

    private fun barsOf(device: ScreenSize.Device, cutouts: List<Pair<CameraEdge, CameraCutout>>): Bars {
        val values = DeviceInsetInputs.of(device).values
        val statusDp = values.statusBars.top
        val topCam = cutouts.map { it.second.box }.firstOrNull { it.y < statusDp }?.let { TopCam(it.x, it.x + it.w, it.y + it.h / 2) }
        val lowCam = cutouts.firstOrNull { (edge, c) -> edge == CameraEdge.BOTTOM && c.box.y + c.box.h >= device.heightDp - .5 }
            ?.second?.box?.let { it.x to it.x + it.w }
        val duo = device.model.id == DUO_ID
        val area = device.insetProfile.safeArea
        val side = if (duo && area != null) when {
            area.left > 0 -> Side.LEFT
            area.right > 0 -> Side.RIGHT
            else -> null
        } else null
        val sideDp = when (side) { Side.LEFT -> area!!.left; Side.RIGHT -> area!!.right; null -> 0.0 }
        return Bars(
            device.widthDp, device.heightDp, statusDp, values.navigationBars.bottom, side, sideDp, duo, device.model.look == BarLook.IOS,
            values.displayCutout.left to values.displayCutout.right, device.panel.face.radius[0], topCam, lowCam,
        )
    }

    private fun statusRegion(bars: Bars): DpBox = when (bars.side) {
        null -> DpBox(0.0, 0.0, bars.w, bars.statusDp)
        Side.LEFT -> DpBox(0.0, DUO_BAND, bars.sideDp, DUO_BAND)
        Side.RIGHT -> DpBox(bars.w - bars.sideDp, DUO_BAND, bars.sideDp, DUO_BAND)
    }

    private fun statusMarks(device: ScreenSize.Device, bars: Bars): List<ChromeMark> = when {
        bars.duo -> StatusRows.duo(bars, device.folded)
        bars.ios -> device.model.status?.let(StatusRows::ios).orEmpty()
        else -> StatusRows.android(bars)
    }

    private fun handle(bars: Bars): ChromeMark.Handle = if (bars.ios) {
        ChromeMark.Handle(DpBox((bars.w - IOS_HANDLE_W) / 2, bars.h - IOS_HANDLE_FROM_BOTTOM, IOS_HANDLE_W, IOS_HANDLE_H), IOS_HANDLE_H / 2)
    } else {
        val cy = bars.h - min(bars.navDp, ANDROID_HANDLE_BAND) / 2
        val cx = bars.lowCam?.let { (x0, x1) -> if (x0 >= bars.w - x1) x0 / 2 else (x1 + bars.w) / 2 } ?: (bars.w / 2)
        ChromeMark.Handle(DpBox(cx - ANDROID_HANDLE_W / 2, cy - ANDROID_HANDLE_H / 2, ANDROID_HANDLE_W, ANDROID_HANDLE_H), ANDROID_HANDLE_H / 2)
    }

    private const val IOS_HANDLE_W = 134.0
    private const val IOS_HANDLE_H = 5.0
    private const val IOS_HANDLE_FROM_BOTTOM = 13.0
    private const val ANDROID_HANDLE_W = 108.0
    private const val ANDROID_HANDLE_H = 4.0
    private const val ANDROID_HANDLE_BAND = 24.0
}

internal object StatusRows {
    private const val GROUP_W = 78.33
    private const val IOS_WEIGHT = 600
    private const val DUO_TIME = 15.0
    private const val DUO_TOP_INSET = 46.0
    private const val DUO_TIME_SHIFT = 52.0
    private const val DUO_TOP_Y = 42.0
    private const val DUO_FOLDED_Y = 124.0
    private const val DUO_OPEN_Y = 78.0
    private const val DUO_TIME_ABOVE = 40.0
    private const val EDGE = 20.0
    private const val CAM_GAP = 8.0
    private const val ICONS_W = 46.0
    private const val ICONS_H = 13.0
    private const val TIME = 14.0
    private const val ANDROID_WEIGHT = 500
    private const val ROW_BASE = 24.0
    private const val ROW_TOP = 66.0
    private const val ROW_GROW = .3
    private const val TEXT_BOX = 1.3

    fun ios(layout: IosStatusLayout): List<ChromeMark> {
        val time = ChromeMark.Time(layout.timeCx, layout.timeBase, layout.timeSize, IOS_WEIGHT, centered = true, middleBaseline = false)
        val right = layout.right - GROUP_W * layout.scale
        val left = layout.left ?: return listOf(time, ChromeMark.Icons(IconSet.IOS_ALL, right, layout.top, layout.scale))
        return listOf(
            time, ChromeMark.Icons(IconSet.IOS_LEFT, left, layout.top, layout.scale), ChromeMark.Icons(IconSet.IOS_RIGHT, right, layout.top, layout.scale),
        )
    }

    fun duo(bars: DeviceChrome.Bars, folded: Boolean): List<ChromeMark> {
        if (folded && bars.w > bars.h) return emptyList()
        val side = bars.side
        val x = when (side) {
            DeviceChrome.Side.LEFT -> bars.sideDp / 2
            DeviceChrome.Side.RIGHT -> bars.w - bars.sideDp / 2
            null -> bars.w - DUO_TOP_INSET
        }
        val y = if (side == null) DUO_TOP_Y else if (folded) DUO_FOLDED_Y else DUO_OPEN_Y
        val time = if (side == null) ChromeMark.Time(x - DUO_TIME_SHIFT, y, DUO_TIME, IOS_WEIGHT, centered = true, middleBaseline = true)
        else ChromeMark.Time(x, y - DUO_TIME_ABOVE, DUO_TIME, IOS_WEIGHT, centered = true, middleBaseline = true)
        return listOf(time, ChromeMark.DuoIndicator(x, y))
    }

    fun android(bars: DeviceChrome.Bars): List<ChromeMark> {
        val k = 1 + ROW_GROW * min(1.0, max(0.0, (bars.statusDp - ROW_BASE) / (ROW_TOP - ROW_BASE)))
        val cam = bars.topCam
        val camLeft = cam != null && cam.x1 < bars.w / 2
        val camRight = cam != null && cam.x0 > bars.w / 2
        val y = cam?.cy ?: (bars.statusDp / 2)
        val roundTime = cornerInset(bars.radius, y - TIME * k * TEXT_BOX / 2)
        val roundIcons = cornerInset(bars.radius, y - ICONS_H * k / 2)
        val left = maxOf(EDGE + bars.cut.first, roundTime, if (camLeft) cam!!.x1 + CAM_GAP else 0.0)
        val right = minOf(bars.w - EDGE - bars.cut.second, bars.w - roundIcons, if (camRight) cam!!.x0 - CAM_GAP else Double.POSITIVE_INFINITY)
        return listOf(
            ChromeMark.Time(left, y, TIME * k, ANDROID_WEIGHT, centered = false, middleBaseline = true),
            ChromeMark.Icons(IconSet.ANDROID, right - ICONS_W * k, y - ICONS_H / 2 * k, k),
        )
    }

    private fun cornerInset(r: Double, top: Double): Double =
        if (r > 0 && top < r) r - sqrt(r * r - (r - max(0.0, top)).let { it * it }) else 0.0
}

internal object ChromeCamera {
    private const val NEAR = .5

    fun cutouts(device: ScreenSize.Device): List<Pair<CameraEdge, CameraCutout>> =
        device.panel.face.cutouts.map { c -> c.box.edge to cutout(device, c.box, lens = false) }

    fun cameras(device: ScreenSize.Device): List<CameraCutout> = device.panel.face.cutouts.flatMap { c ->
        if (c.holes.isEmpty()) listOf(cutout(device, c.box, lens = false))
        else c.holes.map { h -> cutout(device, holeSpec(h, naturalDp(device).first), h.lens) }
    }

    private fun holeSpec(h: CameraHole, width: Double) = CameraSpec(h.d, h.d, h.cy - h.d / 2, h.cx / width, null, CameraEdge.TOP)

    private fun cutout(device: ScreenSize.Device, cam: CameraSpec, lens: Boolean): CameraCutout {
        val own = cam.edge.ordinal
        val turns = (own + (if (device.landscape) 1 else 0) + (if (mirrored(device)) 2 else 0)) % 4
        val placed = placed(device, cam, turns)
        val rad = cam.notch ?: (min(cam.w, cam.h) / 2)
        val sharp = if (cam.notch != null) 0.0 else rad
        return CameraCutout(placed.box, corners(placed, turns, rad, sharp), lens)
    }

    private class Placed(val box: DpBox, val frameW: Double, val frameH: Double)

    private fun placed(device: ScreenSize.Device, cam: CameraSpec, turns: Int): Placed {
        val (w0, h0) = naturalDp(device)
        val own = cam.edge.ordinal
        var fw = if (own % 2 == 1) h0 else w0
        var fh = if (own % 2 == 1) w0 else h0
        val x = if (own == 2) 1 - cam.x else cam.x
        var b = DpBox(x * fw - cam.w / 2, cam.y, cam.w, cam.h)
        repeat(turns) {
            b = DpBox(fh - b.y - b.h, b.x, b.h, b.w)
            fw = fh.also { fh = fw }
        }
        return Placed(b, fw, fh)
    }

    private fun corners(p: Placed, turns: Int, rad: Double, sharp: Double): List<Double> {
        val b = p.box
        val corners = MutableList(4) { rad }
        listOf(0 to 1, 1 to 2, 2 to 3, 3 to 0)[turns].toList().forEach { corners[it] = sharp }
        val onL = b.x <= NEAR
        val onT = b.y <= NEAR
        val onR = b.x + b.w >= p.frameW - NEAR
        val onB = b.y + b.h >= p.frameH - NEAR
        listOf(onL || onT, onT || onR, onR || onB, onB || onL).forEachIndexed { i, on -> if (on) corners[i] = sharp }
        return corners
    }

    fun turnedRadius(device: ScreenSize.Device): List<Double> {
        var r = device.panel.face.radius
        repeat(((if (device.landscape) 1 else 0) + (if (mirrored(device)) 2 else 0)) % 4) { r = listOf(r[3], r[0], r[1], r[2]) }
        return r
    }

    private fun naturalDp(device: ScreenSize.Device): Pair<Double, Double> =
        ScreenSize.Device(device.model, device.folded).let { it.widthDp to it.heightDp }

    private fun mirrored(device: ScreenSize.Device): Boolean {
        val (w, h) = naturalDp(device)
        val wide = w > h
        val angle = when {
            device.orientation == DeviceOrientation.LANDSCAPE_RIGHT -> if (wide) 180 else 90
            device.landscape -> if (wide) 90 else -90
            else -> 0
        }
        return angle < 0 || angle == 180
    }
}
