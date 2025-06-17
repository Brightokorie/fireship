# TODO App Backend

This is a simple TODO application backend built with Node.js and Express.js. It allows users to manage a list of tasks through a RESTful API. Task data is stored in a `data.json` file.

## Features

*   Add new tasks
*   View all tasks
*   Mark tasks as complete
*   Delete tasks

## Project Structure

```
todo_app_backend/
├── tests/
│   └── app.test.js       # Unit tests for the API
├── app.js                # Main application logic, Express routes
├── data.json             # Data store for TODO items
├── package.json          # Project dependencies and scripts
├── package-lock.json
└── README.md             # This file
```

## Setup and Installation

1.  **Clone the repository (or ensure you have the files).**
2.  **Navigate to the project directory:**
    ```bash
    cd todo_app_backend
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

To start the server, run:
```bash
node app.js
```
The server will start on `http://localhost:3000`.

## Running Tests

To run the automated tests, execute:
```bash
npm test
```

## API Endpoints

All endpoints are prefixed with `/`.

### `GET /todos`

*   **Description:** Retrieves all TODO items.
*   **Response:**
    *   `200 OK`: An array of TODO items.
        ```json
        [
          { "id": 1678886400000, "task": "Buy groceries", "completed": false },
          { "id": 1678886400001, "task": "Read a book", "completed": true }
        ]
        ```

### `POST /todos`

*   **Description:** Adds a new TODO item.
*   **Request Body:**
    ```json
    {
      "task": "Your new task description"
    }
    ```
*   **Response:**
    *   `201 Created`: The newly created TODO item.
        ```json
        { "id": 1678886400002, "task": "Your new task description", "completed": false }
        ```
    *   `400 Bad Request`: If the `task` is missing or invalid.
        ```json
        { "error": "Task must be a non-empty string" }
        ```

### `PUT /todos/:id`

*   **Description:** Marks a specific TODO item as complete.
*   **Parameters:**
    *   `:id` (number): The ID of the TODO item to update.
*   **Response:**
    *   `200 OK`: The updated TODO item.
        ```json
        { "id": 1678886400000, "task": "Buy groceries", "completed": true }
        ```
    *   `400 Bad Request`: If the ID format is invalid.
        ```json
        { "error": "Invalid ID format. ID must be a number." }
        ```
    *   `404 Not Found`: If the TODO item with the given ID doesn't exist.
        ```json
        { "error": "Todo item not found" }
        ```

### `DELETE /todos/:id`

*   **Description:** Deletes a specific TODO item.
*   **Parameters:**
    *   `:id` (number): The ID of the TODO item to delete.
*   **Response:**
    *   `204 No Content`: Successfully deleted.
    *   `400 Bad Request`: If the ID format is invalid.
        ```json
        { "error": "Invalid ID format. ID must be a number." }
        ```
    *   `404 Not Found`: If the TODO item with the given ID doesn't exist.
        ```json
        { "error": "Todo item not found" }
        ```

## Error Handling

*   The API uses standard HTTP status codes to indicate success or failure.
*   Error responses are in JSON format: `{"error": "Error message"}`.
*   A general `500 Internal Server Error` will be returned for unexpected server issues.
