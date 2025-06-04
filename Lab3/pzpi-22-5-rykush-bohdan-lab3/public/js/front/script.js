document.addEventListener("DOMContentLoaded", function () {
    const preloader = document.getElementById("preloader");
    const mainContent = document.querySelector("main");

    // Перевіряємо, чи всі зображення завантажилися
    let imagesLoaded = 0;
    const images = document.querySelectorAll("img");

    images.forEach((img) => {
        if (img.complete) {
            imagesLoaded++;
        } else {
            img.addEventListener("load", () => {
                imagesLoaded++;
                if (imagesLoaded === images.length) hidePreloader();
            });
        }
    });

    function hidePreloader() {
        preloader.style.display = "none";
        mainContent.style.display = "block";
    }

    // Додаткова перевірка через 3 секунди (якщо не всі зображення завантажились)
    setTimeout(hidePreloader, 0);
});



// Функція для запуску анімації
function animateOnScroll(entries, observer) {
    entries.forEach(entry => {
        console.log(entry.isIntersecting); // Для тестування
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Зупиняємо спостереження, коли елемент з'явився
        }
    });
}

// Створюємо спостерігача
// Спостереження за анімаціями
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            requestAnimationFrame(() => {
                entry.target.classList.add('visible');
            });
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.advantage-item, .start_bady').forEach(item => {
    observer.observe(item);
});



// Спостерігаємо за кожним елементом в секції .advantages
document.querySelectorAll('.advantage-item').forEach(item => {
    observer.observe(item);
});

const startBadyElement = document.querySelector('.start_bady');
observer.observe(startBadyElement);

// Функція для додавання/видалення класу при прокрутці
window.addEventListener('scroll', function() {
    const header = document.getElementById('main-header');
    
    if (window.scrollY > 0) {
        header.classList.add('scrolled'); // Додаємо клас, якщо є прокрутка
    } else {
        header.classList.remove('scrolled'); // Відбираємо клас, якщо прокрутки немає
    }
});

document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
        // Закриваємо всі інші відкриті питання
        document.querySelectorAll('.faq-item.open').forEach(openItem => {
            if (openItem !== item) {
                openItem.classList.remove('open');
            }
        });

        // Перемикаємо поточне питання
        item.classList.toggle('open');
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const userNameButton = document.getElementById("user-name");
    const dropdownMenu = document.getElementById("dropdown-menu");

    if (userNameButton) {
        userNameButton.addEventListener("click", function () {
            dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", function (event) {
            if (!userNameButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.style.display = "none";
            }
        });
    }
});


