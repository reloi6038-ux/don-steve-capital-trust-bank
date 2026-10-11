/* =========================================================
   Don Steve Capital Trust Bank — Auth (Login + Register)
   Handles: validation, password strength, show/hide, submit,
            rate-limit aware errors, remember-me hint.
   ========================================================= */
(function () {
  'use strict';

  const API_BASE = '/api';

  /* ---------------------------------------------------------
     Utilities
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;
  const NAME_RE = /^[\p{L}][\p{L}\s'.-]{0,49}$/u;

  function setError(inputId, message) {
    const wrap = document.getElementById(inputId + 'Wrap');
    const errEl = document.getElementById(inputId + 'Error');
    if (wrap) {
      wrap.classList.toggle('is-invalid', Boolean(message));
      wrap.classList.toggle('is-valid', !message && wrap.querySelector('.field__input')?.value);
    }
    if (errEl) {
      errEl.classList.toggle('is-visible', Boolean(message));
      const span = errEl.querySelector('span');
      if (span) span.textContent = message || '';
    }
  }

  function clearError(inputId) {
    setError(inputId, '');
  }

  function showGlobalAlert(message, type = 'error') {
    const alert = $('#globalAlert');
    const msg = $('#globalAlertMsg');
    if (!alert || !msg) return;
    alert.className = `auth-alert auth-alert--${type} is-visible`;
    msg.textContent = message;
  }

  function hideGlobalAlert() {
    const alert = $('#globalAlert');
    if (alert) alert.classList.remove('is-visible');
  }

  function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
  }

  function focusFirstError() {
    const firstInvalid = $('.field__control.is-invalid .field__input');
    if (firstInvalid) firstInvalid.focus();
  }

  /* ---------------------------------------------------------
     Show / hide password toggles
     --------------------------------------------------------- */
  $$('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-pressed', String(!showing));
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');

      const eye = btn.querySelector('.icon-eye');
      const eyeOff = btn.querySelector('.icon-eye-off');
      if (eye) eye.style.display = showing ? '' : 'none';
      if (eyeOff) eyeOff.style.display = showing ? 'none' : '';

      // Keep cursor at end
      const len = input.value.length;
      input.focus();
      try { input.setSelectionRange(len, len); } catch (_) {}
    });
  });

  /* ---------------------------------------------------------
     Password strength (entropy-based)
     --------------------------------------------------------- */
  const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', '12345678', '123456789',
    'qwerty123', 'letmein', 'welcome1', 'admin123', 'iloveyou',
  ]);

  function estimateEntropyBits(pwd) {
    if (!pwd) return 0;
    let pool = 0;
    if (/[a-z]/.test(pwd)) pool += 26;
    if (/[A-Z]/.test(pwd)) pool += 26;
    if (/[0-9]/.test(pwd)) pool += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) pool += 33;
    // Rough entropy estimate
    return Math.round(pwd.length * Math.log2(pool || 1));
  }

  function guessCrackTime(bits) {
    // Assume 10 billion guesses/sec (offline attack on fast hash)
    const guessesPerSec = 1e10;
    const seconds = Math.pow(2, bits - 1) / guessesPerSec;
    if (seconds < 1) return 'Instantly';
    if (seconds < 60) return Math.round(seconds) + ' seconds';
    if (seconds < 3600) return Math.round(seconds / 60) + ' minutes';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hours';
    if (seconds < 2592000) return Math.round(seconds / 86400) + ' days';
    if (seconds < 31536000) return Math.round(seconds / 2592000) + ' months';
    if (seconds < 31536000 * 1000) return Math.round(seconds / 31536000) + ' years';
    return 'Centuries';
  }

  function scorePassword(pwd) {
    if (!pwd) return { score: 0, label: 'Strength', level: 'weak', bits: 0 };

    const lower = pwd.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) {
      return { score: 1, label: 'Very weak — common password', level: 'weak', bits: 10 };
    }

    const bits = estimateEntropyBits(pwd);
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    // Cap at 4 segments
    score = Math.min(4, score);

    const map = {
      1: { label: 'Weak', level: 'weak' },
      2: { label: 'Fair', level: 'fair' },
      3: { label: 'Good', level: 'good' },
      4: { label: 'Strong', level: 'strong' },
    };
    const meta = map[score] || map[1];
    return { score, ...meta, bits };
  }

  function renderStrength(pwd) {
    const wrap = $('#passwordStrength');
    const label = $('.strength__label');
    const crack = $('#crackTime');
    if (!wrap || !label) return;

    if (!pwd) {
      wrap.classList.remove('is-visible');
      label.textContent = 'Strength';
      label.removeAttribute('data-level');
      if (crack) crack.textContent = '';
      return;
    }

    wrap.classList.add('is-visible');
    const { score, label: text, level, bits } = scorePassword(pwd);

    label.textContent = text;
    label.setAttribute('data-level', level);

    const segs = $$('.strength__seg');
    segs.forEach((seg, i) => {
      seg.className = 'strength__seg';
      if (i < score) seg.classList.add(`is-active-${level}`);
    });

    if (crack) crack.textContent = bits >= 128 ? 'Very strong' : guessCrackTime(bits) + ' to crack';
  }

  /* ---------------------------------------------------------
     Field-level validators
     --------------------------------------------------------- */
  function validateName(id, humanLabel) {
    const el = document.getElementById(id);
    if (!el) return true;
    const v = el.value.trim();
    if (!v) { setError(id, `${humanLabel} is required`); return false; }
    if (v.length < 2) { setError(id, `${humanLabel} must be at least 2 characters`); return false; }
    if (!NAME_RE.test(v)) {
      setError(id, `${humanLabel} may only contain letters, spaces, hyphens, and apostrophes`);
      return false;
    }
    clearError(id);
    return true;
  }

  function validateEmail(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    const v = el.value.trim();
    if (!v) { setError(id, 'Email is required'); return false; }
    if (!EMAIL_RE.test(v)) { setError(id, 'Please enter a valid email address'); return false; }
    clearError(id);
    return true;
  }

  function validatePhone(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    const v = el.value.trim();
    if (!v) { setError(id, 'Phone number is required'); return false; }
    // Count digits (must be 7–15 per E.164)
    const digits = v.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setError(id, 'Phone number must contain 7 to 15 digits');
      return false;
    }
    if (!PHONE_RE.test(v)) { setError(id, 'Please enter a valid phone number'); return false; }
    clearError(id);
    return true;
  }

  function validatePassword(id, humanLabel = 'Password') {
    const el = document.getElementById(id);
    if (!el) return true;
    const v = el.value;
    if (!v) { setError(id, `${humanLabel} is required`); return false; }
    if (v.length < 8) { setError(id, `${humanLabel} must be at least 8 characters`); return false; }
    if (v.length > 128) { setError(id, `${humanLabel} is too long (max 128 characters)`); return false; }
    if (COMMON_PASSWORDS.has(v.toLowerCase())) {
      setError(id, 'That password is too common — please choose another');
      return false;
    }
    const { level } = scorePassword(v);
    if (level === 'weak' && v.length < 10) {
      setError(id, 'Password is too weak. Add uppercase, numbers, or symbols.');
      return false;
    }
    clearError(id);
    return true;
  }

  function validateConfirm(confirmId, pwdId) {
    const el = document.getElementById(confirmId);
    const pwd = document.getElementById(pwdId);
    if (!el || !pwd) return true;
    if (!el.value) { setError(confirmId, 'Please confirm your password'); return false; }
    if (el.value !== pwd.value) { setError(confirmId, 'Passwords do not match'); return false; }
    clearError(confirmId);
    return true;
  }

  /* ---------------------------------------------------------
     Live validation binding
     --------------------------------------------------------- */
  function bindLiveValidation(map) {
    Object.entries(map).forEach(([id, validator]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', () => validator());
      el.addEventListener('input', () => {
        // Only clear errors on input; revalidate on blur to avoid nagging
        const wrap = document.getElementById(id + 'Wrap');
        if (wrap && wrap.classList.contains('is-invalid')) {
          validator();
        }
      });
    });
  }

  /* ---------------------------------------------------------
     API helpers
     --------------------------------------------------------- */
  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function mapServerError(err) {
    // express-validator returns { errors: [{ param, msg, path }] }
    if (err.data && Array.isArray(err.data.errors)) {
      const first = err.data.errors[0];
      const field = first.path || first.param || '';
      const msg = first.msg || 'Invalid input';
      if (field && document.getElementById(field + 'Wrap')) {
        setError(field, msg);
        const el = document.getElementById(field);
        if (el) el.focus();
        return msg;
      }
      return msg;
    }
    return err.message || 'Something went wrong. Please try again.';
  }

  /* ---------------------------------------------------------
     LOGIN PAGE
     --------------------------------------------------------- */
  const loginForm = $('#loginForm');
  if (loginForm) {
    const emailEl = $('#loginEmail');
    const pwdEl = $('#loginPassword');

    // Restore remembered email
    try {
      const remembered = localStorage.getItem('dsctb_remember_email');
      if (remembered && emailEl) emailEl.value = remembered;
      if (remembered) {
        const cb = $('#rememberMe');
        if (cb) cb.checked = true;
      }
    } catch (_) {}

    bindLiveValidation({
      loginEmail: () => validateEmail('loginEmail'),
      loginPassword: () => {
        const v = pwdEl.value;
        if (!v) { setError('loginPassword', 'Password is required'); return false; }
        clearError('loginPassword');
        return true;
      },
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideGlobalAlert();

      const okEmail = validateEmail('loginEmail');
      const v = pwdEl.value;
      let okPwd = true;
      if (!v) { setError('loginPassword', 'Password is required'); okPwd = false; }
      else clearError('loginPassword');

      if (!okEmail || !okPwd) { focusFirstError(); return; }

      const btn = $('#loginSubmit');
      setLoading(btn, true);

      try {
        await apiPost('/auth/login', {
          email: emailEl.value.trim(),
          password: v,
        });

        // Remember email if requested
        try {
          if ($('#rememberMe')?.checked) {
            localStorage.setItem('dsctb_remember_email', emailEl.value.trim());
          } else {
            localStorage.removeItem('dsctb_remember_email');
          }
        } catch (_) {}

        showGlobalAlert('Sign in successful — redirecting…', 'success');
        setTimeout(() => { window.location.href = '/dashboard.html'; }, 500);
      } catch (err) {
        const msg =
          err.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : mapServerError(err);
        showGlobalAlert(msg, 'error');
        setLoading(btn, false);
        focusFirstError();
      }
    });
  }

  /* ---------------------------------------------------------
     REGISTER PAGE
     --------------------------------------------------------- */
  const registerForm = $('#registerForm');
  if (registerForm) {
    const pwdEl = $('#password');
    const confirmEl = $('#confirmPassword');

    if (pwdEl) {
      pwdEl.addEventListener('input', () => renderStrength(pwdEl.value));
      pwdEl.addEventListener('focus', () => renderStrength(pwdEl.value));
    }

    bindLiveValidation({
      firstName: () => validateName('firstName', 'First name'),
      lastName: () => validateName('lastName', 'Last name'),
      email: () => validateEmail('email'),
      phone: () => validatePhone('phone'),
      password: () => validatePassword('password', 'Password'),
      confirmPassword: () => validateConfirm('confirmPassword', 'password'),
    });

    // Live confirm check as user types
    if (confirmEl) {
      confirmEl.addEventListener('input', () => {
        const wrap = document.getElementById('confirmPasswordWrap');
        if (wrap && wrap.classList.contains('is-invalid')) {
          validateConfirm('confirmPassword', 'password');
        }
      });
    }

    // Terms checkbox live clear
    const terms = $('#acceptTerms');
    if (terms) {
      terms.addEventListener('change', () => {
        if (terms.checked) {
          const errEl = $('#termsError');
          if (errEl) errEl.classList.remove('is-visible');
        }
      });
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideGlobalAlert();

      const checks = [
        validateName('firstName', 'First name'),
        validateName('lastName', 'Last name'),
        validateEmail('email'),
        validatePhone('phone'),
        validatePassword('password', 'Password'),
        validateConfirm('confirmPassword', 'password'),
      ];
      const termsOk = terms?.checked;
      if (!termsOk) {
        const errEl = $('#termsError');
        if (errEl) {
          errEl.classList.add('is-visible');
          const span = errEl.querySelector('span');
          if (span) span.textContent = 'You must accept the terms to continue';
        }
      }

      if (!checks.every(Boolean) || !termsOk) { focusFirstError(); return; }

      const btn = $('#registerSubmit');
      setLoading(btn, true);

      try {
        await apiPost('/auth/register', {
          firstName: $('#firstName').value.trim(),
          lastName: $('#lastName').value.trim(),
          email: $('#email').value.trim(),
          phone: $('#phone').value.trim(),
          password: pwdEl.value,
          accountType: $('#accountType').value,
        });

        showGlobalAlert('Account created! Redirecting to your dashboard…', 'success');
        setTimeout(() => { window.location.href = '/dashboard.html'; }, 800);
      } catch (err) {
        const msg =
          err.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : mapServerError(err);
        showGlobalAlert(msg, 'error');
        setLoading(btn, false);
        focusFirstError();
      }
    });
  }
})();