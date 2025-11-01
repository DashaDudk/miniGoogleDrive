// Перевірка авторизації
const userId = localStorage.getItem('userId');
const username = localStorage.getItem('username');

if (!userId || !username) {
  window.location.href = '/';
}

// Показуємо ім'я користувача
document.getElementById('currentUser').textContent = `👤 ${username}`;

// Масив файлів
let files = [];
let currentFilter = 'all';
let currentSort = 'desc';

// Завантаження файлів з сервера
async function loadFiles() {
  try {
    const response = await fetch(`/api/files?userId=${userId}`);
    const data = await response.json();

    if (data.status === 'ok') {
      files = data.files;
      renderFiles();
    } else {
      console.error('Помилка завантаження файлів:', data.message);
    }
  } catch (error) {
    console.error('Помилка завантаження файлів:', error);
    document.getElementById('filesTableBody').innerHTML = `
      <tr><td colspan="7" class="no-files error">Помилка завантаження файлів</td></tr>
    `;
  }
}

// Фільтрація файлів
function filterFiles() {
  if (currentFilter === 'all') {
    return files;
  }
  return files.filter(f => f.type === currentFilter);
}

// Сортування файлів
function sortFiles(filesToSort) {
  return filesToSort.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return currentSort === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

// Форматування дати
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Форматування розміру файлу
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
}

// Рендеринг таблиці файлів
function renderFiles() {
  const tbody = document.getElementById('filesTableBody');
  
  let filteredFiles = filterFiles();
  let sortedFiles = sortFiles(filteredFiles);

  if (sortedFiles.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="no-files">Файлів не знайдено. Завантажте перший файл!</td></tr>
    `;
    return;
  }

  tbody.innerHTML = sortedFiles.map(file => `
    <tr>
      <td class="col-name">
        <span class="file-icon">${file.type === '.c' ? '📄' : '🖼️'}</span>
        ${file.originalName}
      </td>
      <td class="col-createdAt">${formatDate(file.createdAt)}</td>
      <td class="col-modifiedAt">${formatDate(file.modifiedAt)}</td>
      <td class="col-uploadedBy">${file.uploadedBy}</td>
      <td class="col-editedBy">${file.editedBy}</td>
      <td class="col-size">${formatSize(file.size)}</td>
      <td class="col-actions">
        <button class="btn-action" onclick="previewFile('${file.id}')" title="Переглянути">👁️</button>
        <button class="btn-action" onclick="downloadFile('${file.id}')" title="Завантажити">⬇️</button>
         ${file.type === '.c' ? `<button class="btn-action btn-edit" onclick="editFile('${file.id}')" title="Редагувати">✏️</button>` : ''}
        <button class="btn-action btn-delete" onclick="deleteFile('${file.id}')" title="Видалити">🗑️</button>
      </td>

    </tr>
  `).join('');

  updateColumnVisibility();
}

// Оновлення видимості колонок
function updateColumnVisibility() {
  document.querySelectorAll('.column-toggle').forEach(checkbox => {
    const column = checkbox.dataset.column;
    const isVisible = checkbox.checked;
    
    document.querySelectorAll(`.col-${column}`).forEach(el => {
      el.style.display = isVisible ? '' : 'none';
    });
  });
}

// Завантаження файлу на сервер
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  formData.append('username', username);

  const statusEl = document.getElementById('uploadStatus');
  statusEl.textContent = '⏳ Завантаження...';
  statusEl.className = 'upload-status';

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.status === 'ok') {
      statusEl.textContent = '✅ Файл завантажено!';
      statusEl.className = 'upload-status success';
      await loadFiles();
    } else {
      statusEl.textContent = `❌ ${data.message}`;
      statusEl.className = 'upload-status error';
    }
  } catch (error) {
    console.error('Помилка завантаження:', error);
    statusEl.textContent = '❌ Помилка завантаження';
    statusEl.className = 'upload-status error';
  }

  setTimeout(() => {
    statusEl.textContent = '';
  }, 3000);
}

// Видалення файлу
async function deleteFile(fileId) {
  if (!confirm('Ви впевнені, що хочете видалити цей файл?')) {
    return;
  }

  try {
    const response = await fetch(`/api/files/${fileId}?userId=${userId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.status === 'ok') {
      await loadFiles();
    } else {
      alert('Помилка видалення: ' + data.message);
    }
  } catch (error) {
    console.error('Помилка видалення:', error);
    alert('Помилка видалення файлу');
  }
}

// Завантаження файлу на комп'ютер
function downloadFile(fileId) {
  window.location.href = `/api/files/download/${fileId}?userId=${userId}`;
}

// Перегляд файлу
async function previewFile(fileId) {
  const modal = document.getElementById('previewModal');
  const title = document.getElementById('previewTitle');
  const content = document.getElementById('previewContent');

  const file = files.find(f => f.id === fileId);
  if (!file) return;

  title.textContent = file.originalName;
  content.innerHTML = '<p>Завантаження...</p>';
  modal.style.display = 'block';

  try {
    const response = await fetch(`/api/files/preview/${fileId}?userId=${userId}`);
    const data = await response.json();

    if (data.status === 'ok') {
      // 👇 ось цей блок вставляєш ЗАМІСТЬ старих if-ів
      if (file.originalName.endsWith('.c')) {
        // показуємо текст
        content.innerHTML = `<pre class="code-preview">${escapeHtml(data.content)}</pre>`;
      } else if (file.originalName.endsWith('.jpg') || file.originalName.endsWith('.jpeg')) {
        // показуємо картинку
        content.innerHTML = `<img src="${data.url}" alt="${file.originalName}" class="image-preview">`;
      } else {
        // інші типи не відображаємо
        content.innerHTML = `<p>❌ Перегляд цього типу файлу не підтримується.</p>`;
      }
    } else {
      content.innerHTML = `<p class="error">Помилка: ${data.message}</p>`;
    }
  } catch (error) {
    console.error('Помилка перегляду:', error);
    content.innerHTML = '<p class="error">Помилка завантаження перегляду</p>';
  }
}

async function editFile(fileId) {
  const modal = document.getElementById('previewModal');
  const title = document.getElementById('previewTitle');
  const content = document.getElementById('previewContent');

  const file = files.find(f => f.id === fileId);
  if (!file) return;

  title.textContent = `Редагування: ${file.originalName}`;
  content.innerHTML = `
    <textarea id="editTextarea" style="width:100%; height:300px;">Завантаження...</textarea>
    <button id="saveEditBtn" class="btn btn-primary" style="margin-top:10px;">💾 Зберегти</button>
    <span id="editStatus" style="margin-left:10px;"></span>
  `;
  modal.style.display = 'block';

  try {
    const response = await fetch(`/api/files/preview/${fileId}?userId=${userId}`);
    const data = await response.json();

    if (data.status === 'ok' && data.type === 'text') {
      document.getElementById('editTextarea').value = data.content;

      document.getElementById('saveEditBtn').addEventListener('click', async () => {
        const newContent = document.getElementById('editTextarea').value;
        const statusEl = document.getElementById('editStatus');
        statusEl.textContent = '⏳ Збереження...';

        try {
          const res = await fetch(`/api/files/edit/${fileId}`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ userId, username, content: newContent })
          });
          const resData = await res.json();
          if (resData.status === 'ok') {
            statusEl.textContent = 'Збережено!';
            await loadFiles();
          } else {
            statusEl.textContent = `❌ ${resData.message}`;
          }
        } catch (err) {
          statusEl.textContent = '❌ Помилка збереження';
        }

        setTimeout(() => statusEl.textContent = '', 3000);
      });

    } else {
      document.getElementById('editTextarea').value = '';
      content.innerHTML += `<p class="error">Помилка: ${data.message}</p>`;
    }
  } catch (error) {
    console.error('Помилка редагування:', error);
    content.innerHTML = '<p class="error">Помилка завантаження файлу для редагування</p>';
  }
}

// Екранування HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Обробники подій

// Вибір файлу через input
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file); // Завантажуємо будь-що
  }
  e.target.value = ''; // очищаємо input після завантаження
});

// Синхронізація папки
document.getElementById('folderInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const statusEl = document.getElementById('syncStatus');
    statusEl.textContent = '⏳ Завантаження папки...';
    statusEl.className = 'upload-status';

    for (const file of files) {
        await uploadFile(file); // використовує твою існуючу функцію uploadFile
    }

    statusEl.textContent = 'Папку синхронізовано!';
    statusEl.className = 'upload-status success';
    e.target.value = ''; // очищаємо вибір після завантаження
});


// Drag & Drop
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file) {
    const file = e.dataTransfer.files[0];
if (file) {
  uploadFile(file); // Завантажуємо будь-який тип
}
  }
});

// Фільтр файлів
document.querySelectorAll('input[name="fileFilter"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderFiles();
  });
});

// Сортування
document.getElementById('sortOrder').addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderFiles();
});

// Перемикання колонок
document.querySelectorAll('.column-toggle').forEach(checkbox => {
  checkbox.addEventListener('change', updateColumnVisibility);
});

// Модальне вікно
const modal = document.getElementById('previewModal');
const closeBtn = modal.querySelector('.close');

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Вихід
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Помилка виходу:', error);
  }
  
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  window.location.href = '/';
});

// Завантаження файлів при старті
loadFiles();