require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const path     = require('path');
const fs       = require('fs');
const connectDB = require('./config/db');

// ── Validate env ──────────────────────────────────────────────
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET not set in .env');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set — AI features will use fallback mode');
}

// ── Uploads dir ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

connectDB();

const app = express();

// ── View engine ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Layout middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  const _render = res.render.bind(res);
  res.render = function (view, options = {}, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    options = Object.assign({}, options);

    _render(view, options, (err, html) => {
      if (err) { if (callback) return callback(err); return next(err); }
      if (options.layout === false) { if (callback) return callback(null, html); return res.send(html); }

      const layoutFile = path.join(__dirname, 'views', 'layout.ejs');
      let layoutSrc;
      try { layoutSrc = fs.readFileSync(layoutFile, 'utf8'); }
      catch (e) { if (callback) return callback(e); return next(e); }

      const title  = options.title || 'AI Notes Pro';
      const userId = (req.session && req.session.userId) ? req.session.userId : null;
      const userName = (req.session && req.session.userName) ? req.session.userName : '';

      let navLinks;
      if (userId) {
        navLinks = `
          <a href="/ai/dashboard" class="nav-link"><i class="fas fa-home"></i> Dashboard</a>
          <a href="/ai/history"   class="nav-link"><i class="fas fa-history"></i> History</a>
          <a href="/ai/progress"  class="nav-link"><i class="fas fa-chart-line"></i> Progress</a>
          <a href="/logout"       class="nav-link logout-link"><i class="fas fa-sign-out-alt"></i> Logout</a>
        `;
      } else {
        navLinks = `
          <a href="/"          class="nav-link"><i class="fas fa-home"></i> Home</a>
          <a href="/register"  class="nav-link"><i class="fas fa-user-plus"></i> Register</a>
          <a href="/login"     class="nav-link"><i class="fas fa-sign-in-alt"></i> Login</a>
        `;
      }

      const fullHtml = layoutSrc
        .replace(/%%TITLE%%/g,    title)
        .replace(/%%NAV_LINKS%%/g, navLinks)
        .replace(/%%USER_NAME%%/g, userName)
        .replace(/%%BODY%%/g,     html);

      if (callback) return callback(null, fullHtml);
      return res.send(fullHtml);
    });
  };
  next();
});

// ── Session ───────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/',    require('./routes/authRoutes'));
app.use('/ai',  require('./routes/aiRoutes'));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { error: 'Page not found', title: '404 • AI Notes Pro' });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', { error: 'Something went wrong', title: 'Error • AI Notes Pro' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AI Notes Pro running → http://localhost:${PORT}`));
