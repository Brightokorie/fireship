const express = require('express');
const fs = require('fs');

const app = express();
const port = 3000;
const dataPath = './data.json';

app.use(express.json());

// Helper functions
const readData = () => {
  try {
    if (fs.existsSync(dataPath)) {
      const jsonData = fs.readFileSync(dataPath, 'utf8');
      // Handle empty file case explicitly, as JSON.parse would error
      if (jsonData.trim() === '') {
        return [];
      }
      return JSON.parse(jsonData);
    }
  } catch (error) {
    console.error("Error reading data:", error.message); // Log specific error message
    // If file doesn't exist or is corrupted, return empty array
  }
  return [];
};

const writeData = (data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing data:", error.message); // Log specific error message
    // For now, we just log. In a real app, might throw or have other mechanisms.
  }
};

// API Routes
app.get('/todos', (req, res) => {
  const todos = readData();
  res.status(200).json(todos);
});

app.post('/todos', (req, res) => {
  const { task } = req.body;
  if (!task || typeof task !== 'string' || task.trim() === '') {
    return res.status(400).json({ error: 'Task must be a non-empty string' });
  }

  const todos = readData();
  const newTodo = {
    id: Date.now(), // IDs are numbers
    task: task.trim(),
    completed: false,
  };
  todos.push(newTodo);
  writeData(todos);
  // Check if writeData failed (e.g., by trying to re-read or checking file stats)
  // For this exercise, we assume writeData succeeded if no error was thrown that it couldn't handle.
  res.status(201).json(newTodo);
});

app.put('/todos/:id', (req, res) => {
  const todoId = parseInt(req.params.id);
  if (isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid ID format. ID must be a number.' });
  }

  const todos = readData();
  const todoIndex = todos.findIndex(t => t.id === todoId);

  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  todos[todoIndex].completed = true;
  writeData(todos);
  res.status(200).json(todos[todoIndex]);
});

app.delete('/todos/:id', (req, res) => {
  const todoId = parseInt(req.params.id);
  if (isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid ID format. ID must be a number.' });
  }

  let todos = readData();
  const initialLength = todos.length;
  todos = todos.filter(t => t.id !== todoId);

  if (todos.length === initialLength) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  writeData(todos);
  res.status(204).send();
});

// Basic error handling middleware (optional, but good practice)
// This should be the last middleware added
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the full error stack
  res.status(500).json({ error: 'Internal Server Error' });
});


// Start server
let server;
if (require.main === module) {
  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = { app, getServer: () => server }; // Export app and a function to get the server
