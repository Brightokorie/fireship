const CATEGORIES = [
  'Food & dining',
  'Transport',
  'Shopping',
  'Bills & utilities',
  'Health',
  'Entertainment',
  'Other',
];

const CATEGORY_ICONS = {
  'Food & dining': '☕',
  Transport: '↗',
  Shopping: '◇',
  'Bills & utilities': '⌁',
  Health: '✳',
  Entertainment: '♫',
  Other: '·',
};

const elements = {
  form: document.querySelector('#expense-form'),
  list: document.querySelector('#expense-list'),
  categoryBreakdown: document.querySelector('#category-breakdown'),
  categoryFilter: document.querySelector('#category-filter'),
  monthFilter: document.querySelector('#month-filter'),
  totalSpent: document.querySelector('#total-spent'),
  transactionCount: document.querySelector('#transaction-count'),
  dailyAverage: document.querySelector('#daily-average'),
  monthCaption: document.querySelector('#month-caption'),
  chartEmpty: document.querySelector('#chart-empty'),
  status: document.querySelector('#status-message'),
  submit: document.querySelector('.submit-button'),
};

let expenses = [];

function formatMoney(amount) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function visibleExpenses() {
  const selectedMonth = elements.monthFilter.value;
  const selectedCategory = elements.categoryFilter.value;
  return expenses.filter((expense) => (
    expense.date.startsWith(selectedMonth)
    && (!selectedCategory || expense.category === selectedCategory)
  ));
}

function renderSummary(monthExpenses) {
  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const [year, month] = elements.monthFilter.value.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const days = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
  const monthName = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

  elements.totalSpent.textContent = formatMoney(total);
  elements.transactionCount.textContent = String(monthExpenses.length);
  elements.dailyAverage.textContent = formatMoney(days ? total / days : 0);
  elements.monthCaption.textContent = `Across all your expenses in ${monthName}`;
}

function renderExpenses(items) {
  elements.list.replaceChildren();
  if (items.length === 0) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No expenses here yet. Add one below to get started.';
    row.append(cell);
    elements.list.append(row);
    return;
  }

  for (const expense of items) {
    const row = document.createElement('tr');
    const detailCell = document.createElement('td');
    const detail = document.createElement('div');
    detail.className = 'expense-detail';

    const icon = document.createElement('span');
    icon.className = 'expense-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.Other;

    const copy = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'expense-title';
    title.textContent = expense.title;
    copy.append(title);
    if (expense.notes) {
      const notes = document.createElement('div');
      notes.className = 'expense-notes';
      notes.textContent = expense.notes;
      copy.append(notes);
    }
    detail.append(icon, copy);
    detailCell.append(detail);

    const categoryCell = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'category-pill';
    pill.textContent = expense.category;
    categoryCell.append(pill);

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(expense.date);

    const amountCell = document.createElement('td');
    amountCell.className = 'amount-cell';
    amountCell.textContent = formatMoney(expense.amount);

    const actionCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.className = 'delete-button';
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', `Delete ${expense.title}`);
    removeButton.addEventListener('click', () => deleteExpense(expense.id));
    actionCell.append(removeButton);

    row.append(detailCell, categoryCell, dateCell, amountCell, actionCell);
    elements.list.append(row);
  }
}

function renderCategories(monthExpenses) {
  elements.categoryBreakdown.replaceChildren();
  const totals = new Map(CATEGORIES.map((category) => [category, 0]));
  for (const expense of monthExpenses) {
    totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
  }

  const ranked = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => right[1] - left[1]);
  elements.chartEmpty.hidden = ranked.length > 0;

  const maximum = ranked[0]?.[1] || 1;
  for (const [category, amount] of ranked) {
    const item = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'category-heading';
    const name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = category;
    const value = document.createElement('span');
    value.className = 'category-amount';
    value.textContent = formatMoney(amount);
    heading.append(name, value);

    const track = document.createElement('progress');
    track.className = 'category-progress';
    track.max = maximum;
    track.value = amount;
    track.setAttribute('aria-label', `${category}: ${formatMoney(amount)}`);
    item.append(heading, track);
    elements.categoryBreakdown.append(item);
  }
}

function render() {
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(elements.monthFilter.value));
  renderSummary(monthExpenses);
  renderExpenses(visibleExpenses());
  renderCategories(monthExpenses);
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadExpenses() {
  elements.status.textContent = '';
  try {
    expenses = await request('/api/expenses');
    render();
  } catch (error) {
    elements.status.textContent = error.message;
  }
}

async function addExpense(event) {
  event.preventDefault();
  elements.status.textContent = '';
  const formData = new FormData(elements.form);
  const payload = {
    title: formData.get('title'),
    amount: Number(formData.get('amount')),
    category: formData.get('category'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  };

  elements.submit.disabled = true;
  try {
    const created = await request('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expenses.unshift(created);
    elements.form.reset();
    elements.form.elements.date.value = new Date().toISOString().slice(0, 10);
    if (created.date.startsWith(elements.monthFilter.value)) {
      elements.categoryFilter.value = '';
    }
    render();
    elements.status.textContent = 'Expense added.';
  } catch (error) {
    elements.status.textContent = error.message;
  } finally {
    elements.submit.disabled = false;
  }
}

async function deleteExpense(id) {
  elements.status.textContent = '';
  try {
    await request(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    expenses = expenses.filter((expense) => expense.id !== id);
    render();
    elements.status.textContent = 'Expense deleted.';
  } catch (error) {
    elements.status.textContent = error.message;
  }
}

elements.monthFilter.value = currentMonth();
elements.form.elements.date.value = new Date().toISOString().slice(0, 10);
elements.form.addEventListener('submit', addExpense);
elements.monthFilter.addEventListener('change', render);
elements.categoryFilter.addEventListener('change', render);
loadExpenses();
