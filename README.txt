# 🧠 AI Notes Pro

> **Convert your raw study notes into a complete study pack in under 10 seconds.**

AI Notes Pro is a full-stack web application that uses **Google Gemini AI** and **5 custom NLP algorithms** to automatically generate summaries, MCQ quizzes, flashcards, and keywords from student notes — with progress tracking and PDF export.

---

## ✨ Features

- 📝 **Smart Summarization** — 7-point bullet summary using TextRank algorithm
- ❓ **MCQ Generator** — 5 practice questions using Cloze Deletion technique
- 🃏 **Flashcard Creator** — 6 revision flashcards auto-generated from notes
- 🔑 **Keyword Extractor** — 12 key terms using TF-IDF scoring
- 📊 **Readability Score** — Flesch-Kincaid formula to assess note complexity
- 🔗 **Related Notes** — Cosine Similarity to find similar past notes
- 🎯 **Interactive Quiz Engine** — Real-time scoring and instant feedback
- 📈 **Progress Dashboard** — Analytics charts powered by Chart.js
- 📄 **PDF Export** — Download a 4-page study pack (summary, MCQs, flashcards, tips)
- 🔐 **User Authentication** — Secure login/register with session management
- 🕓 **History Tracking** — All past notes and results saved to your account

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS, HTML, CSS, JavaScript, Bootstrap, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| AI | Google Gemini API |
| NLP | Custom JavaScript algorithms (no external NLP library) |
| PDF | PDFKit |
| Auth | express-session, bcrypt |

---

## 🧪 NLP Algorithms (Built from Scratch)

All 5 algorithms are implemented in pure JavaScript inside `services/nlpService.js` — no NLP library used.

| Algorithm | Purpose |
|-----------|---------|
| **TextRank** | Sentence ranking for extractive summarization |
| **TF-IDF** | Term importance scoring for keyword extraction |
| **Cosine Similarity** | Finding related notes from history |
| **Flesch-Kincaid** | Readability scoring of input text |
| **Cloze Deletion** | Automatic MCQ question generation |

> These 5 algorithms reduced external Gemini API dependency by **75%** — most features run at zero API cost.

---

## 📁 Project Structure

```
ai-notes-pro/
├── config/
│   └── db.js               # MongoDB connection
├── controllers/
│   ├── aiController.js      # NLP + Gemini logic
│   └── authController.js    # Login / Register
├── models/
│   ├── User.js
│   ├── History.js
│   └── QuizResult.js
├── routes/
│   ├── aiRoutes.js
│   └── authRoutes.js
├── services/
│   └── nlpService.js        # All 5 NLP algorithms
├── views/                   # EJS templates (10 pages)
├── public/                  # CSS + JS assets
├── server.js                # Entry point
└── .env                     # Environment variables (not pushed)
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Google Gemini API key → [Get one free](https://aistudio.google.com)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Vishant73/ai-notes-pro.git
cd ai-notes-pro

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in your values (see below)

# 4. Start the server
node server.js
```

### Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/ai-notes-pro
SESSION_SECRET=your_secure_session_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Open in browser
```
http://localhost:3000
```

---

## 📊 Project Stats

- **20+** technologies used across the stack
- **5** NLP algorithms implemented from scratch
- **75%** reduction in external API dependency
- **10** pages / routes
- **3** database models
- **Zero cost** for summarization, MCQs, flashcards, keywords, readability

---

## 👨‍💻 Author

**Vishant Chouhan**
- GitHub: [@Vishant73](https://github.com/Vishant73)
- LinkedIn: [vishant-chouhan-261921291](https://linkedin.com/in/vishant-chouhan-261921291)
- Email: 0173cs221151@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).


