# Student Task Management System

A simple student task management application built with Node.js, Express, MongoDB, HTML, CSS, and JavaScript.

## Features

- Add a new task
- View all tasks
- Update a task
- Delete a task
- Mark a task as Completed or Pending
- Search tasks by title

## Pages

- `index.html` - Home page
- `add.html` - Add Task page
- `view.html` - View Tasks page
- `edit.html` - Edit Task page

## REST API Endpoints

- `GET /tasks` - List all tasks
- `GET /tasks/:id` - Get a task by ID
- `POST /tasks` - Create a new task
- `PUT /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task

## Project Structure

```
student-task-management/
├── server.js
├── package.json
├── db.js
├── routes/
│   └── tasks.js
├── public/
│   ├── index.html
│   ├── add.html
│   ├── view.html
│   ├── edit.html
│   ├── style.css
│   └── app.js
└── schema.sql
```

## Database Setup

1. Create a `.env` file in `backend/`.
2. Add your MongoDB connection string and database name.

  Example `.env` contents:

  ```env
  MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/?appName=Cluster0
  MONGO_DB_NAME=student_task_management
  ```

3. Start the backend server. The app uses the `tasks` collection in the MongoDB database you choose.

## Run in VS Code

1. Open the project folder in VS Code.
2. Open a terminal.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Open your browser and visit:

```
http://localhost:3000
```

## Notes

- The app uses `public/` for static HTML, CSS, and client-side JavaScript.
- The Express API handles task CRUD operations using MongoDB.
- Use the search box on `view.html` to filter tasks by title.
