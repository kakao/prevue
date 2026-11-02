package com.example.pearl.core.model

/** 메뉴의 갈래 — 칩 하나가 하나다. */
enum class Kind { FRUIT_TEA, MILK_TEA, MATCHA, COFFEE, SMOOTHIE, YOGURT }

/** 음료의 맛 — 카드 색 · 음료 색이 여기서 나온다(색은 디자인 시스템이 갖는다). */
enum class Flavor { TARO, THAI, MATCHA, STRAWBERRY, MANGO, BROWN_SUGAR, PEACH, LYCHEE, PASSION, COCONUT }

data class Drink(
    val id: Int,
    val name: String,
    val kind: Kind,
    val flavor: Flavor,
    /** 센트. */
    val cents: Int,
    val saved: Boolean = false,
)
