// Theme toggle logic
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.body.classList.toggle('night-mode', theme === 'dark');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? 'Day Mode' : 'Night Mode';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem('taskAppTheme') || 'light';
  applyTheme(savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('night-mode') ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('taskAppTheme', nextTheme);
    applyTheme(nextTheme);
  });
}

loadTheme();

function getAuthToken() {
  return localStorage.getItem('taskAppAuthToken') || '';
}

function getStoredUser() {
  const rawUser = localStorage.getItem('taskAppUser');
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
}

function setAuthenticatedSession(user, token) {
  localStorage.setItem('taskAppAuthToken', token);
  localStorage.setItem('taskAppUser', JSON.stringify(user));
  localStorage.setItem('taskAppLoggedIn', 'true');
  if (user?.name) {
    localStorage.setItem('taskAppUserName', user.name);
  }
}

function clearAuthenticatedSession() {
  localStorage.removeItem('taskAppAuthToken');
  localStorage.removeItem('taskAppUser');
  localStorage.removeItem('taskAppLoggedIn');
  localStorage.removeItem('taskAppUserName');
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem('taskAppLocalUsers') || '[]');
  } catch (error) {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem('taskAppLocalUsers', JSON.stringify(users));
}

function findLocalUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return getLocalUsers().find((user) => user.email === normalizedEmail) || null;
}

function saveLocalUser(user) {
  const users = getLocalUsers();
  const normalizedUser = {
    name: String(user.name || '').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    password: String(user.password || ''),
    resetToken: user.resetToken || '',
    resetTokenExpiresAt: user.resetTokenExpiresAt || ''
  };

  const index = users.findIndex((entry) => entry.email === normalizedUser.email);
  if (index >= 0) {
    users[index] = normalizedUser;
  } else {
    users.push(normalizedUser);
  }

  saveLocalUsers(users);
  return normalizedUser;
}

function createLocalResetToken(email) {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const users = getLocalUsers();
  const index = users.findIndex((user) => user.email === String(email || '').trim().toLowerCase());

  if (index >= 0) {
    users[index].resetToken = token;
    users[index].resetTokenExpiresAt = String(Date.now() + 1000 * 60 * 30);
    saveLocalUsers(users);
  }

  return token;
}

function resetLocalPassword(token, password) {
  const users = getLocalUsers();
  const index = users.findIndex((user) => user.resetToken === token && Number(user.resetTokenExpiresAt || 0) > Date.now());

  if (index < 0) {
    return false;
  }

  users[index].password = password;
  users[index].resetToken = '';
  users[index].resetTokenExpiresAt = '';
  saveLocalUsers(users);
  return true;
}

function isUserLoggedIn() {
  return Boolean(getAuthToken());
}

function enforceAuthIfRequired() {
  const requiresAuth = document.body && document.body.dataset.requireAuth === 'true';
  if (!requiresAuth) {
    return;
  }

  if (!isUserLoggedIn()) {
    window.location.href = 'login.html';
  }
}

enforceAuthIfRequired();

// Shared utility to show feedback messages
function showMessage(text, isError = false) {
  const messageElement = document.getElementById('message');
  if (!messageElement) return;
  messageElement.textContent = text;
  messageElement.style.color = isError ? '#f87171' : '#22c55e';
}

const RESET_FLOW_EMAIL_KEY = 'taskAppForgotPasswordEmail';
const RESET_FLOW_SESSION_KEY = 'taskAppResetSessionToken';
const RESET_FLOW_COOLDOWN_KEY = 'taskAppResetOtpCooldownUntil';

function getSubmitButton(form) {
  return form?.querySelector('button[type="submit"]') || null;
}

function setFormLoading(form, isLoading) {
  const button = getSubmitButton(form);
  if (!button) {
    return;
  }

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  if (!button.dataset.loadingText) {
    button.dataset.loadingText = 'Please wait...';
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? button.dataset.loadingText : button.dataset.defaultText;
  button.classList.toggle('is-loading', isLoading);
}

function storeResetEmail(email) {
  localStorage.setItem(RESET_FLOW_EMAIL_KEY, String(email || '').trim().toLowerCase());
}

function getStoredResetEmail() {
  return localStorage.getItem(RESET_FLOW_EMAIL_KEY) || '';
}

function storeResetSessionToken(token) {
  localStorage.setItem(RESET_FLOW_SESSION_KEY, String(token || '').trim());
}

function getStoredResetSessionToken() {
  return localStorage.getItem(RESET_FLOW_SESSION_KEY) || '';
}

function clearResetFlowState() {
  localStorage.removeItem(RESET_FLOW_EMAIL_KEY);
  localStorage.removeItem(RESET_FLOW_SESSION_KEY);
  localStorage.removeItem(RESET_FLOW_COOLDOWN_KEY);
}

// Add page logic
const taskForm = document.getElementById('taskForm');
if (taskForm) {
  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const due_date = document.getElementById('due_date').value;
    const status = document.getElementById('status').value;
    const pdfFile = document.getElementById('pdf_file')?.files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('due_date', due_date);
    formData.append('status', status);
    if (pdfFile) {
      formData.append('pdf_file', pdfFile);
    }

    try {
      const response = await fetch('/tasks', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save task');
      }

      showMessage('Task created successfully!');
      taskForm.reset();
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

function wireAuthForm(formId, successMessage, redirectTo) {
  const form = document.getElementById(formId);
  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('message');

    return formId === 'loginForm'
      ? handleLogin(form, message, successMessage, redirectTo)
      : formId === 'signupForm'
        ? handleSignup(form, message, successMessage, redirectTo)
        : formId === 'forgotPasswordForm'
          ? handleForgotPassword(form, message, successMessage, redirectTo)
          : formId === 'verifyOtpForm'
            ? handleVerifyOtp(form, message, successMessage, redirectTo)
            : formId === 'resetPasswordForm'
              ? handleResetPassword(form, message, successMessage, redirectTo)
              : Promise.resolve();
  });
}

async function handleLogin(form, message, successMessage, redirectTo) {
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value || '';

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (message) {
        message.textContent = payload.error || 'Login failed';
        message.style.color = '#f87171';
      }
      return;
    }

    setAuthenticatedSession(payload.user, payload.token);
    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    if (redirectTo) {
      window.setTimeout(() => {
        window.location.href = redirectTo;
      }, 700);
    }
  } catch (error) {
    const localUser = findLocalUserByEmail(email);
    if (localUser && localUser.password === password) {
      setAuthenticatedSession({ name: localUser.name, email: localUser.email }, 'local-session');
      if (message) {
        message.textContent = successMessage;
        message.style.color = '#2563eb';
      }

      if (redirectTo) {
        window.setTimeout(() => {
          window.location.href = redirectTo;
        }, 700);
      }
      return;
    }

    if (message) {
      message.textContent = error.message;
      message.style.color = '#f87171';
    }
  }
}

async function handleSignup(form, message, successMessage, redirectTo) {
  const name = document.getElementById('signupName')?.value.trim();
  const email = document.getElementById('signupEmail')?.value.trim();
  const password = document.getElementById('signupPassword')?.value || '';
  const confirmPassword = document.getElementById('signupConfirm')?.value || '';

  if (password !== confirmPassword) {
    if (message) {
      message.textContent = 'Passwords do not match.';
      message.style.color = '#f87171';
    }
    return;
  }

  try {
    const response = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (message) {
        message.textContent = payload.error || 'Signup failed';
        message.style.color = '#f87171';
      }
      return;
    }

    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    if (redirectTo) {
      window.setTimeout(() => {
        window.location.href = redirectTo;
      }, 700);
    }
  } catch (error) {
    saveLocalUser({ name, email, password });
    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    if (redirectTo) {
      window.setTimeout(() => {
        window.location.href = redirectTo;
      }, 700);
    }
  }
}

async function handleForgotPassword(form, message, successMessage, redirectTo) {
  const email = document.getElementById('resetEmail')?.value.trim();

  if (!email) {
    if (message) {
      message.textContent = 'Enter the email address associated with your account.';
      message.style.color = '#f87171';
    }
    return;
  }

  setFormLoading(form, true);

  try {
    const response = await fetch('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (message) {
        message.textContent = payload.error || 'Password reset request failed';
        message.style.color = '#f87171';
      }
      return;
    }

    storeResetEmail(email);
    localStorage.setItem(RESET_FLOW_COOLDOWN_KEY, String(Date.now() + Number(payload.cooldownSeconds || 60) * 1000));

    const targetUrl = payload.nextStep || payload.resetUrl || redirectTo;
    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    if (targetUrl) {
      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 700);
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message || 'Unable to request OTP right now.';
      message.style.color = '#f87171';
    }
  } finally {
    setFormLoading(form, false);
  }
}

async function handleVerifyOtp(form, message, successMessage, redirectTo) {
  const email = document.getElementById('verifyEmail')?.value.trim() || getStoredResetEmail();
  const otp = document.getElementById('verifyOtp')?.value.trim();

  if (!email || !otp) {
    if (message) {
      message.textContent = 'Enter your email address and the 6-digit OTP.';
      message.style.color = '#f87171';
    }
    return;
  }

  setFormLoading(form, true);

  try {
    const response = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (message) {
        message.textContent = payload.error || 'OTP verification failed';
        message.style.color = '#f87171';
      }
      return;
    }

    storeResetEmail(email);
    storeResetSessionToken(payload.resetSessionToken || '');

    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    const targetUrl = payload.nextStep || redirectTo;
    if (targetUrl) {
      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 700);
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message || 'Unable to verify OTP right now.';
      message.style.color = '#f87171';
    }
  } finally {
    setFormLoading(form, false);
  }
}

async function handleResetPassword(form, message, successMessage, redirectTo) {
  const sessionToken = getStoredResetSessionToken() || new URLSearchParams(window.location.search).get('session') || '';
  const password = document.getElementById('newPassword')?.value || '';
  const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';

  if (!sessionToken) {
    if (message) {
      message.textContent = 'Your reset session is missing. Request a new OTP.';
      message.style.color = '#f87171';
    }
    return;
  }

  if (password !== confirmPassword) {
    if (message) {
      message.textContent = 'Passwords do not match.';
      message.style.color = '#f87171';
    }
    return;
  }

  if (password.length < 8) {
    if (message) {
      message.textContent = 'Use at least 8 characters for your new password.';
      message.style.color = '#f87171';
    }
    return;
  }

  setFormLoading(form, true);

  try {
    const response = await fetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, password, confirmPassword })
    });

    const payload = await response.json();
    if (!response.ok) {
      if (message) {
        message.textContent = payload.error || 'Password reset failed';
        message.style.color = '#f87171';
      }
      return;
    }

    clearResetFlowState();

    if (message) {
      message.textContent = successMessage;
      message.style.color = '#2563eb';
    }

    const targetUrl = payload.nextStep || redirectTo;
    if (targetUrl) {
      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 900);
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message || 'Unable to reset your password right now.';
      message.style.color = '#f87171';
    }
  } finally {
    setFormLoading(form, false);
  }
}

wireAuthForm('loginForm', 'Login successful. Redirecting to your dashboard...', 'dashboard.html');
wireAuthForm('signupForm', 'Account created. Redirecting to login...', 'login.html');
wireAuthForm('forgotPasswordForm', 'OTP sent. Redirecting to verification...', 'verify-otp.html');
wireAuthForm('verifyOtpForm', 'OTP verified. Redirecting to password reset...', 'reset-password.html');
wireAuthForm('resetPasswordForm', 'Password updated. Redirecting to login...', 'login.html');

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    clearAuthenticatedSession();
    window.location.href = 'login.html';
  });
}

// View page logic
const tasksTable = document.getElementById('tasksTable');
const searchInput = document.getElementById('searchInput');

async function fetchTasks(query = '') {
  const url = `/tasks${query ? `?search=${encodeURIComponent(query)}` : ''}`;
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load tasks');
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUploadPath(url) {
  return /^\/uploads\/[A-Za-z0-9._-]+$/.test(String(url || ''));
}

function renderTasks(tasks) {
  if (!tasksTable) return;

  if (!Array.isArray(tasks)) {
    tasksTable.innerHTML = '<tr><td colspan="6">Unable to display tasks right now.</td></tr>';
    return;
  }

  const rows = tasks.map((task, index) => {
    const normalizedStatus = task.status === 'Completed' ? 'Completed' : 'Pending';
    const statusClass = normalizedStatus === 'Completed' ? 'status-completed' : 'status-pending';
    const safeTaskId = encodeURIComponent(String(task.id || ''));
    const safeTitle = escapeHtml(task.title || '');
    const safeDescription = escapeHtml(task.description || '');
    const safeDueDate = escapeHtml(task.due_date || '');
    const safeStatus = escapeHtml(normalizedStatus);
    const safePdfPath = isSafeUploadPath(task.pdf_url) ? task.pdf_url : '';
    const pdfLink = safePdfPath
      ? `<a href="${safePdfPath}" target="_blank" rel="noopener noreferrer" class="pdf-link">View PDF</a>`
      : '-';
    
    return `
      <tr>
        <td><strong>Task ${tasks.length - index}</strong></td>
        <td>${safeTitle}</td>
        <td>${safeDescription}</td>
        <td>${safeDueDate}</td>
        <td>${pdfLink}</td>
        <td><span class="${statusClass}">${safeStatus}</span></td>
        <td class="action-buttons">
          <a href="edit.html?id=${safeTaskId}">Edit</a>
          <button type="button" class="delete-task-btn" data-task-id="${safeTaskId}">Delete</button>
          <button
            type="button"
            class="${normalizedStatus === 'Completed' ? 'pending-btn' : 'complete-btn'} toggle-status-btn"
            data-task-id="${safeTaskId}"
            data-task-status="${normalizedStatus}"
          >
            ${normalizedStatus === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tasksTable.innerHTML = rows || '<tr><td colspan="6">No tasks found.</td></tr>';

  tasksTable.querySelectorAll('.delete-task-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = decodeURIComponent(button.dataset.taskId || '');
      if (id) {
        window.deleteTask(id);
      }
    });
  });

  tasksTable.querySelectorAll('.toggle-status-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = decodeURIComponent(button.dataset.taskId || '');
      const currentStatus = button.dataset.taskStatus || 'Pending';
      if (id) {
        window.toggleStatus(id, currentStatus);
      }
    });
  });
}

async function loadTasks() {
  const messageElement = document.getElementById('message');
  try {
    const query = searchInput ? searchInput.value.trim() : '';
    const tasks = await fetchTasks(query);
    if (messageElement) {
      messageElement.textContent = '';
    }
    renderTasks(tasks);
  } catch (error) {
    if (messageElement) {
      messageElement.textContent = error.message;
      messageElement.style.color = '#ef4444';
    }
    console.error('Failed to load tasks:', error);
    if (tasksTable) {
      tasksTable.innerHTML = '<tr><td colspan="6">Unable to load tasks. Check your database connection.</td></tr>';
    }
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => loadTasks());
}

window.deleteTask = async function (id) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }

  try {
    const response = await fetch(`/tasks/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
    loadTasks();
  } catch (error) {
    alert(error.message);
  }
};

window.toggleStatus = async function (id, currentStatus) {
  const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

  try {
    const taskResponse = await fetch(`/tasks/${id}`);
    if (!taskResponse.ok) {
      throw new Error('Failed to fetch task details');
    }

    const task = await taskResponse.json();
    const response = await fetch(`/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        status: newStatus
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    loadTasks();
  } catch (error) {
    alert(error.message);
  }
};

// Edit page logic
const editForm = document.getElementById('editForm');
if (editForm) {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');

  if (taskId) {
    fetch(`/tasks/${taskId}`)
      .then(res => res.json())
      .then(task => {
        document.getElementById('taskId').value = task.id;
        document.getElementById('editTitle').value = task.title;
        document.getElementById('editDescription').value = task.description;
        document.getElementById('editDueDate').value = task.due_date;
        document.getElementById('editStatus').value = task.status;
      })
      .catch(error => showMessage('Unable to load task details.', true));
  }

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('taskId').value;
    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const due_date = document.getElementById('editDueDate').value;
    const status = document.getElementById('editStatus').value;
    const pdfFile = document.getElementById('editPdfFile')?.files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('due_date', due_date);
    formData.append('status', status);
    if (pdfFile) {
      formData.append('pdf_file', pdfFile);
    }

    try {
      const response = await fetch(`/tasks/${id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      showMessage('Task updated successfully!');
    } catch (error) {
      showMessage(error.message, true);
    }
  });
}

// Load tasks for view page if the table exists
if (tasksTable) {
  loadTasks();
}

async function loadDashboardStats() {
  const totalTasksElement = document.getElementById('totalTasks');
  const pendingTasksElement = document.getElementById('pendingTasks');
  const completedTasksElement = document.getElementById('completedTasks');
  const dashboardMessage = document.getElementById('dashboardMessage');
  const dashboardUser = document.getElementById('dashboardUser');

  if (!totalTasksElement || !pendingTasksElement || !completedTasksElement) {
    return;
  }

  const userName = localStorage.getItem('taskAppUserName') || 'Student';
  const user = getStoredUser();
  const resolvedName = user?.name || userName;
  if (dashboardUser) {
    dashboardUser.textContent = resolvedName;
  }

  try {
    const tasks = await fetchTasks('');
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'Completed').length;
    const pending = total - completed;

    totalTasksElement.textContent = String(total);
    pendingTasksElement.textContent = String(pending);
    completedTasksElement.textContent = String(completed);

    if (dashboardMessage) {
      dashboardMessage.textContent = 'Your tracker is up to date.';
      dashboardMessage.style.color = '#16a34a';
    }
  } catch (error) {
    if (dashboardMessage) {
      dashboardMessage.textContent = 'Unable to load live stats right now. Open View Tasks to check details.';
      dashboardMessage.style.color = '#dc2626';
    }
  }
}

const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  const storedEmail = getStoredResetEmail();
  const emailField = document.getElementById('resetPasswordEmail');
  if (emailField && storedEmail) {
    emailField.value = storedEmail;
  }
}

const verifyEmailField = document.getElementById('verifyEmail');
if (verifyEmailField) {
  const storedEmail = getStoredResetEmail();
  if (storedEmail) {
    verifyEmailField.value = storedEmail;
  }
}

loadDashboardStats();

// Ninja Stealth Trick to hide password fields from static bots
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.stealth-pwd').forEach(el => {
    // Keep it as text in the raw HTML, switch it to password only on user interaction
    el.addEventListener('focus', () => el.setAttribute('type', 'password'));
    el.addEventListener('input', () => el.setAttribute('type', 'password'));
  });
});
