const express = require('express');
const router = express.Router();

let nextId = 4;

let tasks = [
  {
    id: '1',
    title: 'Complete math assignment',
    description: 'Finish chapter 4 problems and review answers.',
    due_date: '2026-07-03',
    status: 'Pending'
  },
  {
    id: '2',
    title: 'Prepare science presentation',
    description: 'Create slide deck and practice the explanation.',
    due_date: '2026-07-05',
    status: 'Completed'
  },
  {
    id: '3',
    title: 'Submit English essay draft',
    description: 'Proofread the first draft before submission.',
    due_date: '2026-07-06',
    status: 'Pending'
  }
];

function normalizeTask(input, fallbackId) {
  return {
    id: fallbackId,
    title: input.title,
    description: input.description || '',
    due_date: input.due_date || '',
    status: input.status || 'Pending'
  };
}

router.get('/', (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();
  const filtered = search
    ? tasks.filter((task) => task.title.toLowerCase().includes(search))
    : tasks;

  res.json(filtered);
});

router.get('/:id', (req, res) => {
  const task = tasks.find((entry) => entry.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.post('/', (req, res) => {
  if (!req.body.title || !req.body.title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const created = normalizeTask(req.body, String(nextId++));
  tasks = [created, ...tasks];
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const index = tasks.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const updated = normalizeTask({ ...tasks[index], ...req.body }, req.params.id);
  tasks[index] = updated;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const originalLength = tasks.length;
  tasks = tasks.filter((entry) => entry.id !== req.params.id);

  if (tasks.length === originalLength) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;