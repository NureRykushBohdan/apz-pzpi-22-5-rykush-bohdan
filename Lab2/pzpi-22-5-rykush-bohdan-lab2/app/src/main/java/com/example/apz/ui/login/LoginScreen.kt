// Файл: app/src/main/java/com/example/apz/ui/login/LoginScreen.kt
package com.example.apz.ui.login

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun LoginScreen(
    // Ця функція буде викликатись при успішному логіні,
    // щоб ми могли перейти на інший екран.
    onLoginSuccess: () -> Unit
) {
    // Отримуємо екземпляр нашої ViewModel
    val loginViewModel: LoginViewModel = viewModel()
    // Підписуємось на зміни стану UI
    val uiState by loginViewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Створюємо змінні для зберігання тексту в полях вводу
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    // LaunchedEffect - виконує код, коли стан змінюється.
    // Це ідеальне місце для показу повідомлень або навігації.
    LaunchedEffect(key1 = uiState) {
        when (val state = uiState) {
            is LoginUiState.Success -> {
                // Показуємо повідомлення про успіх
                Toast.makeText(context, "Вхід успішний!", Toast.LENGTH_SHORT).show()
                // Викликаємо функцію для переходу на інший екран
                onLoginSuccess()
            }
            is LoginUiState.Error -> {
                // Показуємо повідомлення про помилку
                Toast.makeText(context, state.message, Toast.LENGTH_LONG).show()
            }
            else -> Unit // Нічого не робимо в станах Idle та Loading
        }
    }

    // --- Тут починається опис самого UI ---
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Вхід до системи", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Пароль") },
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(24.dp))

            // Показуємо або кнопку, або індикатор завантаження
            if (uiState is LoginUiState.Loading) {
                CircularProgressIndicator()
            } else {
                Button(
                    onClick = { loginViewModel.login(email, password) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Увійти")
                }
            }
        }
    }
}