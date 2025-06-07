package com.example.apz.ui.main

import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.apz.data.models.Sensor
import com.example.apz.data.models.SensorHistoryPoint
import com.example.apz.data.network.RetrofitInstance
import com.google.android.gms.location.*
import com.patrykandpatrick.vico.core.entry.ChartEntry
import com.patrykandpatrick.vico.core.entry.entryOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

data class ChartData(
    val entries: List<ChartEntry>,
    val horizontalAxisValueFormatter: DateTimeAxisValueFormatter
)

sealed class MainUiState {
    object Idle : MainUiState()
    object Loading : MainUiState()
    data class Success(
        val nearestSensor: Sensor,
        val allSensors: List<Sensor>,
        val chartDataMap: Map<String, ChartData>
    ) : MainUiState()
    data class Error(val message: String) : MainUiState()
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow<MainUiState>(MainUiState.Idle)
    val uiState: StateFlow<MainUiState> = _uiState

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(application)

    private val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L).build()

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            locationResult.lastLocation?.let {
                fetchSensorsAndFindNearest(it)
                fusedLocationClient.removeLocationUpdates(this)
            }
        }
    }

    fun startDataLoading() {
        _uiState.value = MainUiState.Loading
        requestLocationUpdates()
    }

    fun findSensorByCoordinates(qrValue: String): Sensor? {
        return (uiState.value as? MainUiState.Success)?.allSensors?.find { sensor ->
            try {
                val (latStr, lonStr) = qrValue.split(',')
                val lat = latStr.trim().toDouble()
                val lon = lonStr.trim().toDouble()
                kotlin.math.abs(sensor.latitude - lat) < 0.0001 && kotlin.math.abs(sensor.longitude - lon) < 0.0001
            } catch (e: Exception) {
                false
            }
        }
    }

    private fun requestLocationUpdates() {
        if (ContextCompat.checkSelfPermission(
                getApplication(), Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        } else {
            _uiState.value = MainUiState.Error("Немає дозволу на доступ до геолокації.")
        }
    }

    private fun fetchSensorsAndFindNearest(userLocation: Location) {
        viewModelScope.launch {
            try {
                val sensorsResponse = RetrofitInstance.api.getSensorsWithLatestReadings()
                if (sensorsResponse.isSuccessful && sensorsResponse.body() != null) {
                    val allSensors = sensorsResponse.body()!!
                    val nearestSensor = allSensors.minByOrNull { sensor ->
                        val sensorLocation = Location("").apply { latitude = sensor.latitude; longitude = sensor.longitude }
                        userLocation.distanceTo(sensorLocation)
                    }
                    if (nearestSensor != null) {
                        fetchHistoryAndProcessCharts(nearestSensor, allSensors)
                    } else {
                        _uiState.value = MainUiState.Error("Датчики не знайдені.")
                    }
                } else {
                    _uiState.value = MainUiState.Error("Помилка завантаження датчиків.")
                }
            } catch (e: Exception) {
                _uiState.value = MainUiState.Error("Помилка мережі: ${e.message}")
            }
        }
    }

    private fun fetchHistoryAndProcessCharts(sensor: Sensor, allSensors: List<Sensor>) {
        viewModelScope.launch {
            try {
                val historyResponse = RetrofitInstance.api.getSensorHistory(sensor.sensor_id)
                if (historyResponse.isSuccessful && historyResponse.body() != null) {
                    val history = historyResponse.body()!!
                    val chartDataMap = processHistoryForCharts(history)
                    _uiState.value = MainUiState.Success(sensor, allSensors, chartDataMap)
                } else {
                    _uiState.value = MainUiState.Error("Не вдалося завантажити історію.")
                }
            } catch (e: Exception) {
                _uiState.value = MainUiState.Error("Помилка мережі при завантаженні історії.")
            }
        }
    }

    private suspend fun processHistoryForCharts(history: List<SensorHistoryPoint>): Map<String, ChartData> = withContext(Dispatchers.Default) {
        val chartDataMap = mutableMapOf<String, ChartData>()
        val dataKeys = history.flatMap { it.data_values.keys }.distinct()
        val timestamps = history.map { parseTimestamp(it.timestamp) }
        val timeFormatter = DateTimeAxisValueFormatter(timestamps)

        for (key in dataKeys) {
            val entries = history.mapIndexedNotNull { index, point ->
                val value = point.data_values[key]?.toFloat()
                value?.let { entryOf(index.toFloat(), it) }
            }
            if (entries.isNotEmpty()) {
                chartDataMap[key] = ChartData(entries, timeFormatter)
            }
        }
        chartDataMap
    }

    private fun parseTimestamp(timestamp: String): LocalDateTime {
        return try {
            val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS")
            LocalDateTime.parse(timestamp, formatter)
        } catch (e: DateTimeParseException) {
            try {
                val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                LocalDateTime.parse(timestamp, formatter)
            } catch (e2: DateTimeParseException) {
                LocalDateTime.now()
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
}