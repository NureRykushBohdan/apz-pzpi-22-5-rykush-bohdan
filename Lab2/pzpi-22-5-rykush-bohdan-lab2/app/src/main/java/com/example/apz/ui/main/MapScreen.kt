// Файл: app/src/main/java/com/example/apz/ui/main/MapScreen.kt
package com.example.apz.ui.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState

@Composable
fun MapScreen(viewModel: MainViewModel) { // <--- ЗМІНА ТУТ
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        val kyiv = LatLng(50.45, 30.52)
        val cameraPositionState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(kyiv, 10f)
        }

        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState
        ) {
            if (uiState is MainUiState.Success) {
                val allSensors = (uiState as MainUiState.Success).allSensors
                allSensors.forEach { sensor ->
                    Marker(
                        state = MarkerState(position = LatLng(sensor.latitude, sensor.longitude)),
                        title = sensor.sensor_name,
                        snippet = "Статус: ${sensor.status}"
                    )
                }
            }
        }
    }
}