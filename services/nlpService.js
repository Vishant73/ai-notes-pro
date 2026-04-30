// services/nlpService.js
// ─────────────────────────────────────────────────────────────
//  All NLP features built from scratch — no external API needed
//  Implements: TF-IDF, TextRank, MCQ generation, Flesch-Kincaid,
//              Cosine Similarity, Keyword extraction
// ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','are','was','were',
  'have','has','had','but','not','you','your','a','an','of','in',
  'on','to','is','be','by','as','it','or','which','their','they',
  'its','we','he','she','i','my','our','us','at','do','did','can',
  'will','would','could','should','may','might','also','been','so',
  'if','than','then','there','these','those','into','about','over',
  'after','before','more','most','some','any','all','each','just',
  'very','one','two','three','new','old','now','get','got','use',
  'used','using','make','made','take','taken','see','seen','come'
]);

// ── Tokenization ──────────────────────────────────────────────

function tokenize(text) {
  return text.toLowerCase().match(/\b[a-z][a-z0-9]{2,}\b/g) || [];
}

function sentences(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

// ── TF-IDF Keyword Extraction ─────────────────────────────────

function tfidf(text, limit = 12) {
  const words  = tokenize(text).filter(w => !STOPWORDS.has(w));
  const total  = words.length || 1;
  const tf     = {};

  words.forEach(w => { tf[w] = (tf[w] || 0) + 1; });

  // IDF: penalise extremely common words (appear in >60% of sentences)
  const sents    = sentences(text);
  const docCount = sents.length || 1;
  const df       = {};
  sents.forEach(s => {
    const seen = new Set(tokenize(s));
    seen.forEach(w => { if (!STOPWORDS.has(w)) df[w] = (df[w] || 0) + 1; });
  });

  const scores = Object.entries(tf).map(([w, freq]) => {
    const idf = Math.log((docCount + 1) / ((df[w] || 1) + 1)) + 1;
    return [w, (freq / total) * idf];
  });

  return scores
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(e => e[0]);
}

// ── TextRank Extractive Summarization ────────────────────────

function cosineSim(a, b) {
  const all = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, normA = 0, normB = 0;
  all.forEach(w => {
    const av = a[w] || 0, bv = b[w] || 0;
    dot += av * bv; normA += av * av; normB += bv * bv;
  });
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function vecOf(sentence) {
  const words = tokenize(sentence).filter(w => !STOPWORDS.has(w));
  const v = {};
  words.forEach(w => { v[w] = (v[w] || 0) + 1; });
  return v;
}

function textRank(text, topN = 7) {
  const sents = sentences(text);
  if (sents.length <= topN) return sents;

  const vecs   = sents.map(vecOf);
  const n      = sents.length;
  const scores = new Array(n).fill(1);

  // 5 iterations of TextRank
  for (let iter = 0; iter < 5; iter++) {
    const newScores = scores.map((_, i) => {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const sim = cosineSim(vecs[i], vecs[j]);
        if (sim > 0) sum += (sim / n) * scores[j];
      }
      return 0.15 + 0.85 * sum;
    });
    newScores.forEach((s, i) => { scores[i] = s; });
  }

  // Return top-N sentences in original order
  const ranked = scores
    .map((s, i) => [i, s])
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([i]) => i)
    .sort((a, b) => a - b);

  return ranked.map(i => sents[i]);
}

// ── MCQ Generation (cloze deletion + distractors) ────────────

function generateMCQs(text, difficulty = 'medium', count = 5) {
  const sents   = sentences(text);
  const keywords = tfidf(text, 20);
  const mcqs    = [];

  for (let i = 0; i < Math.min(count, sents.length); i++) {
    const sentence = sents[i];
    const words    = tokenize(sentence).filter(w => !STOPWORDS.has(w) && w.length > 3);

    if (!words.length) continue;

    // Pick the answer word (keyword if possible)
    const answerWord = words.find(w => keywords.includes(w)) || words[0];

    // Build the question by blanking the answer
    const questionText = sentence.replace(
      new RegExp(`\\b${answerWord}\\b`, 'i'),
      '_____'
    );

    // Generate 3 distractors from other keywords
    const distractors = keywords
      .filter(k => k !== answerWord && k.length > 2)
      .slice(0, 3);

    while (distractors.length < 3) distractors.push('none of the above');

    // Shuffle options
    const options = [answerWord, ...distractors].sort(() => Math.random() - 0.5);
    const answerLetter = ['A', 'B', 'C', 'D'][options.indexOf(answerWord)];

    // Difficulty modifier
    let prefix = '';
    if (difficulty === 'easy')   prefix = 'Fill in the blank: ';
    if (difficulty === 'medium') prefix = 'Choose the correct term: ';
    if (difficulty === 'hard')   prefix = 'Identify the concept: ';

    mcqs.push([
      `Q${i + 1}: ${prefix}${questionText}`,
      `A) ${options[0]}`,
      `B) ${options[1]}`,
      `C) ${options[2]}`,
      `D) ${options[3]}`,
      `Answer: ${answerLetter}`
    ].join('\n'));
  }

  return mcqs;
}

// ── Flashcard Generation ──────────────────────────────────────

function generateFlashcards(text, count = 6) {
  const sents    = sentences(text);
  const keywords = tfidf(text, 20);
  const cards    = [];

  for (let i = 0; i < Math.min(count, sents.length); i++) {
    const s = sents[i];
    const kw = keywords.find(k => s.toLowerCase().includes(k)) || keywords[i] || 'concept';
    cards.push(`Q: What is the significance of "${kw}" in this context?\nA: ${s}`);
  }

  return cards;
}

// ── Flesch-Kincaid Readability ────────────────────────────────

function fleschKincaid(text) {
  const words     = text.match(/\b\w+\b/g) || [];
  const sentCount = (text.match(/[.!?]+/g) || []).length || 1;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const score = 206.835
    - 1.015  * (words.length / sentCount)
    - 84.6   * (syllables   / words.length);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word.length) return 1;
  word = word.replace(/e$/, '');
  const matches = word.match(/[aeiou]{1,2}/g);
  return Math.max(1, matches ? matches.length : 1);
}

function readabilityLabel(score) {
  if (score >= 90) return { label: 'Very Easy', color: '#4ecdc4' };
  if (score >= 70) return { label: 'Easy',      color: '#45b7d1' };
  if (score >= 60) return { label: 'Standard',  color: '#667eea' };
  if (score >= 50) return { label: 'Fairly Difficult', color: '#f9ca24' };
  if (score >= 30) return { label: 'Difficult', color: '#f0932b' };
  return              { label: 'Very Difficult', color: '#eb4d4b' };
}

// ── Cosine Similarity — Related Notes ────────────────────────

function relatedNotes(currentKeywords, allHistory, limit = 3) {
  if (!currentKeywords.length || !allHistory.length) return [];

  const currentVec = {};
  currentKeywords.forEach(k => { currentVec[k] = 1; });

  return allHistory
    .map(item => {
      const vec = {};
      (item.keywords || []).forEach(k => { vec[k] = 1; });
      return { item, score: cosineSim(currentVec, vec) };
    })
    .filter(r => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.item);
}

module.exports = {
  tfidf,
  textRank,
  generateMCQs,
  generateFlashcards,
  fleschKincaid,
  readabilityLabel,
  relatedNotes,
  sentences
};
