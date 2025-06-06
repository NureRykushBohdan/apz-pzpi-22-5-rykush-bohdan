// Файл: app/src/main/java/com/example/apz/ui/login/LoginViewModel.kt
package com.example.apz.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.apz.data.models.LoginRequest
import com.example.apz.data.network.RetrofitInstance
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// Описуємо можливі стани нашого екрану
sealed class LoginUiState {
    object Idle : LoginUiState() // Початковий стан
    object Loading : LoginUiState() // Іде завантаження (робимо запит)
    object Success : LoginUiState() // Запит успішний
    data class Error(val message: String) : LoginUiState() // Сталася помилка
}

class LoginViewModel : ViewModel() {

    // StateFlow - це спеціальний потік даних, який вміє зберігати свій стан.
    // UI буде підписуватися на нього і реагувати на зміни.
    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState

    fun login(email: String, password: String) {
        // Перевірка на пусті поля
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = LoginUiState.Error("Будь ласка, заповніть всі поля")
            return
        }

        // viewModelScope - це спеціальна область для запуску корутин,
        // яка автоматично скасує запит, якщо ViewModel знищиться (наприклад, користувач закриє екран).
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading // Переводимо UI у стан завантаження
            try {
                val response = RetrofitInstance.api.login(LoginRequest(email, password))

                if (response.isSuccessful) {
                    // Сервер відповів успішно (код 2xx).
                    // Це означає, що логін пройшов і cookie сесії встановлено.
                    _uiState.value = LoginUiState.Success
                } else {
                    // Сервер відповів з помилкою (наприклад, 401 Unauthorized)
                    _uiState.value = LoginUiState.Error("Невірний email або пароль")
                }
            } catch (e: Exception) {
                // Сталася помилка мережі (немає інтернету, сервер недоступний)
                _uiState.value = LoginUiState.Error("Помилка мережі: ${e.message}")
            }
        }
    }
}