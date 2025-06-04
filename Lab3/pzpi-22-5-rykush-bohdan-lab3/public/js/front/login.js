document.addEventListener("DOMContentLoaded", function () {
    const errorMessage = document.querySelector(".error-message");
    if (errorMessage) {
        setTimeout(() => {
            errorMessage.style.display = "none";
        }, 100000);
    }
});

