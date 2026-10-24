const assert = require('node:assert/strict');
const fs = require('node:fs');
const { afterEach, beforeEach, test } = require('node:test');
const vm = require('node:vm');
const { createApp } = require('../src/app');

let server;
let baseUrl;
let createdExpense;
let deletedCount;
let findManyArgs;

const storedExpense = {
  id: 'expense-1',
  title: 'Coffee',
  amountCents: 425,
  category: 'Food & dining',
  date: new Date('2026-10-03T12:00:00.000Z'),
  notes: null,
  createdAt: new Date('2026-10-03T12:00:00.000Z'),
};

const prisma = {
  expense: {
    findMany: async (args) => {
      findManyArgs = args;
      return [storedExpense];
    },
    create: async ({ data }) => {
      createdExpense = { ...data, id: 'expense-new', createdAt: new Date() };
      return createdExpense;
    },
    deleteMany: async () => ({ count: deletedCount }),
  },
};

beforeEach(async () => {
  createdExpense = null;
  deletedCount = 1;
  findManyArgs = null;
  server = createApp({ prisma }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health endpoint reports that the app is ready', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('serves the tracker and the learning guide with valid browser JavaScript', async () => {
  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /EGOtracker/);

  const guide = await fetch(`${baseUrl}/learn.html`);
  assert.equal(guide.status, 200);
  assert.match(await guide.text(), /PRISMA ORM/);

  const html = fs.readFileSync(require.resolve('../public/index.html'), 'utf8');
  for (const id of ['expense-form', 'expense-list', 'month-filter', 'category-filter']) {
    assert.ok(html.includes(`id="${id}"`), `Missing required UI element: ${id}`);
  }

  const browserScript = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
  assert.doesNotThrow(() => new vm.Script(browserScript));
});

test('lists expenses and filters dates to the selected month', async () => {
  const response = await fetch(`${baseUrl}/api/expenses?month=2026-10&category=Food%20%26%20dining`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{
    id: 'expense-1',
    title: 'Coffee',
    amount: 4.25,
    category: 'Food & dining',
    date: '2026-10-03',
    notes: null,
  }]);
  assert.deepEqual(findManyArgs.where.date, {
    gte: new Date('2026-10-01T00:00:00.000Z'),
    lt: new Date('2026-11-01T00:00:00.000Z'),
  });
  assert.equal(findManyArgs.where.category, 'Food & dining');
});

test('rejects malformed month filters', async () => {
  const response = await fetch(`${baseUrl}/api/expenses?month=October`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /YYYY-MM/);
});

test('creates expenses using integer cents and trimmed text', async () => {
  const response = await fetch(`${baseUrl}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '  Coffee  ',
      amount: 4.25,
      category: 'Food & dining',
      date: '2026-10-03',
      notes: '  oat milk  ',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(createdExpense.title, 'Coffee');
  assert.equal(createdExpense.amountCents, 425);
  assert.equal(createdExpense.notes, 'oat milk');
  assert.deepEqual(await response.json(), {
    id: 'expense-new',
    title: 'Coffee',
    amount: 4.25,
    category: 'Food & dining',
    date: '2026-10-03',
    notes: 'oat milk',
  });
});

test('rejects invalid amounts, categories, and calendar dates', async () => {
  const invalidExpenses = [
    { title: 'Coffee', amount: 0, category: 'Food & dining', date: '2026-10-03' },
    { title: 'Coffee', amount: 1.239, category: 'Food & dining', date: '2026-10-03' },
    { title: 'Coffee', amount: 1, category: 'Unknown', date: '2026-10-03' },
    { title: 'Coffee', amount: 1, category: 'Food & dining', date: '2026-02-30' },
  ];

  for (const expense of invalidExpenses) {
    const response = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    assert.equal(response.status, 400);
  }
});

test('deletes an existing expense and returns 404 for a missing expense', async () => {
  const response = await fetch(`${baseUrl}/api/expenses/expense-1`, { method: 'DELETE' });
  assert.equal(response.status, 204);

  deletedCount = 0;
  const missingResponse = await fetch(`${baseUrl}/api/expenses/missing`, { method: 'DELETE' });
  assert.equal(missingResponse.status, 404);
});
