// Shared helpers
const API = '/api';

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(API + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  el.textContent = message;
  el.className = `alert ${type} show`;
  setTimeout(() => el.classList.remove('show'), 5000);
}

function formatCurrency(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

function formatDate(d) {
  return new Date(d).toLocaleString();
}

async function getCurrentUser() {
  try {
    const data = await apiFetch('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// Update navbar auth section on public pages
document.addEventListener('DOMContentLoaded', async () => {
  const authLink = document.getElementById('nav-auth');
  if (!authLink) return;
  const user = await getCurrentUser();
  if (user) {
    authLink.innerHTML = `<a href="/dashboard.html">Dashboard</a> <a href="#" id="logoutBtn">Logout</a>`;
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});