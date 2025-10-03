# Maze Reinforcement Learning: Q-Learning vs SARSA

Este proyecto es una aplicación web interactiva que permite comparar dos algoritmos clásicos de aprendizaje por refuerzo: Q-Learning y SARSA, en la resolución de laberintos. Está implementado en Python usando Flask y Flask-SocketIO para la comunicación en tiempo real, y JavaScript con canvas para la visualización.

---

## Características

- Configuración dinámica del laberinto (tamaño, paredes, posición de inicio y meta).
- Configuración de parámetros para agentes Q-Learning y SARSA (alpha, gamma, epsilon).
- Simulación en tiempo real con control de velocidad, pausa, reanudación y paso a paso.
- Visualización gráfica del laberinto, políticas aprendidas, Q-tables y recorridos reales.
- Exportación de Q-table, política y recompensas en formatos JSON y CSV.
- Visualización de recompensas acumuladas por episodio con gráficos generados por Chart.js.
- Dibujo del camino recorrido con flechas sobre el laberinto.
- Backend en Flask con endpoints REST y eventos WebSocket para control y actualización en vivo.
- Contenedor Docker configurado para despliegue sencillo.

---

## Estructura del proyecto

- `app.py`: aplicación Flask que maneja las rutas, lógica de simulación y comunicación con el frontend.
- `maze/`
  - `maze.py`: definición del entorno laberinto y funciones auxiliares.
  - `qlearning.py`: implementación del agente Q-Learning.
  - `sarsa.py`: implementación del agente SARSA.
- `static/js/app.js`: lógica frontend para gestión de UI, comunicación con backend y dibujo.
- `templates/index.html`: interfaz de usuario para configuración y visualización.
- `Dockerfile` y `docker-compose.yml`: para contenerización del proyecto.
- `requirements.txt`: dependencias Python.

---

## Requisitos

- Python 3.10 o superior
- Flask
- Flask-SocketIO
- NumPy
- Chart.js (cargado desde CDN en frontend)
- Docker (opcional, para despliegue en contenedor)

---

## Instalación y Ejecución

1. Clona este repositorio:
git clone https://github.com/tu_usuario/maze-rl.git
cd maze-rl

text

2. Instala dependencias Python:
python -m venv venv
source venv/bin/activate # Linux/Mac
venv\Scripts\activate # Windows
pip install -r requirements.txt

text

3. Ejecuta la aplicación localmente:
python app.py

text
La aplicación estará disponible en `http://localhost:5000`

4. (Opcional) Usar Docker:
docker-compose up --build

text
La app escucha en el puerto 5002 (`http://localhost:5002`)

---

## Uso

- Configura el laberinto indicando dimensiones, paredes, inicio y meta.
- Ajusta los parámetros de los agentes Q-Learning y SARSA.
- Configura agentes y luego inicia la simulación.
- Controla la simulación con pausa, reanudar y velocidad ajustable.
- Visualiza Q-tables, políticas aprendidas, caminos recorridos con flechas y estadísticas.
- Exporta los datos para análisis externo.

---

## Metodología

Los agentes aprenden a navegar el laberinto mediante aprendizaje por refuerzo:

- **Q-Learning**: algoritmo off-policy que optimiza la política considerando la mejor acción futura.
- **SARSA**: algoritmo on-policy que actualiza la Q-table en base a la acción realmente tomada.

El entorno está modelado como una cuadrícula con paredes y posiciones de inicio y meta, recompensando el objetivo y penalizando cada paso.

---

## Contribuciones

Las contribuciones son bienvenidas. Para sugerencias o mejoras, abre un issue o envía un pull request.

---

## Licencia

Este proyecto está bajo licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## Autor

Desarrollado por GHS - 2025
Contacto: cgiohidalgo@gmail.com
