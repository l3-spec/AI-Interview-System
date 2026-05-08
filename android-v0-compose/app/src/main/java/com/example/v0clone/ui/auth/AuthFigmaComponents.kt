package com.xlwl.AiMian.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.ui.graphics.Color
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.toggleableState
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xlwl.AiMian.R
import com.xlwl.AiMian.ui.design.StarLinkAccentOrange
import com.xlwl.AiMian.ui.design.StarLinkLinkBlue
import com.xlwl.AiMian.ui.design.StarLinkPlaceholderGray
import com.xlwl.AiMian.ui.design.StarLinkPrimaryText
import com.xlwl.AiMian.ui.design.StarLinkWhite
import androidx.compose.foundation.shape.CircleShape

@Composable
fun AuthBrandLockup(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // 显著放大后的 U 图标 (移除了 -Talent 文字)
        Image(
            painter = painterResource(id = R.drawable.splash_icon),
            contentDescription = "U-Talent Logo",
            modifier = Modifier.size(120.dp),
            contentScale = ContentScale.Fit
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // 柚汀教育科技 中文部分
        Text(
            text = "柚 汀 教 育 科 技",
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 4.sp
        )
    }
}

@Composable
fun FigmaAgreementCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .size(14.dp)
            .clip(CircleShape)
            .background(
                color = if (checked) StarLinkAccentOrange else StarLinkWhite,
                shape = CircleShape
            )
            .border(
                width = 1.dp,
                color = if (checked) StarLinkAccentOrange else StarLinkPlaceholderGray,
                shape = CircleShape
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                role = Role.Checkbox
            ) { onCheckedChange(!checked) }
            .semantics {
                toggleableState = if (checked) ToggleableState.On else ToggleableState.Off
            },
        contentAlignment = Alignment.Center
    ) {
        if (checked) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = StarLinkWhite,
                modifier = Modifier.size(9.dp)
            )
        }
    }
}

@Composable
fun FigmaAgreementText(
    modifier: Modifier = Modifier,
    onPrivacyClick: () -> Unit = {},
    onAgreementClick: () -> Unit = {}
) {
    val agreementText = buildAnnotatedString {
        append("我已阅读并同意")
        pushStringAnnotation(tag = "USER_AGREEMENT", annotation = "agreement")
        withStyle(style = SpanStyle(color = StarLinkLinkBlue)) {
            append("《用户须知》")
        }
        pop()
        append("和")
        pushStringAnnotation(tag = "PRIVACY_POLICY", annotation = "privacy")
        withStyle(style = SpanStyle(color = StarLinkLinkBlue)) {
            append("《隐私条款》")
        }
        pop()
    }

    androidx.compose.foundation.text.ClickableText(
        text = agreementText,
        style = TextStyle(
            color = StarLinkPrimaryText,
            fontSize = 12.sp,
            fontWeight = FontWeight.Light,
            lineHeight = 21.sp,
            letterSpacing = (-0.32).sp
        ),
        modifier = modifier,
        onClick = { offset ->
            agreementText.getStringAnnotations(tag = "USER_AGREEMENT", start = offset, end = offset)
                .firstOrNull()?.let { onAgreementClick() }
            agreementText.getStringAnnotations(tag = "PRIVACY_POLICY", start = offset, end = offset)
                .firstOrNull()?.let { onPrivacyClick() }
        }
    )
}
