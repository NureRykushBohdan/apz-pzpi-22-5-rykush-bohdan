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


// Маршрут для сторінки "Про нас"
app.get("/about-us", (req, res) => {
    res.render("front/About_Us", { title: "Про нас", user: req.session.user });
});

app.get("/map", (req, res) => {
    res.render("front/map", { title: "мапа", user: req.session.user });
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


app.post("/login", async (req, res) => {
    const { email, password, redirect } = req.body; // Додаємо поле redirect

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            req.session.message = "Невірний email або пароль!";
            return res.redirect("/login");
        }

        const userData = user.rows[0];

        // Перевірка підтвердження email
        if (!userData.is_verified) {
            req.session.message = "Будь ласка, підтвердьте email перед входом!";
            return res.redirect("/login");
        }

        const isValidPassword = await bcrypt.compare(password, userData.password);
        if (!isValidPassword) {
            req.session.message = "Невірний email або пароль!";
            return res.redirect("/login");
        }

        // Збереження даних користувача в сесії
        req.session.user = { 
            id: userData.id, 
            name: userData.name, 
            email: userData.email, 
            role: userData.role 
        };

        // Збереження в cookies
        res.cookie("user", JSON.stringify(req.session.user), { 
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            httpOnly: true 
        });

        // Використовуємо redirect, якщо він є, інакше йдемо на головну сторінку
        const targetPage = redirect && redirect !== "undefined" ? redirect : "/";
        res.redirect(targetPage);
    } catch (err) {
        console.error("Помилка входу:", err);
        req.session.message = "Помилка сервера!";
        res.redirect("/login");
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
    endpoint: process.env.DO_SPACES_ENDPOINT,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET
    }
});

// Налаштування Multer для DigitalOcean Spaces
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: "nikkme",
        acl: "public-read",
        key: (req, file, cb) => {
            const uniqueFileName = `profiles/${req.session.user.id}-${Date.now()}.webp`;
            cb(null, uniqueFileName);
        }
    }),
    limits: { fileSize: 300000 }, // Обмеження на 0.3 MB
});

// 🔹 **Маршрут для оновлення фото профілю**
app.post("/upload-profile-pic", upload.single("profilePic"), async (req, res) => {
    if (!req.file) {
        req.session.message = "Файл не завантажено!";
        return res.redirect("/settings");
    }

    const profilePicUrl = `https://nikkme.fra1.digitaloceanspaces.com/${req.file.key}`;

    try {
        await pool.query("UPDATE users SET profile_picture = $1 WHERE id = $2", [profilePicUrl, req.session.user.id]);
        req.session.user.profile_picture = profilePicUrl;
        res.redirect("/settings");
    } catch (err) {
        console.error("Помилка при оновленні фото профілю:", err);
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




// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});
