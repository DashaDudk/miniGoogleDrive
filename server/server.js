const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статичні файли клієнта
app.use(express.static(path.join(__dirname, '../client')));

// API роути
app.use('/api', apiRoutes);

// Перевірка існування папки uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Перевірка існування db.json
const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: [], files: [] }, null, 2));
}

// Тестовий роут
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is working' });
});

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Drive сторінка
app.get('/drive', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/drive.html'));
});

// Обробка 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not found' });
});

// Обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка сервера:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Внутрішня помилка сервера'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
  console.log(`Uploads: ${uploadsDir}`);
  console.log(`Database: ${dbPath}`);
});

module.exports = app;