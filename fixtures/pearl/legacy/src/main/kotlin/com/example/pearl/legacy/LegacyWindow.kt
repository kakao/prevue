package com.example.pearl.legacy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

class LegacyActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { LegacyWindow() }
    }
}

@Preview(name = "API 34", apiLevel = 34, showSystemUi = true, device = "spec:width=1080px,height=2340px,dpi=480")
@Preview(name = "API 37", apiLevel = 37, showSystemUi = true, device = "spec:width=1080px,height=2340px,dpi=480")
@Composable
fun LegacyWindow() {
    var taps by remember { mutableIntStateOf(0) }
    val top = WindowInsets.statusBars.getTop(LocalDensity.current)
    Column(Modifier.fillMaxSize().background(Color.White).semantics { contentDescription = "app" }.systemBarsPadding()) {
        Box(Modifier.fillMaxWidth().height(16.dp).background(Color.Red).clickable { taps++ }.semantics { contentDescription = "target" }) {
            Text("Taps: $taps / inset: $top", color = Color.White)
        }
        Box(Modifier.fillMaxWidth().weight(1f).background(Color.Green))
        Box(Modifier.fillMaxWidth().height(48.dp).background(Color.Blue).semantics { contentDescription = "bottom" })
    }
}
