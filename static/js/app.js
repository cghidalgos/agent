// app.js - Versión completa y consolidada para integrarse con app.py (Flask + Socket.IO) y templates/index.html
// Autor: Carlos Giovanny Hidalgo Suarez (adaptado)

document.addEventListener('DOMContentLoaded', () => {
    // ======= Elementos del DOM =======
    const exportQTableBtn = document.getElementById('exportQTableBtn');
    const exportPolicyBtn = document.getElementById('exportPolicyBtn');
    const exportRewardsBtn = document.getElementById('exportRewardsBtn');
    const randomWallsBtn = document.getElementById('randomWallsBtn');
    const showQTableBtn = document.getElementById('showQTableBtn');
    const showPolicyBtn = document.getElementById('showPolicyBtn');
    const showPathBtn = document.getElementById('showPathBtn');
    const agentSelect = document.getElementById('agentSelect');
    const qtablePanel = document.getElementById('qtablePanel');
    const policyPanel = document.getElementById('policyPanel');
    const stepsSummary = document.getElementById('stepsSummary');
    const mazeForm = document.getElementById('mazeForm');
    const agentFormQL = document.getElementById('agentFormQL');
    const agentFormSARSA = document.getElementById('agentFormSARSA');
    const cfgAgentsBtn = document.getElementById('cfgAgentsBtn');
    const startBtn = document.getElementById('startBtn');
    const canvas = document.getElementById('mazeCanvas');
    const infoPanel = document.getElementById('infoPanel');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const stepBtn = document.getElementById('stepBtn');
    const rewardsChartCanvas = document.getElementById('rewardsChart');

    // ======= Variables internas =======
    let ctx = null;
    if (canvas) ctx = canvas.getContext('2d');
    let cellSize = 80;
    let mazeConfig = null;
    let agentConfig = null;
    let simSpeed = 200;
    let rewardsChart = null;

    // ======= Utilidades =======
    function download(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    function safeFetchJson(url, opts) {
        return fetch(url, opts)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                return res.json();
            });
    }

    function showPanel(panelId) {
        [qtablePanel, policyPanel].forEach(panel => {
            if (!panel) return;
            panel.style.display = 'none';
        });
        if (panelId === 'qtablePanel' && qtablePanel) qtablePanel.style.display = 'block';
        if (panelId === 'policyPanel' && policyPanel) policyPanel.style.display = 'block';
    }

    function clearPanels() {
        [qtablePanel, policyPanel].forEach(panel => {
            if (!panel) return;
            panel.innerHTML = '';
            panel.style.display = 'none';
        });
    }

    // ======= Exportes =======
    if (exportQTableBtn && agentSelect) {
        exportQTableBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            safeFetchJson(`/qtable/${agent}`)
                .then(data => download(`qtable_${agent}.json`, JSON.stringify(data.q, null, 2)))
                .catch(err => alert('Error al exportar Q-table: ' + err.message));
        });
    }

    if (exportPolicyBtn && agentSelect) {
        exportPolicyBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            safeFetchJson(`/policy/${agent}`)
                .then(data => download(`policy_${agent}.json`, JSON.stringify(data.policy, null, 2)))
                .catch(err => alert('Error al exportar política: ' + err.message));
        });
    }

    if (exportRewardsBtn) {
        exportRewardsBtn.addEventListener('click', () => {
            if (!rewardsChart) {
                alert('No hay datos de recompensas para exportar.');
                return;
            }
            const ql = rewardsChart.data.datasets[0].data;
            const sarsa = rewardsChart.data.datasets[1].data;
            let csv = 'episodio,qlearning,sarsa\n';
            for (let i = 0; i < ql.length; i++) {
                csv += `${i + 1},${ql[i]},${sarsa[i]}\n`;
            }
            download('rewards.csv', csv);
        });
    }

    // ======= Mostrar Q-table, política =======
    function renderQTable(q, agent) {
        if (!qtablePanel) return;
        let html = `<b>Q-table (${agent === 'ql' ? 'Q-Learning' : 'SARSA'})</b><br/><table style='border-collapse:collapse;'>`;
        for (let r = 0; r < q.length; r++) {
            html += '<tr>';
            for (let c = 0; c < q[r].length; c++) {
                html += `<td style='border:1px solid #aaccee; padding:4px; font-size:12px; min-width:90px; vertical-align:top;'>`;
                if (Array.isArray(q[r][c])) {
                    const arrows = ['↑', '↓', '←', '→'];
                    html += q[r][c].map((v, i) => `<span style='color:#666;'>${arrows[i]}:</span> ${Number(v).toFixed(2)}`).join('<br/>');
                } else {
                    html += '-';
                }
                html += '</td>';
            }
            html += '</tr>';
        }
        html += '</table>';
        qtablePanel.innerHTML = html;
        showPanel('qtablePanel');
    }

    function renderPolicy(policy, agent) {
        if (!policyPanel) return;
        let html = `<b>Política aprendida (${agent === 'ql' ? 'Q-Learning' : 'SARSA'})</b><br/><table style='border-collapse:collapse;'>`;
        for (let r = 0; r < policy.length; r++) {
            html += '<tr>';
            for (let c = 0; c < policy[r].length; c++) {
                let val = policy[r][c];
                if (val === 'WALL') {
                    html += `<td style='background:#334466; color:#fff; border:1px solid #aaccee; width:40px; height:28px; text-align:center;'>█</td>`;
                } else {
                    let arrow = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }[val] || '-';
                    html += `<td style='border:1px solid #aaccee; width:40px; height:28px; text-align:center; font-size:18px;'>${arrow}</td>`;
                }
            }
            html += '</tr>';
        }
        html += '</table>';
        policyPanel.innerHTML = html;
        showPanel('policyPanel');
    }

    // ======= Botones mostrar Q-Table, Política y Camino =======
    if (showQTableBtn && agentSelect) {
        showQTableBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            safeFetchJson(`/qtable/${agent}`)
                .then(data => {
                    if (data && data.q) renderQTable(data.q, agent);
                    else alert('Q-table no disponible.');
                })
                .catch(err => alert('Error al obtener Q-table: ' + err.message));
        });
    }

    if (showPolicyBtn && agentSelect) {
        showPolicyBtn.addEventListener('click', () => {
            const agent = agentSelect.value;
            safeFetchJson(`/policy/${agent}`)
                .then(data => {
                    if (data && data.policy) renderPolicy(data.policy, agent);
                    else alert('Política no disponible.');
                })
                .catch(err => alert('Error al obtener política: ' + err.message));
        });
    }

    if (showPathBtn && agentSelect) {
        showPathBtn.addEventListener('click', () => {
            clearPanels();
            const agent = agentSelect.value;
            safeFetchJson(`/last_path/${agent}`)
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                        return;
                    }
                    const tiempo = data.tiempo.toFixed(2);
                    const path = data.path;
                    policyPanel.innerHTML = `<b>Camino (${path.length} pasos) - Tiempo estimado: ${tiempo} segundos</b><br>`;
                    policyPanel.innerHTML += path.map(p => `(${p[0]},${p[1]})`).join(' → ');
                    showPanel('policyPanel');
                    dibujarCamino(path);
                })
                .catch(err => {
                    alert('Error al obtener el camino: ' + err.message);
                });
        });
    }

    // ======= Dibujo laberinto y caminos =======
    function dibujarLaberinto(walls = [], start = [0,0], goal = [mazeConfig ? mazeConfig.rows-1 : 4, mazeConfig ? mazeConfig.cols - 1 : 4]) {
    if (!ctx || !canvas) return;
    const rows = mazeConfig ? mazeConfig.rows : 5;
    const cols = mazeConfig ? mazeConfig.cols : 5;
    cellSize = Math.min(Math.floor(canvas.width / cols), Math.floor(canvas.height / rows));
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Fondo blanco y grilla
    ctx.fillStyle = 'white';
    ctx.fillRect(0,0,cols*cellSize,rows*cellSize);

    ctx.strokeStyle = '#aaccee';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellSize);
        ctx.lineTo(cols * cellSize, r * cellSize);
        ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellSize, 0);
        ctx.lineTo(c * cellSize, rows * cellSize);
        ctx.stroke();
    }

    // Paredes
    ctx.fillStyle = '#334466';
    (walls || (mazeConfig ? mazeConfig.walls : [])).forEach(([r, c]) => {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    });

    // Dibujar coordenadas en cada celda
    ctx.fillStyle = '#555555';  // gris oscuro para texto
    ctx.font = `${Math.max(10, Math.floor(cellSize / 4))}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize + cellSize / 2;
            const y = r * cellSize + cellSize / 2;
            ctx.fillText(`(${r},${c})`, x, y);
        }
    }

    // Inicio y meta
    ctx.fillStyle = 'green';
    ctx.fillRect(start[1] * cellSize, start[0] * cellSize, cellSize, cellSize);
    ctx.fillStyle = 'red';
    ctx.fillRect(goal[1] * cellSize, goal[0] * cellSize, cellSize, cellSize);
}


    function dibujarCamino(path) {
        if (!mazeConfig) {
            alert('Configura el laberinto primero.');
            return;
        }
        dibujarLaberinto(mazeConfig.walls, mazeConfig.start, mazeConfig.goal);

        ctx.strokeStyle = 'blue';
        ctx.fillStyle = 'blue';
        ctx.lineWidth = 3;

        for (let i = 0; i < path.length - 1; i++) {
            const [r1,c1] = path[i];
            const [r2,c2] = path[i+1];

            const x1 = c1 * cellSize + cellSize / 2;
            const y1 = r1 * cellSize + cellSize / 2;
            const x2 = c2 * cellSize + cellSize / 2;
            const y2 = r2 * cellSize + cellSize / 2;

            // Línea
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Flecha
            const headlen = 10;
            const angle = Math.atan2(y2 - y1, x2 - x1);
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
            ctx.fill();
        }
    }

    // ======= Dibujo inicial =======
    if (mazeConfig) dibujarLaberinto(mazeConfig.walls, mazeConfig.start, mazeConfig.goal);

    // ======= Comunicación Socket.IO =======
    const socket = io();

    socket.on('connect', () => {
        console.log('Socket.IO conectado');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO desconectado');
    });

    socket.on('rewards_history', (data) => {
        if (!rewardsChartCanvas) return;
        const episodes = Array.from({ length: data.ql.length }, (_, i) => i + 1);
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

    socket.on('final_steps', (data) => {
        if (!stepsSummary) return;
        stepsSummary.innerHTML = `Q-Learning llegó en <span style='color:#368ae6;'>${data.ql}</span> pasos. SARSA llegó en <span style='color:#e07b2a;'>${data.sarsa}</span> pasos.`;
    });

    socket.on('maze_update', (data) => {
        if (!ctx || !mazeConfig) return;
        drawPaths(data.ql, data.sarsa);
        if (data.stepInfo && infoPanel) {
            const stepInfo = data.stepInfo;
            const li = document.createElement('li');
            li.style.marginBottom = '8px';
            let qlLine = '';
            if (stepInfo.ql) {
                qlLine = `QL - Estado: (${stepInfo.ql.estado[0]},${stepInfo.ql.estado[1]}), Acción: ${stepInfo.ql.accion}, Nuevo: (${stepInfo.ql.nuevo_estado[0]},${stepInfo.ql.nuevo_estado[1]}), Recompensa: ${stepInfo.ql.recompensa}`;
            }
            let sarsaLine = '';
            if (stepInfo.sarsa) {
                sarsaLine = `SARSA - Estado: (${stepInfo.sarsa.estado[0]},${stepInfo.sarsa.estado[1]}), Acción: ${stepInfo.sarsa.accion}, Nuevo: (${stepInfo.sarsa.nuevo_estado[0]},${stepInfo.sarsa.nuevo_estado[1]}), Recompensa: ${stepInfo.sarsa.recompensa}`;
            }
            li.textContent = qlLine + ' | ' + sarsaLine;
            infoPanel.appendChild(li);
            infoPanel.scrollTop = infoPanel.scrollHeight;
        }
    });

    // ==== Control de simulación ====

    if (speedSlider && speedValue) {
        simSpeed = parseInt(speedSlider.value || simSpeed);
        speedValue.textContent = simSpeed;
        speedSlider.addEventListener('input', () => {
            simSpeed = parseInt(speedSlider.value);
            speedValue.textContent = simSpeed;
            socket.emit('sim_control', { type: 'speed', value: simSpeed });
        });
    }

    if (pauseBtn && resumeBtn && stepBtn) {
        pauseBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'pause' });
            if (pauseBtn) pauseBtn.disabled = true;
            if (resumeBtn) resumeBtn.disabled = false;
        });
        resumeBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'resume' });
            if (pauseBtn) pauseBtn.disabled = false;
            if (resumeBtn) resumeBtn.disabled = true;
        });
        stepBtn.addEventListener('click', () => {
            socket.emit('sim_control', { type: 'step' });
        });
    }

    if (mazeForm) {
        mazeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const rows = parseInt(document.getElementById('rows').value);
                const cols = parseInt(document.getElementById('cols').value);
                const wallsRaw = document.getElementById('walls').value.trim();
                const walls = wallsRaw ? wallsRaw.split(';').map(pair => pair.split(',').map(Number)) : [];
                const start = document.getElementById('start').value.trim().split(',').map(Number);
                const goal = document.getElementById('goal').value.trim().split(',').map(Number);
                const reward_goal = parseFloat(document.getElementById('reward_goal').value);
                const reward_step = parseFloat(document.getElementById('reward_step').value);

                safeFetchJson('/maze/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows, cols, walls, start, goal, reward_goal, reward_step })
                }).then(data => {
                    alert(data.status || 'Maze configurado');
                    mazeConfig = { rows, cols, walls, start, goal, reward_goal, reward_step };
                    dibujarLaberinto(walls, start, goal);
                }).catch(err => alert('Error configurando laberinto: ' + err.message));
            } catch (err) {
                console.error(err);
            }
        });
    }
    if (cfgAgentsBtn) {
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
                safeFetchJson('/agent/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentConfig)
                }).then(data => alert(data.status || 'Agentes configurados'))
                  .catch(err => alert('Error configurando agentes: ' + err.message));
            } catch (err) {
                console.error('Error leyendo configuración de agentes:', err);
            }
        });
    }
    if (randomWallsBtn) {
        randomWallsBtn.addEventListener('click', () => {
            try {
                const rows = mazeConfig ? mazeConfig.rows : 5;
                const cols = mazeConfig ? mazeConfig.cols : 5;
                const start = mazeConfig ? mazeConfig.start : [0,0];
                const goal = mazeConfig ? mazeConfig.goal : [rows-1, cols-1];
                const totalCells = rows * cols;
                const maxWalls = Math.floor(totalCells * 0.25);
                let walls = [];
                while (walls.length < maxWalls) {
                    const r = Math.floor(Math.random() * rows);
                    const c = Math.floor(Math.random() * cols);
                    if ((r === start[0] && c === start[1]) || (r === goal[0] && c === goal[1])) continue;
                    if (walls.some(([wr,wc]) => wr === r && wc === c)) continue;
                    walls.push([r,c]);
                }
                document.getElementById('walls').value = walls.map(([r,c]) => `${r},${c}`).join(';');
                alert('Paredes aleatorias generadas. Presiona Configurar Laberinto.');
            } catch(e) {
                alert('Error generando paredes aleatorias: ' + e.message);
            }
        });
    }
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (!mazeConfig || !agentConfig) {
                alert('Configura el laberinto y los agentes antes de iniciar la simulación.');
                return;
            }
            if (infoPanel) infoPanel.innerHTML = '';
            if (stepsSummary) stepsSummary.textContent = '';
            socket.emit('start_simulation', { n_episodes: 50, speed: simSpeed });
            if (pauseBtn) pauseBtn.disabled = false;
            if (resumeBtn) resumeBtn.disabled = true;
        });
    }

    function drawPaths(qlPath, sarsaPath) {
        if (!ctx || !mazeConfig) return;
        dibujarLaberinto(mazeConfig.walls, mazeConfig.start, mazeConfig.goal);
        if (Array.isArray(qlPath)) {
            ctx.fillStyle = 'rgba(50,125,230,0.5)';
            qlPath.forEach(([r,c]) => {
                ctx.fillRect(c*cellSize + cellSize*0.3, r*cellSize + cellSize*0.3, cellSize*0.4, cellSize*0.4);
            });
        }
        if (Array.isArray(sarsaPath)) {
            ctx.fillStyle = 'rgba(230,125,50,0.5)';
            sarsaPath.forEach(([r,c]) => {
                ctx.fillRect(c*cellSize + cellSize*0.1, r*cellSize + cellSize*0.1, cellSize*0.3, cellSize*0.3);
            });
        }
    }

    dibujarLaberinto();

});
