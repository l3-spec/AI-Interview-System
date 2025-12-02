package com.xlwl.AiMian.data.model

data class LoginRequest(
    val phone: String,
    val code: String
)

data class SendCodeRequest(
    val phone: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String,
    val phone: String? = null
)

data class User(
    val id: String,
    val email: String,
    val name: String?,
    val avatar: String? = null,
    val phone: String? = null
)

data class LoginData(
    val user: User,
    val token: String,
    val isNewUser: Boolean = false
)

data class RegisterData(
    val user: User,
    val token: String
)

data class LoginCodeData(
    val expiresIn: Int,
    val resendIn: Int,
    val code: String? = null
)
