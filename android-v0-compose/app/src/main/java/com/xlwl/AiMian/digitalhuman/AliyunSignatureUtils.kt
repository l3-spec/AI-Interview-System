package com.xlwl.AiMian.digitalhuman

import android.util.Base64
import java.text.SimpleDateFormat
import java.util.*
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import okhttp3.Request

/**
2. * 阿里云 ROA (RESTful) 签名工具类
3. * 
4. * 用于为数字人灵眸 (Lingmou) 等阿里云 ROA 风格 API 提供身份校验。
5. * 签名计算规范参考：https://help.aliyun.com/document_detail/25492.html
6. */
object AliyunSignatureUtils {

    private const val ALGORITHM = "HmacSHA1"

    /**
     * 获取符合阿里云规范的 GMT 时间字符串
     */
    fun getGMT() : String {
        val sdf = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("GMT")
        return sdf.format(Date())
    }

    /**
     * 为 OkHttp Request 添加签名头
     */
    fun getSignedRequest(
        request: Request,
        accessKeyId: String,
        accessKeySecret: String
    ): Request {
        val date = getGMT()
        val httpMethod = request.method
        val accept = request.header("Accept") ?: ""
        val contentMd5 = "" // 本次实现暂不包含 Content-MD5
        val contentType = request.header("Content-Type") ?: ""
        
        // 1. 构建 CanonicalizedHeaders (仅包含 x-acs- 开头的头信息，且按字典序排序)
        val canonicalizedHeaders = buildCanonicalizedHeaders(request)
        
        // 2. 构建 CanonicalizedResource
        val canonicalizedResource = buildCanonicalizedResource(request)
        
        // 3. 构建 StringToSign
        val stringToSign = buildString(
            httpMethod, 
            accept, 
            contentMd5, 
            contentType, 
            date, 
            canonicalizedHeaders, 
            canonicalizedResource
        )
        
        // 4. 计算 HMAC-SHA1 签名
        val signature = calculateSignature(accessKeySecret, stringToSign)
        
        // 5. 返回带有 Authorization 头的请求
        return request.newBuilder()
            .header("Date", date)
            .header("Authorization", "acs $accessKeyId:$signature")
            .build()
    }

    private fun buildString(
        method: String,
        accept: String,
        md5: String,
        type: String,
        date: String,
        headers: String,
        resource: String
    ): String {
        val sb = StringBuilder()
        sb.append(method).append("\n")
        sb.append(accept).append("\n")
        sb.append(md5).append("\n")
        sb.append(type).append("\n")
        sb.append(date).append("\n")
        sb.append(headers)
        sb.append(resource)
        return sb.toString()
    }

    private fun buildCanonicalizedHeaders(request: Request): String {
        val acsHeaders = mutableMapOf<String, String>()
        for (name in request.headers.names()) {
            val lowerName = name.lowercase(Locale.ENGLISH)
            if (lowerName.startsWith("x-acs-")) {
                acsHeaders[lowerName] = request.header(name) ?: ""
            }
        }
        
        val sortedKeys = acsHeaders.keys.sorted()
        val sb = StringBuilder()
        for (key in sortedKeys) {
            sb.append(key).append(":").append(acsHeaders[key])
            sb.append("\n")
        }
        return sb.toString()
    }

    private fun buildCanonicalizedResource(request: Request): String {
        val url = request.url
        val path = url.encodedPath
        val query = url.encodedQuery
        
        val sb = StringBuilder()
        sb.append(path)
        if (!query.isNullOrEmpty()) {
            sb.append("?").append(query)
        }
        return sb.toString()
    }

    private fun calculateSignature(key: String, stringToSign: String): String {
        return try {
            val signingKey = SecretKeySpec(key.toByteArray(Charsets.UTF_8), ALGORITHM)
            val mac = Mac.getInstance(ALGORITHM)
            mac.init(signingKey)
            val rawHmac = mac.doFinal(stringToSign.toByteArray(Charsets.UTF_8))
            Base64.encodeToString(rawHmac, Base64.NO_WRAP)
        } catch (e: Exception) {
            throw RuntimeException("Failed to calculate Aliyun ROA signature", e)
        }
    }
}
