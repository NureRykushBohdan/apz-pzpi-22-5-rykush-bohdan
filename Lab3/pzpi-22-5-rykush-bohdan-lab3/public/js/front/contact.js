
document.addEventListener("DOMContentLoaded", function () {
    const emailInput = document.getElementById("email");

    if (emailInput && emailInput.hasAttribute("readonly") && emailInput.value === "") {
        fetch("/get-user-email")
            .then(response => response.json())
            .then(data => {
                if (data.email) {
                    emailInput.value = data.email;
                }
            })
            .catch(error => console.error("Помилка отримання email:", error));
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const messageInput = document.getElementById("message");
    const charCount = document.getElementById("char-count");

    messageInput.addEventListener("input", function () {
        charCount.textContent = `${messageInput.value.length} / 600`;
    });
});
