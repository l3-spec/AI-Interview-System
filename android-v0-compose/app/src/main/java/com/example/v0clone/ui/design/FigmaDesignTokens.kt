package com.xlwl.AiMian.ui.design

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val StarLinkGradientBlue = Color(0xFF00ACC3)
val StarLinkBackgroundGray = Color(0xFFEBEBEB)
val StarLinkAccentOrange = Color(0xFFEC7C38)
val StarLinkPrimaryText = Color(0xFF242525)
val StarLinkPlaceholderGray = Color(0xFFB5B7B8)
val StarLinkLinkBlue = Color(0xFF169BD5)
val StarLinkWhite = Color(0xFFFFFFFF)

fun starLinkHeroGradient(): Brush = Brush.verticalGradient(
    colorStops = arrayOf(
        0f to StarLinkGradientBlue,
        0.3165f to StarLinkGradientBlue,
        1f to StarLinkBackgroundGray
    )
)
