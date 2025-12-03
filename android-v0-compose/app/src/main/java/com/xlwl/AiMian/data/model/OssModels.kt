package com.xlwl.AiMian.data.model

data class OssConfig(
  val endpoint: String,
  val bucketName: String,
  val region: String,
  val cdnDomain: String? = null
)

data class OssUploadResult(
  val objectKey: String? = null,
  val url: String? = null
)

data class OssUploadCompleteRequest(
  val sessionId: String,
  val questionIndex: Int,
  val ossUrl: String,
  val cdnUrl: String? = null,
  val fileSize: Long? = null,
  val duration: Long? = null
)
