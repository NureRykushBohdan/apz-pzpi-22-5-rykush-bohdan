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


document.addEventListener("DOMContentLoaded", function () {
    const accordions = document.querySelectorAll(".accordion-toggle");

    accordions.forEach(button => {
        button.addEventListener("click", function () {
            const content = this.nextElementSibling;
            content.style.display = content.style.display === "block" ? "none" : "block";
        });
    });
});

document.addEventListener("DOMContentLoaded", async function () {
    const tableBody = document.querySelector("#verbs-table tbody");

    async function fetchVerbs() {
        try {
            const response = await fetch("/get-verbs");
            const verbs = await response.json();

            tableBody.innerHTML = "";

            verbs.forEach(verb => {
                const row = `
                    <tr>
                        <td colspan="3">
                            <div class="verb-container">
                                <strong class="verb">${verb.verb}</strong>
                                <span class="example">Beispiel: ${verb.example_1}</span>
                                <span class="example">Переклад: ${verb.example_2}</span>
                            </div>
                        </td>
                        <td>${verb.preposition}</td>
                        <td>${verb.case_type}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error("Помилка завантаження даних:", error);
        }
    }

    fetchVerbs();
});

