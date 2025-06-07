package com.example.apz.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.apz.data.network.SessionManager
import com.example.apz.ui.login.LoginScreen
import com.example.apz.ui.main.HomeScreen
import com.example.apz.ui.main.MainViewModel
import com.example.apz.ui.scanner.QrScannerScreen

sealed class Screen(val route: String) {
    object Login: Screen("login_screen")
    object Home: Screen("home_screen")
    object QrScanner: Screen("qr_scanner_screen")
    object SensorDetail: Screen("sensor_detail_screen/{sensorId}") {
        fun createRoute(sensorId: Int) = "sensor_detail_screen/$sensorId"
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val sessionManager = SessionManager(context)
    // Створюємо ViewModel на верхньому рівні навігації, щоб поділитись між екранами
    val mainViewModel: MainViewModel = viewModel()

    val startDestination = if (sessionManager.isLoggedIn()) Screen.Home.route else Screen.Login.route

    NavHost(navController = navController, startDestination = startDestination) {
        composable(route = Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        composable(route = Screen.Home.route) {
            HomeScreen(
                onLogout = {
                    sessionManager.clearSession() // Очищуємо сесію
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onScanClick = { navController.navigate(Screen.QrScanner.route) }
            )
        }
        composable(route = Screen.QrScanner.route) {
            QrScannerScreen(onQrCodeScanned = { qrValue ->
                val foundSensor = mainViewModel.findSensorByCoordinates(qrValue)
                if (foundSensor != null) {
                    navController.navigate(Screen.SensorDetail.createRoute(foundSensor.sensor_id)) {
                        popUpTo(Screen.QrScanner.route) { inclusive = true }
                    }
                } else {
                    navController.popBackStack()
                }
            })
        }
        composable(
            route = Screen.SensorDetail.route,
            arguments = listOf(navArgument("sensorId") { type = NavType.IntType })
        ) { backStackEntry ->
            val sensorId = backStackEntry.arguments?.getInt("sensorId")
            if (sensorId != null) {
                // Поки що заглушка, але тепер вона коректна
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Екран для датчика з ID: $sensorId")
                }
            }
        }
    }
}