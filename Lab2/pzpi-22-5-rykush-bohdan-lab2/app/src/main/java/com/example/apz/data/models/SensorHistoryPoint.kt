package com.example.apz.data.models

data class SensorHistoryPoint(
    val timestamp: String,
    // ОНОВЛЕНО: Використовуємо Number, щоб приймати і цілі, і дробові числа
    val data_values: Map<String, Number>
)