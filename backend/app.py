from flask import Flask, jsonify, request, send_from_directory, session
import json
import os
import hashlib

app = Flask(__name__)
app.secret_key = 'festival-planner-secret-key-2024'

FRONTEND_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend')

USERS_FILE = 'users.json'

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

def load_events():
    with open('data.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_events(events):
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

def generate_schedules(selected_ids):
    events = load_events()
    selected_events = [e for e in events if e['id'] in selected_ids]
    
    route1 = greedy_algorithm_by_time(selected_events)
    route2 = greedy_algorithm_by_start_time(selected_events)
    route3 = random_start_algorithm(selected_events)
    
    return [route1, route2, route3]

def greedy_algorithm_by_time(events):
    if not events:
        return []
    
    sorted_events = sorted(events, key=lambda x: x['end_time'])
    
    route = []
    last_end_time = "00:00"
    
    for event in sorted_events:
        if event['start_time'] >= last_end_time:
            route.append(event)
            last_end_time = event['end_time']
    
    return route

def greedy_algorithm_by_start_time(events):
    if not events:
        return []
    
    sorted_events = sorted(events, key=lambda x: x['start_time'])
    
    route = []
    last_end_time = "00:00"
    
    for event in sorted_events:
        if event['start_time'] >= last_end_time:
            route.append(event)
            last_end_time = event['end_time']
    
    return route

def random_start_algorithm(events):
    if not events:
        return []
    
    import random
    routes = []
    
    for _ in range(5):
        shuffled = events.copy()
        random.shuffle(shuffled)
        
        route = []
        last_end_time = "00:00"
        
        for event in shuffled:
            if event['start_time'] >= last_end_time:
                route.append(event)
                last_end_time = event['end_time']
        
        routes.append(route)
    
    return max(routes, key=len)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'participant')
    
    if not username or not password:
        return jsonify({'error': 'Имя пользователя и пароль обязательны'}), 400
    
    users = load_users()
    
    if username in users:
        return jsonify({'error': 'Пользователь уже существует'}), 400
    
    users[username] = {
        'password': hash_password(password),
        'role': role
    }
    
    save_users(users)
    return jsonify({'message': 'Пользователь зарегистрирован'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    users = load_users()
    user = users.get(username)
    
    if user and user['password'] == hash_password(password):
        session['user'] = username
        session['role'] = user['role']
        return jsonify({
            'message': 'Вход выполнен',
            'user': username,
            'role': user['role']
        })
    
    return jsonify({'error': 'Неверные данные'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Выход выполнен'})

@app.route('/profile')
def profile():
    user = session.get('user')
    role = session.get('role')
    
    if user:
        return jsonify({'user': user, 'role': role})
    return jsonify({'error': 'Не авторизован'}), 401

@app.route('/events', methods=['GET'])
def get_events():
    return jsonify(load_events())

@app.route('/events', methods=['POST'])
def add_event():
    if session.get('role') != 'organizer':
        return jsonify({'error': 'Только организаторы могут добавлять события'}), 403
    
    data = request.json
    events = load_events()
    
    new_id = max([e['id'] for e in events], default=0) + 1
    
    new_event = {
        'id': new_id,
        'name': data['name'],
        'start_time': data['start_time'],
        'end_time': data['end_time'],
        'location': data['location'],
        'duration': data['duration']
    }
    
    events.append(new_event)
    save_events(events)
    return jsonify(new_event)

@app.route('/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    if session.get('role') != 'organizer':
        return jsonify({'error': 'Только организаторы могут редактировать события'}), 403
    
    data = request.json
    events = load_events()
    
    for event in events:
        if event['id'] == event_id:
            event.update(data)
            save_events(events)
            return jsonify(event)
    
    return jsonify({'error': 'Событие не найдено'}), 404

@app.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    if session.get('role') != 'organizer':
        return jsonify({'error': 'Только организаторы могут удалять события'}), 403
    
    events = load_events()
    events = [e for e in events if e['id'] != event_id]
    save_events(events)
    return jsonify({'message': 'Событие удалено'})

@app.route('/generate-routes', methods=['POST'])
def generate_routes():
    selected_ids = request.json
    routes = generate_schedules(selected_ids)
    return jsonify(routes)

@app.route('/')
def serve_frontend():
    return send_from_directory(FRONTEND_PATH, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_PATH, filename)

@app.route('/image/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(FRONTEND_PATH, 'image'), filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')