package com.example.apz.data.network



import android.content.Context
import android.content.SharedPreferences
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

class PersistentCookieJar(context: Context) : CookieJar {
    private val prefs: SharedPreferences = context.getSharedPreferences("CookiePrefs", Context.MODE_PRIVATE)

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val editor = prefs.edit()
        val cookieStrings = cookies.map { it.toString() }.toSet()
        editor.putStringSet(url.host, cookieStrings)
        editor.apply()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val cookieStrings = prefs.getStringSet(url.host, emptySet()) ?: emptySet()
        return cookieStrings.mapNotNull { Cookie.parse(url, it) }
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}