// Файл: app/src/main/java/com/example/apz/MyApplication.kt
package com.example.apz

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.apz.data.network.RetrofitInstance
import com.example.apz.workers.SensorCheckWorker
import java.util.concurrent.TimeUnit

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Ініціалізуємо Retrofit
        RetrofitInstance.initialize(this)

        // Створюємо канал для сповіщень
        createNotificationChannel()

        // Запускаємо наше фонове завдання
        scheduleSensorCheck()
    }

    private fun createNotificationChannel() {
        val name = "Сповіщення від датчиків"
        val descriptionText = "Канал для показу попереджень про показники датчиків"
        val importance = NotificationManager.IMPORTANCE_HIGH
        val channel = NotificationChannel("SENSOR_ALERTS_CHANNEL", name, importance).apply {
            description = descriptionText
        }
        val notificationManager: NotificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }

    private fun scheduleSensorCheck() {
        // Створюємо запит на періодичне виконання (кожні 15 хвилин - мінімальний інтервал)
        val sensorCheckWorkRequest =
            PeriodicWorkRequestBuilder<SensorCheckWorker>(15, TimeUnit.MINUTES)
                .build()

        // Запускаємо унікальне завдання, щоб уникнути дублювання
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "SensorCheckWork",
            ExistingPeriodicWorkPolicy.KEEP, // Якщо завдання вже існує, нічого не робити
            sensorCheckWorkRequest
        )
    }
}