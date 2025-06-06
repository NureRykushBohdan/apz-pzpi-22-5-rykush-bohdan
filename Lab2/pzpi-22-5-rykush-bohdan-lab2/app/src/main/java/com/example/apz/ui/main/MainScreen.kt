package com.example.apz.ui.main

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.apz.data.models.Sensor

@Composable
fun MainScreen(viewModel: MainViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted -> if (isGranted) viewModel.startDataLoading() }
    )

    LaunchedEffect(Unit) {
        locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        when (val state = uiState) {
            is MainUiState.Loading -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "Отримання геолокації та даних...")
                }
            }
            is MainUiState.Success -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item { SensorInfoCard(sensor = state.nearestSensor) }

                    if (state.chartDataMap.isNotEmpty()) {
                        item { Text("Історія показників", style = MaterialTheme.typography.titleLarge) }

                        items(state.chartDataMap.entries.toList()) { (dataKey, chartData) ->
                            SensorHistoryChart(
                                chartData = chartData,
                                dataKey = dataKey,
                                chartTitle = getChartTitleForKey(dataKey)
                            )
                        }
                    }
                }
            }
            is MainUiState.Error -> Text(text = "Помилка: ${state.message}")
            is MainUiState.Idle -> Text(text = "Очікування дозволу на геолокацію...")
        }
    }
}

private fun getChartTitleForKey(key: String): String {
    return when (key) {
        "temperature" -> "Історія температури (°C)"
        "co2" -> "Історія рівня CO2 (ppm)"
        "so2" -> "Історія рівня SO2 (µg/m³)"
        "pm25" -> "Історія рівня PM2.5 (µg/m³)"
        "db_level" -> "Історія рівня шуму (dB)"
        "salinity" -> "Історія рівня солоності"
        else -> "Історія для $key"
    }
}

private fun getIconForKey(key: String): ImageVector {
    return when (key) {
        "temperature" -> Icons.Default.Thermostat
        "co2" -> Icons.Default.Cloud
        "pm25" -> Icons.Default.Grain
        "db_level" -> Icons.Default.GraphicEq
        else -> Icons.Default.BarChart
    }
}

@Composable
fun SensorInfoCard(sensor: Sensor) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "Інформація про датчик", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 8.dp))
            InfoRow(icon = Icons.Default.Info, label = "Назва", value = sensor.sensor_name)
            InfoRow(icon = Icons.Default.CheckCircle, label = "Статус", value = sensor.status)
            sensor.data_values?.let { data ->
                Divider(modifier = Modifier.padding(vertical = 8.dp))
                Text("Останні показники:", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
                data.forEach { (key, value) ->
                    if (value != null) {
                        InfoRow(icon = getIconForKey(key), label = key.replaceFirstChar { it.titlecase() }, value = value.toString())
                    }
                }
            }
        }
    }
}

@Composable
fun InfoRow(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Icon(imageVector = icon, contentDescription = label, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text("$label: ", fontWeight = FontWeight.Bold)
        Text(value)
    }
}