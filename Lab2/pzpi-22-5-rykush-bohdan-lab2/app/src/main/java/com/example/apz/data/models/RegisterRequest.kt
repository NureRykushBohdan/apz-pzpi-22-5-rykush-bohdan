package com.example.apz.data.models

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    // Назва поля у JSON ("confirm-password") містить дефіс,
    // що не можна використовувати у назві змінної в Kotlin.
    // @SerializedName говорить конвертеру, яку назву використовувати в JSON.
    @SerializedName("confirm-password")
    val confirmPassword: String
)