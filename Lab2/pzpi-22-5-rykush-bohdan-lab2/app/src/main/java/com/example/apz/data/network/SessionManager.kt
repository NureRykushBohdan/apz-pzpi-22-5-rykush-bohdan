package com.example.apz.data.network



import android.content.Context

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("CookiePrefs", Context.MODE_PRIVATE)

    // Перевіряємо, чи існує хоча б один запис про cookie для нашого хоста
    fun isLoggedIn(): Boolean {
        // Перевіряємо, чи є збережені cookies для нашого хоста
        return prefs.getStringSet("nikkme.me", null)?.isNotEmpty() ?: false
    }

    // ДОДАНО: Функція для очищення збережених cookies
    fun clearSession() {
        prefs.edit().clear().apply()
    }
}