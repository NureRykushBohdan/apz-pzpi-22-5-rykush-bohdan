package com.example.apz.data.models

data class Sensor(
    val sensor_id: Int,
    val sensor_name: String,
    val sensor_type: String,
    val latitude: Double,
    val longitude: Double,
    val status: String,
    val last_updated: String,
    // ДОДАНО: Поле для останніх показників
    val data_values: Map<String, Any?>? // Any? бо значення можуть бути числами або null
)