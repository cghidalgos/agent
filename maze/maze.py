import numpy as np

ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT']
ACTION_TO_DELTA = {
    'UP': (-1, 0),
    'DOWN': (1, 0),
    'LEFT': (0, -1),
    'RIGHT': (0, 1)
}


class Maze:
    def __init__(self, rows, cols, walls, start, goal, reward_goal=1, reward_step=-0.04):
        self.rows = rows
        self.cols = cols
        self.walls = set(tuple(w) for w in walls)
        self.start = tuple(start)
        self.goal = tuple(goal)
        self.reward_goal = reward_goal
        self.reward_step = reward_step
        self.reset()

    def reset(self):
        self.agent_pos = self.start
        return self.agent_pos

    def step(self, action):
        r, c = self.agent_pos
        dr, dc = ACTION_TO_DELTA[ACTIONS[action]]
        nr, nc = r + dr, c + dc
        next_pos = (nr, nc)
        if (
            0 <= nr < self.rows and 0 <= nc < self.cols and
            next_pos not in self.walls
        ):
            self.agent_pos = next_pos
        reward = self.reward_goal if self.agent_pos == self.goal else self.reward_step
        done = (self.agent_pos == self.goal)
        return self.agent_pos, reward, done

    def valid_actions(self, pos=None):
        if pos is None:
            pos = self.agent_pos
        acts = []
        for i, a in enumerate(ACTIONS):
            dr, dc = ACTION_TO_DELTA[a]
            nr, nc = pos[0] + dr, pos[1] + dc
            if (0 <= nr < self.rows and 0 <= nc < self.cols and (nr, nc) not in self.walls):
                acts.append(i)
        return acts
