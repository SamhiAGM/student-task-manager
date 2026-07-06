const express = require('express');
const router = express.Router();
const { mongoose } = require('../mongo');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage });

function serializeTask(task) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;

  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description || '',
    due_date: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString().slice(0, 10) : '',
    status: task.status || 'Pending',
    pdf_url: task.pdf_url || ''
  };
}

function getTaskModel() {
  try {
    return mongoose.model('Task');
  } catch (e) {
    if (e.name === 'MissingSchemaError') {
      const { Schema } = mongoose;
      const taskSchema = new Schema(
        {
          title: { type: String, required: true },
          description: String,
          due_date: Date,
          status: { type: String, default: 'Pending' },
          pdf_url: String
        },
        { timestamps: true }
      );
      return mongoose.model('Task', taskSchema);
    }
    throw e;
  }
}

router.get('/', async (req, res) => {
  const Task = getTaskModel();
  const search = req.query.search;
  const filter = {};

  if (search) {
    filter.title = new RegExp(search, 'i');
  }

  try {
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).exec();
    res.json(tasks.map(serializeTask));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const Task = getTaskModel();

  try {
    const task = await Task.findById(req.params.id).exec();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(serializeTask(task));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('pdf_file'), async (req, res) => {
  const Task = getTaskModel();
  if (!req.body.title || !req.body.title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const saved = await new Task({
      title: req.body.title,
      description: req.body.description,
      due_date: req.body.due_date,
      status: req.body.status || 'Pending',
      pdf_url: req.file ? '/uploads/' + req.file.filename : ''
    }).save();
    res.status(201).json(serializeTask(saved));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', upload.single('pdf_file'), async (req, res) => {
  const Task = getTaskModel();

  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.pdf_url = '/uploads/' + req.file.filename;
    }
    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true }).exec();
    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(serializeTask(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const Task = getTaskModel();

  try {
    const result = await Task.findByIdAndDelete(req.params.id).exec();
    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
