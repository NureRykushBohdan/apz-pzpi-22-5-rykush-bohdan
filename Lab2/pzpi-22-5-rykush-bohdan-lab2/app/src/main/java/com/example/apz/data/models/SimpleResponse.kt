package com.example.apz.data.models

data class SimpleResponse(
    val success: Boolean,
    val message: String? // message може не прийти, тому робимо його необов'язковим (nullable)
)