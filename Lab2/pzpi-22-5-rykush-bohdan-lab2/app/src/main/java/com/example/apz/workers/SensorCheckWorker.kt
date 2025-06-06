// Файл: app/src/main/java/com/example/apz/workers/SensorCheckWorker.kt
package com.example.apz.workers

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.apz.R
import com.example.apz.data.network.RetrofitInstance

class SensorCheckWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    // Тут ми визначаємо пороги для сповіщень
    object Thresholds {
        const val MAX_TEMPERATURE = 30.0
        const val MIN_TEMPERATURE = 5.0
        const val MAX_CO2 = 1500
        // Додайте інші пороги за потреби
    }

    // Цей метод буде виконуватися у фоні
    override suspend fun doWork(): Result {
        return try {
            // 1. Отримуємо дані з сервера
            val response = RetrofitInstance.api.getSensorsWithLatestReadings()
            if (response.isSuccessful) {
                val sensors = response.body() ?: emptyList()

                // 2. Перевіряємо кожен датчик
                for (sensor in sensors) {
                    sensor.data_values?.let { data ->
                        val temp = (data["temperature"] as? Number)?.toDouble()
                        val co2 = (data["co2"] as? Number)?.toInt()

                        // 3. Перевіряємо пороги і відправляємо сповіщення
                        if (temp != null && temp > Thresholds.MAX_TEMPERATURE) {
                            showNotification("Висока температура!", "Датчик '${sensor.sensor_name}' показує ${"%.1f".format(temp)}°C.")
                        }
                        if (co2 != null && co2 > Thresholds.MAX_CO2) {
                            showNotification("Високий рівень CO2!", "Датчик '${sensor.sensor_name}' показує $co2 ppm.")
                        }
                    }
                }
            }
            Result.success()
        } catch (e: Exception) {
            Result.failure()
        }
    }

    private fun showNotification(title: String, content: String) {
        val notificationId = System.currentTimeMillis().toInt() // Унікальний ID для кожного сповіщення

        val builder = NotificationCompat.Builder(context, "SENSOR_ALERTS_CHANNEL")
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Стандартна іконка, можна замінити
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        // Перевіряємо дозвіл перед показом
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        }
    }
}