require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const multer = require("multer");
const pgSession = require("connect-pg-simple")(session);
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const sharp = require("sharp"); 




const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


const cookieParser = require("cookie-parser");
app.use(cookieParser());


const port = process.env.PORT || 3000;


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 

app.use(express.urlencoded({ extended: true }));

app.use(express.json());



const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});
app.use(session({
    store: new pgSession({
        pool: pool, 
        tableName: 'user_sessions', 
        createTableIfMissing: true 
    }),
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів збереження сесії
        secure: false, // Якщо HTTPS, поставте true
        httpOnly: true
    }
}));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.TESTMAIL_SENDER,
        pass: process.env.TESTMAIL_API_KEY
    }
});

// Перевірка підключення до бази даних
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Помилка підключення до бази даних:', err);
    } else {
        console.log('Підключено до бази даних:', res.rows[0]);
    }
});

// Головна сторінка
app.get("/", (req, res) => {
    if (!req.session.user && req.cookies.user) {
        req.session.user = JSON.parse(req.cookies.user);
    }
    res.render("front/index", { title: "Головна сторінка", user: req.session.user });
});

app.get("/login", (req, res) => {
    const redirectUrl = req.query.redirect || "/";
    res.render("front/login", { message: req.session.message || "", redirect: redirectUrl });
    req.session.message = ""; // Очищення повідомлення після відображення
});

app.get("/system", (req, res) => {
    if (!req.session.user && req.cookies.user) {
        req.session.user = JSON.parse(req.cookies.user);
    }
    res.render("system/system", { title: "Cистема", user: req.session.user });
});

// Маршрут для сторінки "Про нас"
app.get("/about-us", (req, res) => {
    res.render("front/About_Us", { title: "Про нас", user: req.session.user });
});

app.get("/map", (req, res) => {
    res.render("front/map", { 
        title: "Карта моніторингу",
        user: req.session.user || null 
    });
});

app.get("/about-system", (req, res) => {
    res.render("front/about-system", { title: "про систему", user: req.session.user });
});

app.get("/contact", (req, res) => {
    res.render("front/contact", { 
        title: "Контакти", 
        user: req.session.user || null, 
        message: null 
    });
});

app.get("/get-user-email", (req, res) => {
    if (req.session.user && req.session.user.email) {
        res.json({ email: req.session.user.email });
    } else {
        res.json({ email: "" });
    }
});

app.get("/start", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login"); // Якщо користувач не авторизований → перенаправити на login
    }

    res.render("learning/start", { 
        title: "Початок занять", 
        user: req.session.user // Тепер передаємо тільки інформацію про користувача
    });
});




// Сторінка реєстрації
app.get('/register', (req, res) => {
    // Ваш код, де визначається success
    const success = false; // або false, залежно від результату реєстрації

    res.render('users/register', { success: success });
});





// Вихід
app.get("/logout", (req, res) => {
    res.clearCookie("user"); // Видаляємо кукі
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// 📌 Сторінка профілю
app.get("/profile", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    try {
        const user = await pool.query("SELECT name, email, profile_picture FROM users WHERE id = $1", 
            [req.session.user.id]);

        if (user.rows.length === 0) return res.redirect("/logout");

        res.render("users/profile", { title: "Профіль", user: user.rows[0] });
    } catch (err) {
        console.error("Помилка завантаження профілю:", err);
        res.redirect("/");
    }
});
app.get("/settings", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        const result = await pool.query("SELECT name, email, profile_picture FROM users WHERE id = $1", [req.session.user.id]);
        const user = result.rows[0];

        const message = req.session.message; // Отримуємо повідомлення з сесії
        req.session.message = null; // Видаляємо повідомлення після рендеру сторінки

        res.render("users/settings", { user, message });
    } catch (err) {
        console.error("Помилка при завантаженні налаштувань:", err);
        res.redirect("/start");
    }
});



const flash = require('connect-flash');
app.use(flash());

// Реєстрація користувача

app.post("/register", async (req, res) => {
    const { name, email, password, "confirm-password": confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        return res.json({ success: false, message: "Заповніть всі поля!" });
    }

    if (password !== confirmPassword) {
        return res.json({ success: false, message: "Паролі не співпадають!" });
    }

    try {
        const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.json({ success: false, message: "Email вже використовується!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        await pool.query(
            "INSERT INTO users (name, email, password, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5)",
            [name, email, hashedPassword, verificationToken, false]
        );

        const BASE_URL = process.env.BASE_URL || "http://localhost:3000"; // 🔥 Використовуємо змінну оточення

const confirmLink = `${BASE_URL}/confirm-email?token=${verificationToken}`;

        await transporter.sendMail({
            from: process.env.TESTMAIL_SENDER,
            to: email,
            subject: "Підтвердіть вашу реєстрацію",
            html: `
                <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border-radius: 10px; background: #f9f9f9; text-align: center;">
                    <h2 style="color: #333;">Ласкаво просимо, ${name}!</h2>
                    <p>Дякуємо за реєстрацію! Натисніть кнопку нижче, щоб підтвердити ваш email:</p>
                    <a href="${confirmLink}" style="display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Підтвердити Email
                    </a>
                    <p style="margin-top: 10px; font-size: 14px; color: #666;">Якщо ви не реєструвалися, просто ігноруйте цей лист.</p>
                </div>
            `
        });
        

        return res.json({ success: true });

    } catch (err) {
        console.error("Помилка реєстрації:", err);
        return res.json({ success: false, message: "Помилка сервера!" });
    }
});

app.get("/confirm-email", async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.render("email/confirmation", { success: false, message: "Некоректне посилання." });
    }

    try {
        const user = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);

        if (user.rows.length === 0) {
            return res.render("email/confirmation", { success: false, message: "Посилання недійсне або вже використане." });
        }

        await pool.query(
            "UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1",
            [token]
        );

        return res.render("email/confirmation", { success: true, message: "Ваш email успішно підтверджено! Ви можете увійти." });

    } catch (err) {
        console.error("Помилка підтвердження email:", err);
        return res.render("email/confirmation", { success: false, message: "Сталася помилка. Спробуйте пізніше." });
    }
});


// В файле server.js

app.post("/login", async (req, res) => {
    const { email, password, redirect } = req.body;

    try {
        // Запит тепер включає нові поля
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            req.session.message = "Невірний email або пароль!";
            return res.redirect("/login");
        }

        const userData = user.rows[0];

        if (!userData.is_verified) {
            req.session.message = "Будь ласка, підтвердьте email перед входом!";
            return res.redirect("/login");
        }

        const isValidPassword = await bcrypt.compare(password, userData.password);
        if (!isValidPassword) {
            req.session.message = "Невірний email або пароль!";
            return res.redirect("/login");
        }

        // 🔥 **ОНОВЛЕНО: Додаємо координати в сесію**
        req.session.user = { 
            id: userData.id, 
            name: userData.name, 
            email: userData.email, 
            role: userData.role,
            latitude: userData.latitude,     // Додано
            longitude: userData.longitude   // Додано
        };

        res.cookie("user", JSON.stringify(req.session.user), { 
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            httpOnly: true 
        });

        const targetPage = redirect && redirect !== "undefined" ? redirect : "/system"; // Перенаправляємо на /system
        res.redirect(targetPage);
    } catch (err) {
        console.error("Помилка входу:", err);
        req.session.message = "Помилка сервера!";
        res.redirect("/login");
    }
});

app.post("/api/update-location", async (req, res) => {
    // Перевіряємо, чи користувач авторизований
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Не авторизовано" });
    }

    const { latitude, longitude } = req.body;
    const userId = req.session.user.id;

    // Проста валідація
    if (latitude == null || longitude == null) {
        return res.status(400).json({ success: false, message: "Невірні координати" });
    }

    try {
        await pool.query(
            "UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3",
            [latitude, longitude, userId]
        );

        // Оновлюємо дані в сесії
        req.session.user.latitude = latitude;
        req.session.user.longitude = longitude;

        res.json({ success: true, message: "Місцезнаходження оновлено!" });

    } catch (err) {
        console.error("Помилка оновлення місцезнаходження:", err);
        res.status(500).json({ success: false, message: "Помилка сервера" });
    }
});




app.post("/contact", async (req, res) => {
    const { email, message } = req.body;

    if (!email || !message) {
        return res.render("contact", { 
            title: "Контакти", 
            message: "Заповніть всі поля!", 
            user: req.session.user 
        });
    }

    try {
        await pool.query("INSERT INTO messages (email, message) VALUES ($1, $2)", [email, message]);
        res.render("contact", { 
            title: "Контакти", 
            message: "Ваше повідомлення успішно надіслано!", 
            user: req.session.user 
        });
    } catch (err) {
        console.error("Помилка при відправці повідомлення:", err);
        res.render("contact", { 
            title: "Контакти", 
            message: "Сталася помилка, спробуйте ще раз.", 
            user: req.session.user 
        });
    }
});





// Налаштування S3 для DigitalOcean Spaces
const s3 = new S3Client({
    region: "fra1", 
    endpoint: process.env.DO_SPACES_ENDPOINT, // <-- Тут має бути регіональна адреса
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
    }
});

// Налаштування Multer для DigitalOcean Spaces
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

// В файлі server.js

// 🔹 **ОНОВЛЕНИЙ Маршрут для оновлення фото профілю**
app.post("/upload-profile-pic", upload.single("profilePic"), async (req, res) => {
    if (!req.file) {
        req.session.message = "Файл не завантажено!";
        return res.redirect("/settings");
    }
    try {
        // Тепер req.file.buffer буде існувати, бо ми використовуємо memoryStorage
        const processedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 500, height: 500, fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer();

        // ... подальше завантаження в S3 ...
        const uniqueFileName = `profiles/${req.session.user.id}-${Date.now()}.webp`;
        const uploadParams = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: uniqueFileName,
            Body: processedImageBuffer,
            ACL: "public-read",
            ContentType: "image/webp"
        };
        await s3.send(new PutObjectCommand(uploadParams));

        // ... оновлення БД та редірект
        const profilePicUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT.replace('https://', '')}/${uniqueFileName}`;
        await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2", [profilePicUrl, req.session.user.id]);
        req.session.user.profile_picture = profilePicUrl;
        req.session.message = "Фото профілю успішно оновлено!";
        res.redirect("/settings");

    } catch (err) {
        // ... обробка помилок ...
        console.error("Помилка при оновленні фото профілю:", err);
        req.session.message = "Помилка при обробці зображення.";
        res.redirect("/settings");
    }
});


// 📌 Оновлення нікнейму
app.post("/update-name", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const { newName } = req.body;
    if (!newName) {
        req.session.message = "Нікнейм не може бути порожнім!";
        return res.redirect("/settings");
    }

    try {
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [newName, req.session.user.id]);
        req.session.user.name = newName;
        req.session.message = "Нікнейм оновлено!";
    } catch (err) {
        console.error("Помилка оновлення нікнейму:", err);
        req.session.message = "Помилка при оновленні нікнейму!";
    }
    res.redirect("/settings");
});


// 📌 Оновлення пароля
app.post("/update-password", async (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        req.session.message = "Будь ласка, заповніть всі поля!";
        return res.redirect("/settings");
    }

    try {
        const user = await pool.query("SELECT password FROM users WHERE id = $1", [req.session.user.id]);
        const validPass = await bcrypt.compare(oldPassword, user.rows[0].password);

        if (!validPass) {
            req.session.message = "Невірний поточний пароль!";
            return res.redirect("/settings");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, req.session.user.id]);
        req.session.message = "Пароль успішно змінено!";
    } catch (err) {
        console.error("Помилка оновлення пароля:", err);
        req.session.message = "Помилка при оновленні пароля!";
    }
    res.redirect("/settings");
});


app.get("/api/sensors-with-latest-readings", async (req, res) => {
    try {
        // SQL-запит, який ми обговорювали раніше
        const query = `
            SELECT DISTINCT ON (s.sensor_id)
                s.sensor_id,
                s.sensor_name,
                s.sensor_type,
                s.latitude,
                s.longitude,
                r.status,
                r.data_values,
                r.timestamp AS last_updated
            FROM 
                sensors s
            JOIN 
                sensor_readings r ON s.sensor_id = r.sensor_id
            WHERE
                s.is_active = TRUE
            ORDER BY 
                s.sensor_id, 
                r.timestamp DESC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows); // Відправляємо результат у форматі JSON
    } catch (err) {
        console.error("Помилка отримання даних для карти:", err);
        res.status(500).json({ error: "Помилка сервера при завантаженні даних" });
    }
});


// 2. Маршрут для додавання нового сенсора та його першого показника
// ВАЖЛИВО: цей маршрут має бути захищеним, наприклад, доступним тільки для адміністраторів
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: "Доступ заборонено. Потрібні права адміністратора." });
};

app.post("/api/sensors", checkAdmin, async (req, res) => {
    // В реальному проєкті тут має бути валідація даних (наприклад, через express-validator)
    const { sensor_name, sensor_type, latitude, longitude, status, description, data_values } = req.body;

    if (!sensor_name || !sensor_type || latitude == null || longitude == null) {
        return res.status(400).json({ message: "Обов'язкові поля: назва, тип, широта та довгота." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Початок транзакції

        // Крок 1: Додаємо новий сенсор до таблиці 'sensors' і отримуємо його ID
        const newSensorQuery = `
            INSERT INTO sensors (sensor_name, sensor_type, latitude, longitude, description) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING sensor_id;
        `;
        const sensorResult = await client.query(newSensorQuery, [sensor_name, sensor_type, latitude, longitude, description]);
        const newSensorId = sensorResult.rows[0].sensor_id;

        // Крок 2: Додаємо перший показник для цього сенсора до таблиці 'sensor_readings'
        // Переконуємося, що data_values є валідним JSON або null
        const dataValuesToInsert = (data_values && Object.keys(data_values).length > 0) ? JSON.stringify(data_values) : null;
        
        if (dataValuesToInsert) {
             const newReadingQuery = `
                INSERT INTO sensor_readings (sensor_id, status, data_values) 
                VALUES ($1, $2, $3);
            `;
            await client.query(newReadingQuery, [newSensorId, status, dataValuesToInsert]);
        }
       
        await client.query('COMMIT'); // Завершення транзакції
        res.status(201).json({ message: `Сенсор '${sensor_name}' успішно додано.` });

    } catch (err) {
        await client.query('ROLLBACK'); // Відкат транзакції у разі помилки
        console.error("Помилка додавання нового сенсора:", err);
        res.status(500).json({ message: "Помилка сервера при додаванні сенсора." });
    } finally {
        client.release(); // Повертаємо клієнта до пулу
    }
});


app.get("/api/sensors/:id/history", async (req, res) => {
    try {
        const { id } = req.params;
        const time_24_hours_ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const query = `
            SELECT data_values, timestamp 
            FROM sensor_readings 
            WHERE sensor_id = $1 AND timestamp >= $2
            ORDER BY timestamp ASC;
        `;
        
        const { rows } = await pool.query(query, [id, time_24_hours_ago]);
        res.json(rows);

    } catch (err) {
        console.error("Помилка отримання історії датчика:", err);
        res.status(500).json({ error: "Помилка сервера" });
    }
});

// Маршрут для відображення самої сторінки адмін-панелі
app.get('/admin', checkAdmin, async (req, res) => {
    try {
        // Отримуємо всіх користувачів з бази даних, крім поточного адміна
        const result = await pool.query('SELECT id, name, email, role, is_verified FROM users WHERE id != $1 ORDER BY id ASC', [req.session.user.id]);
        const users = result.rows;
        
        res.render('system/admin', {
            title: 'Панель адміністратора',
            user: req.session.user,
            users: users, // Передаємо список користувачів у шаблон
            message: req.session.message
        });
        req.session.message = null; // Очищуємо повідомлення
    } catch (err) {
        console.error("Помилка завантаження адмін-панелі:", err);
        res.status(500).send("Помилка сервера");
    }
});

// API: Оновлення ролі користувача
app.post('/api/admin/users/:id/update-role', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!['admin', 'user'].includes(newRole)) {
        return res.status(400).json({ success: false, message: 'Невірна роль' });
    }

    try {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, id]);
        res.json({ success: true, message: 'Роль оновлено' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// API: Видалення користувача
app.delete('/api/admin/users/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Потрібно бути обережним з видаленням, можливо, краще деактивувати
        // Але для прикладу реалізуємо видалення
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: 'Користувача видалено' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});
// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});
