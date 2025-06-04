document.addEventListener("DOMContentLoaded", function () {
    const testForm = document.getElementById("test-form");

    testForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        let answers = {};
        document.querySelectorAll("input[type='text']").forEach(input => {
            answers[input.name.replace("question_", "")] = input.value.trim();
        });

        const response = await fetch("/submit-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(answers)
        });

        if (response.ok) {
            window.location.href = "/start";
        } else {
            alert("Помилка при відправці тесту");
        }
    });
});
