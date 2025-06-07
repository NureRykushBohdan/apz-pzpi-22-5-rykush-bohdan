const axios = require('axios');

// Адреса, куди імітатор буде надсилати дані
const API_ENDPOINT = 'http://localhost:3000/api/readings';

// Створюємо масив з 16-ти імітованих сенсорів
const SENSORS = [
    { id: 1, type: 'air' }, { id: 2, type: 'air' }, { id: 3, type: 'air' }, { id: 4, type: 'air' },
    { id: 5, type: 'air' }, { id: 6, type: 'air' },
    { id: 7, type: 'water' }, { id: 8, type: 'water' }, { id: 9, type: 'water' }, { id: 10, type: 'water' },
    { id: 11, type: 'water' }, { id: 12, type: 'water' },
    { id: 13, type: 'noise' }, { id: 14, type: 'noise' }, { id: 15, type: 'noise' }, { id: 16, type: 'noise' }
];

// Функція для генерації випадкових даних
function generateReading(sensor) {
    let data_values = {};
    let status = 'good';

    if (sensor.type === 'air') {
        const pm25 = Math.floor(Math.random() * 50) + 1; // 1 to 50
        data_values = { pm25, co2: 400 + Math.floor(Math.random() * 500), so2: 2 + Math.floor(Math.random() * 15) };
        if (pm25 > 35) status = 'poor';
        else if (pm25 > 15) status = 'moderate';
    } else if (sensor.type === 'water') {
        const ph = (6.0 + Math.random() * 3.0).toFixed(1);
        data_values = { temperature: (15.0 + Math.random() * 10).toFixed(1), ph: parseFloat(ph) };
        if (ph < 6.5 || ph > 8.5) status = 'poor';
    } else if (sensor.type === 'noise') {
        const db_level = 40 + Math.floor(Math.random() * 55); // 40 to 94
        data_values = { db_level };
        if (db_level > 80) status = 'poor';
        else if (db_level > 65) status = 'moderate';
    }

    return {
        sensor_id: sensor.id,
        status: status,
        data_values: data_values
    };
}

// Головна функція, яка надсилає дані
async function sendData() {
    // Вибираємо випадковий сенсор
    const randomSensor = SENSORS[Math.floor(Math.random() * SENSORS.length)];
    const readingData = generateReading(randomSensor);

    try {
        // Робимо POST-запит на наш сервер за допомогою axios
        const response = await axios.post(API_ENDPOINT, readingData);
        console.log(`Надіслано дані від сенсора #${readingData.sensor_id}. Відповідь сервера: ${response.status}`);
    } catch (error) {
        console.error(`ПОМИЛКА: Не вдалося надіслати дані. Переконайтесь, що основний сервер (server.js) запущено. Повідомлення:`, error.message);
    }
}

// Встановлюємо інтервал: запускати функцію sendData кожні 7 секунд
const SIMULATION_INTERVAL = 7000; // 7000 мілісекунд = 7 секунд

console.log('Імітатор датчиків запущено.');
console.log(`Нові дані будуть надсилатися на ${API_ENDPOINT} кожні ${SIMULATION_INTERVAL / 1000} секунд.`);
console.log('Натисніть Ctrl+C, щоб зупинити імітатор.');
console.log('-----------------------------------');

setInterval(sendData, SIMULATION_INTERVAL);