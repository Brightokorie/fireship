const express = require('express');
const helmet = require('helmet');
const path = require('node:path');

const PUBLIC_DIRECTORY = path.join(__dirname, '..', 'public');
const CATEGORIES = new Set([
  'Food & dining',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Health',
  'Entertainment',
  'Other',
]);

function dateRangeForMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    lt: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function serializeExpense(expense) {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amountCents / 100,
    category: expense.category,
    date: expense.date.toISOString().slice(0, 10),
    notes: expense.notes,
  };
}

function createApp({ prisma }) {
  if (!prisma) {
    throw new Error('createApp requires a Prisma client.');
  }

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/expenses', async (req, res) => {
    const where = {};

    if (req.query.month !== undefined) {
      const range = dateRangeForMonth(req.query.month);
      if (!range) {
        return res.status(400).json({ error: 'Month must use YYYY-MM format.' });
      }
      where.date = range;
    }

    if (req.query.category !== undefined) {
      if (!CATEGORIES.has(req.query.category)) {
        return res.status(400).json({ error: 'Choose a valid expense category.' });
      }
      where.category = req.query.category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(expenses.map(serializeExpense));
  });

  app.post('/api/expenses', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Send an expense object.' });
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = typeof body.category === 'string' ? body.category : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const date = typeof body.date === 'string' ? body.date : '';
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T12:00:00.000Z`)
      : null;
    const amountCents = typeof body.amount === 'number'
      ? Math.round(body.amount * 100)
      : NaN;

    if (!title || title.length > 100) {
      return res.status(400).json({ error: 'Title must be between 1 and 100 characters.' });
    }
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number with up to two decimal places.' });
    }
    if (Math.abs(body.amount * 100 - amountCents) > 0.000001) {
      return res.status(400).json({ error: 'Amount must be a positive number with up to two decimal places.' });
    }
    if (!CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Choose a valid expense category.' });
    }
    if (!dateValue || Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: 'Enter a valid expense date.' });
    }
    if (notes.length > 500) {
      return res.status(400).json({ error: 'Notes must be 500 characters or fewer.' });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        amountCents,
        category,
        date: dateValue,
        notes: notes || null,
      },
    });

    res.status(201).json(serializeExpense(expense));
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    if (!req.params.id || req.params.id.length > 64) {
      return res.status(400).json({ error: 'Enter a valid expense ID.' });
    }

    const result = await prisma.expense.deleteMany({
      where: { id: req.params.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.status(204).end();
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use(express.static(PUBLIC_DIRECTORY));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'Request body must contain valid JSON.' });
    }
    console.error(error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}

module.exports = { createApp };
