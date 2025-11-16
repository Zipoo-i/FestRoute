let currentUser = null;
let currentRole = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

async function checkAuth() {
    try {
        const response = await fetch('/profile');
        if (response.ok) {
            const data = await response.json();
            showUserInterface(data.user, data.role);
        } else {
            showAuthInterface();
        }
    } catch (error) {
        showAuthInterface();
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            showUserInterface(data.user, data.role);
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Ошибка сети: ' + error.message);
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            await login();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Ошибка сети: ' + error.message);
    }
}

async function logout() {
    try {
        await fetch('/logout', { method: 'POST' });
        showAuthInterface();
    } catch (error) {
        alert('Ошибка выхода: ' + error.message);
    }
}

async function loadEvents() {
    try {
        const response = await fetch('/events');
        const events = await response.json();
        displayEvents(events);
    } catch (error) {
        console.error('Ошибка загрузки событий:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('events-container');
    container.innerHTML = '';

    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.innerHTML = `
            <label>
                <input type="checkbox" value="${event.id}">
                ${event.name} (${event.start_time} - ${event.end_time}, ${event.location}, ${event.duration} минут)
            </label>
            ${currentRole === 'organizer' ? `
                <div class="event-actions">
                    <button class="edit-btn" onclick="editEvent(${event.id})">✏️</button>
                    <button class="delete-btn" onclick="deleteEvent(${event.id})">❌</button>
                </div>
            ` : ''}
        `;
        container.appendChild(eventElement);
    });
}

async function generateRoutes() {
    const selectedIds = [];
    document.querySelectorAll('#events-container input[type="checkbox"]:checked').forEach(checkbox => {
        selectedIds.push(parseInt(checkbox.value));
    });

    if (selectedIds.length === 0) {
        alert('Выберите хотя бы одно событие');
        return;
    }

    try {
        const response = await fetch('/generate-routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(selectedIds)
        });

        const routes = await response.json();
        displayRoutes(routes);
    } catch (error) {
        alert('Ошибка генерации маршрутов: ' + error.message);
    }
}

function displayRoutes(routes) {
    const results = document.getElementById('results');
    results.innerHTML = '<h2>Предложенные маршруты:</h2>';

    routes.forEach((route, index) => {
        const routeCard = document.createElement('div');
        routeCard.className = 'route-card';
        routeCard.innerHTML = `<h3>Маршрут ${index + 1}</h3>`;
        
        route.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-route';
            eventElement.textContent = `${event.name} (${event.start_time} - ${event.end_time}, ${event.location})`;
            routeCard.appendChild(eventElement);
        });
        
        results.appendChild(routeCard);
    });
}

async function addEvent() {
    const name = document.getElementById('event-name').value;
    const start_time = document.getElementById('event-start').value;
    const end_time = document.getElementById('event-end').value;
    const location = document.getElementById('event-location').value;
    const duration = parseInt(document.getElementById('event-duration').value);

    if (!name || !start_time || !end_time || !location || !duration) {
        alert('Заполните все поля');
        return;
    }

    try {
        const response = await fetch('/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, start_time, end_time, location, duration })
        });

        if (response.ok) {
            const newEvent = await response.json();
            alert('Событие добавлено!');
            loadEvents();
            document.getElementById('event-name').value = '';
            document.getElementById('event-start').value = '';
            document.getElementById('event-end').value = '';
            document.getElementById('event-location').value = '';
            document.getElementById('event-duration').value = '';
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        alert('Ошибка добавления события: ' + error.message);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Удалить событие?')) {
        return;
    }

    try {
        const response = await fetch(`/events/${eventId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadEvents();
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        alert('Ошибка удаления события: ' + error.message);
    }
}

async function editEvent(eventId) {
    const newName = prompt('Введите новое название события:');
    if (newName) {
        try {
            const response = await fetch(`/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newName })
            });

            if (response.ok) {
                loadEvents();
            } else {
                const error = await response.json();
                alert(error.error);
            }
        } catch (error) {
            alert('Ошибка редактирования события: ' + error.message);
        }
    }
}

function showAuthInterface() {
    document.getElementById('auth-panel').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('main-interface').style.display = 'none';
    document.body.classList.remove('authenticated');
}

function showUserInterface(user, role) {
    currentUser = user;
    currentRole = role;
    
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('main-interface').style.display = 'block';
    document.getElementById('current-user').textContent = user;
    document.getElementById('current-role').textContent = role === 'organizer' ? 'Организатор' : 'Участник';
    document.body.classList.add('authenticated');
    
    if (role === 'organizer') {
        document.getElementById('organizer-panel').style.display = 'block';
    } else {
        document.getElementById('organizer-panel').style.display = 'none';
    }
    
    loadEvents();
}

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
});