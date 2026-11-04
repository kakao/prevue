package prevue.adapter.infra

public fun interface InfraLog {
    public operator fun invoke(line: String)
}
