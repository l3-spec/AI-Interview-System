package com.xlwl.AiMian.data.api

import com.xlwl.AiMian.data.model.JobDictionaryCategory
import retrofit2.http.GET

interface JobDictionaryApi {
    @GET("job-dictionary")
    suspend fun getJobDictionary(): ApiResponse<List<JobDictionaryCategory>>
}
