const fs          = require('fs');
const path        = require('path');
const History     = require('../models/History');
const QuizResult  = require('../models/QuizResult');
const User        = require('../models/User');
const nlp         = require('../services/nlpService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Gemini call ───────────────────────────────────────────────
async function callGemini(prompt) {
  if (!genAI) throw new Error('No API key');
  const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Dashboard ─────────────────────────────────────────────────
exports.dashboard = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const user        = await User.findById(req.session.userId);
    const recentItems = await History.find({ user: req.session.userId })
      .sort({ createdAt: -1 }).limit(3);
    const totalNotes  = await History.countDocuments({ user: req.session.userId });
    const totalQuizzes = await QuizResult.countDocuments({ user: req.session.userId });

    res.render('dashboard', {
      title: 'Dashboard • AI Notes Pro',
      user, recentItems, totalNotes, totalQuizzes
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard', {
      title: 'Dashboard • AI Notes Pro',
      user: null, recentItems: [], totalNotes: 0, totalQuizzes: 0
    });
  }
};

// ── Analyze Text ──────────────────────────────────────────────
exports.analyzeText = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  let text  = (req.body.text || '').trim();
  let title = (req.body.title || 'Untitled Notes').trim();
  const difficulty = req.body.difficulty || 'medium';

  // Handle file upload (.txt or .pdf)
  if (req.file) {
    const filePath = req.file.path;
    try {
      if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData    = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }
      fs.unlinkSync(filePath);
      if (!title || title === 'Untitled Notes')
        title = req.file.originalname.replace(/\.(txt|pdf)$/i, '');
    } catch (err) {
      console.error('File read error:', err);
      return res.redirect('/ai/dashboard');
    }
  }

  if (!text || text.length < 30)
    return res.redirect('/ai/dashboard');

  try {
    console.log(`📝 Analyzing "${title}" (${text.length} chars, ${difficulty})`);

    // ── NLP features (always computed, no API needed) ──
    const keywords    = nlp.tfidf(text, 12);
    const summaryBullets = nlp.textRank(text, 7);
    const readability = nlp.fleschKincaid(text);
    const wordCount   = (text.match(/\b\w+\b/g) || []).length;

    let summaryText = summaryBullets.map(b => `• ${b}`).join('\n');
    let mcqLines    = nlp.generateMCQs(text, difficulty, 5).join('\n---\n').split('\n');
    let flashLines  = nlp.generateFlashcards(text, 6).join('\n---\n').split('\n');

    // ── Gemini upgrade (better summary if API available) ──
    if (genAI && text.length > 100) {
      try {
        console.log('🤖 Calling Gemini for enhanced summary...');
        const geminiSummary = await callGemini(
          `Summarize this text into 6-8 clear bullet points. Each bullet should start with "• ":\n\n${text.substring(0, 4000)}`
        );
        if (geminiSummary && geminiSummary.trim().length > 20)
          summaryText = geminiSummary;

        console.log('🤖 Calling Gemini for enhanced MCQs...');
        const geminiMCQs = await callGemini(
          `Create exactly 5 ${difficulty}-level multiple-choice questions from this text.\nFormat each as:\nQ1: question\nA) option\nB) option\nC) option\nD) option\nAnswer: X\n\n${text.substring(0, 3000)}`
        );
        if (geminiMCQs && geminiMCQs.trim().length > 20)
          mcqLines = geminiMCQs.split('\n').filter(l => l.trim());

        console.log('🤖 Calling Gemini for enhanced flashcards...');
        const geminiFlash = await callGemini(
          `Create 6 flashcard Q&A pairs from this text.\nFormat each as:\nQ: question\nA: answer\n\n${text.substring(0, 3000)}`
        );
        if (geminiFlash && geminiFlash.trim().length > 20)
          flashLines = geminiFlash.split('\n').filter(l => l.trim());

      } catch (apiErr) {
        console.warn('⚠️  Gemini failed, using NLP fallback:', apiErr.message);
      }
    }

    // ── Save to MongoDB ──
    const history = new History({
      user:         req.session.userId,
      title,
      originalText: text.substring(0, 600),
      summary:      summaryText,
      keywords,
      mcqs:         mcqLines,
      flashcards:   flashLines,
      difficulty,
      readability,
      wordCount
    });
    await history.save();

    // Update user streak
    await User.findByIdAndUpdate(req.session.userId, { lastStudy: new Date() });

    console.log('✅ Saved:', history._id);
    res.redirect(`/ai/result/${history._id}`);

  } catch (err) {
    console.error('❌ Analysis error:', err);
    res.render('dashboard', {
      title: 'Dashboard • AI Notes Pro',
      error: 'Analysis failed. Please try again.',
      user: null, recentItems: [], totalNotes: 0, totalQuizzes: 0
    });
  }
};

// ── Show Result ───────────────────────────────────────────────
exports.showResult = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const item = await History.findOne({ _id: req.params.id, user: req.session.userId });
    if (!item) return res.redirect('/ai/history');

    // Related notes via cosine similarity
    const allHistory = await History.find({
      user: req.session.userId,
      _id: { $ne: item._id }
    }).select('title keywords createdAt _id');

    const related = nlp.relatedNotes(item.keywords, allHistory, 3);
    const rl      = nlp.readabilityLabel(item.readability);

    res.render('result', {
      title: `${item.title} • AI Notes Pro`,
      item, related, rl
    });
  } catch (err) {
    console.error(err);
    res.redirect('/ai/history');
  }
};

// ── History ───────────────────────────────────────────────────
exports.history = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const items = await History.find({ user: req.session.userId }).sort({ createdAt: -1 });
  res.render('history', { title: 'History • AI Notes Pro', items });
};

// ── Interactive Quiz ──────────────────────────────────────────
exports.showQuiz = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const item = await History.findOne({ _id: req.params.id, user: req.session.userId });
  if (!item) return res.redirect('/ai/history');
  res.render('quiz', { title: `Quiz — ${item.title}`, item });
};

// ── Save Quiz Result ──────────────────────────────────────────
exports.saveQuizResult = async (req, res) => {
  if (!req.session.userId) return res.json({ ok: false });
  try {
    const { historyId, score, total, timeTaken } = req.body;
    const percent = Math.round((score / total) * 100);

    const result = new QuizResult({
      user:      req.session.userId,
      history:   historyId,
      title:     req.body.title || '',
      score:     parseInt(score),
      total:     parseInt(total),
      percent,
      timeTaken: parseInt(timeTaken) || 0
    });
    await result.save();
    res.json({ ok: true, percent });
  } catch (err) {
    console.error(err);
    res.json({ ok: false });
  }
};

// ── Progress Dashboard ────────────────────────────────────────
exports.progress = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const user        = await User.findById(req.session.userId);
    const quizResults = await QuizResult.find({ user: req.session.userId })
      .sort({ createdAt: -1 }).limit(20).populate('history', 'title');
    const totalNotes  = await History.countDocuments({ user: req.session.userId });
    const avgScore    = quizResults.length
      ? Math.round(quizResults.reduce((s, r) => s + r.percent, 0) / quizResults.length)
      : 0;

    // Topics covered from history
    const allHistory = await History.find({ user: req.session.userId })
      .select('title keywords createdAt readability wordCount difficulty');

    res.render('progress', {
      title: 'Progress • AI Notes Pro',
      user, quizResults, totalNotes, avgScore, allHistory
    });
  } catch (err) {
    console.error(err);
    res.redirect('/ai/dashboard');
  }
};

// ── PDF Export ────────────────────────────────────────────────
exports.exportPDF = async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const item = await History.findOne({ _id: req.params.id, user: req.session.userId });
    if (!item) return res.status(404).send('Not found');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 50, bottom: 60, left: 50, right: 50 } });

    const safeTitle = (item.title || 'study-pack').replace(/[^a-z0-9 _-]/gi, '').replace(/\s+/g, '-').toLowerCase().slice(0, 50);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width - 100;

    // ── Cover ──
    doc.rect(0, 0, doc.page.width, 130).fill('#667eea');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('AI NOTES PRO', 50, 25);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#fff').text(item.title || 'Study Pack', 50, 45, { width: W });
    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.85)')
       .text(`Generated ${new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}  ·  ${item.difficulty || 'medium'} difficulty`, 50, 100);
    doc.y = 150;

    // ── Summary ──
    doc.roundedRect(50, doc.y, W, 30, 6).fill('#667eea');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#fff').text('📋  Summary', 62, doc.y - 22);
    doc.y += 18;
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(item.summary || 'No summary', 50, doc.y, { width: W, lineGap: 3 });
    doc.moveDown(1);

    // ── Keywords ──
    if (item.keywords && item.keywords.length) {
      doc.roundedRect(50, doc.y, W, 30, 6).fill('#4ecdc4');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#fff').text('🔑  Keywords', 62, doc.y - 22);
      doc.y += 18;
      doc.font('Helvetica').fontSize(10).fillColor('#333').text(item.keywords.join('  ·  '), 50, doc.y, { width: W });
      doc.moveDown(1.5);
    }

    // ── MCQs ──
    if (item.mcqs && item.mcqs.length) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 80).fill('#667eea');
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('Multiple Choice Questions', 50, 30, { width: W });
      doc.y = 100;

      const raw = item.mcqs;
      let block = [], qNum = 0;
      raw.forEach(line => {
        if (/^Q\d+:/i.test(line.trim()) && block.length) {
          writeBlock(doc, block, ++qNum, W); block = [];
        }
        block.push(line);
      });
      if (block.length) writeBlock(doc, block, ++qNum, W);
    }

    // ── Flashcards ──
    if (item.flashcards && item.flashcards.length) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 80).fill('#4ecdc4');
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#fff').text('Flashcards', 50, 30, { width: W });
      doc.y = 100;

      let card = [], cardNum = 0;
      item.flashcards.forEach(line => {
        if (/^Q:/i.test(line.trim()) && card.length) { writeCard(doc, card, ++cardNum, W); card = []; }
        card.push(line);
      });
      if (card.length) writeCard(doc, card, ++cardNum, W);
    }

    // ── Page numbers ──
    const total = doc.bufferedPageRange().count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(9).fillColor('#999')
         .text(`AI Notes Pro  ·  Page ${i + 1} of ${total}`, 50, doc.page.height - 35, { align: 'center', width: W });
    }

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).send('PDF generation failed');
  }
};

function writeBlock(doc, lines, n, W) {
  if (doc.y > doc.page.height - 150) doc.addPage();
  const q = (lines[0] || '').replace(/^Q\d+:\s*/i, '');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text(`${n}. ${q}`, 50, doc.y, { width: W });
  lines.slice(1).forEach(line => {
    const isAns = lines.some(l => /^answer:/i.test(l) && l.includes((line || '')[0]));
    doc.font(isAns ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
       .fillColor(isAns ? '#4ecdc4' : '#555').text(`   ${line}`, 50, doc.y, { width: W });
  });
  doc.moveDown(0.8);
}

function writeCard(doc, lines, n, W) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  const q = lines.find(l => /^Q:/i.test(l)) || '';
  const a = lines.find(l => /^A:/i.test(l)) || '';
  doc.roundedRect(50, doc.y, W, 60, 6).fill('#f8f9ff');
  doc.rect(50, doc.y, 4, 60).fill('#4ecdc4');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#4ecdc4').text(`#${n}`, 62, doc.y + 6);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text(q.replace(/^Q:\s*/i, ''), 62, doc.y + 18, { width: W - 20, ellipsis: true });
  doc.font('Helvetica').fontSize(10).fillColor('#666').text(a.replace(/^A:\s*/i, ''), 62, doc.y + 35, { width: W - 20, ellipsis: true });
  doc.y += 72;
}
