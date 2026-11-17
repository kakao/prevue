package prevue.application.domain.model

enum class CameraEdge { TOP, RIGHT, BOTTOM }

data class CameraSpec(val w: Double, val h: Double, val y: Double, val x: Double, val notch: Double?, val edge: CameraEdge)

data class PanelFace(val radius: List<Double>, val camera: CameraSpec)

data class IosStatusLayout(
    val top: Double,
    val right: Double,
    val left: Double?,
    val scale: Double,
    val timeCx: Double,
    val timeBase: Double,
    val timeSize: Double,
)

data class DpBox(val x: Double, val y: Double, val w: Double, val h: Double)

data class CameraCutout(val box: DpBox, val corners: List<Double>)

enum class IconSet { IOS_ALL, IOS_LEFT, IOS_RIGHT, ANDROID }

enum class InkBand { STATUS, NAVIGATION }

sealed interface ChromeMark {
    val band: InkBand

    data class Time(val x: Double, val y: Double, val size: Double, val weight: Int, val centered: Boolean, val middleBaseline: Boolean) : ChromeMark {
        override val band: InkBand get() = InkBand.STATUS
    }

    data class Icons(val set: IconSet, val x: Double, val y: Double, val scale: Double) : ChromeMark {
        override val band: InkBand get() = InkBand.STATUS
    }

    data class DuoIndicator(val x: Double, val y: Double) : ChromeMark {
        override val band: InkBand get() = InkBand.STATUS
    }

    data class Handle(val box: DpBox, val rx: Double) : ChromeMark {
        override val band: InkBand get() = InkBand.NAVIGATION
    }
}

data class ChromeLayout(
    val widthDp: Double,
    val heightDp: Double,
    val radius: List<Double>,
    val camera: CameraCutout?,
    val marks: List<ChromeMark>,
    val inkRegions: Map<InkBand, DpBox>,
)
