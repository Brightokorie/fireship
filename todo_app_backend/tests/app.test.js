const request = require('supertest');
const { app, getServer } = require('../app'); // Import app and the server getter
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
let server; // To hold the server instance

// Utility function to write test data
const writeTestData = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// Utility function to read data (for assertions)
const readCurrentData = () => {
  if (fs.existsSync(dataPath)) {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    if (fileContent.trim() === '') return [];
    return JSON.parse(fileContent);
  }
  return [];
};

describe('Todo API', () => {
  beforeAll((done) => {
    // Start the server only once before all tests
    // Use a different port for testing to avoid conflicts if the main app is running
    const testPort = process.env.TEST_PORT || 3001;
    if (getServer() && getServer().listening) { // Check if server from app.js is already running
        server = getServer();
        server.close(done); // Close it if it is, then restart on testPort
        server = app.listen(testPort, done);
    } else if (getServer()) { // If server object exists but not listening (e.g. after a previous close)
        server = getServer();
        server.listen(testPort, done);
    }
    else { // If app.js wasn't run directly, getServer() will be undefined initially
        server = app.listen(testPort, done);
    }
  });

  afterAll((done) => {
    // Close the server after all tests are done
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Reset data before each test
    writeTestData([]);
  });

  afterEach(() => {
    // Clean up data file after each test
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }
  });

  describe('GET /todos', () => {
    it('should return an empty array when no todos exist', async () => {
      const response = await request(app).get('/todos');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all todos when todos exist', async () => {
      const testTodos = [{ id: 1, task: 'Test Todo 1', completed: false }];
      writeTestData(testTodos);
      const response = await request(app).get('/todos');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(testTodos);
    });
  });

  describe('POST /todos', () => {
    it('should add a new todo successfully', async () => {
      const newTask = { task: 'New Todo Task' };
      const response = await request(app).post('/todos').send(newTask);
      expect(response.status).toBe(201);
      expect(response.body.task).toBe(newTask.task);
      expect(response.body.completed).toBe(false);
      expect(response.body).toHaveProperty('id');

      const todos = readCurrentData();
      expect(todos.length).toBe(1);
      expect(todos[0].task).toBe(newTask.task);
    });

    it('should return 400 if task is missing', async () => {
      const response = await request(app).post('/todos').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task must be a non-empty string');
    });

    it('should return 400 if task is an empty string', async () => {
      const response = await request(app).post('/todos').send({ task: '  ' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task must be a non-empty string');
    });
     it('should return 400 if task is not a string', async () => {
      const response = await request(app).post('/todos').send({ task: 123 });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task must be a non-empty string');
    });
  });

  describe('PUT /todos/:id', () => {
    it('should mark an existing todo as completed', async () => {
      const testTodos = [{ id: 123, task: 'Complete Me', completed: false }];
      writeTestData(testTodos);
      const response = await request(app).put('/todos/123').send();
      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
      expect(response.body.task).toBe('Complete Me');

      const todos = readCurrentData();
      expect(todos[0].completed).toBe(true);
    });

    it('should return 404 if todo to update is not found', async () => {
      writeTestData([]); // Ensure no todos
      const response = await request(app).put('/todos/999').send();
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
    });

    it('should return 400 for an invalid ID format', async () => {
      const response = await request(app).put('/todos/abc').send();
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid ID format. ID must be a number.');
    });
  });

  describe('DELETE /todos/:id', () => {
    it('should delete an existing todo', async () => {
      const testTodos = [{ id: 123, task: 'Delete Me', completed: false }];
      writeTestData(testTodos);
      const response = await request(app).delete('/todos/123');
      expect(response.status).toBe(204);

      const todos = readCurrentData();
      expect(todos.length).toBe(0);
    });

    it('should return 404 if todo to delete is not found', async () => {
      writeTestData([]);
      const response = await request(app).delete('/todos/999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
    });

    it('should return 400 for an invalid ID format', async () => {
      const response = await request(app).delete('/todos/abc');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid ID format. ID must be a number.');
    });
  });
});
