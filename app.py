import numpy as np
import threading
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from maze.maze import Maze
from maze.qlearning import QLearningAgent
from maze.sarsa import SarsaAgent

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# --- Estado global de entorno y agentes ---
maze = None
agents = {}

# --- Simulación controlada ---
sim_control = {'pause': False, 'step': False, 'speed': 0.2}
sim_lock = threading.Lock()

# --- Helpers ---
def get_policy_from_q(q, maze):
    from maze.maze import ACTIONS
    policy = np.full((maze.rows, maze.cols), '', dtype=object)
    for r in range(maze.rows):
        for c in range(maze.cols):
            if (r, c) in maze.walls:
                policy[r, c] = 'WALL'
            else:
                best_a = np.argmax(q[r, c])
                policy[r, c] = ACTIONS[best_a]
    return policy.tolist()

# --- Rutas Flask --- 

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/maze/config', methods=['POST'])
def set_maze():
    conf = request.json
    print("Configuración recibida:", conf)
    global maze
    try:
        reward_goal = conf.get('reward_goal', 1)
        reward_step = conf.get('reward_step', -0.04)
        maze = Maze(
            conf['rows'],
            conf['cols'],
            conf['walls'],
            conf['start'],
            conf['goal'],
            reward_goal,
            reward_step
        )
        return jsonify({'status': 'Maze configured'})
    except Exception as e:
        print("Error al configurar laberinto:", e)
        return jsonify({'status': 'Error', 'message': str(e)}), 400

@app.route('/agent/config', methods=['POST'])
def set_parameters():
    params = request.json
    global maze, agents
    agents['ql'] = QLearningAgent(maze, **params['ql'])
    agents['sarsa'] = SarsaAgent(maze, **params['sarsa'])
    return jsonify({'status': 'Parameters updated'})

@app.route('/qtable/<agent>')
def get_qtable(agent):
    global agents
    if agent not in agents:
        return jsonify({'error': 'Agente no encontrado'}), 404
    q = agents[agent].q.tolist()
    return jsonify({'q': q})

@app.route('/policy/<agent>')
def get_policy(agent):
    global agents, maze
    if agent not in agents:
        return jsonify({'error': 'Agente no encontrado'}), 404
    q = agents[agent].q
    policy = get_policy_from_q(q, maze)
    return jsonify({'policy': policy})

@app.route('/last_path/<agent>')
def get_last_path(agent):
    global agents
    if agent not in agents:
        return jsonify({'error': 'Agente no encontrado'}), 404
    # Tomar el último episodio ejecutado
    if hasattr(agents[agent], 'last_episodes') and agents[agent].last_episodes:
        steps = agents[agent].last_episodes[-1]
    elif hasattr(agents[agent], 'last_steps') and agents[agent].last_steps:
        steps = agents[agent].last_steps
    else:
        return jsonify({'error': 'No hay episodios ejecutados'}), 404
    # Calcular tiempo estimado: pasos * delay estimado de visualización (ajusta según tu UI)
    delay = sim_control.get('speed', 0.2)
    time_secs = len(steps) * delay
    path = [step['estado'] for step in steps] + [steps[-1]['nuevo_estado']]
    return jsonify({'path': path, 'tiempo': time_secs})

# --- Eventos Flask-SocketIO ---

@socketio.on('sim_control')
def handle_sim_control(data):
    global sim_control
    with sim_lock:
        if data['type'] == 'pause':
            sim_control['pause'] = True
            sim_control['step'] = False
        elif data['type'] == 'resume':
            sim_control['pause'] = False
            sim_control['step'] = False
        elif data['type'] == 'step':
            sim_control['step'] = True
        elif data['type'] == 'speed':
            sim_control['speed'] = float(data['value']) / 1000.0

@socketio.on('start_simulation')
def handle_simulation(data):
    global agents, sim_control
    n_episodes = data.get('n_episodes', 50)
    speed = data.get('speed', 200)
    sim_control['speed'] = float(speed) / 1000.0
    sim_control['pause'] = False
    sim_control['step'] = False

    ql_episodes, ql_rewards = agents['ql'].run_episodes(n_episodes)
    sarsa_episodes, sarsa_rewards = agents['sarsa'].run_episodes(n_episodes)

    # Guardar episodios para consulta posterior
    agents['ql'].last_episodes = ql_episodes
    agents['sarsa'].last_episodes = sarsa_episodes

    ql_steps = ql_episodes[-1]
    sarsa_steps = sarsa_episodes[-1]

    ql_path = [step['estado'] for step in ql_steps] + [ql_steps[-1]['nuevo_estado']] if ql_steps else []
    sarsa_path = [step['estado'] for step in sarsa_steps] + [sarsa_steps[-1]['nuevo_estado']] if sarsa_steps else []

    emit('rewards_history', {
        'ql': ql_rewards,
        'sarsa': sarsa_rewards
    })

    from maze.maze import ACTIONS
    i = 0
    while i < max(len(ql_steps), len(sarsa_steps)):
        # QL paso
        if i < len(ql_steps):
            ql_step = ql_steps[i]
            ql_partial_path = [step['estado'] for step in ql_steps[:i+1]] + [ql_steps[i]['nuevo_estado']]
        else:
            ql_step = ql_steps[-1]
            ql_partial_path = ql_path

        # SARSA paso
        if i < len(sarsa_steps):
            sarsa_step = sarsa_steps[i]
            sarsa_partial_path = [step['estado'] for step in sarsa_steps[:i+1]] + [sarsa_steps[i]['nuevo_estado']]
        else:
            sarsa_step = sarsa_steps[-1]
            sarsa_partial_path = sarsa_path

        ql_accion = ACTIONS[ql_step['accion']]
        sarsa_accion = ACTIONS[sarsa_step['accion']]

        step_info = {
            'ql': {
                'estado': ql_step['estado'],
                'accion': ql_accion,
                'nuevo_estado': ql_step['nuevo_estado'],
                'recompensa': ql_step['recompensa']
            },
            'sarsa': {
                'estado': sarsa_step['estado'],
                'accion': sarsa_accion,
                'nuevo_estado': sarsa_step['nuevo_estado'],
                'recompensa': sarsa_step['recompensa']
            }
        }

        emit('maze_update', {
            'ql': ql_partial_path,
            'sarsa': sarsa_partial_path,
            'stepInfo': step_info
        })

        # Control de velocidad y pausa
        with sim_lock:
            delay = sim_control.get('speed', 0.2)
        while True:
            with sim_lock:
                if sim_control['pause']:
                    if sim_control['step']:
                        sim_control['step'] = False
                        break
                    socketio.sleep(0.05)
                    continue
            break
        socketio.sleep(delay)
        i += 1

    # Al finalizar, enviar cantidad de pasos de cada algoritmo
    socketio.emit('final_steps', {
        'ql': len(ql_steps),
        'sarsa': len(sarsa_steps)
    })

if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True, host='0.0.0.0')
