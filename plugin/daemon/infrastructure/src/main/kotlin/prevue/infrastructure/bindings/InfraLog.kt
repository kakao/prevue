package prevue.infrastructure.bindings

public fun interface InfraLog {
    public operator fun invoke(line: String)
}
