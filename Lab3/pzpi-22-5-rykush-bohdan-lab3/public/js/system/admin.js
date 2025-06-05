document.addEventListener('DOMContentLoaded', () => {
    // Логіка для перемикання вкладок
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const tabId = link.dataset.tab;
            tabContents.forEach(content => {
                content.style.display = content.id === tabId ? 'block' : 'none';
            });
        });
    });

    // Логіка для зміни ролі
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (event) => {
            const userId = event.target.dataset.userId;
            const newRole = event.target.value;

            if (confirm(`Ви впевнені, що хочете змінити роль для користувача ID ${userId} на "${newRole}"?`)) {
                try {
                    const response = await fetch(`/api/admin/users/${userId}/update-role`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newRole: newRole })
                    });
                    const result = await response.json();
                    alert(result.message);
                } catch (err) {
                    alert('Сталася помилка.');
                }
            } else {
                event.target.value = newRole === 'admin' ? 'user' : 'admin'; // Повертаємо значення назад
            }
        });
    });

    // Логіка для видалення користувача
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const userId = event.target.dataset.userId;

            if (confirm(`Ви ТОЧНО хочете видалити користувача ID ${userId}? Цю дію неможливо буде скасувати.`)) {
                try {
                    const response = await fetch(`/api/admin/users/${userId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (result.success) {
                        alert(result.message);
                        event.target.closest('tr').remove(); // Видаляємо рядок з таблиці
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    alert('Сталася помилка.');
                }
            }
        });
    });
});