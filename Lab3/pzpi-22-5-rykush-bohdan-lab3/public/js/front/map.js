document.addEventListener("DOMContentLoaded", async function() {
    // 1. Ініціалізація карти
    const map = L.map('map').setView([49.9935, 36.2304], 12); // Центр - Харків

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. Іконки для маркерів
    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const yellowIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
     const greyIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    const getIconByStatus = (status) => {
        const lowerCaseStatus = status ? status.toLowerCase() : 'unknown';
        if (lowerCaseStatus === 'good' || lowerCaseStatus === 'добре') return greenIcon;
        if (lowerCaseStatus === 'moderate' || lowerCaseStatus === 'помірно') return yellowIcon;
        if (lowerCaseStatus === 'poor' || lowerCaseStatus === 'погано') return redIcon;
        return greyIcon;
    };

    // 3. Створення шарів для фільтрації
    const layerGroups = {
        air: L.layerGroup(),
        water: L.layerGroup(),
        noise: L.layerGroup()
    };
    // Загальний шар, щоб легко показувати/ховати всі маркери разом
    const allMarkersLayerGroup = L.layerGroup();

    const sidebarInfo = document.getElementById('sidebar-info');

    // 4. Функція для відображення маркерів на карті
    function displayMarkers(sensors) {
        // Очищення попередніх маркерів
        Object.values(layerGroups).forEach(group => group.clearLayers());
        allMarkersLayerGroup.clearLayers();

        if (!sensors || sensors.length === 0) {
            sidebarInfo.innerHTML = "<p>Не знайдено даних для відображення.</p>";
            return;
        }

        sensors.forEach(sensor => {
            // Перевірка наявності координат
            if (sensor.latitude == null || sensor.longitude == null || !sensor.sensor_type) {
                console.warn('Дані сенсора неповні (відсутні координати або тип):', sensor);
                return; 
            }

            const marker = L.marker([sensor.latitude, sensor.longitude], { 
                icon: getIconByStatus(sensor.status),
                sensorData: sensor // Зберігаємо всі дані в маркері для легкого доступу
            });

            // Формування контенту для спливаючого вікна
            let popupContent = `<h4>${sensor.sensor_name || 'Невідомий сенсор'}</h4>`;
            popupContent += `<p><strong>Тип:</strong> ${sensor.sensor_type}</p>`;
            popupContent += `<p><strong>Статус:</strong> ${sensor.status || 'Немає даних'}</p>`;
            
            // `data_values` - це об'єкт JSON з бази даних
            if (sensor.data_values && typeof sensor.data_values === 'object') {
                for (const [key, value] of Object.entries(sensor.data_values)) {
                    popupContent += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
                }
            }
            if (sensor.last_updated) {
                 popupContent += `<p><small>Оновлено: ${new Date(sensor.last_updated).toLocaleString('uk-UA')}</small></p>`;
            }

            marker.bindPopup(popupContent);

            // Оновлення інформації в бічній панелі при наведенні
            marker.on('mouseover', function(e) {
                const data = this.options.sensorData;
                let infoText = `<strong>${data.sensor_name}</strong><br>
                                Тип: ${data.sensor_type}<br>
                                Статус: ${data.status || 'Немає даних'}`;
                if (data.data_values) {
                     for(const [key, value] of Object.entries(data.data_values)) {
                        infoText += `<br>${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                    }
                }
                sidebarInfo.innerHTML = infoText;
            });
             marker.on('mouseout', function(e) {
                sidebarInfo.innerHTML = `<p>Наведіть курсор на сенсор для отримання детальної інформації.</p>`;
            });

            // Додавання маркера до відповідних шарів
            const typeKey = sensor.sensor_type.toLowerCase();
            if (layerGroups[typeKey]) {
                marker.addTo(layerGroups[typeKey]);
            }
            // Копія маркера у загальний шар, щоб уникнути конфліктів
            L.marker([sensor.latitude, sensor.longitude], { 
                icon: getIconByStatus(sensor.status),
                sensorData: sensor 
            }).bindPopup(popupContent).addTo(allMarkersLayerGroup);
        });
        
        updateVisibleLayers(); // Застосовуємо початковий фільтр
    }

    // 5. Функція для оновлення видимості шарів згідно з фільтром
    function updateVisibleLayers() {
        const selectedType = document.querySelector('input[name="layer-toggle"]:checked').value;
        
        // Спочатку ховаємо всі шари
        map.removeLayer(allMarkersLayerGroup);
        Object.values(layerGroups).forEach(group => map.removeLayer(group));

        if (selectedType === "all") {
            allMarkersLayerGroup.addTo(map);
        } else if (layerGroups[selectedType]) {
            layerGroups[selectedType].addTo(map);
        }
    }

    // 6. Завантаження даних сенсорів з сервера
    async function fetchSensorData() {
        try {
            // Запит до вашого API ендпоінту
            const response = await fetch('/api/sensors-with-latest-readings'); 
            if (!response.ok) {
                throw new Error(`HTTP помилка! Статус: ${response.status}`);
            }
            const sensors = await response.json();
            if (Array.isArray(sensors)) {
                displayMarkers(sensors);
            } else {
                console.error("Отримані дані не є масивом:", sensors);
                sidebarInfo.innerHTML = "<p>Помилка формату даних.</p>";
            }
        } catch (error) {
            console.error("Помилка завантаження даних сенсорів:", error);
            sidebarInfo.innerHTML = "<p>Не вдалося завантажити дані. Спробуйте оновити сторінку.</p>";
        }
    }

    // Додаємо обробники подій для фільтрів
    const filterRadios = document.querySelectorAll('input[name="layer-toggle"]');
    filterRadios.forEach(radio => {
        radio.addEventListener('change', updateVisibleLayers);
    });

    // Початкове завантаження даних при завантаженні сторінки
    fetchSensorData();
});
