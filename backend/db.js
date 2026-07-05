require('dotenv').config();
const mysql = require('mysql2');

const hasMySqlConfig = Boolean(
  process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME
);

let connection = null;

if (hasMySqlConfig) {
  // Use environment variables to store secure database credentials
  connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_task_management'
  });

  // Connect and log errors if any
  connection.connect(err => {
    if (err) {
      console.error('MySQL connection error:', err.message);
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Access denied when connecting to MySQL.');
        console.error('Create a .env file in the project root based on .env.example and set DB_USER and DB_PASSWORD.');
        console.error('Example .env contents:');
        console.error('DB_HOST=localhost');
        console.error('DB_USER=root');
        console.error('DB_PASSWORD=your_password_here');
        console.error('DB_NAME=student_task_management');
      }
      return;
    }
    console.log('Connected to MySQL database.');
  });
} else {
  console.log('MySQL config not set; skipping MySQL initialization.');
}

module.exports = connection;
