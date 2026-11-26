package com.example.pearl

import android.widget.ProgressBar
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.viewinterop.AndroidView

@Preview(showBackground = true, widthDp = 360, heightDp = 200, name = "로딩")
@Composable
fun LoadingIndicatorPreview() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AndroidView(
            modifier = Modifier.wrapContentSize(),
            factory = { ProgressBar(it).apply { isIndeterminate = true } },
        )
    }
}
