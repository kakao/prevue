package prevue.daemon.adapter.dump

import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Locale
import javax.imageio.ImageIO

/**
 * 대상 앱이 폰에서 보이는 모습 — 런처 아이콘(PNG)과 이름. 뷰어 헤더의 닻 · 파비콘이다. 두 앱을 나란히 띄워도 아이콘과 이름으로 가른다.
 * 매니페스트의 `<application>`이 가리키는 것을 덤프의 res 디렉터리(원본 XML이 있는 `packaged_res` 포함)에서 찾는다.
 * 그리지 않고 파일만 읽는다 — 렌더 스레드를 쓰지 않는다. 못 읽는 꼴(벡터 · WebP 전경)이면 null이고 뷰어는 Prevue 마크를 쓴다.
 * [manifests]는 앞의 것이 이긴다(flavor → main).
 */
class AppIdentity(private val manifests: List<File>, resDirs: List<File>) {
    private val dirs = resDirs.filter { it.isDirectory }

    private fun attr(name: String): String? = manifests.asSequence().filter { it.isFile }
        .mapNotNull { Regex("""<application\b[^>]*>""").find(it.readText())?.value }
        .mapNotNull { Regex("""android:$name="([^"]+)"""").find(it)?.groupValues?.get(1) }
        .firstOrNull()

    /** 런처에 보이는 이름. 문자열 리소스는 이 기계의 언어(`values-ko`)를 먼저, 없으면 기본(`values`)을 쓴다. */
    val name: String? by lazy {
        val v = attr("label") ?: return@lazy null
        if (v.startsWith("@string/")) string(v.removePrefix("@string/")) else v
    }

    val icon: ByteArray? by lazy {
        val ref = attr("icon")?.removePrefix("@")?.split('/')
        val (type, base) = if (ref?.size == 2) ref[0] to ref[1] else "mipmap" to "ic_launcher"
        for (n in listOf(base, "${base}_round").distinct()) {
            val img = adaptive(n) ?: bitmap(type, n)?.let { scaled(it, SIZE) }
            if (img != null) return@lazy ByteArrayOutputStream().also { ImageIO.write(img, "png", it) }.toByteArray()
        }
        null
    }

    private fun string(name: String): String? {
        val pattern = Regex("""<string name="$name"[^>]*>(.*?)</string>""", RegexOption.DOT_MATCHES_ALL)
        val lang = Locale.getDefault().language
        for (qualified in listOf("values-$lang", "values")) {
            val hit = dirs.asSequence().map { File(it, qualified) }.filter { it.isDirectory }
                .flatMap { it.listFiles { f -> f.extension == "xml" }.orEmpty().asSequence() }
                .mapNotNull { pattern.find(it.readText())?.groupValues?.get(1) }.firstOrNull()
            if (hit != null) return hit.trim().removeSurrounding("\"").replace("\\'", "'").replace("&amp;", "&").takeIf { !it.startsWith("@") }
        }
        return null
    }

    /** 배경 · 전경 두 겹(108dp)을 합치고 마스크가 보이는 가운데 72dp만 남긴다 — 모양(둥근 사각)은 뷰어가 깎는다. */
    private fun adaptive(name: String, size: Int = SIZE): BufferedImage? {
        val xml = dirs.asSequence().flatMap { d -> d.listFiles { f -> f.isDirectory && f.name.startsWith("mipmap-anydpi") }.orEmpty().asSequence() }
            .map { File(it, "$name.xml") }.firstOrNull { it.isFile }?.readText() ?: return null
        fun ref(tag: String) = Regex("""<$tag[^>]*android:drawable="@(\w+)/(\w+)"""").find(xml)?.destructured
        val (fgType, fgName) = ref("foreground") ?: return null
        val fg = bitmap(fgType, fgName) ?: return null
        val out = BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB)
        val g = out.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
        val full = size * 108 / 72
        val at = -(full - size) / 2
        ref("background")?.let { (type, n) ->
            if (type == "color") color(n)?.let { g.color = it; g.fillRect(0, 0, size, size) }
            else bitmap(type, n)?.let { g.drawImage(it, at, at, full, full, null) }
        }
        g.drawImage(fg, at, at, full, full, null)
        g.dispose()
        return out
    }

    /** 가장 촘촘한 밀도의 PNG. 한정자(`-v4` · `-v26`)는 가리지 않는다. */
    private fun bitmap(type: String, name: String): BufferedImage? {
        if (type != "mipmap" && type != "drawable") return null
        for (density in DENSITY) for (d in dirs) {
            val hit = d.listFiles { f -> f.isDirectory && f.name.startsWith("$type-$density") }.orEmpty()
                .map { File(it, "$name.png") }.firstOrNull { it.isFile } ?: continue
            return runCatching { ImageIO.read(hit) }.getOrNull() ?: continue
        }
        return null
    }

    /** values 디렉터리의 `<color name=…>` — 다른 색을 가리키면 한 번 더 따라간다. */
    private fun color(name: String, hops: Int = 2): Color? {
        val pattern = Regex("""<color name="$name"[^>]*>\s*([^<\s]+)\s*</color>""")
        val v = dirs.asSequence()
            .flatMap { d -> d.listFiles { f -> f.isDirectory && (f.name == "values" || f.name.startsWith("values-v")) }.orEmpty().asSequence() }
            .flatMap { it.listFiles { f -> f.extension == "xml" }.orEmpty().asSequence() }
            .mapNotNull { pattern.find(it.readText())?.groupValues?.get(1) }.firstOrNull() ?: return null
        if (v.startsWith("@color/")) return if (hops > 0) color(v.removePrefix("@color/"), hops - 1) else null
        val hex = v.removePrefix("#")
        val argb = when (hex.length) {
            6 -> 0xFF000000.toInt() or hex.toInt(16)
            8 -> hex.toLong(16).toInt()
            3 -> 0xFF000000.toInt() or hex.map { "$it$it" }.joinToString("").toInt(16)
            else -> return null
        }
        return Color(argb, true)
    }

    private companion object {
        const val SIZE = 128
        val DENSITY = listOf("xxxhdpi", "xxhdpi", "xhdpi", "hdpi", "mdpi")
    }

    private fun scaled(src: BufferedImage, size: Int): BufferedImage {
        val out = BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB)
        val g = out.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
        g.drawImage(src, 0, 0, size, size, null)
        g.dispose()
        return out
    }
}
