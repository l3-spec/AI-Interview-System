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
    val phone: String? = null,
    val gender: String? = null,
    val region: String? = null,
    val signature: String? = null,
    val openToCompanies: Boolean = true,
    val autoPublish: Boolean = true
)

data class UpdateProfileRequest(
    val name: String? = null,
    val avatar: String? = null,
    val gender: String? = null,
    val region: String? = null,
    val phone: String? = null,
    val signature: String? = null,
    val openToCompanies: Boolean? = null,
    val autoPublish: Boolean? = null
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
