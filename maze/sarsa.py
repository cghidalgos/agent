import numpy as np

class SarsaAgent:
    def __init__(self, maze, alpha=0.1, gamma=0.9, epsilon=0.1):
        self.maze = maze
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q = np.zeros((maze.rows, maze.cols, 4))
        self.path = []

    def choose_action(self, pos):
        if np.random.rand() < self.epsilon:
            acts = self.maze.valid_actions(pos)
            return np.random.choice(acts)
        qvals = self.q[pos[0], pos[1]]
        acts = self.maze.valid_actions(pos)
        maxq = np.max(qvals[acts])
        best_acts = [a for a in acts if qvals[a] == maxq]

        return np.random.choice(best_acts)

    def run_episode(self):
        s = self.maze.reset()
        a = self.choose_action(s)
        done = False
        steps = []
        while not done:
            prev_s, prev_a = s, a
            s_, r, done = self.maze.step(a)
            a_ = self.choose_action(s_)
            self.q[prev_s[0], prev_s[1], prev_a] += self.alpha * (
                r + self.gamma * self.q[s_[0], s_[1], a_] - self.q[prev_s[0], prev_s[1], prev_a]
            )
            steps.append({
                'estado': prev_s,
                'accion': prev_a,
                'nuevo_estado': s_,
                'recompensa': r
            })
            s, a = s_, a_
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
