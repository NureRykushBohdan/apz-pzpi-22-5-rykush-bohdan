document.addEventListener('DOMContentLoaded', () => {

    // --- 1. УНІВЕРСАЛЬНІ ДОПОМІЖНІ ФУНКЦІЇ ---

    /**
     * Рендерить таблицю з даними для вкладки "Управління даними".
     */
    const renderDataTable = (data, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!data || data.length === 0) {
            container.innerHTML = '<p>Нічого не знайдено.</p>';
            return;
        }

        const headers = Object.keys(data[0]);
        let tableHTML = '<table><thead><tr>';
        headers.forEach(h => tableHTML += `<th class="sortable" data-column="${h}">${h}</th>`);
        tableHTML += '</tr></thead><tbody>';

        data.forEach(row => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                let cellData = row[header];
                if (typeof cellData === 'object' && cellData !== null) cellData = JSON.stringify(cellData);
                if (typeof cellData === 'string' && cellData.length > 70) cellData = cellData.substring(0, 70) + '...';
                tableHTML += `<td>${cellData !== null ? cellData : ''}</td>`;
            });
            tableHTML += '</tr>';
        });
        container.innerHTML = tableHTML + '</tbody></table>';
        addDataTableSortListeners(data, containerId);
    };

    /**
     * Додає логіку сортування до таблиць даних.
     */
    const addDataTableSortListeners = (data, containerId) => {
        const headers = document.querySelectorAll(`#${containerId} th.sortable`);
        let sortState = {};
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                sortState.order = (sortState.column === column && sortState.order === 'asc') ? 'desc' : 'asc';
                sortState.column = column;
                
                headers.forEach(h => h.classList.remove('asc', 'desc'));
                header.classList.add(sortState.order);
                
                const sortedData = [...data].sort((a, b) => {
                    if (a[column] < b[column]) return sortState.order === 'asc' ? -1 : 1;
                    if (a[column] > b[column]) return sortState.order === 'asc' ? 1 : -1;
                    return 0;
                });
                renderDataTable(sortedData, containerId);
            });
        });
    };


    // --- 2. НАЛАШТУВАННЯ ОСНОВНИХ ВКЛАДОК ---
    const mainTabLinks = document.querySelectorAll('.tab-link');
    mainTabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.tab-link.active')?.classList.remove('active');
            link.classList.add('active');
            
            document.querySelector('.tab-content.active')?.classList.remove('active');
            const targetTab = document.getElementById(link.dataset.tab);
            if(targetTab) targetTab.classList.add('active');

            if (link.dataset.tab === 'data') {
                document.querySelector('.data-tab-link')?.click();
            }
        });
    });

    // --- 3. НАЛАШТУВАННЯ ВКЛАДКИ "УПРАВЛІННЯ КОРИСТУВАЧАМИ" ---
    const userTabContent = document.getElementById('users');
    if (userTabContent && typeof allUsersData !== 'undefined') {
        const searchInput = document.getElementById('user-search-input');
        const usersTableContainer = document.getElementById('users-table-container');

        const renderUserTable = (users) => {
            if (!users || users.length === 0) { usersTableContainer.innerHTML = '<p>Користувачів не знайдено.</p>'; return; }
            let tableHTML = '<table><thead><tr><th>ID</th><th>Ім\'я</th><th>Email</th><th>Роль</th><th>Верифікований</th><th>Дії</th></tr></thead><tbody>';
            users.forEach(u => {
                tableHTML += `<tr data-user-id="${u.id}"><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td><select class="role-select" data-user-id="${u.id}"><option value="user" ${u.role==='user'?'selected':''}>User</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></td><td>${u.is_verified?'Так':'Ні'}</td><td><button class="delete-btn" data-user-id="${u.id}">Видалити</button></td></tr>`;
            });
            usersTableContainer.innerHTML = tableHTML + '</tbody></table>';
        };

        const applyUserSearch = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredUsers = allUsersData.filter(user => user.name.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm));
            renderUserTable(filteredUsers);
        };
        
        searchInput.addEventListener('input', applyUserSearch);
        renderUserTable(allUsersData); // Початковий рендерінг

        userTabContent.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const userId = event.target.dataset.userId;
                if (!confirm(`Ви ТОЧНО хочете видалити користувача ID ${userId}?`)) return;
                try {
                    const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if(result.success) { event.target.closest('tr').remove(); alert(result.message); } 
                    else { alert(`Помилка: ${result.message}`); }
                } catch (err) { alert('Сталася помилка на клієнті.'); }
            }
        });

        userTabContent.addEventListener('change', async (event) => {
            if (event.target.classList.contains('role-select')) {
                const userId = event.target.dataset.userId;
                const newRole = event.target.value;
                if (!confirm(`Змінити роль для ID ${userId} на "${newRole}"?`)) { event.target.value = newRole === 'admin' ? 'user' : 'admin'; return; }
                try {
                    const response = await fetch(`/api/admin/users/${userId}/update-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newRole }) });
                    alert((await response.json()).message);
                } catch (err) { alert('Сталася помилка на клієнті.'); }
            }
        });
    }

    // --- 4. НАЛАШТУВАННЯ ВКЛАДКИ "УПРАВЛІННЯ ДАНИМИ" ---
    const dataTabContainer = document.getElementById('data');
    if (dataTabContainer) {
        const dataTabLinks = dataTabContainer.querySelectorAll('.data-tab-link');
        const tableDataCache = {};
        
        const sensorSearchInput = document.getElementById('sensor-search-input');
        const sensorTypeFilter = document.getElementById('sensor-type-filter');

        const applySensorFilters = () => {
            if (!tableDataCache['sensors']) return;
            const searchTerm = sensorSearchInput.value.toLowerCase();
            const filterType = sensorTypeFilter.value;
            const filteredData = tableDataCache['sensors'].filter(s => 
                ((filterType === 'all') || (s.sensor_type === filterType)) &&
                ((s.sensor_name.toLowerCase().includes(searchTerm)) || (s.description && s.description.toLowerCase().includes(searchTerm)))
            );
            renderDataTable(filteredData, 'sensors-table-container');
        };

        if (sensorSearchInput && sensorTypeFilter) {
            sensorSearchInput.addEventListener('input', applySensorFilters);
            sensorTypeFilter.addEventListener('change', applySensorFilters);
        }

        dataTabLinks.forEach(link => {
            link.addEventListener('click', async () => {
                const tableId = link.dataset.table;
                dataTabLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                dataTabContainer.querySelectorAll('.data-table-content').forEach(c => c.style.display = 'none');
                document.getElementById(`${tableId}-content`).style.display = 'block';

                if (!tableDataCache[tableId]) {
                    const container = document.getElementById(`${tableId}-table-container`);
                    container.innerHTML = '<p>Завантаження...</p>';
                    try {
                        const response = await fetch(`/api/admin/${tableId}`);
                        tableDataCache[tableId] = await response.json();
                    } catch (err) { container.innerHTML = '<p>Помилка завантаження даних.</p>'; return; }
                }

                if (tableId === 'sensors') {
                    applySensorFilters();
                } else {
                    renderDataTable(tableDataCache[tableId], `${tableId}-table-container`);
                }
            });
        });
    }

    // --- 5. ІНІЦІАЛІЗАЦІЯ ---
    document.querySelector('.tab-link.active')?.click();
});