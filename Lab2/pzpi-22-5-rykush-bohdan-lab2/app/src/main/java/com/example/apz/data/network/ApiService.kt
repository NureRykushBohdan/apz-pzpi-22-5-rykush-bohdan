// Файл: app/src/main/java/com/example/apz/data/network/ApiService.kt
package com.example.apz.data.network

import com.example.apz.data.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {

    @POST("/login")
    suspend fun login(@Body request: LoginRequest): Response<Void>

    @POST("/register")
    suspend fun register(@Body request: RegisterRequest): Response<SimpleResponse>

    @GET("/api/sensors-with-latest-readings")
    suspend fun getSensorsWithLatestReadings(): Response<List<Sensor>>

    @POST("/api/update-location")
    suspend fun updateLocation(@Body location: Map<String, Double>): Response<Void>

    @GET("/api/sensors/{id}/history")
    suspend fun getSensorHistory(@Path("id") sensorId: Int): Response<List<SensorHistoryPoint>>
}