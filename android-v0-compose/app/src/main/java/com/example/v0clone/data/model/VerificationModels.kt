package com.xlwl.AiMian.data.model

/**
 * 企业实名认证信息
 */
data class VerificationInfo(
    val id: String? = null,
    val status: String? = null,
    val legalPerson: String? = null,
    val registrationNumber: String? = null,
    val businessLicense: String? = null,
    val reviewComments: String? = null,
    val reviewedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

enum class VerificationStatusType {
    NOT_SUBMITTED,
    PENDING,
    APPROVED,
    REJECTED;

    companion object {
        fun fromStatus(raw: String?): VerificationStatusType {
            return when (raw?.uppercase()) {
                "APPROVED" -> APPROVED
                "REJECTED" -> REJECTED
                "PENDING" -> PENDING
                else -> NOT_SUBMITTED
            }
        }
    }
}
