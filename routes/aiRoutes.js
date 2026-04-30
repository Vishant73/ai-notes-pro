const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const path         = require('path');
const aiController = require('../controllers/aiController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .pdf files allowed'));
    }
  }
});

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

router.get('/dashboard',          requireAuth, aiController.dashboard);
router.post('/analyze',           requireAuth, upload.single('file'), aiController.analyzeText);
router.get('/result/:id',         requireAuth, aiController.showResult);
router.get('/history',            requireAuth, aiController.history);
router.get('/quiz/:id',           requireAuth, aiController.showQuiz);
router.post('/quiz/save',         requireAuth, aiController.saveQuizResult);
router.get('/progress',           requireAuth, aiController.progress);
router.get('/export/:id',         requireAuth, aiController.exportPDF);

module.exports = router;
