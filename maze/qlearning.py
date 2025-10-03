import numpy as np

class QLearningAgent:
    def __init__(self, maze, alpha=0.1, gamma=0.9, epsilon=0.1):
        self.maze = maze
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q = np.zeros((maze.rows, maze.cols, 4))
        self.path = []

    def choose_action(self, pos):
        # Escoge acción con política epsilon-greedy
        acts = self.maze.valid_actions(pos)
        if np.random.rand() < self.epsilon:
            return np.random.choice(acts)
        qvals = self.q[pos[0], pos[1]]
        maxq = np.max(qvals[acts])
        best_acts = [a for a in acts if qvals[a] == maxq]
        return np.random.choice(best_acts)

    def run_episode(self):
        s = self.maze.reset()
        done = False
        steps = []
        while not done:
            a = self.choose_action(s)
            s_, r, done = self.maze.step(a)
            # Q-Learning: update con el máximo de Q en s' (a')
            next_valid = self.maze.valid_actions(s_)
            max_q_next = np.max(self.q[s_[0], s_[1], next_valid]) if next_valid else 0.0
            self.q[s[0], s[1], a] += self.alpha * (
                r + self.gamma * max_q_next - self.q[s[0], s[1], a]
            )
            steps.append({
                'estado': s,
                'accion': a,
                'nuevo_estado': s_,
                'recompensa': r
            })
            s = s_
        return steps

    def run_episodes(self, n):
        episodes = []
        rewards = []
        for _ in range(n):
            steps = self.run_episode()
            episodes.append(steps)
            total_reward = sum(step['recompensa'] for step in steps)
            rewards.append(total_reward)
        return episodes, rewards
