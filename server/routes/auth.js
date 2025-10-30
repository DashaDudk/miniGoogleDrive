const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../db.json');

// Допоміжна функція для читання БД
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], files: [] };
  }
}

// Допоміжна функція для запису в БД
async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Хешування паролю
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Генерація токена
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register - Реєстрація
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Введіть ім\'я користувача та пароль'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        status: 'error',
        message: 'Пароль повинен бути мінімум 4 символи'
      });
    }

    const db = await readDB();

    // Перевірка чи користувач вже існує
    const existingUser = db.users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Користувач з таким іменем вже існує'
      });
    }

    // Створення нового користувача
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    await writeDB(db);

    res.json({
      status: 'ok',
      message: 'Реєстрація успішна',
      userId: newUser.id
    });
  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// POST /api/auth/login - Вхід
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Введіть ім\'я користувача та пароль'
      });
    }

    const db = await readDB();

    // Пошук користувача
    const user = db.users.find(
      u => u.username === username && u.password === hashPassword(password)
    );

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Невірне ім\'я користувача або пароль'
      });
    }

    // Генерація токена
    const token = generateToken();

    res.json({
      status: 'ok',
      message: 'Вхід успішний',
      token,
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('Помилка входу:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// POST /api/auth/logout - Вихід
router.post('/logout', async (req, res) => {
  res.json({
    status: 'ok',
    message: 'Вихід успішний'
  });
});

module.exports = router;