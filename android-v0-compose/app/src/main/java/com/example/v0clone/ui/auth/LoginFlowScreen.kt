package com.xlwl.AiMian.ui.auth

import androidx.compose.runtime.*
import com.xlwl.AiMian.data.repository.AuthRepository

/**
 * 登录流程主屏幕 - 整合所有登录页面
 * 根据Figma设计实现完整的登录流程
 */
@Composable
fun LoginFlowScreen(
    repo: AuthRepository,
    onLoginSuccess: (String, String) -> Unit, // token, userJson
    onGoRegister: () -> Unit
) {
    var currentScreen by remember { mutableStateOf(LoginScreenType.MAIN) }
    var codeLoginPhone by remember { mutableStateOf<String?>(null) }
    
    when (currentScreen) {
        LoginScreenType.MAIN -> {
            LoginMainScreen(
                repo = repo,
                onLoginSuccess = onLoginSuccess,
                onRequestCodeLogin = { phone ->
                    codeLoginPhone = phone
                    currentScreen = LoginScreenType.CODE_LOGIN
                }
            )
        }
        
        LoginScreenType.CODE_LOGIN -> {
            CodeLoginScreen(
                repo = repo,
                initialPhone = codeLoginPhone,
                onLoginSuccess = onLoginSuccess,
                onBackClick = {
                    codeLoginPhone = null
                    currentScreen = LoginScreenType.MAIN
                }
            )
        }
    }
}

/**
 * 登录页面类型枚举
 */
enum class LoginScreenType {
    MAIN,           // 主登录页
    CODE_LOGIN      // 验证码登录页
}
