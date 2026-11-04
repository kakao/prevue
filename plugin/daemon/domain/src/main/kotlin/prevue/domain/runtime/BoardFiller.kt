package prevue.domain.runtime

interface BoardFiller {
    operator fun invoke(by: String, since: Long? = null)
}
