// Перемикання між формами входу та реєстрації
document.getElementById('showRegister')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginForm').classList.remove('active');
  document.getElementById('registerForm').classList.add('active');
  clearMessages();
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerForm').classList.remove('active');
  document.getElementById('loginForm').classList.add('active');
  clearMessages();
});

// Очищення повідомлень
function clearMessages() {
  document.getElementById('loginMessage').textContent = '';
  document.getElementById('registerMessage').textContent = '';
}

// Показ повідомлення
function showMessage(elementId, message, isError = false) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.className = isError ? 'message error' : 'message success';
}

// Обробка форми входу
document.getElementById('login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showMessage('loginMessage', 'Заповніть всі поля', true);
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.status === 'ok') {
      // Зберігаємо дані користувача
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);
      localStorage.setItem('token', data.token);

      showMessage('loginMessage', 'Вхід успішний! Перенаправлення...', false);
      
      // Перенаправлення на drive
      setTimeout(() => {
        window.location.href = '/drive';
      }, 1000);
    } else {
      showMessage('loginMessage', data.message || 'Помилка входу', true);
    }
  } catch (error) {
    console.error('Помилка входу:', error);
    showMessage('loginMessage', 'Помилка з\'єднання з сервером', true);
  }
});

// Обробка форми реєстрації
document.getElementById('register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

  if (!username || !password || !passwordConfirm) {
    showMessage('registerMessage', 'Заповніть всі поля', true);
    return;
  }

  if (password.length < 4) {
    showMessage('registerMessage', 'Пароль повинен містити мінімум 4 символи', true);
    return;
  }

  if (password !== passwordConfirm) {
    showMessage('registerMessage', 'Паролі не співпадають', true);
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.status === 'ok') {
      showMessage('registerMessage', 'Реєстрація успішна! Тепер можете увійти', false);
      
      // Очищення форми та перемикання на вхід
      document.getElementById('register').reset();
      setTimeout(() => {
        document.getElementById('registerForm').classList.remove('active');
        document.getElementById('loginForm').classList.add('active');
        clearMessages();
      }, 2000);
    } else {
      showMessage('registerMessage', data.message || 'Помилка реєстрації', true);
    }
  } catch (error) {
    console.error('Помилка реєстрації:', error);
    showMessage('registerMessage', 'Помилка з\'єднання з сервером', true);
  }
});