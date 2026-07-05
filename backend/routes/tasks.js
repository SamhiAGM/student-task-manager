const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all tasks, with optional search by title
router.get('/', (req, res) => {
  const search = req.query.search;
  let sql = 'SELECT * FROM tasks';
  const params = [];

  if (search) {
    sql += ' WHERE title LIKE ?';
    params.push(`%${search}%`);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get a single task by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM tasks WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!results.length) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(results[0]);
  });
});

// Create a new task
router.post('/', (req, res) => {
  const { title, description, due_date, status } = req.body;
  const sql = 'INSERT INTO tasks (title, description, due_date, status) VALUES (?, ?, ?, ?)';

  db.query(sql, [title, description, due_date, status || 'Pending'], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: result.insertId, title, description, due_date, status: status || 'Pending' });
  });
});

// Update an existing task
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, status } = req.body;
  const sql = 'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ?';

  db.query(sql, [title, description, due_date, status, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ id, title, description, due_date, status });
  });
});

// Delete a task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM tasks WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

module.exports = router;
