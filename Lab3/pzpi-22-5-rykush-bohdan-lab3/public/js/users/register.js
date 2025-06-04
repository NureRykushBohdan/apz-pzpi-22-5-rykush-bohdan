document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const errorMessage = document.getElementById("error-message");

    errorMessage.style.display = "none";

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, "confirm-password": confirmPassword })
        });

        const data = await response.json();

        if (!data.success) {
            errorMessage.innerText = data.message;
            errorMessage.style.display = "block";
        } else {
            document.getElementById("success-modal").style.display = "flex";
            document.querySelector(".modal-content p").innerText = 
                "Перевірте свою електронну пошту та підтвердіть реєстрацію.";
        }
    } catch (error) {
        console.error("Помилка запиту:", error);
        errorMessage.innerText = "Сталася помилка під час обробки запиту.";
        errorMessage.style.display = "block";
    }
});
