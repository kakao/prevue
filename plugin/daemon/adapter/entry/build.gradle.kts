// adapter:entry — 입구(http · cli · browser · hotswap). 기술 어댑터 · 렌더러를 의존하지 않아 import 하면 컴파일이 안 된다(D-141).
plugins {
    id("prevue.coroutines")
}

dependencies {
    api(project(":domain"))
    implementation(project(":json"))
}
