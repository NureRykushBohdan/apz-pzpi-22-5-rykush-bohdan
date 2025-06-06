document.addEventListener("DOMContentLoaded", function () {
    // ... (ваш існуючий код для випадаючого меню та повідомлень) ...

    const updateLocationBtn = document.getElementById("update-location-btn");
    const locationStatus = document.getElementById("location-status");

    if (updateLocationBtn) {
        updateLocationBtn.addEventListener("click", () => {
            locationStatus.textContent = "Запитую дозвіл на геолокацію...";
            locationStatus.style.color = "#333";

            if (!navigator.geolocation) {
                locationStatus.textContent = "Ваш браузер не підтримує геолокацію.";
                locationStatus.style.color = "red";
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    locationStatus.textContent = "Отримано координати. Зберігаємо...";

                    try {
                        const response = await fetch('/api/update-location', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                               body: JSON.stringify({ latitude, longitude })
});

                        const result = await response.json();

                        if (result.success) {
                            locationStatus.textContent = "Місцезнаходження успішно оновлено!";
                            locationStatus.style.color = "green";
                        } else {
                            locationStatus.textContent = result.message || "Не вдалося оновити місцезнаходження.";
                            locationStatus.style.color = "red";
                        }
                    } catch (error) {
                        locationStatus.textContent = "Помилка при відправці даних на сервер.";
                        locationStatus.style.color = "red";
                    }
                },
                (error) => {
                    locationStatus.textContent = "Не вдалося отримати місцезнаходження. " + error.message;
                    locationStatus.style.color = "red";
                }
            );
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const toast = document.getElementById("success-toast");

    if (toast) {
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
            toast.style.display = "none"; // Приховуємо елемент повністю
        }, 5000);
    }
});

