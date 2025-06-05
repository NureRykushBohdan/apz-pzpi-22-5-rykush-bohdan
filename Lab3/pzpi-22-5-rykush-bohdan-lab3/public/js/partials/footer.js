document.addEventListener("DOMContentLoaded", function () {
    const userNameButton = document.getElementById("user-name");
    const dropdownMenu = document.getElementById("dropdown-menu");

    if (userNameButton) {
        userNameButton.addEventListener("click", function (event) {
            event.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
        });
    }

    document.addEventListener("click", function (event) {
        if (dropdownMenu && !dropdownMenu.contains(event.target) && !userNameButton.contains(event.target)) {
            dropdownMenu.style.display = "none";
        }
    });
});


document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll('header nav a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
    link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
        });

        });
   
