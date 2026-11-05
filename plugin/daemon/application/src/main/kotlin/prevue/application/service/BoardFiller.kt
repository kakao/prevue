package prevue.application.service

interface BoardFiller {
    operator fun invoke(by: String, since: Long? = null)
}
