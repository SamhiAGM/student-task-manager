-- Create the database and tasks table for the Student Task Management System
CREATE DATABASE IF NOT EXISTS student_task_management;
USE student_task_management;

CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
);
