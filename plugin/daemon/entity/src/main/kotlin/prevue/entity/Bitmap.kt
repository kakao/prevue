package prevue.entity

class Bitmap(val width: Int, val height: Int, val pixels: IntArray, val premultiplied: Boolean = false) {
    init { require(pixels.size == width * height) { "픽셀 ${pixels.size}개가 ${width}×${height}와 맞지 않는다" } }
}
