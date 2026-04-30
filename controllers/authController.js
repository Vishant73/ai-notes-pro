const bcrypt = require('bcryptjs');
const User   = require('../models/User');

exports.index = (req, res) => {
  if (req.session.userId) return res.redirect('/ai/dashboard');
  res.render('index', { title: 'Home • AI Notes Pro' });
};

exports.showRegister = (req, res) => {
  res.render('register', { error: null, title: 'Register • AI Notes Pro' });
};

exports.showLogin = (req, res) => {
  res.render('login', { error: null, title: 'Login • AI Notes Pro' });
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.render('register', { error: 'All fields are required', title: 'Register • AI Notes Pro' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.render('register', { error: 'Email already registered', title: 'Register • AI Notes Pro' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ name, email: email.toLowerCase(), password: hashed });
    await user.save();

    req.session.userId   = user._id;
    req.session.userName = user.name;
    res.redirect('/ai/dashboard');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Registration failed. Try again.', title: 'Register • AI Notes Pro' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user)
      return res.render('login', { error: 'Invalid email or password', title: 'Login • AI Notes Pro' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.render('login', { error: 'Invalid email or password', title: 'Login • AI Notes Pro' });

    req.session.userId   = user._id;
    req.session.userName = user.name;

    // Update streak
    const today     = new Date().toDateString();
    const lastStudy = user.lastStudy ? new Date(user.lastStudy).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastStudy === yesterday) {
      await User.findByIdAndUpdate(user._id, { $inc: { streak: 1 }, lastStudy: new Date() });
    } else if (lastStudy !== today) {
      await User.findByIdAndUpdate(user._id, { streak: 1, lastStudy: new Date() });
    }

    res.redirect('/ai/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Login failed. Try again.', title: 'Login • AI Notes Pro' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};
