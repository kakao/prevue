package prevue.infrastructure.render

import com.android.tools.apk.analyzer.BinaryXmlParser
import java.io.ByteArrayInputStream
import java.io.File
import java.util.zip.ZipFile
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory

internal object ApkManifest {
    fun targetSdk(apk: File): Int = ZipFile(apk).use { zip ->
        val entry = zip.getEntry("AndroidManifest.xml") ?: error("리소스 APK에 AndroidManifest.xml이 없다: $apk")
        targetSdkXml(BinaryXmlParser.decodeXml(zip.getInputStream(entry).use { it.readBytes() }))
    }

    fun targetSdkXml(xml: ByteArray): Int {
        val factory = DocumentBuilderFactory.newInstance().apply {
            isNamespaceAware = true
            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
            setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "")
            setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "")
        }
        val sdk = factory.newDocumentBuilder().parse(ByteArrayInputStream(xml)).getElementsByTagName("uses-sdk").item(0)
        fun api(name: String): Int? = sdk?.attributes?.getNamedItemNS("http://schemas.android.com/apk/res/android", name)
            ?.nodeValue?.takeIf { it.isNotBlank() }?.let { it.toIntOrNull() ?: error("숫자가 아닌 $name 은 지원하지 않는다: $it") }
        return api("targetSdkVersion") ?: api("minSdkVersion") ?: 1
    }
}
