const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');
const { complaints, users } = require('../db/schema');
const { eq, desc } = require('drizzle-orm');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/ai/question', authMiddleware, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ error: 'Complaint text is required' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const prompt = `Generate exactly one short follow-up question relevant to the following complaint:\n\n${complaint_text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const ai_question = response.text().trim();

    res.json({ ai_question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating AI question' });
  }
});

router.post('/complaints', authMiddleware, async (req, res) => {
  const { complaint_text, ai_question, user_answer } = req.body;
  if (!complaint_text) return res.status(400).json({ error: 'Complaint text is required' });

  try {
    const newComplaint = await db.insert(complaints).values({
      user_id: req.user.id,
      complaint_text,
      ai_question,
      user_answer,
    }).returning();

    res.json(newComplaint[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error submitting complaint' });
  }
});

router.get('/complaints/my', authMiddleware, async (req, res) => {
  try {
    const myComplaints = await db.select().from(complaints).where(eq(complaints.user_id, req.user.id)).orderBy(desc(complaints.created_at));
    res.json(myComplaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching complaints' });
  }
});

router.get('/admin/complaints', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allComplaints = await db.select({
      id: complaints.id,
      complaint_text: complaints.complaint_text,
      ai_question: complaints.ai_question,
      user_answer: complaints.user_answer,
      created_at: complaints.created_at,
      name: users.name,
      email: users.email
    }).from(complaints)
    .leftJoin(users, eq(complaints.user_id, users.id))
    .orderBy(desc(complaints.created_at));

    res.json(allComplaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching all complaints' });
  }
});

module.exports = router;
