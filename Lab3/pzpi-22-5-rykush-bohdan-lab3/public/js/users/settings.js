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

