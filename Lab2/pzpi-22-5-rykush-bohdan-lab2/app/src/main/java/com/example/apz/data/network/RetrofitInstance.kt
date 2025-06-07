package com.example.apz.data.network

import android.content.Context
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitInstance {
    private const val BASE_URL = "https://nikkme.me/"
    private lateinit var cookieJar: PersistentCookieJar

    fun initialize(context: Context) {
        cookieJar = PersistentCookieJar(context)
    }

    private val okHttpClient: OkHttpClient by lazy {
        if (!::cookieJar.isInitialized) {
            throw UninitializedPropertyAccessException("RetrofitInstance must be initialized first in Application class.")
        }
        OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .build()
    }

    // ВИПРАВЛЕНО: Правильна ініціалізація 'api'
    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val api: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    fun logout() {
        if (::cookieJar.isInitialized) {
            cookieJar.clear()
        }
    }
}