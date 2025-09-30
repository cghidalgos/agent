
    // Ahora el botón de Ver Política muestra el recorrido real ejecutado
    if (showPolicyBtn && agentSelect) {
        showPolicyBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            fetch(`/last_path/${agent}`)
                .then(res => res.json())
                .then(data => renderPathTable(data.path, agent));
        });
    }

    function renderPathTable(path, agent) {
        let html = `<b>Recorrido real ejecutado (${agent === 'ql' ? 'Q-Learning' : 'SARSA'})</b><br/><table style='border-collapse:collapse;'>`;
        // Construir una matriz vacía del tamaño del laberinto
        const rows = mazeConfig ? mazeConfig.rows : path.length;
        const cols = mazeConfig ? mazeConfig.cols : path[0] ? path[0].length : 0;
        let grid = Array.from({length: rows}, () => Array(cols).fill(''));
        // Rellenar con flechas según la acción ejecutada
        for (let i = 0; i < path.length - 1; i++) {
            const curr = path[i].estado;
            const next = path[i+1].estado;
            let dr = next[0] - curr[0];
            let dc = next[1] - curr[1];
            let arrow = '?';
            if (dr === -1 && dc === 0) arrow = '↑';
            else if (dr === 1 && dc === 0) arrow = '↓';
            else if (dr === 0 && dc === -1) arrow = '←';
            else if (dr === 0 && dc === 1) arrow = '→';
            grid[curr[0]][curr[1]] = arrow;
        }
        // Última celda (meta)
        const last = path[path.length-1].estado;
        grid[last[0]][last[1]] = '🏁';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                let val = grid[r][c];
                html += `<td style='border:1px solid #aaccee; width:40px; height:28px; text-align:center; font-size:22px;'>${val}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        policyPanel.innerHTML = html;
        policyPanel.style.display = 'block';
        qtablePanel.style.display = 'none';
    }
    const stepsSummary = document.getElementById('stepsSummary');
    // Mostrar resumen de pasos al finalizar la simulación
    function showStepsSummary(qlSteps, sarsaSteps) {
        if (!stepsSummary) return;
        stepsSummary.innerHTML = `Q-Learning llegó en <span style='color:#368ae6;'>${qlSteps}</span> pasos. SARSA llegó en <span style='color:#e07b2a;'>${sarsaSteps}</span> pasos.`;
    }
document.addEventListener('DOMContentLoaded', () => {
    // Exportar resultados
    const exportQTableBtn = document.getElementById('exportQTableBtn');
    const exportPolicyBtn = document.getElementById('exportPolicyBtn');
    const exportRewardsBtn = document.getElementById('exportRewardsBtn');
    const randomWallsBtn = document.getElementById('randomWallsBtn');
    const showQTableBtn = document.getElementById('showQTableBtn');
    const showPolicyBtn = document.getElementById('showPolicyBtn');
    const agentSelect = document.getElementById('agentSelect');
    const qtablePanel = document.getElementById('qtablePanel');
    const policyPanel = document.getElementById('policyPanel');

    function download(filename, content) {
        const blob = new Blob([content], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    if (exportQTableBtn && agentSelect) {
        exportQTableBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            fetch(`/qtable/${agent}`)
                .then(res => res.json())
                .then(data => download(`qtable_${agent}.json`, JSON.stringify(data.q, null, 2)));
        });
    }
    if (exportPolicyBtn && agentSelect) {
        exportPolicyBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            fetch(`/policy/${agent}`)
                .then(res => res.json())
                .then(data => download(`policy_${agent}.json`, JSON.stringify(data.policy, null, 2)));
        });
    }
    if (exportRewardsBtn) {
        exportRewardsBtn.addEventListener('click', () => {
            // Usar los datos de la última gráfica
            if (!rewardsChart) return;
            const ql = rewardsChart.data.datasets[0].data;
            const sarsa = rewardsChart.data.datasets[1].data;
            let csv = 'episodio,qlearning,sarsa\n';
            for (let i = 0; i < ql.length; i++) {
                csv += `${i+1},${ql[i]},${sarsa[i]}\n`;
            }
            download('rewards.csv', csv);
        });
    }
    // Generar obstáculos aleatorios
    if (randomWallsBtn) {
        randomWallsBtn.addEventListener('click', () => {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const start = getPos('start');
            const goal = getPos('goal');
            const totalCells = rows * cols;
            const maxWalls = Math.floor(totalCells * 0.25); // hasta 25% del laberinto
            let walls = [];
            while (walls.length < maxWalls) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                // No poner pared en inicio/meta ni duplicados
                if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
                if (walls.some(([wr, wc]) => wr === r && wc === c)) continue;
                walls.push([r, c]);
            }
            document.getElementById('walls').value = walls.map(([r, c]) => `${r},${c}`).join(';');
        });
    }
    function renderQTable(q, agent) {
        let html = `<b>Q-table (${agent === 'ql' ? 'Q-Learning' : 'SARSA'})</b><br/><table style='border-collapse:collapse;'>`;
        for (let r = 0; r < q.length; r++) {
            html += '<tr>';
            for (let c = 0; c < q[r].length; c++) {
                html += `<td style='border:1px solid #aaccee; padding:2px 4px; font-size:12px; min-width:90px;'>`;
                if (Array.isArray(q[r][c])) {
                    html += q[r][c].map((v, i) => `<span style='color:#888;'>${['↑','↓','←','→'][i]}:</span> ${v.toFixed(2)}`).join('<br/>');
                } else {
                    html += '-';
                }
                html += '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        qtablePanel.innerHTML = html;
        qtablePanel.style.display = 'block';
        policyPanel.style.display = 'none';
    }
    function renderPolicy(policy, agent) {
        let html = `<b>Política aprendida (${agent === 'ql' ? 'Q-Learning' : 'SARSA'})</b><br/><table style='border-collapse:collapse;'>`;
        for (let r = 0; r < policy.length; r++) {
            html += '<tr>';
            for (let c = 0; c < policy[r].length; c++) {
                let val = policy[r][c];
                if (val === 'WALL') {
                    html += `<td style='background:#334466; color:#fff; border:1px solid #aaccee; width:40px; height:28px; text-align:center;'>█</td>`;
                } else {
                    let arrow = {'UP':'↑','DOWN':'↓','LEFT':'←','RIGHT':'→'}[val] || '?';
                    html += `<td style='border:1px solid #aaccee; width:40px; height:28px; text-align:center; font-size:22px;'>${arrow}</td>`;
                }
            }
            html += '</tr>';
        }
        html += '</table>';
        policyPanel.innerHTML = html;
        policyPanel.style.display = 'block';
        qtablePanel.style.display = 'none';
    }
    if (showQTableBtn && agentSelect) {
        showQTableBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            fetch(`/qtable/${agent}`)
                .then(res => res.json())
                .then(data => renderQTable(data.q, agent));
        });
    }
    if (showPolicyBtn && agentSelect) {
        showPolicyBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            fetch(`/policy/${agent}`)
                .then(res => res.json())
                .then(data => renderPolicy(data.policy, agent));
        });
    }
    const socket = io();

    // Elementos del DOM
    const mazeForm = document.getElementById('mazeForm');
    const agentFormQL = document.getElementById('agentFormQL');
    const agentFormSARSA = document.getElementById('agentFormSARSA');
    const cfgAgentsBtn = document.getElementById('cfgAgentsBtn');
    const startBtn = document.getElementById('startBtn');
    const canvas = document.getElementById('mazeCanvas');
    const ctx = canvas.getContext('2d');
    const infoPanel = document.getElementById('infoPanel');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const stepBtn = document.getElementById('stepBtn');

    // Chart.js para recompensas
    let rewardsChart = null;
    const rewardsChartCanvas = document.getElementById('rewardsChart');
    // Control de velocidad
    let simSpeed = 200;
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', () => {
            simSpeed = parseInt(speedSlider.value);
            speedValue.textContent = simSpeed;
            socket.emit('sim_control', { type: 'speed', value: simSpeed });
        });
        speedValue.textContent = speedSlider.value;
    }

    // Control de pausa/reanudar/paso
    if (pauseBtn && resumeBtn && stepBtn) {
        pauseBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'pause' });
            pauseBtn.disabled = true;
            resumeBtn.disabled = false;
        });
        resumeBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'resume' });
            pauseBtn.disabled = false;
            resumeBtn.disabled = true;
        });
        stepBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'step' });
        });
    }

    let cellSize = 80;  // Ajustar según tamaño del canvas y laberinto
    let mazeConfig = null;
    let agentConfig = null;
    // Escuchar recompensas por episodio y graficar
    socket.on('rewards_history', (data) => {
        if (!rewardsChartCanvas) return;
        const episodes = Array.from({length: data.ql.length}, (_, i) => i+1);
        if (rewardsChart) rewardsChart.destroy();
        rewardsChart = new Chart(rewardsChartCanvas, {
            type: 'line',
            data: {
                labels: episodes,
                datasets: [
                    {
                        label: 'Q-Learning',
                        data: data.ql,
                        borderColor: 'rgba(50,125,230,1)',
                        backgroundColor: 'rgba(50,125,230,0.15)',
                        tension: 0.2,
                        pointRadius: 0
                    },
                    {
                        label: 'SARSA',
                        data: data.sarsa,
                        borderColor: 'rgba(230,125,50,1)',
                        backgroundColor: 'rgba(230,125,50,0.15)',
                        tension: 0.2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: 'Recompensa total por episodio' }
                },
                scales: {
                    x: { title: { display: true, text: 'Episodio' } },
                    y: { title: { display: true, text: 'Recompensa total' } }
                }
            }
        });
    });

    // Función para parsear paredes (walls)
    function getWalls() {
        const w = document.getElementById('walls').value.trim();
        if (!w) return [];
        return w.split(';').map(pair => {
            const [r, c] = pair.split(',').map(Number);
            return [r, c];
        });
    }

    function getRewards() {
        return {
            reward_goal: parseFloat(document.getElementById('reward_goal').value),
            reward_step: parseFloat(document.getElementById('reward_step').value)
        };
    }

    // Función para obtener posición desde input (ej: "0,0")
    function getPos(id) {
        const val = document.getElementById(id).value.trim();
        const parts = val.split(',').map(Number);
        if (parts.length !== 2 || parts.some(isNaN)) {
            alert(`Posición inválida en ${id}`);
            throw new Error('Posición inválida');
        }
        return parts;
    }

    // Inicializa mazeConfig con los valores actuales del formulario al cargar la página
    try {
        mazeConfig = {
            rows: parseInt(document.getElementById('rows').value),
            cols: parseInt(document.getElementById('cols').value),
            walls: getWalls(),
            start: getPos('start'),
            goal: getPos('goal')
        };
    } catch (err) {
        console.error(err);
    }
    drawMaze();

    // Formulario para configurar laberinto
    mazeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const rows = parseInt(document.getElementById('rows').value);
            const cols = parseInt(document.getElementById('cols').value);
            const walls = getWalls();
            const start = getPos('start');
            const goal = getPos('goal');
            const rewards = getRewards();

            fetch('/maze/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows, cols, walls, start, goal, ...rewards })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.status);
                if (data.status === 'Maze configured') {
                    mazeConfig = { rows, cols, walls, start, goal, ...rewards }; // Actualizar config local
                    drawMaze();  // Dibujar inmediatamente
                }
            })
            .catch(err => alert('Error configurando laberinto: ' + err));
        } catch (err) {
            console.error(err);
        }
    });

    // Configurar agentes QL y SARSA
    cfgAgentsBtn.addEventListener('click', () => {
        try {
            agentConfig = {
                ql: {
                    alpha: parseFloat(document.getElementById('alpha_ql').value),
                    gamma: parseFloat(document.getElementById('gamma_ql').value),
                    epsilon: parseFloat(document.getElementById('epsilon_ql').value)
                },
                sarsa: {
                    alpha: parseFloat(document.getElementById('alpha_sarsa').value),
                    gamma: parseFloat(document.getElementById('gamma_sarsa').value),
                    epsilon: parseFloat(document.getElementById('epsilon_sarsa').value)
                }
            };
            fetch('/agent/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agentConfig)
            })
            .then(res => res.json())
            .then(data => alert(data.status))
            .catch(err => alert('Error configurando agentes: ' + err));
        } catch (err) {
            console.error(err);
        }
    });

    // Iniciar simulación
    startBtn.addEventListener('click', () => {
        if (!mazeConfig || !agentConfig) {
            alert('Configure el laberinto y los agentes antes de iniciar la simulación.');
            return;
        }
        infoPanel.textContent = '';
        if (stepsSummary) stepsSummary.textContent = '';
        socket.emit('start_simulation', { n_episodes: 20, speed: simSpeed });
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
    });
    // Recibir evento de pasos finales
    socket.on('final_steps', (data) => {
        showStepsSummary(data.ql, data.sarsa);
    });

    // Dibuja el laberinto con coordenadas
    function drawMaze() {
        if (!mazeConfig) return;
        const { rows, cols, walls, start, goal } = mazeConfig;

        // Ajustar tamaño del canvas dinámicamente
        const maxCell = 80;
        const minCell = 32;
        let cell = Math.floor(470 / Math.max(rows, cols));
        cell = Math.max(minCell, Math.min(maxCell, cell));
        canvas.width = cols * cell;
        canvas.height = rows * cell;
        cellSize = cell;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo blanco para celdas libres
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

        // Paredes en azul oscuro
        ctx.fillStyle = '#334466';
        walls.forEach(([r, c]) => {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        });

        // Dibujar grilla y coordenadas
        ctx.strokeStyle = '#aaccee';
        ctx.fillStyle = '#555555';
        ctx.font = `${cellSize / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Líneas horizontal y vertical para la grilla
                ctx.beginPath();
                ctx.moveTo(0, r * cellSize);
                ctx.lineTo(cols * cellSize, r * cellSize);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(c * cellSize, 0);
                ctx.lineTo(c * cellSize, rows * cellSize);
                ctx.stroke();

                // Texto coordenadas en celda
                ctx.fillText(`(${r},${c})`, c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
            }
        }

        // Líneas para cerrar grilla
        ctx.beginPath();
        ctx.moveTo(0, rows * cellSize);
        ctx.lineTo(cols * cellSize, rows * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cols * cellSize, 0);
        ctx.lineTo(cols * cellSize, rows * cellSize);
        ctx.stroke();

        // Inicio en verde
        ctx.fillStyle = '#2aaf2a';
        ctx.fillRect(start[1] * cellSize, start[0] * cellSize, cellSize, cellSize);

        // Meta en rojo
        ctx.fillStyle = '#e04e4e';
        ctx.fillRect(goal[1] * cellSize, goal[0] * cellSize, cellSize, cellSize);
    }

    // Dibuja recorridos de agentes sobre laberinto
    function drawPaths(qlPath, sarsaPath) {
        if (!qlPath || !sarsaPath) return;

        drawMaze();

        // Recorrido Q-Learning en azul claro
        ctx.fillStyle = 'rgba(50, 125, 230, 0.5)';
        qlPath.forEach(([r, c]) => {
            ctx.fillRect(c * cellSize + cellSize * 0.3, r * cellSize + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
        });

        // Recorrido SARSA en naranja claro
        ctx.fillStyle = 'rgba(230, 125, 50, 0.5)';
        sarsaPath.forEach(([r, c]) => {
            ctx.fillRect(c * cellSize + cellSize * 0.1, r * cellSize + cellSize * 0.1, cellSize * 0.3, cellSize * 0.3);
        });
    }

    // Actualización en tiempo real de posicion, recompensas, movimientos
    socket.on('maze_update', (data) => {
    drawPaths(data.ql, data.sarsa);

    if (data.stepInfo) {
        const stepInfo = data.stepInfo;
        const ul = infoPanel; // ya es un <ul>

        // Crear un elemento li con el contenido formateado
        const li = document.createElement('li');
        li.style.marginBottom = '10px'; // espacios entre pasos

        li.innerHTML = `
            <strong>QL:</strong> Estado: (${stepInfo.ql.estado[0]},${stepInfo.ql.estado[1]}),
            Acción: ${stepInfo.ql.accion},
            Nuevo estado: (${stepInfo.ql.nuevo_estado[0]},${stepInfo.ql.nuevo_estado[1]}),
            Recompensa: ${stepInfo.ql.recompensa}
            <br/>
            <strong>SARSA:</strong> Estado: (${stepInfo.sarsa.estado[0]},${stepInfo.sarsa.estado[1]}),
            Acción: ${stepInfo.sarsa.accion},
            Nuevo estado: (${stepInfo.sarsa.nuevo_estado[0]},${stepInfo.sarsa.nuevo_estado[1]}),
            Recompensa: ${stepInfo.sarsa.recompensa}
        `;

        ul.appendChild(li);

        // Opcional: hacer scroll al último paso para verlo siempre
        ul.scrollTop = ul.scrollHeight;
    }
});


});
