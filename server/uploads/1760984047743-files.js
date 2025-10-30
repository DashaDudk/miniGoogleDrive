const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');

const DB_PATH = path.join(__dirname, '../db.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Налаштування multer для завантаження файлів
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    cb(null, true); // не перевіряємо тип
  }
});

// Допоміжні функції для роботи з БД
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], files: [] };
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// GET /api/files - Отримати список файлів користувача
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Необхідна авторизація'
      });
    }

    const db = await readDB();
    const userFiles = db.files.filter(f => f.userId === userId);

    res.json({
      status: 'ok',
      files: userFiles
    });
  } catch (error) {
    console.error('Помилка отримання файлів:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// POST /api/files/upload - Завантаження файлу
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = req.body.userId;
    const username = req.body.username;

    if (!userId || !username) {
      // Видаляємо завантажений файл якщо немає авторизації
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      return res.status(401).json({
        status: 'error',
        message: 'Необхідна авторизація'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Файл не надіслано'
      });
    }

    const db = await readDB();

    // Отримуємо статистику файлу
    const stats = await fs.stat(req.file.path);

    // Створюємо запис про файл
    const fileRecord = {
      id: Date.now().toString(),
      userId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      type: path.extname(req.file.originalname).toLowerCase(),
      uploadedBy: username,
      editedBy: username,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    db.files.push(fileRecord);
    await writeDB(db);

    res.json({
      status: 'ok',
      message: 'Файл успішно завантажено',
      file: fileRecord
    });
  } catch (error) {
    console.error('Помилка завантаження файлу:', error);
    // Видаляємо файл у разі помилки
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({
      status: 'error',
      message: error.message || 'Помилка сервера'
    });
  }
});

// DELETE /api/files/:id - Видалення файлу
router.delete('/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Необхідна авторизація'
      });
    }

    const db = await readDB();

    // Знаходимо файл
    const fileIndex = db.files.findIndex(f => f.id === fileId && f.userId === userId);

    if (fileIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Файл не знайдено'
      });
    }

    const file = db.files[fileIndex];

    // Видаляємо файл з диску
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Помилка видалення файлу з диску:', error);
    }

    // Видаляємо запис з БД
    db.files.splice(fileIndex, 1);
    await writeDB(db);

    res.json({
      status: 'ok',
      message: 'Файл успішно видалено'
    });
  } catch (error) {
    console.error('Помилка видалення файлу:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// GET /api/files/download/:id - Завантажити файл
router.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Необхідна авторизація'
      });
    }

    const db = await readDB();

    // Знаходимо файл
    const file = db.files.find(f => f.id === fileId && f.userId === userId);

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'Файл не знайдено'
      });
    }

    // Перевіряємо чи файл існує
    if (!fsSync.existsSync(file.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'Файл не знайдено на диску'
      });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Помилка завантаження файлу:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// GET /api/files/preview/:id - Перегляд вмісту файлу (.c файли)
router.get('/preview/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Необхідна авторизація'
      });
    }

    const db = await readDB();

    // Знаходимо файл
    const file = db.files.find(f => f.id === fileId && f.userId === userId);

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'Файл не знайдено'
      });
    }

    // Перевіряємо тип файлу
    if (file.type === '.c') {
      const content = await fs.readFile(file.path, 'utf8');
      res.json({
        status: 'ok',
        content,
        type: 'text'
      });
    } else if (file.type === '.jpg') {
      // Для зображень відправляємо URL
      res.json({
        status: 'ok',
        url: `/api/files/image/${fileId}?userId=${userId}`,
        type: 'image'
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Перегляд не підтримується для цього типу файлу'
      });
    }
  } catch (error) {
    console.error('Помилка перегляду файлу:', error);
    res.status(500).json({
      status: 'error',
      message: 'Помилка сервера'
    });
  }
});

// GET /api/files/image/:id - Отримати зображення
router.get('/image/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).send('Необхідна авторизація');
    }

    const db = await readDB();

    // Знаходимо файл
    const file = db.files.find(f => f.id === fileId && f.userId === userId);

    if (!file) {
      return res.status(404).send('Файл не знайдено');
    }

    if (file.type !== '.jpg') {
      return res.status(400).send('Це не зображення');
    }

    res.sendFile(file.path);
  } catch (error) {
    console.error('Помилка відображення зображення:', error);
    res.status(500).send('Помилка сервера');
  }
});

// PUT /api/files/edit/:id - редагування .c файлу
router.put('/edit/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const { userId, username, content } = req.body;

    if (!userId || !username) {
      return res.status(401).json({status:'error', message:'Необхідна авторизація'});
    }

    const db = await readDB();
    const file = db.files.find(f => f.id === fileId && f.userId === userId);

    if (!file) return res.status(404).json({status:'error', message:'Файл не знайдено'});
    if (file.type !== '.c') return res.status(400).json({status:'error', message:'Редагування лише .c файлів'});

    // Перезаписуємо файл
    await fs.writeFile(file.path, content, 'utf8');

    // Оновлюємо БД
    file.modifiedAt = new Date().toISOString();
    file.editedBy = username;
    await writeDB(db);

    res.json({status:'ok', message:'Файл успішно збережено'});

  } catch (error) {
    console.error('Помилка редагування файлу:', error);
    res.status(500).json({status:'error', message:'Помилка сервера'});
  }
});


module.exports = router;