package com.xlwl.AiMian.ai.guide

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import com.xlwl.AiMian.ui.theme.PrimaryBlue
import com.xlwl.AiMian.ui.theme.TextPrimary
import com.xlwl.AiMian.ui.theme.TextSecondary
import com.xlwl.AiMian.ui.theme.BackgroundLight
import com.xlwl.AiMian.ui.theme.SurfaceWhite
import com.xlwl.AiMian.ui.theme.TextInvert
import com.xlwl.AiMian.ui.theme.ErrorRed
import com.xlwl.AiMian.ui.theme.SurfaceVariant

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InterviewPrecautionsScreen(
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    var isAgreed by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = SurfaceWhite,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "面试注意事项",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "返回",
                            tint = TextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceWhite
                )
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceWhite)
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .navigationBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clickable { isAgreed = !isAgreed }
                        .padding(vertical = 12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "同意",
                        tint = if (isAgreed) PrimaryBlue else Color.LightGray,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = buildAnnotatedString {
                            append("我已阅读并同意")
                            withStyle(SpanStyle(color = PrimaryBlue)) {
                                append("AI面试隐私政策")
                            }
                        },
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }

                Button(
                    onClick = { if (isAgreed) onNext() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    enabled = isAgreed,
                    shape = RoundedCornerShape(27.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PrimaryBlue,
                        contentColor = TextInvert,
                        disabledContainerColor = SurfaceVariant,
                        disabledContentColor = TextSecondary
                    )
                ) {
                    Text(
                        text = "下一步",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Text(
                    text = "为保证您的面试顺利进行，请注意以下事项：",
                    fontSize = 14.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    PrecautionCard(
                        modifier = Modifier.weight(1f),
                        title = "保持",
                        subtitle = "良好光线 干净背景",
                        iconTint = PrimaryBlue
                    )
                    PrecautionCard(
                        modifier = Modifier.weight(1f),
                        title = "保持",
                        subtitle = "安静环境",
                        iconTint = PrimaryBlue
                    )
                    PrecautionCard(
                        modifier = Modifier.weight(1f),
                        title = "保持",
                        subtitle = "良好网络",
                        iconTint = PrimaryBlue
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    PrecautionCard(
                        modifier = Modifier.weight(1f),
                        title = "请勿中途退出",
                        subtitle = "接听电话",
                        iconTint = ErrorRed
                    )
                    PrecautionCard(
                        modifier = Modifier.weight(1f),
                        title = "请勿",
                        subtitle = "录屏/截屏",
                        iconTint = ErrorRed
                    )
                }
            }



            item {
                SectionTitle("隐私保护")
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(bottom = 24.dp)
                ) {
                    val privacyPoints = listOf(
                        "1、请您确认上方的提示并已经做好面试准备;",
                        "2、在您点击开始面试后，我们将使用您的摄像头、麦克风以为您提供面试服务，我们将收集您的面试信息以生成面试报告，具体信息有:面部信息、声音信息。其中面部信息属于您的敏感信息，您确认授权我们收集、使用该等信息;",
                        "3、面试中的对话由ai生成，面试结束后，我们将向您应聘的企业发送您面试的有关报告，您确认授权面试邀约的企业、面试发起者或平台可观看、下载、储存、使用你的面试影像信息;",
                        "4、在您面试过程中，为了保护您的隐私信息，作答过程中请勿露出身份证件、手机号码等信息，您在面试中途退出后重新进入面试的，视为您仍同意面试开始前的授权;",
                        "5、您确认并同意隐私保护部分的全部内容并同意授权，您确认并同意《用户隐私政策》全部内容。"
                    )
                    privacyPoints.forEach { point ->
                        Text(
                            text = point,
                            color = TextSecondary,
                            fontSize = 13.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(bottom = 12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(width = 4.dp, height = 16.dp)
                .background(PrimaryBlue, RoundedCornerShape(2.dp))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
    }
}

@Composable
private fun PrecautionCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    iconTint: Color
) {
    Surface(
        modifier = modifier.height(86.dp),
        color = BackgroundLight,
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            )
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = TextSecondary,
                lineHeight = 14.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}
