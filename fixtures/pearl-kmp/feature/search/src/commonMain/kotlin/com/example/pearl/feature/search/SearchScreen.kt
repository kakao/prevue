package com.example.pearl.feature.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.DrinkCard
import com.example.pearl.feature.search.res.*
import com.example.pearl.feature.search.res.Res
import org.jetbrains.compose.resources.stringResource

// 이름으로 거른다 — 픽스처에서 TextField가 있는 유일한 화면이다(글자 넣기 · type)
@Composable
fun SearchScreen(
    modifier: Modifier = Modifier,
    drinks: List<Drink> = menu,
    initialQuery: String = "",
    onDrinkClick: (Drink) -> Unit = {},
) {
    var query by remember { mutableStateOf(initialQuery) }
    val q = query.trim()
    val hits = drinks.filter { q.isEmpty() || it.name.contains(q, ignoreCase = true) }
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text(stringResource(Res.string.search_hint)) },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        )
        Text(
            text = stringResource(Res.string.search_count, hits.size),
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(hits, key = { it.id }) { drink ->
                DrinkCard(drink, Modifier.fillMaxWidth(), aspect = 2.6f, onClick = { onDrinkClick(drink) })
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun SearchScreenPreview() {
    PearlTheme { SearchScreen() }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun SearchScreenQueryPreview() {
    PearlTheme { SearchScreen(initialQuery = "tea") }
}
