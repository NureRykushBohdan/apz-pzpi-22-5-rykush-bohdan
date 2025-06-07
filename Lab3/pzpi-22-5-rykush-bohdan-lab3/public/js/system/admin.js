document.addEventListener('DOMContentLoaded', () => {

    // --- 1. УНІВЕРСАЛЬНІ ДОПОМІЖНІ ФУНКЦІЇ ---

    /
     * Рендерить таблицю з даними для вкладки "Управління даними".
     * @param {Array} data - Масив об'єктів для відображення.
     * @param {string} containerId - ID контейнера, куди буде вставлено таблицю.
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

    /
     * Додає логіку сортування до таблиць даних.
     * @param {Array} data - Оригінальний (несортований) масив даних.
     * @param {string} containerId - ID контейнера таблиці.
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
            const currentActive = document.querySelector('.tab-link.active');
            if (currentActive) currentActive.classList.remove('active');
            link.classList.add('active');
            
            document.querySelector('.tab-content.active')?.classList.remove('active');
            const targetTab = document.getElementById(link.dataset.tab);
            if(targetTab) targetTab.classList.add('active');

            if (link.dataset.tab === 'data') {
                const firstDataTab = document.querySelector('.data-tab-link');
                if (firstDataTab && !firstDataTab.classList.contains('active')) {
                    firstDataTab.click();
                }
            }
        });
    });

    // --- 3. НАЛАШТУВАННЯ ВКЛАДКИ "УПРАВЛІННЯ КОРИСТУВАЧАМИ" ---
    const userTabContent = document.getElementById('users');
    const mainElement = document.querySelector('.admin-main');
    const allUsersData = JSON.parse(mainElement.dataset.users || '[]');
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
            renderUserTable(allUsersData.filter(user => user.name.toLowerCase().includes(searchTerm) || user.email.toLowerCase().includes(searchTerm)));
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
                    if (result.success) {
                        alert(result.message);
                        const userIndex = allUsersData.findIndex(u => u.id == userId);
                        if (userIndex > -1) allUsersData.splice(userIndex, 1);
                        applyUserSearch();
                    } else { alert(`Помилка: ${result.message}`); }
                } catch (err) { alert('Сталася помилка на клієнті.'); }
            }
        });

        userTabContent.addEventListener('change', async (event) => {
            if (event.target.classList.contains('role-select')) {
                const userId = event.target.dataset.userId;
                const newRole = event.target.value;
                const originalRole = newRole === 'admin' ? 'user' : 'admin';
                if (!confirm(`Змінити роль для ID ${userId} на "${newRole}"?`)) { event.target.value = originalRole; return; }
                try {
                    const response = await fetch(`/api/admin/users/${userId}/update-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newRole }) });
                    const result = await response.json();
                    alert(result.message);
                    if (!result.success) event.target.value = originalRole;
                } catch (err) { alert('Сталася помилка на клієнті.'); event.target.value = originalRole; }
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
    
    const statusTab = document.getElementById('status');
    if (statusTab) {
        const socket = io();
        const elements = {
            cpu: document.getElementById('cpu-load'),
            memUsage: document.getElementById('mem-usage'),
            memInfo: document.getElementById('mem-info'),
            os: document.getElementById('os-info'),
            dbUsers: document.getElementById('db-users'),
            dbSensors: document.getElementById('db-sensors'),
            dbReadings: document.getElementById('db-readings'),
            dbMessages: document.getElementById('db-messages')
        };
        socket.on('server-stats', (stats) => {
            elements.cpu.textContent = stats.cpu;
            elements.memUsage.textContent = ((parseFloat(stats.memory.used) / parseFloat(stats.memory.total)) * 100).toFixed(1);
            elements.memInfo.textContent = `${stats.memory.used} GB / ${stats.memory.total} GB`;
            elements.os.textContent = stats.os;
            elements.dbUsers.textContent = stats.db.users;
            elements.dbSensors.textContent = stats.db.sensors;
            elements.dbReadings.textContent = stats.db.readings;
            elements.dbMessages.textContent = stats.db.messages;
        });
    }
    

    // --- 5. ІНІЦІАЛІЗАЦІЯ ---
    document.querySelector('.tab-link.active')?.click();


});
