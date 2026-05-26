const BACKEND_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
  ? 'http://localhost:3000'
  : 'https://complaints-registration-platform-full-aohd.onrender.com';
const API_BASE = `${BACKEND_BASE_URL}/api`;
let currentUser = null;

// State for registration flow
let regEmail = '';
let complaintTextTemp = '';
let aiQuestionTemp = '';

// UI Utilities
const showToast = (msg, type = 'error') => {
  const toastId = type === 'error' ? 'error-toast' : 'success-toast';
  const toast = document.getElementById(toastId);
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
};

const updateNav = () => {
  const navLinks = document.getElementById('navLinks');
  if (!currentUser) {
    navLinks.innerHTML = `
      <a href="#" onclick="router('login'); return false;">Login</a>
      <a href="#" onclick="router('register'); return false;">Register</a>
    `;
  } else {
    if (currentUser.role === 'admin') {
      navLinks.innerHTML = `
        <a href="#" onclick="router('admin-dashboard'); return false;">Dashboard</a>
        <button onclick="logout()">Logout</button>
      `;
    } else {
      navLinks.innerHTML = `
        <a href="#" onclick="router('my-complaints'); return false;">My Complaints</a>
        <a href="#" onclick="router('submit-complaint'); return false;">Submit</a>
        <button onclick="logout()">Logout</button>
      `;
    }
  }
};

// API calls
const apiFetch = async (endpoint, options = {}) => {
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
};

// Auth Actions
const checkSession = async () => {
  try {
    currentUser = await apiFetch('/auth/me');
  } catch (err) {
    currentUser = null;
  }
  updateNav();
};

const logout = async () => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
    currentUser = null;
    localStorage.removeItem('token');
    router('login');
  } catch (err) {
    showToast(err.message);
  }
};

// Router
const router = async (route) => {
  const content = document.getElementById('content');
  content.innerHTML = '';

  if (route !== 'login' && route !== 'register') {
    if (!currentUser) {
      await checkSession();
    }
    if (!currentUser) return router('login');
  }

  const tpl = document.getElementById(`tpl-${route}`);
  if (tpl) {
    content.appendChild(tpl.content.cloneNode(true));
    attachListeners(route);
  }

  // Fetch data if needed
  if (route === 'my-complaints') fetchMyComplaints();
  if (route === 'admin-dashboard') fetchAdminComplaints();
};

const attachListeners = (route) => {
  if (route === 'register') {
    document.getElementById('btn-send-otp').addEventListener('click', async () => {
      const email = document.getElementById('reg-email').value;
      if (!email) return showToast('Please enter your email first.');

      const btn = document.getElementById('btn-send-otp');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      try {
        await apiFetch('/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        showToast('OTP sent to your email!', 'success');
        document.getElementById('otp-group').classList.remove('hidden');
        document.getElementById('reg-otp').setAttribute('required', 'true');
      } catch (err) {
        showToast(err.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });

    document.getElementById('btn-verify-otp').addEventListener('click', async () => {
      const email = document.getElementById('reg-email').value;
      const otp = document.getElementById('reg-otp').value;
      if (!email) return showToast('Please enter your email.');
      if (!otp) return showToast('Please enter the OTP.');

      const btn = document.getElementById('btn-verify-otp');
      const originalText = btn.textContent;
      btn.textContent = 'Verifying...';
      btn.disabled = true;

      try {
        await apiFetch('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email, otp })
        });
        showToast('OTP verified successfully!', 'success');
        
        // Hide/Disable OTP elements
        btn.textContent = 'Verified!';
        btn.disabled = true;
        document.getElementById('reg-otp').disabled = true;
        document.getElementById('reg-email').disabled = true;
        document.getElementById('reg-name').disabled = true;
        document.getElementById('btn-send-otp').disabled = true;

        // Show password fields and Register button
        document.getElementById('password-group').classList.remove('hidden');
        document.getElementById('confirm-password-group').classList.remove('hidden');
        document.getElementById('btn-register').classList.remove('hidden');
        
        document.getElementById('reg-password').setAttribute('required', 'true');
        document.getElementById('reg-confirm-password').setAttribute('required', 'true');
      } catch (err) {
        showToast(err.message);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });

    document.getElementById('form-register').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const otp = document.getElementById('reg-otp').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (password !== confirmPassword) {
        return showToast('Passwords do not match');
      }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.textContent = 'Registering...';
      btn.disabled = true;

      try {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, otp, password, confirmPassword })
        });
        showToast('Registration successful!', 'success');
        router('login');
      } catch (err) {
        showToast(err.message);
        btn.textContent = 'Register';
        btn.disabled = false;
      }
    });
  }

  if (route === 'login') {
    const loginForm = document.getElementById('form-login');
    console.log('Attaching login listener to:', loginForm);
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      console.log('Attempting login for:', email);

      const btn = e.target.querySelector('button');
      btn.textContent = 'Logging in...';
      btn.disabled = true;

      try {
        currentUser = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        console.log('Login success:', currentUser);
        if (currentUser.token) {
          localStorage.setItem('token', currentUser.token);
        }
        showToast(`Welcome, ${currentUser.name}!`, 'success');
        updateNav();
        router(currentUser.role === 'admin' ? 'admin-dashboard' : 'my-complaints');
      } catch (err) {
        console.error('Login error:', err);
        showToast(err.message);
        btn.textContent = 'Log In';
        btn.disabled = false;
      }
    });
  }

  if (route === 'submit-complaint') {
    document.getElementById('btn-get-ai').addEventListener('click', async () => {
      complaintTextTemp = document.getElementById('complaint-text').value;
      if (!complaintTextTemp.trim()) return showToast('Please write your complaint first.');

      const btn = document.getElementById('btn-get-ai');
      btn.textContent = 'Analyzing...';
      btn.disabled = true;

      try {
        const res = await apiFetch('/ai/question', {
          method: 'POST',
          body: JSON.stringify({ complaint_text: complaintTextTemp })
        });
        aiQuestionTemp = res.ai_question;
        document.getElementById('ai-question-text').textContent = aiQuestionTemp;

        document.getElementById('step-complaint').classList.add('hidden');
        document.getElementById('step-ai').classList.remove('hidden');
      } catch (err) {
        showToast(err.message);
        btn.innerHTML = '<span class="sparkle">✨</span> Get AI Follow-up';
        btn.disabled = false;
      }
    });

    document.getElementById('btn-submit-final').addEventListener('click', async () => {
      const userAnswer = document.getElementById('user-answer').value;
      if (!userAnswer.trim()) return showToast('Please answer the follow-up question.');

      const btn = document.getElementById('btn-submit-final');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      try {
        await apiFetch('/complaints', {
          method: 'POST',
          body: JSON.stringify({
            complaint_text: complaintTextTemp,
            ai_question: aiQuestionTemp,
            user_answer: userAnswer
          })
        });
        showToast('Complaint submitted successfully!', 'success');
        router('my-complaints');
      } catch (err) {
        showToast(err.message);
        btn.textContent = 'Submit Complaint';
        btn.disabled = false;
      }
    });
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const fetchMyComplaints = async () => {
  const container = document.getElementById('complaints-list');
  container.innerHTML = '<p>Loading complaints...</p>';
  try {
    const complaints = await apiFetch('/complaints/my');
    if (complaints.length === 0) {
      container.innerHTML = '<p class="text-muted">You have not submitted any complaints yet.</p>';
      return;
    }

    container.innerHTML = complaints.map(c => `
      <div class="complaint-card">
        <div class="c-meta">
          <span>Submitted on</span>
          <span>${formatDate(c.created_at)}</span>
        </div>
        <div class="c-section">
          <h4>Original Complaint</h4>
          <p>${c.complaint_text}</p>
        </div>
        <div class="ai-q">
          <span style="font-size:0.8rem;color:#8b5cf6;text-transform:uppercase;font-weight:600">AI Follow-up</span>
          <p style="margin-top:4px">${c.ai_question}</p>
        </div>
        <div class="c-section">
          <h4>Your Answer</h4>
          <p>${c.user_answer}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">Error loading complaints</p>`;
  }
};

const fetchAdminComplaints = async () => {
  const container = document.getElementById('admin-complaints-list');
  container.innerHTML = '<p>Loading complaints...</p>';
  try {
    const complaints = await apiFetch('/admin/complaints');
    if (complaints.length === 0) {
      container.innerHTML = '<p class="text-muted">No complaints found.</p>';
      return;
    }

    container.innerHTML = complaints.map(c => `
      <div class="complaint-card">
        <div class="c-meta" style="flex-direction:column;gap:4px;">
          <span class="c-user">${c.name} (${c.email})</span>
          <span>${formatDate(c.created_at)}</span>
        </div>
        <div class="c-section">
          <h4>Complaint</h4>
          <p>${c.complaint_text}</p>
        </div>
        <div class="ai-q">
          <span style="font-size:0.8rem;color:#8b5cf6;text-transform:uppercase;font-weight:600">AI Question</span>
          <p style="margin-top:4px">${c.ai_question}</p>
        </div>
        <div class="c-section">
          <h4>User's Answer</h4>
          <p>${c.user_answer}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">Error loading complaints</p>`;
  }
};

// Initial Load
window.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  if (currentUser) {
    router(currentUser.role === 'admin' ? 'admin-dashboard' : 'my-complaints');
  } else {
    router('login');
  }
});
