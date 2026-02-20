// ============================================
// TEAM APP - Admin Interface
// ============================================

// Initialize DB only if not already initialized
if (!DB.db) {
  DB.init();
}

// Restore user from storage if not already loaded
if (!DB.user) {
  const savedLocal = localStorage.getItem('teamUser');
  const savedSession = sessionStorage.getItem('teamUser');
  if (savedLocal) {
    DB.user = JSON.parse(savedLocal);
  } else if (savedSession) {
    DB.user = JSON.parse(savedSession);
  }
}

// Show username if logged in
if (DB.user) {
  document.getElementById('userName').textContent = DB.user.id;
} else {
  document.getElementById('userName').textContent = 'Guest';
}

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('.nav-link').forEach(link => {
  link.onclick = () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.s).classList.add('active');
    loadSection(link.dataset.s);
  };
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    const parent = tab.parentElement;
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const section = parent.closest('.section');
    section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tab.dataset.t).classList.add('active');
  };
});

function logout() {
  DB.logout();
  location.href = 'index.html';
}

function loadSection(s) {
  // Stop Telegram checking when leaving AI section
  if (s !== 'ai' && typeof stopTelegramCheck === 'function') {
    stopTelegramCheck();
  }

  switch(s) {
    case 'daily': loadDaily(); break;
    case 'ai': loadAI(); break;
    case 'outreach': loadOutreach(); break;
    case 'leads': loadLeads(); break;
    case 'models': loadModels(); break;
    case 'chatters': loadChatters(); break;
    case 'spy': loadSpy(); break;
    case 'content': loadContent(); break;
    case 'posting': loadPosting(); break;
    case 'settings': loadSettings(); break;
  }
}

// ============================================
// DATE NAVIGATION
// ============================================
let curDate = new Date().toISOString().split('T')[0];
let calendarDate = new Date();
document.getElementById('curDate').value = curDate;

function chgDate(d) {
  const dt = new Date(curDate);
  dt.setDate(dt.getDate() + d);
  curDate = dt.toISOString().split('T')[0];
  document.getElementById('curDate').value = curDate;
  loadDayDetail();
}

function goToday() {
  curDate = new Date().toISOString().split('T')[0];
  document.getElementById('curDate').value = curDate;
  loadDayDetail();
}

function chgMonth(d) {
  calendarDate.setMonth(calendarDate.getMonth() + d);
  loadCalendar();
}

function selectDate(date) {
  curDate = date;
  document.getElementById('curDate').value = date;
  // Switch to Day Detail tab
  document.querySelectorAll('#daily .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#daily .tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('#daily .tab[data-t="t-day"]').classList.add('active');
  document.getElementById('t-day').classList.add('active');
  loadDayDetail();
}

// ============================================
// DAILY SECTION
// ============================================
let userId = CONFIG.assistant;

async function loadAssistantList() {
  try {
    const snapshot = await DB.db.collection('users').get();
    const assistants = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'assistant') {
        assistants.push(doc.id);
      }
    });
    const select = document.getElementById('assistantSelect');
    select.innerHTML = assistants.map(a =>
      `<option value="${a}" ${a === userId ? 'selected' : ''}>@${a}</option>`
    ).join('');
    if (assistants.length > 0 && !assistants.includes(userId)) {
      userId = assistants[0];
      select.value = userId;
    }
  } catch (e) {
    console.error('Error loading assistants:', e);
  }
}

function switchAssistant(id) {
  userId = id;
  loadDaily();
}

async function loadDaily() {
  await loadAssistantList();
  await recalcAllPending();
  await loadPaymentSummary();
  await loadDayDetail();
  await loadPayroll();
  await loadWallets();
  await loadCalendar();
}

// Calculate bonus from manual_tasks for a given user+date
async function calcBonus(uid, date) {
  const tasks = await DB.getAll('manual_tasks', [
    { field: 'userId', value: uid },
    { field: 'date', value: date }
  ]);
  return tasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);
}

// Sync work_days.bonus and payroll amount for a given user+date
async function syncBonusAndPayroll(uid, date) {
  const bonus = await calcBonus(uid, date);
  const wds = await DB.getAll('work_days', [
    { field: 'userId', value: uid },
    { field: 'date', value: date }
  ]);
  if (wds.length > 0) {
    await DB.update('work_days', wds[0].id, { bonus });
    const hours = wds[0].hours || 0;
    if (wds[0].status === 'completed') {
      const rateSetting = await DB.getSetting('hourly_rate');
      const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
      const amount = (hours * rate) + bonus;
      const payrolls = await DB.getAll('payroll', [
        { field: 'userId', value: uid },
        { field: 'date', value: date }
      ]);
      const pending = payrolls.filter(p => p.status === 'pending');
      if (pending.length > 0) {
        await DB.update('payroll', pending[0].id, { hours, bonus, amount });
      }
    }
  }
}

// Get work_days data for a specific date
async function getDayData(date) {
  const days = await DB.getAll('work_days', [
    { field: 'userId', value: userId },
    { field: 'date', value: date }
  ]);
  return days[0] || { date, status: null, hours: 0, report: '', bonus: 0 };
}

// Load Day Detail tab
async function loadDayDetail() {
  try {
    const day = await getDayData(curDate);

    // Update day status display
    const statusEl = document.getElementById('dayStatus');
    if (statusEl) {
      if (day.status === 'completed') {
        statusEl.innerHTML = '<span class="status status-healthy">Completed</span>';
      } else if (day.status === 'dayoff') {
        statusEl.innerHTML = '<span class="status" style="background:#f55;color:#fff">Day Off</span>';
      } else if (day.status === 'planned') {
        statusEl.innerHTML = '<span class="status status-pending">Planned</span>';
      } else {
        statusEl.innerHTML = '<span class="status status-gray">Not Planned</span>';
      }
    }

    // Update button states
    document.getElementById('btnPlanned')?.classList.toggle('btn-primary', day.status === 'planned');
    document.getElementById('btnDayOff')?.classList.toggle('btn-danger', day.status === 'dayoff');
    document.getElementById('btnComplete')?.classList.toggle('btn-primary', day.status === 'completed');

    // Load tasks (returns completed bonus amount)
    const completedBonus = await loadTasks();

    // Load report data
    const hoursInput = document.getElementById('dayHours');
    const reportInput = document.getElementById('reportTxt');
    if (hoursInput) hoursInput.value = day.hours || '';
    if (reportInput) reportInput.value = day.report || '';

    // Calculate day earnings (including bonus)
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
    const hours = day.hours || 0;
    const total = (hours * rate) + (completedBonus || 0);

    const hoursDisplay = document.getElementById('dayHoursDisplay');
    const rateDisplay = document.getElementById('dayRate');
    const totalDisplay = document.getElementById('dayTotal');

    if (hoursDisplay) hoursDisplay.textContent = hours + 'h';
    if (rateDisplay) rateDisplay.textContent = '$' + rate;
    if (totalDisplay) totalDisplay.textContent = '$' + total.toFixed(2);
  } catch (e) {
    console.error('Day detail error:', e);
  }
}

// Set day status (planned, dayoff, completed)
async function setDayStatus(status) {
  const existing = await DB.getAll('work_days', [
    { field: 'userId', value: userId },
    { field: 'date', value: curDate }
  ]);

  let newStatus = status;
  let dayData = existing[0] || { hours: 0, report: '' };

  // Toggle off if clicking same status
  if (existing.length > 0 && existing[0].status === status) {
    newStatus = 'planned';
  }

  const bonus = await calcBonus(userId, curDate);

  if (existing.length > 0) {
    await DB.update('work_days', existing[0].id, { status: newStatus, bonus });
    dayData = { ...existing[0], status: newStatus, bonus };
  } else {
    const newDay = {
      userId: userId,
      date: curDate,
      status: newStatus,
      hours: 0,
      report: '',
      bonus: bonus,
      createdAt: new Date()
    };
    await DB.add('work_days', newDay);
    dayData = newDay;
  }

  // If marking as completed, create pending payment with bonus
  if (newStatus === 'completed') {
    await createPendingPayment(curDate, dayData.hours || 0, bonus);
  }

  // If un-completing, remove pending payment
  if (status === 'completed' && newStatus === 'planned') {
    await removePendingPayment(curDate);
  }

  toast('Day status updated', 'success');
  loadDayDetail();
  loadCalendar();
  loadPayroll();
}

// Create pending payment for completed day
async function createPendingPayment(date, hours, bonus = 0) {
  console.log('createPendingPayment called:', { date, hours, bonus, userId });
  try {
    // Check if payment already exists
    const existing = await DB.getAll('payroll', [
      { field: 'userId', value: userId },
      { field: 'date', value: date }
    ]);
    console.log('Existing payroll entries:', existing);

    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
    const amount = (hours * rate) + bonus;
    console.log('Payment calc:', { rate, bonus, amount });

    if (existing.length > 0) {
      // Update if pending
      if (existing[0].status === 'pending') {
        await DB.update('payroll', existing[0].id, { hours, bonus, amount });
        console.log('Updated existing payment:', existing[0].id);
      }
    } else {
      // Create new
      const newId = await DB.add('payroll', {
        userId: userId,
        date: date,
        hours: hours,
        bonus: bonus,
        amount: amount,
        status: 'pending',
        createdAt: new Date()
      });
      console.log('Created new pending payment:', newId);
    }
  } catch (e) {
    console.error('createPendingPayment error:', e);
  }
}

// Remove pending payment
async function removePendingPayment(date) {
  const existing = await DB.getAll('payroll', [
    { field: 'userId', value: userId },
    { field: 'date', value: date },
    { field: 'status', value: 'pending' }
  ]);

  for (const p of existing) {
    await DB.delete('payroll', p.id);
  }
}

// Save day report (hours + report text)
async function saveDayReport() {
  const hours = parseFloat(document.getElementById('dayHours').value) || 0;
  const report = document.getElementById('reportTxt').value.trim();

  const existing = await DB.getAll('work_days', [
    { field: 'userId', value: userId },
    { field: 'date', value: curDate }
  ]);

  const bonus = await calcBonus(userId, curDate);
  let dayStatus = 'planned';
  if (existing.length > 0) {
    dayStatus = existing[0].status;
    await DB.update('work_days', existing[0].id, { hours, report, bonus });
  } else {
    await DB.add('work_days', {
      userId: userId,
      date: curDate,
      status: 'planned',
      hours: hours,
      report: report,
      bonus: bonus,
      createdAt: new Date()
    });
  }

  // If day is completed, update the pending payment with bonus
  if (dayStatus === 'completed') {
    await createPendingPayment(curDate, hours, bonus);
  }

  toast('Report saved!', 'success');
  loadDayDetail();
  loadCalendar();
  loadPayroll();
  loadPaymentSummary();
}

// Plan next 7 days as work days
async function planNextWeek() {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const existing = await DB.getAll('work_days', [
      { field: 'userId', value: userId },
      { field: 'date', value: dateStr }
    ]);

    if (existing.length === 0) {
      await DB.add('work_days', {
        userId: userId,
        date: dateStr,
        status: 'planned',
        hours: 0,
        report: '',
        createdAt: new Date()
      });
    }
  }

  toast('Next 7 days planned!', 'success');
  loadCalendar();
}

// --- TASKS ---
async function loadTasks() {
  try {
    const tasks = await DB.getDailyTasks(userId, curDate);
    const presets = await DB.getTaskPresets();
    const manualTasks = await DB.getAll('manual_tasks', [
      { field: 'userId', value: userId },
      { field: 'date', value: curDate }
    ]);

  const presetDone = tasks.filter(t => t.done).length;
  const manualDone = manualTasks.filter(t => t.done).length;
  const totalTasks = presets.length + manualTasks.length;
  const totalDone = presetDone + manualDone;

  document.getElementById('taskProg').textContent = `${totalDone}/${totalTasks}`;

  let html = '';

  // Preset tasks - clickable to toggle
  presets.forEach(p => {
    const t = tasks.find(x => x.taskId === p.id);
    const isDone = t?.done || false;
    const taskDocId = t?.id || null;
    html += `<div class="task-item ${isDone ? 'done' : ''}" onclick="togglePresetTask('${p.id}', '${taskDocId}', ${isDone})" style="cursor:pointer">
      <span style="color:${isDone ? '#0f0' : '#f55'}">${isDone ? '✓' : '○'}</span>
      <span class="task-name">${p.name}${p.operative ? ' <span style="color:#4CAF50;font-weight:bold;font-size:9px">[OPERATIVE]</span>' : ''}</span>
      ${p.guide || p.images || p.video ? '<span style="color:#666;font-size:10px">(has guide)</span>' : ''}
    </div>`;
  });

  // Manual/custom tasks - clickable to toggle
  manualTasks.forEach(m => {
    const bonusLabel = m.bonus > 0 ? `<span style="color:#0f0;font-weight:bold;margin-left:5px">+$${m.bonus}</span>` : '';
    html += `<div class="task-item ${m.done ? 'done' : ''}" style="${m.bonus > 0 ? 'border-left:3px solid #0f0' : ''};cursor:pointer">
      <span style="color:${m.done ? '#0f0' : '#f55'}" onclick="toggleManualTask('${m.id}', ${!m.done})">${m.done ? '✓' : '○'}</span>
      <span class="task-name" onclick="toggleManualTask('${m.id}', ${!m.done})">${m.name}${bonusLabel}</span>
      <button class="btn btn-sm" style="margin-left:auto;padding:2px 6px;font-size:9px" onclick="event.stopPropagation();deleteManualTask('${m.id}')">×</button>
    </div>`;
  });

  // Add task form
  html += `
    <div style="margin-top:15px;padding-top:10px;border-top:1px solid #222">
      <div id="addTaskForm" style="display:none;margin-bottom:10px">
        <input type="text" class="form-input" id="newTaskName" placeholder="Task name..." style="margin-bottom:5px">
        <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px">
          <label style="font-size:10px;color:#0f0">Bonus $:</label>
          <input type="number" class="form-input" id="newTaskBonus" placeholder="0" style="width:60px" min="0" step="0.5">
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveManualTask()">Add</button>
        <button class="btn btn-sm" onclick="hideAddTask()">Cancel</button>
      </div>
      <button class="btn btn-sm" id="addTaskBtn" onclick="showAddTask()">+ Add Task</button>
    </div>
  `;

  document.getElementById('taskList').innerHTML = html || '<div class="empty-state">No tasks</div>';

    // Calculate and return bonus
    const completedBonus = manualTasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);
    const bonusDisplay = document.getElementById('dayBonusDisplay');
    if (bonusDisplay) bonusDisplay.textContent = '$' + completedBonus;

    return completedBonus;
  } catch (e) {
    console.error('Tasks error:', e);
    document.getElementById('taskList').innerHTML = '<div class="empty-state">Error loading tasks</div>';
    return 0;
  }
}

// Toggle preset task done/undone
async function togglePresetTask(presetId, taskDocId, currentDone) {
  console.log('togglePresetTask called:', presetId, taskDocId, currentDone);
  try {
    if (taskDocId && taskDocId !== 'null') {
      // Update existing task
      await DB.update('daily_tasks', taskDocId, { done: !currentDone });
    } else {
      // Create new task record
      await DB.add('daily_tasks', {
        userId: userId,
        date: curDate,
        taskId: presetId,
        done: true
      });
    }
    loadTasks();
  } catch (e) {
    console.error('Toggle task error:', e);
    toast('Error toggling task', 'error');
  }
}

function showAddTask() {
  document.getElementById('addTaskForm').style.display = 'block';
  document.getElementById('addTaskBtn').style.display = 'none';
  document.getElementById('newTaskName').focus();
}

function hideAddTask() {
  document.getElementById('addTaskForm').style.display = 'none';
  document.getElementById('addTaskBtn').style.display = 'inline-block';
  document.getElementById('newTaskName').value = '';
  const bonusInput = document.getElementById('newTaskBonus');
  if (bonusInput) bonusInput.value = '';
}

async function saveManualTask() {
  const name = document.getElementById('newTaskName').value.trim();
  if (!name) return toast('Enter task name', 'error');

  const bonus = parseFloat(document.getElementById('newTaskBonus')?.value) || 0;

  await DB.add('manual_tasks', {
    userId: userId,
    date: curDate,
    name: name,
    bonus: bonus,
    done: false
  });

  hideAddTask();
  await syncBonusAndPayroll(userId, curDate);
  loadTasks();
  loadDayDetail();
  toast('Task added', 'success');
}

async function toggleManualTask(id, done) {
  console.log('toggleManualTask called:', id, done);
  try {
    await DB.update('manual_tasks', id, { done });
    await syncBonusAndPayroll(userId, curDate);
    loadTasks();
    loadDayDetail();
    loadPayroll();
    loadPaymentSummary();
  } catch (e) {
    console.error('Toggle manual task error:', e);
    toast('Error toggling task', 'error');
  }
}

async function deleteManualTask(id) {
  if (await confirmDialog('Delete this task?')) {
    await DB.delete('manual_tasks', id);
    await syncBonusAndPayroll(userId, curDate);
    loadTasks();
    loadDayDetail();
    loadPayroll();
    loadPaymentSummary();
    toast('Task deleted', 'success');
  }
}


// --- PAYROLL ---
async function loadPayroll() {
  try {
    // Get payroll without orderBy to avoid index requirement
    const payrolls = await DB.getAll('payroll', [{ field: 'userId', value: userId }]);
    const pendingPayrolls = payrolls.filter(p => p.status === 'pending').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const paidPayrolls = payrolls.filter(p => p.status === 'paid').sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));

  const pendingAmount = pendingPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = paidPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Update totals
  document.getElementById('pendingTotal').textContent = '$' + pendingAmount.toFixed(2);
  document.getElementById('paidTotal').textContent = '$' + paidAmount.toFixed(2) + ' paid';

  // Pending payments
  let pendHtml = '';
  pendingPayrolls.forEach(p => {
    pendHtml += `<div class="payroll-item">
      <div style="flex:1">
        <div class="payroll-amount">$${(p.amount || 0).toFixed(2)}</div>
        <div class="payroll-info">${p.date || 'Unknown date'} • ${p.hours || 0}h${p.bonus > 0 ? ' + $' + p.bonus + ' bonus' : ''}</div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="markPaid('${p.id}')">Mark Paid</button>
    </div>`;
  });
  document.getElementById('payrollPending').innerHTML = pendHtml || '<div class="empty-state">No pending payments</div>';

  // History
  let histHtml = '';
  paidPayrolls.forEach(p => {
    const paidDate = p.paidAt ? new Date(p.paidAt.seconds * 1000).toLocaleDateString() : '-';
    histHtml += `<div class="payroll-item">
      <div style="flex:1">
        <div class="payroll-amount">$${(p.amount || 0).toFixed(2)}</div>
        <div class="payroll-info">${p.date || ''} • Paid: ${paidDate}</div>
      </div>
      <span class="payroll-status paid">Paid</span>
    </div>`;
  });
  document.getElementById('payrollHistory').innerHTML = histHtml || '<div class="empty-state">No payment history</div>';
  } catch (e) {
    console.error('Payroll error:', e);
    document.getElementById('payrollPending').innerHTML = '<div class="empty-state">Error loading payroll</div>';
    document.getElementById('payrollHistory').innerHTML = '';
  }
}

async function markPaid(id) {
  if (await confirmDialog('Mark this payment as paid?')) {
    await DB.update('payroll', id, { status: 'paid', paidAt: new Date() });
    toast('Payment marked as paid', 'success');
    loadPayroll();
    loadPaymentSummary();
  }
}

// --- SYNC PAYROLL: create missing payroll records for all work days with hours ---
async function recalcAllPending() {
  try {
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;

    const allPayrolls = await DB.getAll('payroll');
    const allWorkDays = await DB.getAll('work_days');
    const allManualTasks = await DB.getAll('manual_tasks');

    // Get admin users to exclude
    const snapshot = await DB.db.collection('users').get();
    const adminUsers = [];
    snapshot.forEach(doc => { if (doc.data().role === 'admin') adminUsers.push(doc.id); });

    // Build bonus lookup from manual_tasks: key = "userId_date" -> bonus sum
    const bonusMap = {};
    allManualTasks.filter(t => t.done && t.bonus > 0).forEach(t => {
      const key = `${t.userId}_${t.date}`;
      bonusMap[key] = (bonusMap[key] || 0) + (t.bonus || 0);
    });

    // All completed days where hours were logged, excluding admins
    const workedDays = allWorkDays.filter(w => {
      const bonus = bonusMap[`${w.userId}_${w.date}`] || w.bonus || 0;
      return w.status === 'completed' && ((w.hours || 0) > 0 || bonus > 0) && !adminUsers.includes(w.userId);
    });

    for (const wd of workedDays) {
      const hours = wd.hours || 0;
      // Use manual_tasks bonus (source of truth), fallback to work_days.bonus
      const bonus = bonusMap[`${wd.userId}_${wd.date}`] || wd.bonus || 0;
      const correctAmount = (hours * rate) + bonus;

      // Also sync work_days.bonus if it differs
      if (Math.abs((wd.bonus || 0) - bonus) > 0.001) {
        await DB.update('work_days', wd.id, { bonus });
      }

      const existing = allPayrolls.find(p => p.userId === wd.userId && p.date === wd.date);

      if (!existing) {
        await DB.add('payroll', {
          userId: wd.userId,
          date: wd.date,
          hours: hours,
          bonus: bonus,
          amount: correctAmount,
          status: 'pending',
          createdAt: new Date()
        });
        console.log(`Created missing payment: ${wd.userId} ${wd.date} -> $${correctAmount}`);
      } else if (existing.status === 'pending') {
        if (Math.abs((existing.amount || 0) - correctAmount) > 0.001) {
          await DB.update('payroll', existing.id, { hours, bonus, amount: correctAmount });
          console.log(`Fixed payment ${existing.id}: ${wd.userId} ${wd.date} -> $${correctAmount}`);
        }
      }
    }
  } catch (e) {
    console.error('recalcAllPending error:', e);
  }
}

// --- PAYMENT SUMMARY (all assistants) ---
async function loadPaymentSummary() {
  try {
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;

    const allWorkDays = await DB.getAll('work_days');
    const allPayrolls = await DB.getAll('payroll');
    const allManualTasks = await DB.getAll('manual_tasks');

    // Build bonus lookup from manual_tasks
    const bonusMap = {};
    allManualTasks.filter(t => t.done && t.bonus > 0).forEach(t => {
      const key = `${t.userId}_${t.date}`;
      bonusMap[key] = (bonusMap[key] || 0) + (t.bonus || 0);
    });

    // Get admin users to exclude them
    const snapshot = await DB.db.collection('users').get();
    const adminUsers = [];
    snapshot.forEach(doc => { if (doc.data().role === 'admin') adminUsers.push(doc.id); });
    // All completed days with hours or bonus logged, excluding admins
    const workedDays = allWorkDays.filter(w => {
      const bonus = bonusMap[`${w.userId}_${w.date}`] || w.bonus || 0;
      return w.status === 'completed' && ((w.hours || 0) > 0 || bonus > 0) && !adminUsers.includes(w.userId);
    });

    // Group by userId with day details
    const byUser = {};
    workedDays.forEach(wd => {
      const uid = wd.userId || 'unknown';
      if (!byUser[uid]) byUser[uid] = { totalEarned: 0, totalPaid: 0, unpaidDays: [], paidDays: [] };
      const hours = wd.hours || 0;
      const bonus = bonusMap[`${wd.userId}_${wd.date}`] || wd.bonus || 0;
      const dayAmount = (hours * rate) + bonus;
      byUser[uid].totalEarned += dayAmount;

      const payrollEntry = allPayrolls.find(p => p.userId === wd.userId && p.date === wd.date && p.status === 'paid');
      if (payrollEntry) {
        byUser[uid].totalPaid += (payrollEntry.amount || 0);
        byUser[uid].paidDays.push({ date: wd.date, hours, bonus, amount: dayAmount, report: wd.report || '' });
      } else {
        byUser[uid].unpaidDays.push({ date: wd.date, hours, bonus, amount: dayAmount, report: wd.report || '', status: wd.status });
      }
    });

    let grandTotalOwed = 0;
    const userIds = Object.keys(byUser).sort();
    userIds.forEach(uid => {
      byUser[uid].owed = byUser[uid].totalEarned - byUser[uid].totalPaid;
      grandTotalOwed += byUser[uid].owed;
    });

    document.getElementById('summaryTotalPending').textContent = '$' + grandTotalOwed.toFixed(2) + ' total owed';

    if (userIds.length === 0) {
      document.getElementById('paymentSummary').innerHTML = '<div class="empty-state">No work days with hours</div>';
      return;
    }

    let html = '';
    userIds.forEach(uid => {
      const u = byUser[uid];
      if (u.owed <= 0) return;

      // Sort unpaid days by date descending
      u.unpaidDays.sort((a, b) => b.date.localeCompare(a.date));

      // Build day rows
      let daysHtml = '';
      u.unpaidDays.forEach(d => {
        const bonusStr = d.bonus > 0 ? ` + $${d.bonus} bonus` : '';
        const reportHtml = d.report ? `<div style="color:#888;font-size:11px;margin-top:4px;padding:6px 8px;background:#0a0a0a;border-radius:3px;white-space:pre-wrap">${escapeHtml(d.report)}</div>` : '';
        const editId = `edit-${uid}-${d.date}`;
        daysHtml += `<div style="padding:8px 0;border-bottom:1px solid #1a1a1a">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="color:#0f0;font-family:'Courier New',monospace">${d.date}</span>
              <span style="color:#666;font-size:11px;margin-left:8px">${d.hours}h${bonusStr}</span>
              <span style="color:#ff0;font-weight:bold;margin-left:8px">$${d.amount.toFixed(2)}</span>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-sm btn-primary" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation(); payDay('${uid}','${d.date}')">Pay</button>
              <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation(); document.getElementById('${editId}').style.display = document.getElementById('${editId}').style.display === 'none' ? 'flex' : 'none'">Edit</button>
              <button class="btn btn-sm" style="font-size:10px;padding:3px 8px;border-color:#f55;color:#f55" onclick="event.stopPropagation(); deleteDay('${uid}','${d.date}')">Del</button>
            </div>
          </div>
          ${reportHtml}
          <div id="${editId}" style="display:none;flex-wrap:wrap;gap:6px;margin-top:6px;padding:8px;background:#111;border:1px solid #333;border-radius:4px">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%">
              <label style="color:#666;font-size:11px">Hours:</label>
              <input type="number" id="${editId}-hours" value="${d.hours}" step="0.5" min="0" max="24" style="width:60px;background:#000;border:1px solid #333;color:#0f0;padding:4px;font-size:12px">
              <label style="color:#666;font-size:11px">Bonus $:</label>
              <input type="number" id="${editId}-bonus" value="${d.bonus}" step="1" min="0" style="width:60px;background:#000;border:1px solid #333;color:#ff0;padding:4px;font-size:12px">
            </div>
            <div style="width:100%;margin-top:4px">
              <textarea id="${editId}-report" style="width:100%;background:#000;border:1px solid #333;color:#999;padding:4px;font-size:11px;min-height:50px;resize:vertical">${escapeHtml(d.report)}</textarea>
            </div>
            <button class="btn btn-sm btn-primary" style="font-size:11px;margin-top:4px" onclick="event.stopPropagation(); saveDay('${uid}','${d.date}','${editId}')">Save</button>
          </div>
        </div>`;
      });

      const detailId = 'summary-detail-' + uid;
      html += `<div style="border-bottom:1px solid #333;padding:12px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="document.getElementById('${detailId}').style.display = document.getElementById('${detailId}').style.display === 'none' ? 'block' : 'none'">
          <div>
            <div style="display:flex;align-items:center;gap:10px">
              <strong style="color:#0f0;font-family:'Courier New',monospace;font-size:15px">@${uid}</strong>
              <span style="color:#ff0;font-size:16px;font-weight:bold">$${u.owed.toFixed(2)}</span>
            </div>
            <div style="color:#666;font-size:11px;margin-top:3px">${u.unpaidDays.length} unpaid day${u.unpaidDays.length !== 1 ? 's' : ''} • Total earned: $${u.totalEarned.toFixed(2)} • Paid: $${u.totalPaid.toFixed(2)} • Click to expand</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); markAllPaid('${uid}')">Pay $${u.owed.toFixed(2)}</button>
        </div>
        <div id="${detailId}" style="display:none;margin-top:10px;padding:8px;background:#0d0d0d;border:1px solid #222;border-radius:4px;max-height:400px;overflow-y:auto">
          ${daysHtml}
        </div>
      </div>`;
    });

    if (!html) {
      html = '<div class="empty-state">All payments up to date</div>';
    }

    document.getElementById('paymentSummary').innerHTML = html;
  } catch (e) {
    console.error('Payment summary error:', e);
    document.getElementById('paymentSummary').innerHTML = '<div class="empty-state">Error loading summary</div>';
  }
}

// Pay single day
async function payDay(assistantId, date) {
  if (await confirmDialog(`Mark ${date} for @${assistantId} as paid?`)) {
    try {
      const payrolls = await DB.getAll('payroll', [
        { field: 'userId', value: assistantId },
        { field: 'date', value: date }
      ]);
      const pending = payrolls.filter(p => p.status === 'pending');
      if (pending.length > 0) {
        await DB.update('payroll', pending[0].id, { status: 'paid', paidAt: new Date() });
      } else {
        // Create paid record if none exists
        const rateSetting = await DB.getSetting('hourly_rate');
        const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
        const wds = await DB.getAll('work_days', [{ field: 'userId', value: assistantId }, { field: 'date', value: date }]);
        const wd = wds[0];
        const hours = wd?.hours || 0;
        const bonus = await calcBonus(assistantId, date);
        await DB.add('payroll', { userId: assistantId, date, hours, bonus, amount: (hours * rate) + bonus, status: 'paid', paidAt: new Date() });
      }
      toast(`${date} marked as paid`, 'success');
      loadPaymentSummary();
      loadPayroll();
    } catch (e) {
      console.error('payDay error:', e);
      toast('Error', 'error');
    }
  }
}

// Delete day (remove work_day + payroll record)
async function deleteDay(assistantId, date) {
  if (await confirmDialog(`Delete work day ${date} for @${assistantId}? This removes the day and its payment.`)) {
    try {
      // Delete work_day
      const wds = await DB.getAll('work_days', [{ field: 'userId', value: assistantId }, { field: 'date', value: date }]);
      for (const w of wds) await DB.delete('work_days', w.id);
      // Delete payroll
      const payrolls = await DB.getAll('payroll', [{ field: 'userId', value: assistantId }, { field: 'date', value: date }]);
      for (const p of payrolls) await DB.delete('payroll', p.id);
      toast(`${date} deleted`, 'success');
      loadPaymentSummary();
      loadPayroll();
      loadCalendar();
    } catch (e) {
      console.error('deleteDay error:', e);
      toast('Error', 'error');
    }
  }
}

// Edit day (update hours, bonus, report)
async function saveDay(assistantId, date, editId) {
  try {
    const hours = parseFloat(document.getElementById(editId + '-hours').value) || 0;
    const bonus = parseFloat(document.getElementById(editId + '-bonus').value) || 0;
    const report = document.getElementById(editId + '-report').value.trim();

    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
    const amount = (hours * rate) + bonus;

    // Update work_day
    const wds = await DB.getAll('work_days', [{ field: 'userId', value: assistantId }, { field: 'date', value: date }]);
    if (wds.length > 0) {
      await DB.update('work_days', wds[0].id, { hours, bonus, report });
    }

    // Update payroll if exists
    const payrolls = await DB.getAll('payroll', [{ field: 'userId', value: assistantId }, { field: 'date', value: date }]);
    const pending = payrolls.filter(p => p.status === 'pending');
    if (pending.length > 0) {
      await DB.update('payroll', pending[0].id, { hours, bonus, amount });
    }

    toast(`${date} updated: $${amount.toFixed(2)}`, 'success');
    loadPaymentSummary();
    loadPayroll();
  } catch (e) {
    console.error('saveDay error:', e);
    toast('Error saving', 'error');
  }
}

async function markAllPaid(assistantId) {
  if (await confirmDialog(`Mark ALL pending payments for @${assistantId} as paid?`)) {
    try {
      const payrolls = await DB.getAll('payroll', [
        { field: 'userId', value: assistantId },
      ]);
      const pending = payrolls.filter(p => p.status === 'pending');
      for (const p of pending) {
        await DB.update('payroll', p.id, { status: 'paid', paidAt: new Date() });
      }
      toast(`${pending.length} payment(s) for @${assistantId} marked as paid`, 'success');
      loadPayroll();
      loadPaymentSummary();
    } catch (e) {
      console.error('Mark all paid error:', e);
      toast('Error marking payments', 'error');
    }
  }
}

// --- DATA CLEANUP & SEED (call from console: cleanAndSeed()) ---
async function cleanAndSeed() {
  if (!await confirmDialog('DELETE all old payroll + work_days data and create fresh data from Feb 16?')) return;

  try {
    toast('Cleaning old data...', 'info');

    // 1. Delete ALL payroll records
    const allPayrolls = await DB.getAll('payroll');
    for (const p of allPayrolls) {
      await DB.delete('payroll', p.id);
    }
    console.log(`Deleted ${allPayrolls.length} payroll records`);

    // 2. Delete ALL work_days records that have hours or amounts
    const allWorkDays = await DB.getAll('work_days');
    for (const w of allWorkDays) {
      await DB.delete('work_days', w.id);
    }
    console.log(`Deleted ${allWorkDays.length} work_days records`);

    // 3. Delete ALL manual_tasks records
    const allManualTasks = await DB.getAll('manual_tasks');
    for (const t of allManualTasks) {
      await DB.delete('manual_tasks', t.id);
    }
    console.log(`Deleted ${allManualTasks.length} manual_tasks records`);

    // 4. Delete ALL daily_tasks records
    const allDailyTasks = await DB.getAll('daily_tasks');
    for (const t of allDailyTasks) {
      await DB.delete('daily_tasks', t.id);
    }
    console.log(`Deleted ${allDailyTasks.length} daily_tasks records`);

    // 5. Seed new data for "muy" from Feb 16
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 2.5;

    const seedData = [
      { date: '2026-02-16', hours: 7, status: 'completed', report: 'Outreach + content work' },
      { date: '2026-02-17', hours: 6, status: 'completed', report: 'Instagram DMs + follow-ups' },
      { date: '2026-02-18', hours: 4, status: 'planned', report: '' },
    ];

    for (const day of seedData) {
      // Create work_day
      await DB.add('work_days', {
        userId: 'muy',
        date: day.date,
        status: day.status,
        hours: day.hours,
        report: day.report,
        bonus: 0,
        createdAt: new Date()
      });

      // Create payroll for completed days
      if (day.status === 'completed' && day.hours > 0) {
        const amount = day.hours * rate;
        await DB.add('payroll', {
          userId: 'muy',
          date: day.date,
          hours: day.hours,
          bonus: 0,
          amount: amount,
          status: 'pending',
          createdAt: new Date()
        });
        console.log(`Created: ${day.date} - ${day.hours}h - $${amount}`);
      }
    }

    toast('Done! Fresh data from Feb 16 created.', 'success');
    loadDaily();
  } catch (e) {
    console.error('cleanAndSeed error:', e);
    toast('Error: ' + e.message, 'error');
  }
}

// --- WALLETS ---
async function loadWallets() {
  const wallets = await DB.getWallets(userId);
  let html = '';
  wallets.forEach(w => {
    html += `<div class="wallet-item">
      <div>
        <div class="wallet-type">${w.type}</div>
        ${w.label ? `<div class="wallet-label">${w.label}</div>` : ''}
        <div class="wallet-address">${w.address}</div>
      </div>
    </div>`;
  });
  document.getElementById('walletList').innerHTML = html || '<div class="empty-state">No wallets added by assistant</div>';
}

// --- CALENDAR ---
async function loadCalendar() {
  console.log('loadCalendar called');
  try {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    console.log('Calendar year:', year, 'month:', month);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;

    // Get all work days for this month
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const endDate = `${year}-${String(month+1).padStart(2,'0')}-31`;

    let logs = [];
    try {
      logs = await DB.getAll('work_days', [{ field: 'userId', value: userId }]);
    } catch (e) {
      console.error('Error loading work_days:', e);
    }
    const monthLogs = logs.filter(l => l.date && l.date >= startDate && l.date <= endDate);

    // Fetch manual_tasks for bonus calculation
    const monthManualTasks = await DB.getAll('manual_tasks', [{ field: 'userId', value: userId }]);
    const monthBonusMap = {};
    monthManualTasks.filter(t => t.done && t.bonus > 0).forEach(t => {
      monthBonusMap[t.date] = (monthBonusMap[t.date] || 0) + (t.bonus || 0);
    });

    // Calculate month stats
    let totalHours = 0;
    let totalBonus = 0;
    let daysWorked = 0;
    const daysData = {};

    monthLogs.forEach(log => {
      const dayHours = log.hours || 0;
      const dayBonus = monthBonusMap[log.date] || log.bonus || 0;
      totalHours += dayHours;
      totalBonus += dayBonus;
      if (log.status === 'completed') daysWorked++;
      daysData[log.date] = { hours: dayHours, status: log.status, bonus: dayBonus };
    });

    totalHours = Math.round(totalHours * 10) / 10;
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
    const earned = (totalHours * rate) + totalBonus;

    document.getElementById('monthHours').textContent = totalHours + 'h';
    document.getElementById('monthEarned').textContent = '$' + earned.toFixed(2);
    document.getElementById('monthDays').textContent = daysWorked;

    // Build calendar grid - ALWAYS show days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    let html = '';

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="calendar-day other-month"></div>`;
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === today;
      const dayData = daysData[dateStr];
      const isSelected = dateStr === curDate;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';

      // Status styling
      if (dayData) {
        if (dayData.status === 'completed') classes += ' cal-completed';
        else if (dayData.status === 'dayoff') classes += ' cal-dayoff';
        else if (dayData.status === 'planned') classes += ' cal-planned';
      }

      html += `<div class="${classes}" onclick="selectDate('${dateStr}')">
        <div class="day-num">${d}</div>
        ${dayData && dayData.hours > 0 ? `<div class="day-hours">${dayData.hours}h</div>` : ''}
      </div>`;
    }

    console.log('Calendar HTML length:', html.length);
    document.getElementById('calendarGrid').innerHTML = html;

    // Daily history - detailed version with tasks
    let histHtml = '';
    if (monthLogs.length === 0) {
      histHtml = '<div class="empty-state">No work logged this month</div>';
    } else {
      // Fetch all tasks data for the month
      const allDailyTasks = await DB.getAll('daily_tasks', [{ field: 'userId', value: userId }]);
      const allManualTasks = await DB.getAll('manual_tasks', [{ field: 'userId', value: userId }]);
      const presets = await DB.getTaskPresets();
      const presetsMap = {};
      presets.forEach(p => presetsMap[p.id] = { name: p.name, operative: p.operative });

      const sortedLogs = [...monthLogs].sort((a, b) => b.date.localeCompare(a.date));

      for (const log of sortedLogs.slice(0, 20)) {
        const dayHours = log.hours || 0;
        const reportPreview = log.report ? log.report.substring(0, 80) + (log.report.length > 80 ? '...' : '') : '';

        // Get tasks for this day (deduplicated)
        const dayPresetTasks = allDailyTasks.filter(t => t.date === log.date && t.done);
        const dayManualTasks = allManualTasks.filter(t => t.date === log.date);

        // Calculate bonus
        const dayBonus = dayManualTasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);
        const dayEarned = ((dayHours * rate) + dayBonus).toFixed(2);

        // Build tasks HTML (deduplicate by taskId/name)
        let tasksHtml = '';
        const shownTasks = new Set();
        dayPresetTasks.forEach(t => {
          if (shownTasks.has(t.taskId)) return;
          shownTasks.add(t.taskId);
          const preset = presetsMap[t.taskId];
          const name = preset ? preset.name : t.taskId;
          const opTag = preset && preset.operative ? ' <span style="color:#4CAF50;font-weight:bold;font-size:9px">[OPERATIVE]</span>' : '';
          tasksHtml += `<span class="history-task done">✓ ${name}${opTag}</span>`;
        });
        dayManualTasks.filter(t => t.done).forEach(t => {
          if (shownTasks.has(t.name)) return;
          shownTasks.add(t.name);
          const bonusClass = t.bonus > 0 ? ' bonus' : '';
          const bonusLabel = t.bonus > 0 ? ` +$${t.bonus}` : '';
          tasksHtml += `<span class="history-task done${bonusClass}">✓ ${t.name}${bonusLabel}</span>`;
        });

        histHtml += `<div class="history-item" onclick="selectDate('${log.date}')">
          <div class="history-header">
            <span class="history-date">${log.date}</span>
            <div class="history-stats">
              <span class="history-hours">${dayHours}h</span>
              <span class="history-earned">$${dayEarned}</span>
              ${dayBonus > 0 ? `<span class="history-bonus">+$${dayBonus} bonus</span>` : ''}
            </div>
          </div>
          ${tasksHtml ? `<div class="history-tasks-list">${tasksHtml}</div>` : ''}
          ${reportPreview ? `<div class="history-report">${reportPreview}</div>` : ''}
        </div>`;
      }
    }
    document.getElementById('dailyHistory').innerHTML = histHtml;

  } catch (e) {
    console.error('Calendar error:', e);
    document.getElementById('calendarGrid').innerHTML = '<div class="empty-state">Error loading calendar</div>';
  }
}

// ============================================
// AI CHAT & KNOWLEDGE BASE
// ============================================

let chatMessages = [];
let aiContextCache = null;

// Initialize AI Chat
async function initAIChat() {
  try {
    // Load ALL chat history from all users
    const chatHistory = await DB.getAll('ai_chat_history', []);

    // Sort by timestamp
    chatMessages = chatHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    console.log('Loaded chat history:', chatMessages.length, 'messages');

    // Display messages
    let html = `<div class="chat-msg ai">
      <div class="chat-msg-bubble">Hi Boss! I'm your AI Expert Assistant. Ask me anything!</div>
    </div>`;

    chatMessages.forEach(m => {
      const sender = m.userId && m.userId !== 'admin' && m.role === 'user' ? `<strong>[${m.userId}]</strong> ` : '';
      html += `<div class="chat-msg ${m.role === 'ai' ? 'ai' : 'user'}">
        <div class="chat-msg-bubble">${sender}${escapeHtml(m.content)}</div>
      </div>`;
    });

    document.getElementById('chatMsgs').innerHTML = html;
    document.getElementById('chatMsgs').scrollTop = document.getElementById('chatMsgs').scrollHeight;
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

// Search chat history for relevant past conversations
function searchChatHistory(query, messages) {
  if (!messages || messages.length === 0) return [];

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (queryWords.length === 0) return [];

  const scored = messages.map(m => {
    const text = m.content.toLowerCase();
    let score = 0;

    queryWords.forEach(word => {
      if (text.includes(word)) score += 1;
    });

    return { ...m, score };
  });

  // Return top 10 most relevant messages (both Q and A for context)
  const relevant = scored.filter(m => m.score > 0).sort((a, b) => b.score - a.score);

  // Get messages with their context (previous/next message for Q&A pairs)
  const result = [];
  const addedIndexes = new Set();

  relevant.slice(0, 5).forEach(m => {
    const idx = messages.findIndex(msg => msg.timestamp === m.timestamp);
    if (idx >= 0 && !addedIndexes.has(idx)) {
      // Add the message and its pair (Q gets A, A gets Q)
      result.push(messages[idx]);
      addedIndexes.add(idx);

      if (idx > 0 && !addedIndexes.has(idx - 1)) {
        result.push(messages[idx - 1]);
        addedIndexes.add(idx - 1);
      }
      if (idx < messages.length - 1 && !addedIndexes.has(idx + 1)) {
        result.push(messages[idx + 1]);
        addedIndexes.add(idx + 1);
      }
    }
  });

  return result.sort((a, b) => a.timestamp - b.timestamp).slice(0, 10);
}

// Search knowledge base for relevant entries
async function searchKnowledge(query) {
  const allKnowledge = await DB.getKnowledge();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = allKnowledge.map(k => {
    const text = ((k.keywords || k.question || '') + ' ' + (k.content || k.answer || '')).toLowerCase();
    let score = 0;

    queryWords.forEach(word => {
      if (text.includes(word)) score += 1;
      if ((k.keywords || k.question || '').toLowerCase().includes(word)) score += 2;
    });

    return { ...k, score };
  });

  return scored
    .filter(k => k.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// Build AI context with smart retrieval
async function buildAIContext(userQuery) {
  let context = `You are the AI EXPERT ASSISTANT for TEAM. You help boss Mori manage everything.

YOUR CAPABILITIES:
- You have access to a knowledge database that gets searched for each question
- You remember our conversation history
- You learn from information added to the database
- You actively improve by asking follow-up questions

RULES:
- Answer based on the RELEVANT KNOWLEDGE below - this is your database
- If no relevant knowledge found, say "I don't have information about that in my database yet"
- Be helpful, professional, concise
- Never make up specific info not in your database

LEARNING BEHAVIOR - IMPORTANT:
- After answering, sometimes ask a follow-up question to learn more
- Ask things like: "Should I remember this for next time?" or "Want to tell me more details about this?"
- When you don't have info, ask: "Want to explain this so I know for next time?"
- If topic is unclear, ask clarifying questions to understand better
- Goal: Become smarter with each conversation by learning from Boss

`;

  // SMART RETRIEVAL: Search for relevant knowledge
  const relevantKnowledge = await searchKnowledge(userQuery);
  if (relevantKnowledge.length > 0) {
    context += "=== RELEVANT KNOWLEDGE FROM DATABASE ===\n";
    relevantKnowledge.forEach(k => {
      const title = k.keywords || k.question || k.title || 'Info';
      const content = k.content || k.answer || '';
      context += `[${title}]\n${content}\n`;

      // Training data from Boss feedback - PRIORITY
      if (k.type === 'training' || k.source === 'telegram' || k.source === 'telegram_training') {
        if (k.moriFeedback) {
          context += `\n🎯 BOSS SAYS: ${k.moriFeedback}\n`;
        }
        if (k.recommendedAnswer) {
          context += `\n🎯 CORRECT ANSWER: ${k.recommendedAnswer}\n`;
        }
        if (k.concerns && k.concerns.length > 0) {
          context += `⚠️ AVOID: ${k.concerns.join('; ')}\n`;
        }
        if (k.positives && k.positives.length > 0) {
          context += `✓ GOOD: ${k.positives.join('; ')}\n`;
        }
      }

      // Include example Q&A if available
      if (k.examples) {
        context += `\nEXAMPLE HOW TO ANSWER:\n${k.examples}\n`;
      }
      context += '\n';
    });
  } else {
    context += "=== NO MATCHING KNOWLEDGE FOUND ===\nNo entries in database match this query.\n\n";
  }

  // Always include active models
  const models = await DB.getAll('models');
  if (models.length > 0) {
    context += "=== ACTIVE MODELS ===\n";
    models.forEach(m => context += `- ${m.name} (${m.status})\n`);
    context += "\n";
  }

  return context;
}

async function sendMsg() {
  const input = document.getElementById('chatIn');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  const today = new Date().toISOString().split('T')[0];

  // Add user message to display
  document.getElementById('chatMsgs').innerHTML += `<div class="chat-msg user">
    <div class="chat-msg-bubble">${escapeHtml(msg)}</div>
  </div>`;

  // Save user message
  await DB.add('ai_chat_history', {
    userId: 'admin',
    date: today,
    role: 'user',
    content: msg,
    timestamp: Date.now()
  });
  chatMessages.push({ role: 'user', content: msg, timestamp: Date.now() });

  // Show typing indicator
  document.getElementById('chatMsgs').innerHTML += `<div class="chat-msg ai" id="aiTyping">
    <div class="chat-msg-bubble"><span class="typing">Thinking</span></div>
  </div>`;
  document.getElementById('chatMsgs').scrollTop = document.getElementById('chatMsgs').scrollHeight;

  try {
    // Build context with smart retrieval based on user's question
    const systemPrompt = await buildAIContext(msg);

    // Search old chat history for relevant past conversations
    const relevantOldChats = searchChatHistory(msg, chatMessages.slice(0, -20)); // Search older messages

    // Recent conversation (last 100 messages for continuity)
    const recentMsgs = chatMessages.slice(-100);

    // Build messages array with relevant old context + recent conversation
    let contextMsgs = [];

    // Add relevant old conversations as context
    if (relevantOldChats.length > 0) {
      const oldContext = relevantOldChats.map(m => `[${new Date(m.timestamp).toLocaleDateString()}] ${m.role === 'user' ? 'Q' : 'A'}: ${m.content}`).join('\n');
      contextMsgs.push({
        role: 'system',
        content: `RELEVANT PAST CONVERSATIONS:\n${oldContext}\n\n---`
      });
    }

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...contextMsgs,
      ...recentMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: msg }
    ];

    const response = await fetch(CONFIG.llm.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.llm.apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'TEAM Admin'
      },
      body: JSON.stringify({
        model: CONFIG.llm.model,
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log('API Response:', data);

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const aiReply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.';

    // Save AI response
    await DB.add('ai_chat_history', {
      userId: 'admin',
      date: today,
      role: 'ai',
      content: aiReply,
      timestamp: Date.now()
    });
    chatMessages.push({ role: 'ai', content: aiReply, timestamp: Date.now() });

    // Send to Telegram and save review with message ID
    const reviewId = Date.now().toString(36);
    const telegramMsgId = await sendTelegramReview(reviewId, msg, aiReply);

    // Save review with telegram message ID
    await DB.set('ai_reviews', reviewId, {
      question: msg,
      aiAnswer: aiReply,
      status: 'pending',
      telegramMsgId: telegramMsgId,
      createdAt: new Date()
    });

    console.log('Review saved:', reviewId, 'telegramMsgId:', telegramMsgId);

    // Update display - with save to KB button
    document.getElementById('aiTyping').outerHTML = `<div class="chat-msg ai">
      <div class="chat-msg-bubble">${escapeHtml(aiReply)}</div>
      <div class="chat-msg-actions">
        <button class="btn btn-sm" onclick="saveToKB('${encodeURIComponent(msg)}', '${encodeURIComponent(aiReply)}')">💾 Save to KB</button>
      </div>
    </div>`;

  } catch (err) {
    console.error('AI Error:', err);
    document.getElementById('aiTyping').outerHTML = `<div class="chat-msg ai">
      <div class="chat-msg-bubble" style="color:#f55">Error: ${err.message || 'Could not get response. Check console.'}</div>
    </div>`;
  }

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';
  document.getElementById('chatMsgs').scrollTop = document.getElementById('chatMsgs').scrollHeight;
}

// Save chat Q&A to Database (training from chat)
async function saveToKB(question, answer) {
  const q = decodeURIComponent(question);
  const a = decodeURIComponent(answer);

  const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5).join(' ');

  await DB.add('knowledge_base', {
    type: 'text',
    keywords: keywords || q.substring(0, 50).toLowerCase(),
    content: `Q: ${q}\nA: ${a}`,
    source: 'chat',
    createdAt: new Date()
  });

  toast('Saved to database!', 'success');
  loadAI();
}

// Toggle form based on knowledge type
function toggleKbType() {
  const type = document.getElementById('kbType').value;
  document.getElementById('kbTextForm').style.display = type === 'text' ? 'block' : 'none';
  document.getElementById('kbFileForm').style.display = type === 'file' ? 'block' : 'none';
}

// Add knowledge to database
async function addKnowledge() {
  const type = document.getElementById('kbType').value;
  let data = { type, createdAt: new Date() };

  if (type === 'text') {
    const keywords = document.getElementById('kbQuestion').value.trim();
    const content = document.getElementById('kbAnswer').value.trim();
    const examples = document.getElementById('kbExamples').value.trim();
    if (!keywords || !content) {
      return toast('Please fill in both fields', 'error');
    }
    data.keywords = keywords.toLowerCase();
    data.content = content;
    if (examples) data.examples = examples;
  } else if (type === 'file') {
    const title = document.getElementById('kbFileTitle').value.trim();
    const content = document.getElementById('kbFileContent').value.trim();
    const examples = document.getElementById('kbFileExamples').value.trim();
    if (!title || !content) {
      return toast('Please fill in both fields', 'error');
    }
    data.keywords = title.toLowerCase();
    data.content = content;
    data.title = title;
    if (examples) data.examples = examples;
  }

  await DB.add('knowledge_base', data);

  // Clear forms
  document.getElementById('kbQuestion').value = '';
  document.getElementById('kbAnswer').value = '';
  document.getElementById('kbExamples').value = '';
  document.getElementById('kbFileTitle').value = '';
  document.getElementById('kbFileContent').value = '';
  document.getElementById('kbFileExamples').value = '';

  toast('Added to database!', 'success');
  loadAI();
}

async function loadAI() {
  // Initialize chat
  await initAIChat();

  // Start checking Telegram for replies (auto-training)
  startTelegramCheck();

  // Load knowledge base list
  const kb = await DB.getKnowledge();

  // Separate training entries from regular entries
  const trainingEntries = kb.filter(k => k.type === 'training' || k.source === 'telegram' || k.source === 'telegram_training');
  const regularEntries = kb.filter(k => k.type !== 'training' && k.source !== 'telegram' && k.source !== 'telegram_training');

  // Knowledge Base list
  let kbHtml = '';

  // Show training entries first with special styling
  if (trainingEntries.length > 0) {
    kbHtml += `<div style="margin-bottom:15px;padding:10px;background:#1a1a00;border:1px solid #ff0;border-radius:4px">
      <div style="color:#ff0;font-weight:bold;margin-bottom:10px">🎓 BOSS TRAINING (${trainingEntries.length})</div>`;

    trainingEntries.forEach(k => {
      const q = k.question || k.keywords || 'Training';
      kbHtml += `<div class="kb-item" style="border-left:3px solid #ff0">
        <div style="color:#0f0;font-weight:bold;margin-bottom:5px">Q: ${escapeHtml(q.substring(0, 100))}</div>`;

      if (k.moriFeedback) {
        kbHtml += `<div style="color:#ff0;font-size:11px;margin:5px 0">💬 Boss: ${escapeHtml(k.moriFeedback.substring(0, 150))}${k.moriFeedback.length > 150 ? '...' : ''}</div>`;
      }

      kbHtml += `<div style="margin-top:8px">
          <button class="btn btn-sm" onclick="viewKB('${k.id}')">View</button>
          <button class="btn btn-sm" onclick="delKB('${k.id}')">Delete</button>
        </div>
      </div>`;
    });

    kbHtml += `</div>`;
  }

  // Regular entries
  regularEntries.forEach(k => {
    const typeIcon = k.type === 'file' ? '📄' : '📝';
    const title = k.keywords || k.question || k.title || 'Entry';
    const content = k.content || k.answer || '';

    kbHtml += `<div class="kb-item">
      <div class="kb-question">
        <span style="margin-right:5px">${typeIcon}</span>
        ${title}
      </div>
      <div class="kb-answer">${escapeHtml(content.substring(0, 200))}${content.length > 200 ? '...' : ''}</div>
      <div style="margin-top:8px">
        <button class="btn btn-sm" onclick="editKB('${k.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delKB('${k.id}')">Delete</button>
      </div>
    </div>`;
  });

  document.getElementById('kbList').innerHTML = kbHtml || '<div class="empty-state">No entries in database. Add information for AI to use.</div>';
}

async function delKB(id) {
  if (await confirmDialog('Delete this knowledge entry?')) {
    await DB.delete('knowledge_base', id);
    toast('Knowledge entry deleted', 'success');
    loadAI();
  }
}

async function viewKB(id) {
  const k = await DB.get('knowledge_base', id);
  if (!k) return toast('Entry not found', 'error');

  const m = document.getElementById('modal');
  document.getElementById('mTitle').textContent = '🎓 Training Detail';
  document.getElementById('mBox').className = 'modal-box large';

  let html = `<div style="max-height:500px;overflow-y:auto">`;

  html += `<div style="margin-bottom:15px">
    <div style="color:#666;font-size:10px">QUESTION:</div>
    <div style="color:#0f0;font-size:14px;font-weight:bold">${escapeHtml(k.question || k.keywords || '')}</div>
  </div>`;

  if (k.aiAnswer) {
    html += `<div style="margin-bottom:15px;padding:10px;background:#1a1a1a;border-radius:4px">
      <div style="color:#666;font-size:10px">AI ANSWERED:</div>
      <div style="color:#999;font-size:12px">${escapeHtml(k.aiAnswer)}</div>
    </div>`;
  }

  if (k.moriFeedback) {
    html += `<div style="margin-bottom:15px;padding:10px;background:#1a1a00;border:1px solid #ff0;border-radius:4px">
      <div style="color:#ff0;font-size:10px">💬 BOSS FEEDBACK:</div>
      <div style="color:#fff;font-size:12px;white-space:pre-wrap">${escapeHtml(k.moriFeedback)}</div>
    </div>`;
  }

  html += `</div>
    <button class="btn btn-primary" onclick="closeModal()">Close</button>`;

  document.getElementById('mBody').innerHTML = html;
  m.classList.add('active');
}

async function editKB(id) {
  const kb = await DB.get('knowledge_base', id);
  modal('kbEdit', kb);
}

function showKbEditModal(kb) {
  const m = document.getElementById('modal');
  document.getElementById('mTitle').textContent = 'Edit Database Entry';
  document.getElementById('mBox').className = 'modal-box large';

  const typeLabel = kb.type === 'file' ? 'Document' : 'Text';
  const keywords = kb.keywords || kb.question || '';
  const content = kb.content || kb.answer || '';
  const examples = kb.examples || '';

  document.getElementById('mBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Type: <span style="color:#0f0">${typeLabel}</span></label>
    </div>
    <div class="form-group">
      <label class="form-label">Keywords:</label>
      <input type="text" class="form-input" id="editKbQ" value="${keywords}">
    </div>
    <div class="form-group">
      <label class="form-label">Content:</label>
      <textarea class="form-textarea" id="editKbA" style="min-height:120px">${content}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Example Q&A:</label>
      <textarea class="form-textarea" id="editKbEx" style="min-height:80px" placeholder="Q: Example question?&#10;A: Example answer...">${examples}</textarea>
    </div>
    <button class="btn btn-primary" onclick="updateKB('${kb.id}')">Update Entry</button>
  `;
  m.classList.add('active');
}

async function updateKB(id) {
  const data = {
    keywords: document.getElementById('editKbQ').value.toLowerCase(),
    content: document.getElementById('editKbA').value,
    examples: document.getElementById('editKbEx').value
  };
  await DB.update('knowledge_base', id, data);
  closeModal();
  loadAI();
}

function answerQ(id, q, aiResponse) {
  modal('answerQ', { id, question: decodeURIComponent(q), aiResponse: decodeURIComponent(aiResponse) });
}

async function dismissQ(id) {
  if (await confirmDialog('Dismiss this question? It won\'t be added to KB.')) {
    await DB.update('uncertain_questions', id, { answered: true, dismissed: true });
    toast('Question dismissed', 'success');
    loadAI();
  }
}

// AI Review functions
async function approveReview(id) {
  // Mark as approved - AI answered correctly
  await DB.update('ai_reviews', id, { status: 'approved', reviewedAt: new Date() });
  toast('AI odpoved schvalena!', 'success');
  loadAI();
}

async function dismissReview(id) {
  // Just dismiss without saving to KB
  await DB.update('ai_reviews', id, { status: 'dismissed', reviewedAt: new Date() });
  toast('Review zahozeno', 'success');
  loadAI();
}

function correctReview(id, question, aiAnswer) {
  // Open modal to correct the answer
  const q = decodeURIComponent(question);
  const a = decodeURIComponent(aiAnswer);

  const m = document.getElementById('modal');
  document.getElementById('mTitle').textContent = 'Opravit AI odpoved';
  document.getElementById('mBox').className = 'modal-box large';

  document.getElementById('mBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Otazka:</label>
      <div style="background:#111;padding:10px;border-radius:4px;color:#0f0">${escapeHtml(q)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">AI odpovdela (spatne):</label>
      <div style="background:#111;padding:10px;border-radius:4px;color:#666;font-size:11px">${escapeHtml(a.substring(0, 200))}...</div>
    </div>
    <div class="form-group">
      <label class="form-label">Spravna odpoved:</label>
      <textarea class="form-textarea" id="correctAnswer" style="min-height:120px" placeholder="Napiste spravnou odpoved..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Klicova slova (pro vyhledavani):</label>
      <input type="text" class="form-input" id="correctKeywords" value="${q.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5).join(' ')}">
    </div>
    <button class="btn btn-primary" onclick="saveCorrection('${id}','${encodeURIComponent(q)}')">Ulozit opravu do databaze</button>
  `;
  m.classList.add('active');
}

async function saveCorrection(reviewId, question) {
  const q = decodeURIComponent(question);
  const answer = document.getElementById('correctAnswer').value.trim();
  const keywords = document.getElementById('correctKeywords').value.trim();

  if (!answer) {
    return toast('Napiste spravnou odpoved', 'error');
  }

  // Save to knowledge base
  await DB.add('knowledge_base', {
    type: 'text',
    keywords: keywords || q.substring(0, 50).toLowerCase(),
    content: `Q: ${q}\nA: ${answer}`,
    source: 'correction',
    createdAt: new Date()
  });

  // Mark review as corrected
  await DB.update('ai_reviews', reviewId, {
    status: 'corrected',
    correction: answer,
    reviewedAt: new Date()
  });

  closeModal();
  toast('Oprava ulozena! AI se nauci.', 'success');

  // Notify via Telegram
  sendTelegramUpdate(`📚 AI Knowledge Updated\n\nQ: ${q}\nCorrect A: ${answer.substring(0, 200)}...`);

  loadAI();
}

// ============================================
// OUTREACH
// ============================================
async function loadOutreach() {
  await loadOutreachAccounts();
  await loadWarmupGuides();
  await loadOfBombex();
  await loadModelOutreach();
  await loadOpeners();
  await loadFollowups();
  await loadScripts();
}

async function loadWarmupGuides() {
  const guide = await DB.getSetting('warmup_guide');
  if (guide?.text) {
    const html = `<div class="box" style="background:#001a00;border-color:#0f0">
      <div class="box-header">Warmup Guide</div>
      <div class="box-body" style="white-space:pre-wrap;font-size:11px">${guide.text}</div>
    </div>`;
    document.getElementById('warmupGuideIg').innerHTML = html;
    document.getElementById('warmupGuideTw').innerHTML = html;
  }
}

async function loadOutreachAccounts() {
  console.log('📋 Loading outreach accounts...');
  let ig = await DB.getAccounts('instagram');
  let tw = await DB.getAccounts('twitter');
  let wc = await DB.getAccounts('webcam');
  let of = await DB.getAccounts('onlyfans');
  let tk = await DB.getAccounts('tiktok');
  console.log('📋 OnlyFans accounts loaded:', of.length, of);

  // Apply IG filters
  const igUsername = document.getElementById('igFilterUsername')?.value?.toLowerCase() || '';
  const igDevice = document.getElementById('igFilterDevice')?.value?.toLowerCase() || '';
  const igLocation = document.getElementById('igFilterLocation')?.value || '';
  const igStatus = document.getElementById('igFilterStatus')?.value || '';

  if (igUsername) ig = ig.filter(a => a.username.toLowerCase().includes(igUsername));
  if (igDevice) ig = ig.filter(a => (a.deviceName || '').toLowerCase().includes(igDevice));
  if (igLocation) ig = ig.filter(a => a.location === igLocation);
  if (igStatus !== '') ig = ig.filter(a => String(a.healthy) === igStatus);

  // Apply TW filters
  const twUsername = document.getElementById('twFilterUsername')?.value?.toLowerCase() || '';
  const twDevice = document.getElementById('twFilterDevice')?.value?.toLowerCase() || '';
  const twLocation = document.getElementById('twFilterLocation')?.value || '';
  const twStatus = document.getElementById('twFilterStatus')?.value || '';

  if (twUsername) tw = tw.filter(a => a.username.toLowerCase().includes(twUsername));
  if (twDevice) tw = tw.filter(a => (a.deviceName || '').toLowerCase().includes(twDevice));
  if (twLocation) tw = tw.filter(a => a.location === twLocation);
  if (twStatus !== '') tw = tw.filter(a => String(a.healthy) === twStatus);

  // Apply WC filters
  const wcUsername = document.getElementById('wcFilterUsername')?.value?.toLowerCase() || '';
  const wcDevice = document.getElementById('wcFilterDevice')?.value?.toLowerCase() || '';
  const wcLocation = document.getElementById('wcFilterLocation')?.value || '';
  const wcStatus = document.getElementById('wcFilterStatus')?.value || '';

  if (wcUsername) wc = wc.filter(a => a.username.toLowerCase().includes(wcUsername));
  if (wcDevice) wc = wc.filter(a => (a.deviceName || '').toLowerCase().includes(wcDevice));
  if (wcLocation) wc = wc.filter(a => a.location === wcLocation);
  if (wcStatus !== '') wc = wc.filter(a => String(a.healthy) === wcStatus);

  // Apply OF filters
  const ofUsername = document.getElementById('ofFilterUsername')?.value?.toLowerCase() || '';
  const ofDevice = document.getElementById('ofFilterDevice')?.value?.toLowerCase() || '';
  const ofLocation = document.getElementById('ofFilterLocation')?.value || '';
  const ofStatus = document.getElementById('ofFilterStatus')?.value || '';

  if (ofUsername) of = of.filter(a => a.username.toLowerCase().includes(ofUsername));
  if (ofDevice) of = of.filter(a => (a.deviceName || '').toLowerCase().includes(ofDevice));
  if (ofLocation) of = of.filter(a => a.location === ofLocation);
  if (ofStatus !== '') of = of.filter(a => String(a.healthy) === ofStatus);

  // Apply TK filters
  const tkUsername = document.getElementById('tkFilterUsername')?.value?.toLowerCase() || '';
  const tkDevice = document.getElementById('tkFilterDevice')?.value?.toLowerCase() || '';
  const tkLocation = document.getElementById('tkFilterLocation')?.value || '';
  const tkStatus = document.getElementById('tkFilterStatus')?.value || '';

  if (tkUsername) tk = tk.filter(a => a.username.toLowerCase().includes(tkUsername));
  if (tkDevice) tk = tk.filter(a => (a.deviceName || '').toLowerCase().includes(tkDevice));
  if (tkLocation) tk = tk.filter(a => a.location === tkLocation);
  if (tkStatus !== '') tk = tk.filter(a => String(a.healthy) === tkStatus);

  document.getElementById('igList').innerHTML = renderAccounts(ig);
  document.getElementById('twList').innerHTML = renderAccounts(tw);
  document.getElementById('wcList').innerHTML = renderWebcamAccounts(wc);
  document.getElementById('ofList').innerHTML = renderWebcamAccounts(of);
  document.getElementById('tkList').innerHTML = renderAccounts(tk);
}

async function loadOfBombex() {
  const logs = await DB.getOutseekerLogs();
  const latest = logs[0];
  if (latest) {
    document.getElementById('osActive').textContent = latest.activeAccounts || 0;
    document.getElementById('osUSA').textContent = latest.usaRunning || 0;
    document.getElementById('osESP').textContent = latest.espRunning || 0;
  }

  let osHtml = '';
  logs.forEach(l => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = l.date === today;
    const usaOut = l.usaOutreached || 0;
    const espOut = l.espOutreached || 0;
    const totalOut = usaOut + espOut;
    const logId = `${l.userId}_${l.date}`;

    osHtml += `<div class="list-item" style="${isToday ? 'background:#001a00;border-left:3px solid #0f0' : ''};padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:15px">
        <div style="flex:0 0 auto">
          <div style="font-weight:${isToday ? 'bold' : 'normal'};color:${isToday ? '#0f0' : '#eee'};font-size:13px;margin-bottom:2px">${l.date}</div>
          ${isToday ? '<div style="font-size:9px;color:#0f0">TODAY</div>' : ''}
        </div>
        <div style="flex:1;display:flex;gap:8px;align-items:center;font-size:11px;flex-wrap:wrap">
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">Accounts Running:</span> <strong style="color:#0f0">${l.activeAccounts || 0}</strong>
          </div>
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">USA Running:</span> <strong style="color:#4af">${l.usaRunning || 0}</strong>
          </div>
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">ESP Running:</span> <strong style="color:#f4a">${l.espRunning || 0}</strong>
          </div>
          <div style="width:1px;height:20px;background:#333"></div>
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">Outreached USA:</span> <strong style="color:#4af">${usaOut}</strong>
          </div>
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">Outreached ESP:</span> <strong style="color:#f4a">${espOut}</strong>
          </div>
          <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
            <span style="color:#666">Total Outreached:</span> <strong style="color:#ff0">${totalOut}</strong>
          </div>
        </div>
        <div style="flex:0 0 auto;display:flex;gap:5px">
          <button class="btn btn-sm" style="font-size:10px;padding:2px 8px" onclick="editOfBombex('${logId}')">Edit</button>
          <button class="btn btn-sm" style="font-size:10px;padding:2px 8px" onclick="delOfBombex('${logId}')">Delete</button>
        </div>
      </div>
      ${l.notes ? `<div style="margin-top:8px;padding:6px 8px;background:#0a0a0a;border:1px solid #222;border-radius:2px;font-size:10px;color:#999"><strong style="color:#666;font-size:9px;margin-right:5px">Notes:</strong>${l.notes}</div>` : ''}
    </div>`;
  });
  document.getElementById('osLog').innerHTML = osHtml || '<div class="empty-state">No OFautopilot logs</div>';
}

async function loadOpeners() {
  const filter = document.getElementById('openerFilter')?.value || '';
  const accountFilter = document.getElementById('openerAccountFilter')?.value || '';
  let scripts = await DB.getScripts('opener');

  // Populate account filter dropdown
  const accounts = await DB.getAll('accounts', [{ field: 'userId', value: userId }]);
  const accountSelect = document.getElementById('openerAccountFilter');
  if (accountSelect && accountSelect.options.length === 1) {
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `@${a.username} (${a.type})`;
      accountSelect.appendChild(opt);
    });
    if (accountFilter) accountSelect.value = accountFilter;
  }

  // Filter by platform - check if filter is in platforms array or old platform field
  if (filter) {
    scripts = scripts.filter(s => {
      const platforms = s.platforms || (s.platform ? [s.platform] : []);
      return platforms.includes(filter);
    });
  }

  // Filter by account
  if (accountFilter) {
    scripts = scripts.filter(s => {
      const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);
      return accountIds.includes(accountFilter);
    });
  }

  // Separate active and inactive
  const active = scripts.filter(s => s.active);
  const inactive = scripts.filter(s => !s.active);

  let html = '';

  if (active.length > 0) {
    html += '<div style="margin-bottom:15px"><strong style="color:#0f0">● Active Openers</strong></div>';
    for (const s of active) {
      html += await renderOpenerCard(s);
    }
  }

  if (inactive.length > 0) {
    html += '<div style="margin:20px 0 15px"><strong style="color:#666">Inactive Openers</strong></div>';
    for (const s of inactive) {
      html += await renderOpenerCard(s);
    }
  }

  document.getElementById('openerList').innerHTML = html || '<div class="empty-state">No openers yet. Add one!</div>';
}

async function renderOpenerCard(s) {
  // Convert old format to new
  const platforms = s.platforms || (s.platform ? [s.platform] : []);
  const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);

  // Load account names
  const accountNames = [];
  for (const accId of accountIds) {
    const acc = await DB.get('accounts', accId);
    if (acc) accountNames.push(`@${acc.username}`);
  }

  // Platform badges
  const platformBadges = platforms.map(p =>
    `<span class="status status-${p === 'instagram' ? 'healthy' : p === 'twitter' ? 'pending' : p === 'onlyfans' ? 'expired' : p === 'tiktok' ? 'healthy' : 'live'}">${p}</span>`
  ).join(' ');

  return `<div class="script-box ${s.active ? 'selected' : ''}" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        ${platformBadges || '<span style="color:#666">All Platforms</span>'}
        ${s.active ? '<span style="color:#0f0;margin-left:8px;font-size:11px">● ACTIVE</span>' : ''}
        ${accountNames.length > 0 ? `<span style="color:#999;margin-left:8px;font-size:11px">→ ${accountNames.join(', ')}</span>` : ''}
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();toggleScriptActive('${s.id}','opener')">${s.active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();editScript('${s.id}','opener')">Edit</button>
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();deleteScript('${s.id}','opener')">Delete</button>
      </div>
    </div>
    <div style="color:#eee;font-size:12px;line-height:1.5">${s.text}</div>
    ${s.notes ? `<div style="margin-top:6px;padding:6px;background:#0a0a0a;border:1px solid #222;font-size:10px;color:#666">${s.notes}</div>` : ''}
    <div style="margin-top:8px;font-size:10px;color:#666">Click to copy</div>
  </div>`;
}

async function loadFollowups() {
  const filter = document.getElementById('followupFilter')?.value || '';
  const accountFilter = document.getElementById('followupAccountFilter')?.value || '';
  let scripts = await DB.getScripts('followup');

  // Populate account filter dropdown
  const accounts = await DB.getAll('accounts', [{ field: 'userId', value: userId }]);
  const accountSelect = document.getElementById('followupAccountFilter');
  if (accountSelect && accountSelect.options.length === 1) {
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `@${a.username} (${a.type})`;
      accountSelect.appendChild(opt);
    });
    if (accountFilter) accountSelect.value = accountFilter;
  }

  // Filter by platform - check if filter is in platforms array or old platform field
  if (filter) {
    scripts = scripts.filter(s => {
      const platforms = s.platforms || (s.platform ? [s.platform] : []);
      return platforms.includes(filter);
    });
  }

  // Filter by account
  if (accountFilter) {
    scripts = scripts.filter(s => {
      const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);
      return accountIds.includes(accountFilter);
    });
  }

  // Separate active and inactive
  const active = scripts.filter(s => s.active);
  const inactive = scripts.filter(s => !s.active);

  let html = '';

  if (active.length > 0) {
    html += '<div style="margin-bottom:15px"><strong style="color:#0f0">● Active Follow-ups</strong></div>';
    for (const s of active) {
      html += await renderFollowupCard(s);
    }
  }

  if (inactive.length > 0) {
    html += '<div style="margin:20px 0 15px"><strong style="color:#666">Inactive Follow-ups</strong></div>';
    for (const s of inactive) {
      html += await renderFollowupCard(s);
    }
  }

  document.getElementById('followupList').innerHTML = html || '<div class="empty-state">No follow-ups yet. Add one!</div>';
}

async function renderFollowupCard(s) {
  // Convert old format to new
  const platforms = s.platforms || (s.platform ? [s.platform] : []);
  const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);

  // Load account names
  const accountNames = [];
  for (const accId of accountIds) {
    const acc = await DB.get('accounts', accId);
    if (acc) accountNames.push(`@${acc.username}`);
  }

  // Platform badges
  const platformBadges = platforms.map(p =>
    `<span class="status status-${p === 'instagram' ? 'healthy' : p === 'twitter' ? 'pending' : p === 'onlyfans' ? 'expired' : p === 'tiktok' ? 'healthy' : 'live'}">${p}</span>`
  ).join(' ');

  return `<div class="script-box ${s.active ? 'selected' : ''}" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        ${platformBadges || '<span style="color:#666">All Platforms</span>'}
        ${s.active ? '<span style="color:#0f0;margin-left:8px;font-size:11px">● ACTIVE</span>' : ''}
        ${accountNames.length > 0 ? `<span style="color:#999;margin-left:8px;font-size:11px">→ ${accountNames.join(', ')}</span>` : ''}
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();toggleScriptActive('${s.id}','followup')">${s.active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();editScript('${s.id}','followup')">Edit</button>
        <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();deleteScript('${s.id}','followup')">Delete</button>
      </div>
    </div>
    <div style="color:#eee;font-size:12px;line-height:1.5">${s.text}</div>
    ${s.notes ? `<div style="margin-top:6px;padding:6px;background:#0a0a0a;border:1px solid #222;font-size:10px;color:#666">${s.notes}</div>` : ''}
    <div style="margin-top:8px;font-size:10px;color:#666">Click to copy</div>
  </div>`;
}

async function loadScripts() {
  const platformFilter = document.getElementById('scriptPlatformFilter')?.value || '';
  const accountFilter = document.getElementById('scriptAccountFilter')?.value || '';
  let scripts = await DB.getScripts('script');

  // Populate account filter dropdown
  const accounts = await DB.getAll('accounts', [{ field: 'userId', value: userId }]);
  const accountSelect = document.getElementById('scriptAccountFilter');
  if (accountSelect && accountSelect.options.length === 1) {
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `@${a.username} (${a.type})`;
      accountSelect.appendChild(opt);
    });
    if (accountFilter) accountSelect.value = accountFilter;
  }

  // Filter by platform
  if (platformFilter) {
    scripts = scripts.filter(s => {
      const platforms = s.platforms || (s.platform ? [s.platform] : []);
      return platforms.includes(platformFilter);
    });
  }

  // Filter by account
  if (accountFilter) {
    scripts = scripts.filter(s => {
      const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);
      return accountIds.includes(accountFilter);
    });
  }

  let html = '';
  for (const s of scripts) {
    // Convert old format to new
    const platforms = s.platforms || (s.platform ? [s.platform] : []);
    const accountIds = s.accountIds || (s.accountId ? [s.accountId] : []);

    // Load account names
    const accountNames = [];
    for (const accId of accountIds) {
      const acc = await DB.get('accounts', accId);
      if (acc) accountNames.push(`@${acc.username}`);
    }

    // Platform badges
    const platformBadges = platforms.map(p =>
      `<span class="status status-${p === 'instagram' ? 'healthy' : p === 'twitter' ? 'pending' : p === 'onlyfans' ? 'expired' : p === 'tiktok' ? 'healthy' : 'live'}" style="font-size:10px">${p}</span>`
    ).join(' ');

    html += `<div class="script-box" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <strong>${s.title || 'Script'}</strong>
          ${platformBadges ? `<span style="margin-left:8px">${platformBadges}</span>` : ''}
          ${accountNames.length > 0 ? `<span style="color:#999;margin-left:8px;font-size:11px">→ ${accountNames.join(', ')}</span>` : ''}
        </div>
        <div style="display:flex;gap:5px">
          <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();editScript('${s.id}','script')">Edit</button>
          <button class="btn btn-sm" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();deleteScript('${s.id}','script')">Delete</button>
        </div>
      </div>
      <div style="color:#eee;font-size:12px;line-height:1.5">${s.text}</div>
      ${s.category ? `<div style="margin-top:6px;font-size:10px;color:#666">Category: ${s.category}</div>` : ''}
      ${s.notes ? `<div style="margin-top:6px;padding:6px;background:#0a0a0a;border:1px solid #222;font-size:10px;color:#666">${s.notes}</div>` : ''}
      <div style="margin-top:8px;font-size:10px;color:#666">Click to copy</div>
    </div>`;
  }
  document.getElementById('scriptList').innerHTML = html || '<div class="empty-state">No scripts</div>';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(decodeURIComponent(text));
  toast('Copied to clipboard!', 'success');
}

async function toggleScriptActive(id, type) {
  try {
    const script = await DB.get('scripts', id);
    if (!script) {
      toast('Script not found', 'error');
      return;
    }

    await DB.update('scripts', id, { active: !script.active });
    toast(script.active ? 'Deactivated' : 'Activated!', 'success');

    // Reload the appropriate list
    if (type === 'opener') loadOpeners();
    else if (type === 'followup') loadFollowups();
    else loadScripts();
  } catch (e) {
    console.error('toggleScriptActive error:', e);
    toast('Error updating script', 'error');
  }
}

async function editScript(id, type) {
  try {
    const script = await DB.get('scripts', id);
    if (!script) {
      toast('Script not found', 'error');
      return;
    }
    modal('script-edit', { ...script, scriptType: type });
  } catch (e) {
    console.error('editScript error:', e);
    toast('Error loading script', 'error');
  }
}

async function deleteScript(id, type) {
  if (!confirm('Are you sure you want to delete this script?')) return;

  try {
    await DB.delete('scripts', id);
    toast('Script deleted', 'success');

    // Reload the appropriate list
    if (type === 'opener') loadOpeners();
    else if (type === 'followup') loadFollowups();
    else loadScripts();
  } catch (e) {
    console.error('deleteScript error:', e);
    toast('Error deleting script', 'error');
  }
}

function renderAccounts(accs) {
  if (!accs.length) return '<div class="empty-state">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    const proxyExpired = a.proxyExpiration && new Date(a.proxyExpiration) < new Date();
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">@${a.username}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Healthy' : 'Expired'}</span>
      </div>
      <div class="acc-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><strong style="color:#666;font-size:10px">Location:</strong><br>${a.location || '-'}</div>
          <div><strong style="color:#666;font-size:10px">Device:</strong><br>${a.deviceName || '-'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><strong style="color:#666;font-size:10px">Proxy Status:</strong><br>${a.proxyStatus || '-'}</div>
          <div><strong style="color:#666;font-size:10px">Proxy Type:</strong><br>${a.proxyType || '-'}</div>
        </div>
        ${a.proxyDetails ? `<div style="margin-bottom:8px"><strong style="color:#666;font-size:10px">Proxy Details:</strong><br><code style="font-size:10px">${a.proxyDetails}</code></div>` : ''}
        ${a.proxyExpiration ? `<div style="margin-bottom:8px"><strong style="color:#666;font-size:10px">Proxy Expiration:</strong><br><span style="color:${proxyExpired ? '#f00' : '#0f0'}">${a.proxyExpiration}${proxyExpired ? ' (EXPIRED)' : ''}</span></div>` : ''}
        ${a.warmupStatus ? `<div style="margin-bottom:8px"><strong style="color:#666;font-size:10px">Warmup:</strong><br>${a.warmupStatus}</div>` : ''}
        ${a.notes ? `<div style="margin-top:8px;padding:8px;background:#0a0a0a;border:1px solid #222;border-radius:3px;font-size:11px"><strong style="color:#666;font-size:9px">Notes:</strong><br>${a.notes}</div>` : ''}
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

function renderWebcamAccounts(accs) {
  if (!accs.length) return '<div class="empty-state">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    const proxyExpired = a.proxyExpiration && new Date(a.proxyExpiration) < new Date();
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">${a.username}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="acc-card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><strong style="color:#666;font-size:10px">Site:</strong><br>${a.site || '-'}</div>
          <div><strong style="color:#666;font-size:10px">Location:</strong><br>${a.location || '-'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><strong style="color:#666;font-size:10px">Device:</strong><br>${a.deviceName || '-'}</div>
          <div><strong style="color:#666;font-size:10px">Proxy Status:</strong><br>${a.proxyStatus || '-'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><strong style="color:#666;font-size:10px">Proxy Type:</strong><br>${a.proxyType || '-'}</div>
          ${a.proxyExpiration ? `<div><strong style="color:#666;font-size:10px">Proxy Exp:</strong><br><span style="color:${proxyExpired ? '#f00' : '#0f0'}">${a.proxyExpiration}${proxyExpired ? ' ⚠' : ''}</span></div>` : '<div></div>'}
        </div>
        ${a.proxyDetails ? `<div style="margin-bottom:8px"><strong style="color:#666;font-size:10px">Proxy Details:</strong><br><code style="font-size:10px">${a.proxyDetails}</code></div>` : ''}
        ${a.outreachMethod ? `<div style="margin-top:8px;padding:8px;background:#0a0a0a;border:1px solid #222;border-radius:3px;font-size:11px"><strong style="color:#666;font-size:9px">Outreach Method:</strong><br>${a.outreachMethod}</div>` : ''}
        ${a.notes ? `<div style="margin-top:8px;padding:8px;background:#0a0a0a;border:1px solid #222;border-radius:3px;font-size:11px"><strong style="color:#666;font-size:9px">Notes:</strong><br>${a.notes}</div>` : ''}
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

function renderScripts(scripts) {
  if (!scripts.length) return '<div class="empty-state">No scripts</div>';
  let html = '';
  scripts.forEach(s => {
    html += `<div class="script-box" onclick="copyScript('${encodeURIComponent(s.text)}')">
      ${s.platform ? `<span class="status status-${s.platform === 'instagram' ? 'healthy' : 'pending'}">${s.platform}</span>` : ''}
      ${s.title ? `<strong>${s.title}</strong><br>` : ''}
      ${s.text.substring(0, 80)}...
      <button class="btn btn-sm" style="float:right" onclick="event.stopPropagation();delScript('${s.id}')">X</button>
    </div>`;
  });
  return html;
}

function copyScript(text) {
  navigator.clipboard.writeText(decodeURIComponent(text));
  toast('Copied!', 'success');
}

async function delAcc(id) {
  if (await confirmDialog('Delete this account?')) {
    await DB.delete('accounts', id);
    toast('Account deleted', 'success');
    loadOutreachAccounts();
  }
}

async function editOutreachAcc(id) {
  const acc = await DB.get('accounts', id);
  modal('outreach-acc-edit', acc);
}

async function delScript(id) {
  if (await confirmDialog('Delete this script?')) {
    await DB.delete('scripts', id);
    toast('Script deleted', 'success');
    loadOutreach();
  }
}

// ============================================
// LEADS
// ============================================
let currentExpandedCollection = null;

async function loadLeads() {
  console.log('=== LOADING LEADS ===');
  const collections = await DB.getAll('lead_collections', [{ field: 'userId', value: userId }]);
  console.log('Collections found:', collections.length);

  let html = '';
  for (const coll of collections) {
    console.log('Collection:', coll.name, 'accountIds:', coll.accountIds);
    const leads = await DB.getAll('leads', [{ field: 'collectionId', value: coll.id }]);
    const outreached = leads.filter(l => l.outreached).length;
    const total = leads.length;
    const isExpanded = currentExpandedCollection === coll.id;

    const platformLabel = coll.platform === 'instagram' ? 'IG' :
                          coll.platform === 'twitter' ? 'TW' :
                          coll.platform === 'onlyfans' ? 'OF' : 'WC';

    // Get assigned accounts
    let accountsHtml = '';
    if (coll.accountIds && coll.accountIds.length > 0) {
      console.log('  -> Has accountIds:', coll.accountIds);
      const allAccounts = await DB.getAccounts();
      console.log('  -> All accounts:', allAccounts.length);
      const assignedAccounts = allAccounts.filter(acc => coll.accountIds.includes(acc.id));
      console.log('  -> Assigned accounts:', assignedAccounts.length, assignedAccounts.map(a => a.username));
      accountsHtml = assignedAccounts.map(acc => `<span style="font-size:10px;padding:2px 8px;background:#001a00;color:#0f0;border:1px solid #0f0;margin-right:6px;font-family:'Courier New',monospace">@${acc.username}</span>`).join('');
    } else {
      console.log('  -> NO accountIds');
    }

    html += `<div style="margin-bottom:15px;border:1px solid #333;background:#0a0a0a">
      <!-- Collection Header -->
      <div style="padding:12px;background:#0a0a0a;cursor:pointer;border-bottom:${isExpanded ? '1px solid #0f0' : '1px solid #333'}" onclick="toggleCollection('${coll.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1">
            <div style="color:#0f0;margin:0 0 6px 0;font-size:14px;font-family:'Courier New',monospace;display:flex;align-items:center;gap:10px">
              <span style="color:#0f0">${isExpanded ? '▼' : '►'}</span>
              <span style="letter-spacing:1px">[${platformLabel}]</span>
              ${coll.name.toUpperCase()}
            </div>
            <div style="display:flex;gap:15px;font-size:11px;color:#666;font-family:'Courier New',monospace;margin-bottom:6px">
              <span>TOTAL:<strong style="color:#0f0;margin-left:5px">${total}</strong></span>
              <span>DONE:<strong style="color:#ff0;margin-left:5px">${outreached}</strong></span>
              <span>PEND:<strong style="color:#f55;margin-left:5px">${total - outreached}</strong></span>
            </div>
            ${coll.notes ? `<div style="font-size:10px;color:#999;font-family:'Courier New',monospace;margin-bottom:6px;font-style:italic">${coll.notes}</div>` : ''}
            ${accountsHtml ? `<div style="margin-top:8px">${accountsHtml}</div>` : '<div style="font-size:10px;color:#666;font-family:\'Courier New\',monospace;margin-top:4px">NO ACCOUNTS ASSIGNED</div>'}
          </div>
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            <button class="btn btn-sm" style="font-size:10px;padding:4px 10px" onclick="editCollection('${coll.id}')">EDIT</button>
            <button class="btn btn-sm" style="font-size:10px;padding:4px 10px;background:#000;border:1px solid #f55;color:#f55" onclick="deleteLeadCollection('${coll.id}')">DEL</button>
          </div>
        </div>
      </div>

      <!-- Leads Table (expandable) -->
      <div id="coll-${coll.id}" style="display:${isExpanded ? 'block' : 'none'}">
        <div style="padding:0 15px 15px 15px">
          <div style="margin-bottom:12px;padding-top:12px">
            <button class="btn btn-primary btn-sm" onclick="showAddLeadForm('${coll.id}','${coll.platform}')">+ Add Lead</button>
          </div>

          <!-- Add Lead Form (inline) -->
          <div id="addLeadForm-${coll.id}" style="display:none;margin-bottom:15px;padding:12px;background:#000;border:1px solid #0f0">
            <input type="hidden" id="editLeadId-${coll.id}">
            <div style="margin-bottom:8px;color:#0f0;font-size:11px;font-family:'Courier New',monospace">+ NEW LEAD</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:8px;margin-bottom:8px">
              <input type="text" class="form-input" id="leadName-${coll.id}" placeholder="NAME" style="font-size:10px;font-family:'Courier New',monospace">
              <input type="text" class="form-input" id="leadUsername-${coll.id}" placeholder="USERNAME" style="font-size:10px;font-family:'Courier New',monospace">
              <input type="text" class="form-input" id="leadNotes-${coll.id}" placeholder="NOTES" style="font-size:10px;font-family:'Courier New',monospace">
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:#999;cursor:pointer;font-family:'Courier New',monospace">
                <input type="checkbox" id="leadOutreached-${coll.id}" style="width:14px;height:14px">
                OUTREACHED
              </label>
              <button class="btn btn-primary btn-sm" onclick="saveLeadInline('${coll.id}','${coll.platform}')" style="margin-left:auto;font-size:10px;font-family:'Courier New',monospace">
                <span id="saveLeadBtn-${coll.id}">ADD</span>
              </button>
              <button class="btn btn-sm" onclick="cancelAddLeadForm('${coll.id}')" style="font-size:10px;font-family:'Courier New',monospace">CANCEL</button>
            </div>
          </div>

          <!-- Leads Table -->
          ${leads.length > 0 ? `
            <div style="background:#000;border:1px solid #333">
              <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace">
                <thead>
                  <tr style="background:#0a0a0a;border-bottom:1px solid #0f0">
                    <th style="padding:8px;text-align:left;font-size:10px;color:#0f0;font-weight:normal;letter-spacing:1px">NAME</th>
                    <th style="padding:8px;text-align:left;font-size:10px;color:#0f0;font-weight:normal;letter-spacing:1px">${coll.platform.toUpperCase()}</th>
                    <th style="padding:8px;text-align:left;font-size:10px;color:#0f0;font-weight:normal;letter-spacing:1px">NOTES</th>
                    <th style="padding:8px;text-align:center;font-size:10px;color:#0f0;font-weight:normal;letter-spacing:1px">STATUS</th>
                    <th style="padding:8px;text-align:center;font-size:10px;color:#0f0;font-weight:normal;width:60px">[ ]</th>
                  </tr>
                </thead>
                <tbody>
                  ${leads.map((lead, idx) => {
                    const username = coll.platform === 'instagram' ? lead.igUsername :
                                    coll.platform === 'twitter' ? lead.twitterUsername :
                                    lead.webcamUsername;
                    const rowBg = idx % 2 === 0 ? '#0a0a0a' : '#000';
                    return `<tr style="background:${rowBg};border-bottom:1px solid #222" onmouseover="this.style.background='#111'" onmouseout="this.style.background='${rowBg}'">
                      <td style="padding:10px 8px;font-size:11px;color:#0f0">${lead.name}</td>
                      <td style="padding:10px 8px;font-size:10px;color:#ccc">${username || '-'}</td>
                      <td style="padding:10px 8px;font-size:10px;color:#666">${lead.notes || '-'}</td>
                      <td style="padding:10px 8px;text-align:center">
                        <span style="font-size:10px;padding:2px 8px;background:${lead.outreached ? '#001a00' : '#1a0a0a'};color:${lead.outreached ? '#0f0' : '#f55'};border:1px solid ${lead.outreached ? '#0f0' : '#f55'};font-weight:bold;letter-spacing:1px">
                          ${lead.outreached ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td style="padding:10px 8px;text-align:center">
                        <input type="checkbox" ${lead.outreached ? 'checked' : ''} onchange="toggleLeadOutreach('${lead.id}','${coll.id}',this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:#0f0">
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state" style="padding:20px;font-family:\'Courier New\',monospace;color:#666">NO LEADS. PRESS ADD LEAD.</div>'}
        </div>
      </div>
    </div>`;
  }

  document.getElementById('leadsCollectionList').innerHTML = html || '<div class="empty-state">No collections yet. Click "Create Collection" above!</div>';
}

function toggleCollection(collId) {
  currentExpandedCollection = currentExpandedCollection === collId ? null : collId;
  loadLeads();
}

function showAddLeadForm(collId, platform) {
  const form = document.getElementById(`addLeadForm-${collId}`);
  form.style.display = 'block';
  document.getElementById(`editLeadId-${collId}`).value = '';
  document.getElementById(`leadName-${collId}`).value = '';
  document.getElementById(`leadUsername-${collId}`).value = '';
  document.getElementById(`leadNotes-${collId}`).value = '';
  document.getElementById(`leadOutreached-${collId}`).checked = false;
  document.getElementById(`saveLeadBtn-${collId}`).textContent = 'Add Lead';
}

function cancelAddLeadForm(collId) {
  document.getElementById(`addLeadForm-${collId}`).style.display = 'none';
}

async function saveLeadInline(collId, platform) {
  const editId = document.getElementById(`editLeadId-${collId}`).value;
  const name = document.getElementById(`leadName-${collId}`).value.trim();
  const username = document.getElementById(`leadUsername-${collId}`).value.trim();
  const notes = document.getElementById(`leadNotes-${collId}`).value.trim();
  const outreached = document.getElementById(`leadOutreached-${collId}`).checked;

  if (!name) {
    toast('Name is required', 'error');
    return;
  }

  const data = {
    userId: userId,
    collectionId: collId,
    name: name,
    igUsername: platform === 'instagram' ? username : '',
    twitterUsername: platform === 'twitter' ? username : '',
    webcamUsername: platform === 'webcams' ? username : '',
    notes: notes,
    outreached: outreached,
    addedDate: editId ? undefined : new Date().toISOString()
  };

  if (editId) {
    await DB.update('leads', editId, data);
    toast('Lead updated!', 'success');
  } else {
    await DB.add('leads', data);
    toast('Lead added!', 'success');
  }

  cancelAddLeadForm(collId);
  currentExpandedCollection = collId;
  loadLeads();
}

async function toggleLeadOutreach(leadId, collId, checked) {
  await DB.update('leads', leadId, { outreached: checked });
  toast(checked ? 'Marked as outreached ✅' : 'Marked as pending ⏳', 'success');
  currentExpandedCollection = collId;
  loadLeads();
}

function toggleCollectionForm() {
  const form = document.getElementById('collectionForm');
  const isVisible = form.style.display !== 'none';
  form.style.display = isVisible ? 'none' : 'block';
  document.getElementById('collFormBtnText').textContent = isVisible ? '+ Create Collection' : '✕ Cancel';

  if (!isVisible) {
    document.getElementById('collFormTitle').textContent = 'Create New Collection';
    document.getElementById('collSaveBtnText').textContent = 'Create Collection';
    document.getElementById('collEditId').value = '';
    document.getElementById('collName').value = '';
    document.getElementById('collNotes').value = '';
    document.getElementById('collPlatform').value = 'instagram';

    // Set up save button click handler
    const saveBtn = document.getElementById('saveCollBtn');
    if (saveBtn) {
      saveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        saveLeadCollection();
      };
    }

    DB.getAccounts().then(accounts => {
      const wrap = document.getElementById('collAccountsWrap');
      console.log('Loaded accounts:', accounts.length);
      if (accounts.length === 0) {
        wrap.innerHTML = '<div style="color:#ff0;font-size:11px;text-align:center;padding:10px;font-family:\'Courier New\',monospace">NO ACCOUNTS. ADD ACCOUNTS IN OUTREACH SECTION FIRST.</div>';
        return;
      }
      wrap.innerHTML = accounts.map(acc => `
        <label style="display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer;padding:6px;background:#0a0a0a;border:1px solid #333" onmouseover="this.style.borderColor='#0f0'" onmouseout="this.style.borderColor='#333'">
          <input type="checkbox" class="collAccCheck" value="${acc.id}" style="width:16px;height:16px;cursor:pointer;accent-color:#0f0">
          <span style="font-size:11px;color:#0f0;font-family:'Courier New',monospace">@${acc.username}</span>
          <span style="color:#666;font-size:10px;font-family:'Courier New',monospace">[${acc.type}]</span>
        </label>
      `).join('');
    }).catch(err => {
      console.error('Error loading accounts:', err);
      toast('Error loading accounts: ' + err.message, 'error');
    });
  }
}

function cancelCollectionForm() {
  document.getElementById('collectionForm').style.display = 'none';
  document.getElementById('collFormBtnText').textContent = '+ Create Collection';
  // Clear form
  document.getElementById('collEditId').value = '';
  document.getElementById('collName').value = '';
  document.getElementById('collNotes').value = '';
  document.getElementById('collPlatform').value = 'instagram';
  document.getElementById('collAccountsWrap').innerHTML = '';
}

async function editCollection(collId) {
  try {
    const coll = await DB.get('lead_collections', collId);
    if (!coll) {
      toast('Collection not found', 'error');
      return;
    }

    document.getElementById('collectionForm').style.display = 'block';
    document.getElementById('collFormTitle').textContent = 'Edit Collection';
    document.getElementById('collFormBtnText').textContent = '✕ Cancel';
    document.getElementById('collSaveBtnText').textContent = 'Update Collection';
    document.getElementById('collEditId').value = coll.id;
    document.getElementById('collName').value = coll.name;
    document.getElementById('collNotes').value = coll.notes || '';
    document.getElementById('collPlatform').value = coll.platform;

    // Set up save button click handler
    const saveBtn = document.getElementById('saveCollBtn');
    if (saveBtn) {
      saveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        saveLeadCollection();
      };
    }

    const accounts = await DB.getAccounts();
    const wrap = document.getElementById('collAccountsWrap');
    console.log('Edit - Loaded accounts:', accounts.length);
    console.log('Collection accountIds:', coll.accountIds);

    if (accounts.length === 0) {
      wrap.innerHTML = '<div style="color:#ff0;font-size:11px;text-align:center;padding:10px;font-family:\'Courier New\',monospace">NO ACCOUNTS. ADD ACCOUNTS IN OUTREACH SECTION FIRST.</div>';
      return;
    }

    wrap.innerHTML = accounts.map(acc => {
      const checked = coll.accountIds && coll.accountIds.includes(acc.id);
      return `<label style="display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer;padding:6px;background:#0a0a0a;border:1px solid ${checked ? '#0f0' : '#333'}" onmouseover="this.style.borderColor='#0f0'" onmouseout="this.style.borderColor='${checked ? '#0f0' : '#333'}'">
        <input type="checkbox" class="collAccCheck" value="${acc.id}" ${checked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#0f0">
        <span style="font-size:11px;color:#0f0;font-family:'Courier New',monospace">@${acc.username}</span>
        <span style="color:#666;font-size:10px;font-family:'Courier New',monospace">[${acc.type}]</span>
      </label>`;
    }).join('');

    document.getElementById('collectionForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('Error editing collection:', err);
    toast('Error loading collection: ' + err.message, 'error');
  }
}

async function deleteLeadCollection(collId) {
  if (!confirm('Delete this collection and all its leads?')) return;
  const leads = await DB.getAll('leads', [{ field: 'collectionId', value: collId }]);
  for (const lead of leads) {
    await DB.delete('leads', lead.id);
  }
  await DB.delete('lead_collections', collId);
  toast('Collection deleted', 'success');
  currentExpandedCollection = null;
  loadLeads();
}

// ============================================
// MODELS
// ============================================
async function loadModels() {
  const allModels = await DB.getAll('models', [{ field: 'userId', value: userId }]);
  const pot = allModels.filter(m => m.status === 'potential');
  const act = allModels.filter(m => m.status === 'active');
  const mkt = allModels.filter(m => m.status === 'market');

  document.getElementById('potList').innerHTML = renderModels(pot) || '<div class="empty-state">No potential models</div>';
  document.getElementById('actList').innerHTML = renderModels(act) || '<div class="empty-state">No active models</div>';
  document.getElementById('mktList').innerHTML = renderMarketModels(mkt) || '<div class="empty-state">No market models yet</div>';
}

function renderMarketModels(models) {
  if (!models.length) return '';
  const today = new Date().toISOString().split('T')[0];
  return models.map(m => {
    const lastComm = m.lastCommunication ? new Date(m.lastCommunication).toISOString().split('T')[0] : null;
    const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000*60*60*24)) : null;
    const needsContact = daysSince === null || daysSince > 0;
    const reports = m.marketReports || [];
    const lastReport = reports.length ? reports[reports.length - 1] : null;

    return `<div class="model-card" style="cursor:default;padding:12px">
      <div class="model-card-img" style="cursor:pointer" onclick="modal('marketModelView','${m.id}')">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#222;color:#666">No Photo</div>'}
      </div>
      <div class="model-card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <div>
            <div class="model-card-name">${m.name}</div>
            <div style="font-size:11px;color:#999">${m.country || '-'}, ${m.age || '-'}y</div>
          </div>
          <span style="background:#e91e63;color:#fff;padding:2px 8px;border-radius:2px;font-size:9px">MARKET</span>
        </div>

        ${m.marketPrice ? `<div style="font-size:12px;color:#ff0;margin-bottom:6px">Contract: $${m.marketPrice}</div>` : ''}
        ${m.marketNotes ? `<div style="font-size:10px;color:#999;margin-bottom:6px">${m.marketNotes.substring(0, 80)}${m.marketNotes.length > 80 ? '...' : ''}</div>` : ''}

        <div style="margin:8px 0;padding:8px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;color:#666">Last contact:</span>
            <span style="font-size:11px;color:${needsContact ? '#f00' : '#0f0'}">${needsContact ? (daysSince === null ? 'Never' : daysSince + 'd ago') : 'Today ✓'}</span>
          </div>
          ${m.marketStatus ? `<div style="font-size:10px;color:#0f0;margin-top:4px">Status: ${m.marketStatus}</div>` : ''}
        </div>

        ${lastReport ? `<div style="margin:6px 0;padding:6px;background:#0a0a0a;border-left:2px solid #e91e63;border-radius:2px">
          <div style="font-size:9px;color:#666">${new Date(lastReport.date).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</div>
          <div style="font-size:10px;color:#ccc">${lastReport.text.substring(0, 60)}${lastReport.text.length > 60 ? '...' : ''}</div>
        </div>` : ''}

        <div style="display:flex;gap:5px;margin-top:8px">
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="logMarketContact('${m.id}')">Log Contact</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="addMarketReport('${m.id}')">Report</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="modal('marketModel',${JSON.stringify(m).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="deleteModel('${m.id}')">Del</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function logMarketContact(id) {
  const model = await DB.get('models', id);
  if (!model) return toast('Model not found', 'error');
  const notes = model.communicationNotes || [];
  const note = prompt('Quick contact note:');
  if (!note) return;
  notes.push({ date: new Date().toISOString(), note, progress: 'neutral' });
  await DB.update('models', id, {
    communicationNotes: notes,
    lastCommunication: new Date().toISOString(),
    communicationStreak: (model.communicationStreak || 0) + 1
  });
  toast('Contact logged', 'success');
  loadModels();
}

async function addMarketReport(id) {
  const model = await DB.get('models', id);
  if (!model) return toast('Model not found', 'error');
  const mTitle = document.getElementById('mTitle');
  const mBody = document.getElementById('mBody');
  mTitle.textContent = `Report: ${model.name}`;
  mBody.innerHTML = `
    <input type="hidden" id="mktReportId" value="${id}">
    <div class="form-group">
      <label class="form-label">Report:</label>
      <textarea class="form-textarea" id="mktReportText" style="min-height:120px" placeholder="Status update, agency interest, contact summary..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Market Status:</label>
      <select class="form-select" id="mktReportStatus">
        <option value="available">Available</option>
        <option value="in_talks">In Talks with Agency</option>
        <option value="contract_sent">Contract Sent</option>
        <option value="sold">Sold</option>
        <option value="on_hold">On Hold</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="saveMarketReport()">Save Report</button>
  `;
  if (model.marketStatus) {
    setTimeout(() => { const sel = document.getElementById('mktReportStatus'); if(sel) sel.value = model.marketStatus; }, 50);
  }
  document.getElementById('modal').style.display = 'flex';
}

async function saveMarketReport() {
  const id = document.getElementById('mktReportId').value;
  const text = document.getElementById('mktReportText').value.trim();
  const status = document.getElementById('mktReportStatus').value;
  if (!text) return toast('Write a report', 'error');
  const model = await DB.get('models', id);
  const reports = model.marketReports || [];
  reports.push({ date: new Date().toISOString(), text, status });
  await DB.update('models', id, { marketReports: reports, marketStatus: status });
  closeModal();
  toast('Report saved', 'success');
  loadModels();
}

async function saveMarketModel() {
  const editId = document.getElementById('mktEditId')?.value;
  const name = document.getElementById('mktName')?.value?.trim();
  if (!name) return toast('Name is required', 'error');

  const data = {
    userId: userId,
    name,
    photo: document.getElementById('mktPhoto')?.value?.trim() || '',
    country: document.getElementById('mktCountry')?.value?.trim() || '',
    age: parseInt(document.getElementById('mktAge')?.value) || null,
    status: 'market',
    marketPrice: parseFloat(document.getElementById('mktPrice')?.value) || null,
    contactInfo: document.getElementById('mktContact')?.value?.trim() || '',
    marketNotes: document.getElementById('mktNotes')?.value?.trim() || '',
    marketStatus: document.getElementById('mktStatus')?.value || 'available'
  };

  if (editId) {
    const existing = await DB.get('models', editId);
    data.communicationNotes = existing?.communicationNotes || [];
    data.lastCommunication = existing?.lastCommunication || null;
    data.communicationStreak = existing?.communicationStreak || 0;
    data.marketReports = existing?.marketReports || [];
    await DB.update('models', editId, data);
    toast('Market model updated!', 'success');
  } else {
    data.addedDate = new Date().toISOString();
    data.communicationNotes = [];
    data.marketReports = [];
    await DB.add('models', data);
    toast('Market model added!', 'success');
  }
  closeModal();
  loadModels();
}

async function logCommunication(modelId) {
  const model = await DB.get('models', modelId);
  if (!model) {
    toast('Model not found', 'error');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastComm = model.lastCommunication ? new Date(model.lastCommunication).toISOString().split('T')[0] : null;

  // Check if already logged today
  if (lastComm === today) {
    toast('Already logged communication for today', 'info');
    return;
  }

  // Open modal with model data
  modal('logComm', model);
}

async function moveToActive(modelId) {
  if (!confirm('Move this model to Active? This means you\'ve started working with her.')) return;

  await DB.update('models', modelId, {
    status: 'active',
    activatedDate: new Date().toISOString()
  });

  toast('Model moved to Active!', 'success');
  loadModels();
}

async function viewModelDetails(modelId) {
  const model = await DB.get('models', modelId);
  if (!model) {
    toast('Model not found', 'error');
    return;
  }

  // Open edit modal which will show performance fields for active models
  modal('model', model);
}

function toggleActiveFields() {
  const status = document.getElementById('modStatus')?.value;
  const isActive = status === 'active';
  const activeFields = document.getElementById('activeModelFields');
  const activePerf = document.getElementById('activeModelPerf');
  if (activeFields) activeFields.style.display = isActive ? 'block' : 'none';
  if (activePerf) activePerf.style.display = isActive ? 'block' : 'none';
}

function toggleCommLogs(modelId) {
  const recent = document.getElementById(`commLogs-${modelId}-recent`);
  const all = document.getElementById(`commLogs-${modelId}-all`);
  const toggleBtn = event.target;

  if (all.style.display === 'none') {
    // Show all logs
    recent.style.display = 'none';
    all.style.display = 'block';
    toggleBtn.textContent = 'Show Less ▲';
  } else {
    // Show recent only
    recent.style.display = 'block';
    all.style.display = 'none';
    toggleBtn.textContent = 'Show All ▼';
  }
}

async function viewCommHistory(modelId) {
  const model = await DB.get('models', modelId);
  if (!model) {
    toast('Model not found', 'error');
    return;
  }

  const commNotes = model.communicationNotes || [];
  const sortedNotes = [...commNotes].reverse(); // Most recent first

  const m = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  title.textContent = `Communication History - ${model.name}`;
  document.getElementById('mBox').className = 'modal-box large';

  const today = new Date().toISOString().split('T')[0];
  const lastComm = model.lastCommunication ? new Date(model.lastCommunication).toISOString().split('T')[0] : null;
  const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000 * 60 * 60 * 24)) : null;
  const streak = model.communicationStreak || 0;

  body.innerHTML = `
    <div style="margin-bottom:20px;padding:15px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:10px">
        <div>
          <div style="font-size:11px;color:#666">Last Communication:</div>
          <div style="font-size:14px;color:${daysSince === null ? '#f00' : (daysSince === 0 ? '#0f0' : '#ff0')};font-weight:bold">
            ${daysSince === null ? 'Never' : (daysSince === 0 ? 'Today' : `${daysSince} days ago`)}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#666">Current Streak:</div>
          <div style="font-size:14px;color:#ff0;font-weight:bold">🔥 ${streak} days</div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:#666">Total Communications:</div>
        <div style="font-size:14px;color:#0f0;font-weight:bold">${commNotes.length} logged</div>
      </div>
    </div>

    <div style="margin-bottom:15px">
      <h3 style="color:#0f0;margin-bottom:10px">Communication Log</h3>
      ${sortedNotes.length > 0 ? `
        <div style="max-height:400px;overflow-y:auto">
          ${sortedNotes.map(note => {
            const noteDate = new Date(note.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const progressIcon = note.progress === 'positive' ? '✅' : (note.progress === 'negative' ? '❌' : '➖');
            const progressColor = note.progress === 'positive' ? '#0f0' : (note.progress === 'negative' ? '#f00' : '#ff0');
            const progressLabel = note.progress === 'positive' ? 'Positive' : (note.progress === 'negative' ? 'Negative' : 'Neutral');

            return `
              <div style="margin-bottom:15px;padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <div style="font-size:12px;color:#999">${noteDate}</div>
                  <div style="display:flex;align-items:center;gap:5px">
                    <span style="font-size:14px">${progressIcon}</span>
                    <span style="font-size:11px;color:${progressColor};font-weight:bold">${progressLabel}</span>
                  </div>
                </div>
                ${note.note ? `
                  <div style="font-size:12px;color:#ccc;margin-bottom:8px;line-height:1.5">${note.note}</div>
                ` : ''}
                ${note.contentUpdate ? `
                  <div style="margin-top:8px;padding:8px;background:#111;border-left:3px solid #0f0">
                    <div style="font-size:10px;color:#0f0;margin-bottom:4px">Content Update:</div>
                    <div style="font-size:11px;color:#999">${note.contentUpdate}</div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="empty-state">No communication history yet</div>'}
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" onclick="closeModal();logCommunication('${modelId}')" style="flex:1">Log New Communication</button>
      <button class="btn" onclick="closeModal()" style="flex:0;min-width:100px">Close</button>
    </div>
  `;

  m.classList.add('active');
}

function renderModels(models) {
  if (!models.length) return '';
  let html = '';
  const today = new Date().toISOString().split('T')[0];

  models.forEach(m => {
    // Calculate days since last communication
    const lastComm = m.lastCommunication ? new Date(m.lastCommunication).toISOString().split('T')[0] : null;
    const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000 * 60 * 60 * 24)) : null;
    const needsContact = daysSince === null || daysSince > 0;
    const streak = m.communicationStreak || 0;
    const isActive = m.status === 'active';

    // Contact status badges
    const contactBadges = [];
    if (m.onAssistantTelegram) contactBadges.push('<span title="On My Telegram" style="background:#0088cc;color:#fff;padding:2px 6px;border-radius:2px;font-size:9px">My TG</span>');
    if (m.onAssistantWhatsApp) contactBadges.push('<span title="On My WhatsApp" style="background:#25D366;color:#fff;padding:2px 6px;border-radius:2px;font-size:9px">My WA</span>');
    if (m.onBossTelegram) contactBadges.push('<span title="On Boss\'s Telegram" style="background:#0088cc;color:#fff;padding:2px 6px;border-radius:2px;font-size:9px">Boss TG</span>');
    if (m.onBossWhatsApp) contactBadges.push('<span title="On Boss\'s WhatsApp" style="background:#25D366;color:#fff;padding:2px 6px;border-radius:2px;font-size:9px">Boss WA</span>');

    // Get recent communication notes (last 3)
    const commNotes = m.communicationNotes || [];
    const recentNotes = commNotes.slice(-3).reverse();

    // Calculate progress trend (last 5 communications)
    const last5 = commNotes.slice(-5);
    const positiveCount = last5.filter(n => n.progress === 'positive').length;
    const negativeCount = last5.filter(n => n.progress === 'negative').length;
    let trendIndicator = '';
    if (last5.length >= 3) {
      if (positiveCount >= 3) trendIndicator = '<span style="color:#0f0;font-size:10px">📈 Trending Up</span>';
      else if (negativeCount >= 3) trendIndicator = '<span style="color:#f00;font-size:10px">📉 Needs Attention</span>';
      else trendIndicator = '<span style="color:#ff0;font-size:10px">➡️ Stable</span>';
    }

    html += `<div class="model-card" style="cursor:default;padding:12px">
      <div class="model-card-img" onclick="modal('modelView','${m.id}')" style="cursor:pointer">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#222;color:#666">No Photo</div>'}
      </div>
      <div class="model-card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <div>
            <div class="model-card-name" onclick="modal('modelView','${m.id}')" style="cursor:pointer">${m.name}</div>
            <div style="font-size:11px;color:#999">${m.country || '-'}, ${m.age || '-'}y</div>
          </div>
          <div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;max-width:50%">
            ${contactBadges.join('')}
          </div>
        </div>

        <div style="margin:8px 0;padding:8px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <span style="font-size:10px;color:#666">Communication:</span>
            <span style="font-size:11px;color:${needsContact ? '#f00' : '#0f0'}">${needsContact ? (daysSince === null ? 'Never' : `${daysSince}d ago`) : 'Today ✓'}</span>
          </div>
          ${streak > 0 ? `<div style="font-size:10px;color:#ff0">🔥 ${streak} day streak</div>` : ''}
          ${trendIndicator ? `<div style="margin-top:4px">${trendIndicator}</div>` : ''}
        </div>

        ${commNotes.length > 0 ? `
        <div style="margin:8px 0;padding:8px;background:#0a0a0a;border:1px solid #222;border-radius:3px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <span style="font-size:10px;color:#666">Communication Logs (${commNotes.length}):</span>
            ${commNotes.length > 3 ? `<span style="font-size:9px;color:#0f0;cursor:pointer" onclick="toggleCommLogs('${m.id}')">Show All ▼</span>` : ''}
          </div>

          <div id="commLogs-${m.id}-recent">
            ${recentNotes.map(note => {
              const noteDate = new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const progressIcon = note.progress === 'positive' ? '✅' : (note.progress === 'negative' ? '❌' : '➖');
              const noteText = note.note.length > 50 ? note.note.substring(0, 50) + '...' : note.note;
              return `<div style="font-size:9px;color:#999;margin:3px 0;display:flex;gap:5px">
                <span>${progressIcon}</span>
                <span style="color:#666">${noteDate}:</span>
                <span>${noteText || 'No note'}</span>
              </div>`;
            }).join('')}
          </div>

          <div id="commLogs-${m.id}-all" style="display:none;max-height:300px;overflow-y:auto">
            ${[...commNotes].reverse().map(note => {
              const noteDate = new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const progressIcon = note.progress === 'positive' ? '✅' : (note.progress === 'negative' ? '❌' : '➖');
              const progressColor = note.progress === 'positive' ? '#0f0' : (note.progress === 'negative' ? '#f00' : '#ff0');
              return `<div style="margin:6px 0;padding:6px;background:#111;border-left:2px solid ${progressColor};border-radius:2px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                  <span style="font-size:9px;color:#666">${noteDate}</span>
                  <span style="font-size:10px">${progressIcon}</span>
                </div>
                <div style="font-size:9px;color:#ccc;line-height:1.4">${note.note || 'No note'}</div>
                ${note.contentUpdate ? `<div style="margin-top:4px;padding:4px;background:#0a0a0a;border-radius:2px">
                  <div style="font-size:8px;color:#0f0">Content: ${note.contentUpdate}</div>
                </div>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div style="display:flex;gap:5px;margin-top:8px">
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="logCommunication('${m.id}')">Log Today</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="modal('model',${JSON.stringify(m).replace(/"/g, '&quot;')})">Edit</button>
          ${m.status === 'active' ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="modal('modelView','${m.id}')">View</button>` : ''}
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="deleteModel('${m.id}')">Delete</button>
        </div>
      </div>
    </div>`;
  });
  return html;
}

async function deleteModel(id) {
  if (await confirmDialog('Delete this model? This cannot be undone.')) {
    await DB.delete('models', id);
    toast('Model deleted', 'success');
    loadModels();
  }
}

// ============================================
// CHATTERS
// ============================================

async function loadChatters() {
  try {
    const all = await DB.getAll('chatters', [{ field: 'userId', value: userId }]);
    const applying = all.filter(c => c.status === 'applying');
    const approved = all.filter(c => c.status === 'approved');
    const rejected = all.filter(c => c.status === 'rejected');

    document.getElementById('chatterApplying').innerHTML = renderChatters(applying, 'applying') || '<div class="empty-state">No applicants</div>';
    document.getElementById('chatterApproved').innerHTML = renderChatters(approved, 'approved') || '<div class="empty-state">No approved chatters</div>';
    document.getElementById('chatterRejected').innerHTML = renderChatters(rejected, 'rejected') || '<div class="empty-state">No rejected chatters</div>';
  } catch (e) {
    console.error('Chatters load error:', e);
  }
}

function renderChatters(chatters, tab) {
  if (!chatters.length) return '';

  const testFields = [
    { key: 'englishQuality', label: 'English Quality' },
    { key: 'speedtest', label: 'Speedtest' },
    { key: 'computerStress', label: 'PC Stress' },
    { key: 'typingTest', label: 'Typing' },
    { key: 'iqTest', label: 'IQ' },
    { key: 'eqTest', label: 'EQ' },
    { key: 'empathyTest', label: 'Empathy' },
    { key: 'englishTest', label: 'English Test' }
  ];

  return chatters.map(c => {
    const testsHtml = testFields.map(t => {
      const val = c[t.key] || '';
      if (!val) return '';
      const color = val.toLowerCase().includes('fail') || val.toLowerCase().includes('bad') || val.toLowerCase().includes('low') ? '#f55' : '#0f0';
      return `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0"><span style="color:#999">${t.label}:</span><span style="color:${color}">${val}</span></div>`;
    }).join('');

    const statusActions = tab === 'applying'
      ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#1b5e20;color:#fff" onclick="updateChatterStatus('${c.id}','approved')">Approve</button>
         <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="updateChatterStatus('${c.id}','rejected')">Reject</button>`
      : tab === 'approved'
      ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="updateChatterStatus('${c.id}','rejected')">Reject</button>`
      : `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#1b5e20;color:#fff" onclick="updateChatterStatus('${c.id}','approved')">Approve</button>`;

    return `<div class="card" style="background:#111;border:1px solid #333;border-radius:6px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong style="color:#0f0;font-size:13px">${c.name || 'Unnamed'}</strong>
        <span style="font-size:10px;color:#999">${c.telegram ? '@' + c.telegram : ''}</span>
      </div>
      ${c.info ? `<div style="font-size:10px;color:#888;margin-bottom:8px">${c.info}</div>` : ''}
      ${testsHtml ? `<div style="margin-bottom:8px;padding:6px;background:#0a0a0a;border-radius:4px">${testsHtml}</div>` : ''}
      <div style="display:flex;gap:5px;margin-top:8px">
        <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="modal('chatter',${JSON.stringify(c).replace(/"/g, '&quot;')})">Edit</button>
        ${statusActions}
        <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="deleteChatter('${c.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function saveChatter() {
  const editId = document.getElementById('chatterEditId')?.value;
  const name = document.getElementById('chatterName')?.value?.trim();

  if (!name) {
    toast('Name is required', 'error');
    return;
  }

  const data = {
    userId: userId,
    name: name,
    telegram: document.getElementById('chatterTelegram')?.value?.trim() || '',
    info: document.getElementById('chatterInfo')?.value?.trim() || '',
    status: document.getElementById('chatterStatus')?.value || 'applying',
    englishQuality: document.getElementById('chatterEnglishQuality')?.value?.trim() || '',
    speedtest: document.getElementById('chatterSpeedtest')?.value?.trim() || '',
    computerStress: document.getElementById('chatterComputerStress')?.value?.trim() || '',
    typingTest: document.getElementById('chatterTypingTest')?.value?.trim() || '',
    iqTest: document.getElementById('chatterIqTest')?.value?.trim() || '',
    eqTest: document.getElementById('chatterEqTest')?.value?.trim() || '',
    empathyTest: document.getElementById('chatterEmpathyTest')?.value?.trim() || '',
    englishTest: document.getElementById('chatterEnglishTest')?.value?.trim() || ''
  };

  if (editId) {
    await DB.update('chatters', editId, data);
    toast('Chatter updated', 'success');
  } else {
    data.createdAt = new Date().toISOString();
    await DB.add('chatters', data);
    toast('Chatter added', 'success');
  }

  closeModal();
  loadChatters();
}

async function deleteChatter(id) {
  if (await confirmDialog('Delete this chatter? This cannot be undone.')) {
    await DB.delete('chatters', id);
    toast('Chatter deleted', 'success');
    loadChatters();
  }
}

async function updateChatterStatus(id, status) {
  await DB.update('chatters', id, { status: status });
  toast(`Chatter ${status}`, 'success');
  loadChatters();
}

// ============================================
// SPY — Agency Applies
// ============================================

async function loadSpy() {
  try {
    let applies = await DB.getAll('spy_applies', [{ field: 'userId', value: userId }]);
    applies.sort((a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''));

    const applying = applies.filter(a => a.status === 'applying');
    const accepted = applies.filter(a => a.status === 'accepted');
    const rejected = applies.filter(a => a.status === 'rejected');

    // Stats
    document.getElementById('spyTotal').textContent = applies.length;
    document.getElementById('spyAccepted').textContent = accepted.length;
    const totalFans = applies.reduce((s, a) => {
      const models = a.models || [];
      return s + models.reduce((ms, m) => ms + (parseInt(m.fans) || 0), 0);
    }, 0);
    document.getElementById('spyTotalFans').textContent = totalFans.toLocaleString();
    document.getElementById('spyImported').textContent = applies.filter(a => a.importedToAutopilot).length;

    document.getElementById('spyApplyingList').innerHTML = renderSpyCards(applying) || '<div class="empty-state">No active applies</div>';
    document.getElementById('spyAcceptedList').innerHTML = renderSpyCards(accepted) || '<div class="empty-state">No accepted applies</div>';
    document.getElementById('spyRejectedList').innerHTML = renderSpyCards(rejected) || '<div class="empty-state">No rejected applies</div>';
  } catch (e) {
    console.error('loadSpy error:', e);
  }
}

function renderSpyCards(applies) {
  if (!applies.length) return '';
  return applies.map(a => {
    const models = a.models || [];
    const totalFans = models.reduce((s, m) => s + (parseInt(m.fans) || 0), 0);

    const badges = [
      a.hadInterview ? '<span style="background:#1b5e20;color:#fff;padding:1px 6px;border-radius:2px;font-size:9px">Interview</span>' : '<span style="background:#333;color:#666;padding:1px 6px;border-radius:2px;font-size:9px">Interview</span>',
      a.gotLogins ? '<span style="background:#1b5e20;color:#fff;padding:1px 6px;border-radius:2px;font-size:9px">Logins</span>' : '<span style="background:#333;color:#666;padding:1px 6px;border-radius:2px;font-size:9px">Logins</span>',
      a.accessToFans ? '<span style="background:#1b5e20;color:#fff;padding:1px 6px;border-radius:2px;font-size:9px">Fans Access</span>' : '<span style="background:#333;color:#666;padding:1px 6px;border-radius:2px;font-size:9px">Fans Access</span>',
      a.importedToAutopilot ? '<span style="background:#0d47a1;color:#fff;padding:1px 6px;border-radius:2px;font-size:9px">Imported</span>' : '<span style="background:#333;color:#666;padding:1px 6px;border-radius:2px;font-size:9px">Imported</span>'
    ].join(' ');

    const modelsHtml = models.length ? `<div style="margin-top:8px;padding:6px;background:#0a0a0a;border-radius:3px">
      <div style="font-size:9px;color:#666;margin-bottom:4px">Models (${models.length}):</div>
      ${models.map(m => `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;border-bottom:1px solid #1a1a1a">
        <span style="color:#0f0">@${m.username || '?'}</span>
        <span style="color:#ff0">${m.fans ? parseInt(m.fans).toLocaleString() + ' fans' : '—'}</span>
      </div>`).join('')}
      ${totalFans ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0 0;margin-top:3px;border-top:1px solid #333"><strong style="color:#999">Total</strong><strong style="color:#ff0">${totalFans.toLocaleString()} fans</strong></div>` : ''}
    </div>` : '';

    return `<div class="card" style="background:#111;border:1px solid #333;border-radius:6px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="color:#0f0;font-size:13px">${a.agency || 'Unknown Agency'}</strong>
        <span style="font-size:10px;color:#999">${a.dateApplied || '—'}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">${badges}</div>
      ${a.notes ? `<div style="font-size:10px;color:#888;margin-bottom:6px">${a.notes}</div>` : ''}
      ${modelsHtml}
      <div style="display:flex;gap:5px;margin-top:10px">
        <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="editSpyApply('${a.id}')">Edit</button>
        ${a.status === 'applying' ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#1b5e20;color:#fff" onclick="updateSpyStatus('${a.id}','accepted')">Accept</button>
        <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="updateSpyStatus('${a.id}','rejected')">Reject</button>` : ''}
        ${a.status === 'accepted' ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="updateSpyStatus('${a.id}','rejected')">Reject</button>` : ''}
        ${a.status === 'rejected' ? `<button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#1b5e20;color:#fff" onclick="updateSpyStatus('${a.id}','accepted')">Accept</button>` : ''}
        <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;background:#c62828;color:#fff" onclick="deleteSpyApply('${a.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function saveSpyApply() {
  const editId = document.getElementById('spyEditId')?.value;
  const agency = document.getElementById('spyAgency')?.value?.trim();

  if (!agency) {
    toast('Agency name is required', 'error');
    return;
  }

  // Collect models from dynamic rows
  const rows = document.querySelectorAll('.spy-model-row');
  const models = [];
  rows.forEach(row => {
    const username = row.querySelector('.spy-model-username')?.value?.trim();
    if (!username) return;
    models.push({
      username: username,
      fans: parseInt(row.querySelector('.spy-model-fans')?.value) || 0
    });
  });

  const data = {
    userId: userId,
    agency: agency,
    dateApplied: document.getElementById('spyDate')?.value || new Date().toISOString().split('T')[0],
    status: document.getElementById('spyStatus')?.value || 'applying',
    hadInterview: document.getElementById('spyInterview')?.checked || false,
    gotLogins: document.getElementById('spyLogins')?.checked || false,
    accessToFans: document.getElementById('spyFansAccess')?.checked || false,
    importedToAutopilot: document.getElementById('spyImportedAP')?.checked || false,
    models: models,
    notes: document.getElementById('spyNotes')?.value?.trim() || ''
  };

  if (editId) {
    await DB.update('spy_applies', editId, data);
    toast('Apply updated', 'success');
  } else {
    data.createdAt = new Date().toISOString();
    await DB.add('spy_applies', data);
    toast('Apply added', 'success');
  }

  closeModal();
  loadSpy();
}

async function editSpyApply(id) {
  try {
    const apply = await DB.get('spy_applies', id);
    if (!apply) {
      toast('Apply not found', 'error');
      return;
    }
    if (!apply.id) apply.id = id;
    modal('spyApply', apply);
  } catch (e) {
    console.error('editSpyApply error:', e);
    toast('Error loading apply', 'error');
  }
}

async function deleteSpyApply(id) {
  if (await confirmDialog('Delete this apply? This cannot be undone.')) {
    await DB.delete('spy_applies', id);
    toast('Apply deleted', 'success');
    loadSpy();
  }
}

async function updateSpyStatus(id, status) {
  await DB.update('spy_applies', id, { status: status });
  toast(`Apply ${status}`, 'success');
  loadSpy();
}

function addSpyModelRow(model) {
  const container = document.getElementById('spyModelsContainer');
  const row = document.createElement('div');
  row.className = 'spy-model-row';
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px';
  row.innerHTML = `
    <input type="text" class="form-input spy-model-username" placeholder="@username" value="${model?.username || ''}" style="flex:2">
    <input type="number" class="form-input spy-model-fans" placeholder="Fans count" min="0" value="${model?.fans || ''}" style="flex:1">
    <button class="btn btn-sm" style="font-size:10px;padding:4px 8px;background:#c62828;color:#fff;flex:0 0 auto" onclick="this.closest('.spy-model-row').remove()">X</button>
  `;
  container.appendChild(row);
}

// ============================================
// CONTENT
// ============================================

let spoofFiles = [];
let currentSpoofContentId = null;

async function loadContent() {
  try {
    const allContent = await DB.getAll('content', [{ field: 'userId', value: userId }]);
    const pending = allContent.filter(c => c.status === 'pending');
    const approved = allContent.filter(c => c.status === 'approved' && !c.posted);
    const posted = allContent.filter(c => c.posted === true);
    const rejected = allContent.filter(c => c.status === 'rejected');

    document.getElementById('contentPending').innerHTML = renderContentCards(pending, 'pending') || '<div class="empty-state">No pending content</div>';
    document.getElementById('contentApproved').innerHTML = renderContentCards(approved, 'approved') || '<div class="empty-state">No approved content</div>';
    document.getElementById('contentPosted').innerHTML = renderContentCards(posted, 'posted') || '<div class="empty-state">No posted content yet</div>';
    document.getElementById('contentRejected').innerHTML = renderContentCards(rejected, 'rejected') || '<div class="empty-state">No rejected content</div>';

    loadPrompts();
  } catch (e) {
    console.error('Content load error:', e);
  }
}

function renderContentCards(items, tab) {
  if (!items.length) return '';
  let html = '';
  items.forEach(c => {
    const isVideo = c.mediaType === 'video' || c.contentType === 'video' || c.contentType === 'reels' ||
                    c.mediaUrl?.includes('vimeo') || c.mediaUrl?.includes('.mp4') || c.mediaUrl?.includes('.mov');
    const displayUrl = c.spoofedUrl || c.mediaUrl;

    // Check for Vimeo
    const vimeoMatch = displayUrl?.match(/vimeo\.com\/(\d+)/) || displayUrl?.match(/player\.vimeo\.com\/video\/(\d+)/);

    // Build media HTML
    let mediaHtml;
    if (!displayUrl) {
      mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:11px">No media</div>';
    } else if (vimeoMatch) {
      // Vimeo embed player
      mediaHtml = `<iframe
        src="https://player.vimeo.com/video/${vimeoMatch[1]}?badge=0&autopause=0&player_id=0&app_id=58479&muted=1"
        style="width:100%;height:100%;border:none"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        loading="lazy"
        referrerpolicy="no-referrer"></iframe>`;
    } else if (isVideo) {
      // Direct video player
      mediaHtml = `<video
        src="${displayUrl}"
        style="width:100%;height:100%;object-fit:cover;background:#000"
        muted
        loop
        playsinline
        preload="metadata"
        onmouseover="this.play()"
        onmouseout="this.pause()"></video>`;
    } else {
      // Image
      mediaHtml = `<img src="${displayUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`;
    }

    // Format dates helper
    const fmtDate = (d) => {
      if (!d) return null;
      const date = new Date(d.seconds ? d.seconds * 1000 : d);
      return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
    };

    const uploadedDate = fmtDate(c.createdAt);
    const spoofedDate = fmtDate(c.spoofedAt);
    const postedDate = fmtDate(c.postedAt);

    let actionsHtml = '';
    let statusHtml = '';
    let datesHtml = '<div class="content-card-dates">';
    if (uploadedDate) datesHtml += `<span>📤 ${uploadedDate}</span>`;
    if (spoofedDate) datesHtml += `<span>🔧 ${spoofedDate}</span>`;
    if (postedDate) datesHtml += `<span>✅ ${postedDate}</span>`;
    datesHtml += '</div>';

    if (tab === 'pending') {
      actionsHtml = `
        <button class="btn btn-sm btn-primary" onclick="approveContent('${c.id}')">Approve</button>
        <button class="btn btn-sm" onclick="rejectContentModal('${c.id}')">Reject</button>
      `;
    } else if (tab === 'approved') {
      statusHtml = `<span class="content-status-tag ${c.spoofed ? 'done' : 'pending'}">${c.spoofed ? '✓ Spoofed' : '○ Not Spoofed'}</span>`;
      actionsHtml = `
        <button class="btn btn-sm" onclick="openSpoofer('${c.id}')">Spoof</button>
        <button class="btn btn-sm btn-primary" onclick="markPosted('${c.id}')">Posted</button>
        <button class="btn btn-sm" onclick="viewContent('${c.id}')">View</button>
      `;
    } else if (tab === 'posted') {
      statusHtml = `
        <span class="content-status-tag done">✓ Posted</span>
        ${c.spoofed ? `<span class="content-status-tag done">✓ Spoofed</span>` : ''}
      `;
      actionsHtml = `<button class="btn btn-sm" onclick="viewContent('${c.id}')">View</button>`;
    } else if (tab === 'rejected') {
      statusHtml = c.rejectNote ? `<div style="color:#f55;font-size:10px;margin-top:5px">Reason: ${c.rejectNote}</div>` : '';
      actionsHtml = `<button class="btn btn-sm" onclick="deleteContent('${c.id}')">Delete</button>`;
    }

    html += `<div class="content-card">
      <div class="content-card-media">
        ${mediaHtml}
        <span class="content-card-badge ${c.contentType || 'photo'}">${c.contentType || 'photo'}</span>
      </div>
      <div class="content-card-body">
        <div class="content-card-header">
          <span class="content-card-account">@${c.accountUsername || 'unknown'}</span>
          <span class="content-card-platform">${c.platform || ''}</span>
        </div>
        ${datesHtml}
        ${c.description ? `<div style="font-size:10px;color:#888;margin-bottom:6px">${c.description}</div>` : ''}
        <div class="content-card-status">${statusHtml}</div>
        <div class="content-card-actions">${actionsHtml}</div>
      </div>
    </div>`;
  });
  return html;
}

async function approveContent(id) {
  await DB.update('content', id, { status: 'approved', approvedAt: new Date() });
  toast('Content approved', 'success');
  loadContent();
}

function rejectContentModal(id) {
  const note = prompt('Rejection reason:');
  if (note !== null) {
    rejectContent(id, note);
  }
}

async function rejectContent(id, note) {
  await DB.update('content', id, { status: 'rejected', rejectNote: note || '', rejectedAt: new Date() });
  toast('Content rejected', 'success');
  loadContent();
}

async function markPosted(id) {
  await DB.update('content', id, { posted: true, postedAt: new Date() });
  toast('Moved to Posted', 'success');
  loadContent();
}

async function deleteContent(id) {
  if (await confirmDialog('Delete this content?')) {
    await DB.delete('content', id);
    toast('Content deleted', 'success');
    loadContent();
  }
}

async function viewContent(id) {
  const content = await DB.get('content', id);
  if (content) modal('viewContent', content);
}

// ========== SPOOFER ==========
function openSpoofer(contentId) {
  currentSpoofContentId = contentId;
  spoofFiles = [];
  modal('spoofer', { contentId });
}

function handleSpoofFiles(input) {
  spoofFiles = Array.from(input.files);
  const preview = document.getElementById('spoofPreview');
  if (spoofFiles.length > 0) {
    preview.innerHTML = `<p style="color:#0f0">${spoofFiles.length} file(s) selected</p><div id="spoofThumbs" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px"></div>`;
    const thumbsEl = document.getElementById('spoofThumbs');
    spoofFiles.forEach((f, i) => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          thumbsEl.innerHTML += `<img src="${e.target.result}" style="width:60px;height:60px;object-fit:cover;border-radius:4px">`;
        };
        reader.readAsDataURL(f);
      } else if (f.type.startsWith('video/')) {
        thumbsEl.innerHTML += `<div style="width:60px;height:60px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px">🎬</div>`;
      }
    });
  }
}

async function processSpoof() {
  if (spoofFiles.length === 0) {
    return toast('Please select files first', 'error');
  }

  const city = document.getElementById('spoofCity').value;
  const device = document.getElementById('spoofDevice').value;
  const statusEl = document.getElementById('spoofStatus');
  const resultsEl = document.getElementById('spoofResults');

  resultsEl.innerHTML = '';
  statusEl.innerHTML = '<span style="color:#ff0">Processing...</span>';

  let processed = 0;
  const results = [];

  for (const file of spoofFiles) {
    try {
      statusEl.innerHTML = `<span style="color:#ff0">Processing ${processed + 1}/${spoofFiles.length}: ${file.name}...</span>`;

      if (file.type.startsWith('image/')) {
        const result = await spoofImageBrowser(file, city, device);
        results.push(result);
      } else if (file.type.startsWith('video/')) {
        const result = await spoofVideoBrowser(file, city, device);
        results.push(result);
      }
      processed++;
    } catch (e) {
      console.error('Spoof error:', e);
      results.push({ type: 'error', filename: file.name, error: e.message });
    }
  }

  // Display results
  resultsEl.innerHTML = '<div style="margin-top:15px"><strong style="color:#0f0">✓ Results:</strong></div><div id="spoofResultsList" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px"></div>';
  const listEl = document.getElementById('spoofResultsList');

  results.forEach((r, i) => {
    if (r.type === 'error') {
      listEl.innerHTML += `<div style="padding:10px;background:#300;border-radius:4px;font-size:10px;color:#f55">${r.filename}: ${r.error}</div>`;
    } else {
      const isVideo = r.type === 'video';
      const thumbEl = isVideo ?
        `<video src="${r.blobUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:4px"></video>` :
        `<img src="${r.blobUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:4px">`;

      listEl.innerHTML += `
        <div style="text-align:center">
          ${thumbEl}
          <a href="${r.blobUrl}" download="${r.filename}" class="btn btn-sm" style="margin-top:5px;font-size:9px;display:block">⬇ Download</a>
        </div>`;
    }
  });

  const successCount = results.filter(r => r.type !== 'error').length;
  statusEl.innerHTML = `
    <div style="color:#0f0;margin-bottom:15px">✓ ${successCount}/${spoofFiles.length} files processed with full iPhone metadata.</div>
    <button class="btn btn-primary" onclick="markSpoofedManually()">Done - Mark as Spoofed</button>
  `;
}

// Video spoof - uses VideoSpoofer for proper MP4 metadata injection
async function spoofVideoBrowser(file, city, device) {
  return await VideoSpoofer.spoof(file, city, device);
}

// Browser fallback for images (with piexif for EXIF)
async function spoofImageBrowser(file, city, device) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Random transforms
        const cropPct = 0.005 + Math.random() * 0.015;
        const cropX = Math.floor(img.width * cropPct);
        const cropY = Math.floor(img.height * cropPct);
        canvas.width = img.width - cropX * 2;
        canvas.height = img.height - cropY * 2;

        const rotation = (Math.random() - 0.5);
        const flip = Math.random() > 0.5;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        if (flip) ctx.scale(-1, 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.drawImage(img, cropX, cropY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Color adjustments
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const brightness = 0.98 + Math.random() * 0.04;
        const contrast = 0.98 + Math.random() * 0.04;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128) * brightness);
          data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * contrast + 128) * brightness);
          data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * contrast + 128) * brightness);
        }
        ctx.putImageData(imageData, 0, 0);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        // Add EXIF if piexif available
        if (typeof piexif !== 'undefined') {
          try {
            const exif = createBrowserExif(city, device);
            dataUrl = piexif.insert(exif, dataUrl);
          } catch (ex) { console.warn('EXIF failed:', ex); }
        }

        // Convert to blob
        fetch(dataUrl).then(r => r.blob()).then(blob => {
          resolve({
            type: 'image',
            blobUrl: URL.createObjectURL(blob),
            filename: `IMG_${Date.now()}.jpg`
          });
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Randomize GPS coordinates within ~2km radius
function randomizeGPS(lat, lon) {
  // Random offset: ±0.02 degrees = roughly ±2km
  const latOffset = (Math.random() - 0.5) * 0.04;
  const lonOffset = (Math.random() - 0.5) * 0.04;
  return [lat + latOffset, lon + lonOffset];
}

// Get random altitude based on city
function getRandomAltitude(baseAlt) {
  return Math.max(0, baseAlt + Math.floor((Math.random() - 0.5) * 20));
}

function createBrowserExif(city, device) {
  const cities = {
    "New York": [40.7128, -74.0060, 10], "Los Angeles": [34.0522, -118.2437, 71],
    "Miami": [25.7617, -80.1918, 2], "Chicago": [41.8781, -87.6298, 181],
    "London": [51.5074, -0.1278, 11], "Prague": [50.0755, 14.4378, 235],
    "Paris": [48.8566, 2.3522, 35], "Berlin": [52.5200, 13.4050, 34],
    "Tokyo": [35.6762, 139.6503, 40], "Sydney": [-33.8688, 151.2093, 58],
    "Dubai": [25.2048, 55.2708, 5], "Toronto": [43.6532, -79.3832, 76],
    "Amsterdam": [52.3676, 4.9041, 2], "Barcelona": [41.3851, 2.1734, 12],
    "Rome": [41.9028, 12.4964, 21], "Vienna": [48.2082, 16.3738, 171],
    "Singapore": [1.3521, 103.8198, 15], "Hong Kong": [22.3193, 114.1694, 32],
    "Seoul": [37.5665, 126.9780, 38], "Mumbai": [19.0760, 72.8777, 14]
  };
  const devices = {
    "iPhone 16 Pro": { make: "Apple", model: "iPhone 16 Pro", software: "18.2.1", lens: "iPhone 16 Pro back triple camera 6.765mm f/1.78" },
    "iPhone 16 Pro Max": { make: "Apple", model: "iPhone 16 Pro Max", software: "18.2.1", lens: "iPhone 16 Pro Max back triple camera 6.765mm f/1.78" },
    "iPhone 17 Pro": { make: "Apple", model: "iPhone 17 Pro", software: "19.0", lens: "iPhone 17 Pro back triple camera 6.765mm f/1.78" },
    "iPhone 17 Pro Max": { make: "Apple", model: "iPhone 17 Pro Max", software: "19.0", lens: "iPhone 17 Pro Max back triple camera 6.765mm f/1.78" }
  };

  const baseCoords = cities[city] || cities["New York"];
  const randomCoords = randomizeGPS(baseCoords[0], baseCoords[1]);
  const altitude = getRandomAltitude(baseCoords[2] || 10);
  const dev = devices[device] || devices["iPhone 16 Pro"];

  // Random date within last 7 days
  const now = new Date();
  now.setDate(now.getDate() - Math.floor(Math.random() * 7));
  now.setHours(8 + Math.floor(Math.random() * 12));
  now.setMinutes(Math.floor(Math.random() * 60));
  now.setSeconds(Math.floor(Math.random() * 60));
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, ':');

  // Random realistic camera settings
  const isoValues = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400];
  const exposureTimes = [[1, 60], [1, 100], [1, 125], [1, 200], [1, 250], [1, 500], [1, 1000]];
  const fNumbers = [[178, 100], [189, 100], [220, 100], [280, 100]];

  const iso = isoValues[Math.floor(Math.random() * isoValues.length)];
  const exposure = exposureTimes[Math.floor(Math.random() * exposureTimes.length)];
  const fNumber = fNumbers[Math.floor(Math.random() * fNumbers.length)];

  const toDMS = (d) => {
    const abs = Math.abs(d), deg = Math.floor(abs), min = Math.floor((abs - deg) * 60);
    return [[deg, 1], [min, 1], [Math.round(((abs - deg) * 60 - min) * 60 * 10000), 10000]];
  };

  return piexif.dump({
    "0th": {
      [piexif.ImageIFD.Make]: dev.make,
      [piexif.ImageIFD.Model]: dev.model,
      [piexif.ImageIFD.Software]: dev.software,
      [piexif.ImageIFD.DateTime]: dateStr,
      [piexif.ImageIFD.Orientation]: 1,
      [piexif.ImageIFD.XResolution]: [72, 1],
      [piexif.ImageIFD.YResolution]: [72, 1],
      [piexif.ImageIFD.ResolutionUnit]: 2
    },
    "Exif": {
      [piexif.ExifIFD.DateTimeOriginal]: dateStr,
      [piexif.ExifIFD.DateTimeDigitized]: dateStr,
      [piexif.ExifIFD.LensMake]: "Apple",
      [piexif.ExifIFD.LensModel]: dev.lens,
      [piexif.ExifIFD.FocalLength]: [6765, 1000],
      [piexif.ExifIFD.FocalLengthIn35mmFilm]: 24,
      [piexif.ExifIFD.FNumber]: fNumber,
      [piexif.ExifIFD.ExposureTime]: exposure,
      [piexif.ExifIFD.ISOSpeedRatings]: iso,
      [piexif.ExifIFD.ExposureProgram]: 2,
      [piexif.ExifIFD.ExposureMode]: 0,
      [piexif.ExifIFD.WhiteBalance]: 0,
      [piexif.ExifIFD.MeteringMode]: 5,
      [piexif.ExifIFD.Flash]: 16,
      [piexif.ExifIFD.ColorSpace]: 65535,
      [piexif.ExifIFD.SensingMethod]: 2,
      [piexif.ExifIFD.SceneType]: "\x01",
      [piexif.ExifIFD.SubjectArea]: [2009, 1506, 2208, 1324],
      [piexif.ExifIFD.SubSecTimeOriginal]: String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      [piexif.ExifIFD.SubSecTimeDigitized]: String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    },
    "GPS": {
      [piexif.GPSIFD.GPSVersionID]: [2, 3, 0, 0],
      [piexif.GPSIFD.GPSLatitudeRef]: randomCoords[0] >= 0 ? "N" : "S",
      [piexif.GPSIFD.GPSLatitude]: toDMS(randomCoords[0]),
      [piexif.GPSIFD.GPSLongitudeRef]: randomCoords[1] >= 0 ? "E" : "W",
      [piexif.GPSIFD.GPSLongitude]: toDMS(randomCoords[1]),
      [piexif.GPSIFD.GPSAltitudeRef]: 0,
      [piexif.GPSIFD.GPSAltitude]: [altitude, 1],
      [piexif.GPSIFD.GPSSpeedRef]: "K",
      [piexif.GPSIFD.GPSSpeed]: [0, 1],
      [piexif.GPSIFD.GPSImgDirectionRef]: "T",
      [piexif.GPSIFD.GPSImgDirection]: [Math.floor(Math.random() * 36000), 100],
      [piexif.GPSIFD.GPSDestBearingRef]: "T",
      [piexif.GPSIFD.GPSDestBearing]: [Math.floor(Math.random() * 36000), 100],
      [piexif.GPSIFD.GPSHPositioningError]: [5, 1]
    }
  });
}

async function markSpoofedManually(contentId) {
  const city = document.getElementById('spoofCity').value;
  const device = document.getElementById('spoofDevice').value;

  await DB.update('content', contentId || currentSpoofContentId, {
    spoofed: true,
    spoofedAt: new Date(),
    spoofCity: city,
    spoofDevice: device
  });

  toast('Marked as spoofed', 'success');
  closeModal();
  loadContent();
}

// ========== PROMPTS ==========
async function loadPrompts() {
  const prompts = await DB.getAll('prompts', [{ field: 'userId', value: userId }]);
  let html = '';

  prompts.forEach(p => {
    const refsHtml = (p.referenceImages || []).map(url =>
      `<img src="${url}" onclick="window.open('${url}', '_blank')" style="cursor:pointer">`
    ).join('');

    const resultHtml = p.resultUrl ? (p.resultType === 'video' ?
      `<video src="${p.resultUrl}" controls></video>` :
      `<img src="${p.resultUrl}" onclick="window.open('${p.resultUrl}', '_blank')" style="cursor:pointer">`) : '';

    html += `<div class="prompt-card">
      <div class="prompt-card-header">
        <span class="prompt-card-account">@${p.accountUsername || 'General'}</span>
        <div>
          <button class="btn btn-sm" onclick="copyPrompt('${p.id}')">Copy</button>
          <button class="btn btn-sm" onclick="deletePrompt('${p.id}')">Delete</button>
        </div>
      </div>
      <div class="prompt-card-text">${p.promptText || ''}</div>
      ${p.workflow ? `<div style="font-size:10px;color:#666;margin-bottom:10px"><strong>Workflow:</strong> ${p.workflow}</div>` : ''}
      ${refsHtml ? `<div class="prompt-card-refs"><strong style="width:100%;font-size:10px;margin-bottom:5px">References:</strong>${refsHtml}</div>` : ''}
      ${resultHtml ? `<div class="prompt-card-result"><strong style="font-size:10px">Result:</strong><br>${resultHtml}</div>` : ''}
    </div>`;
  });

  document.getElementById('promptList').innerHTML = html || '<div class="empty-state">No saved prompts yet</div>';
}

async function copyPrompt(id) {
  const p = await DB.get('prompts', id);
  if (p?.promptText) {
    navigator.clipboard.writeText(p.promptText);
    toast('Prompt copied!', 'success');
  }
}

async function deletePrompt(id) {
  if (await confirmDialog('Delete this prompt?')) {
    await DB.delete('prompts', id);
    toast('Prompt deleted', 'success');
    loadPrompts();
  }
}

async function savePrompt() {
  const accountId = document.getElementById('promptAccount').value;
  const accounts = await DB.getAll('posting_accounts');
  const account = accounts.find(a => a.id === accountId);

  const promptText = document.getElementById('promptText').value.trim();
  const workflow = document.getElementById('promptWorkflow').value.trim();
  const refImages = document.getElementById('promptRefs').value.trim().split(',').map(s => s.trim()).filter(s => s);
  const resultUrl = document.getElementById('promptResult').value.trim();
  const resultType = resultUrl.includes('vimeo') || resultUrl.includes('.mp4') ? 'video' : 'image';

  if (!promptText) return toast('Enter prompt text', 'error');

  await DB.add('prompts', {
    userId: userId,
    accountId: accountId || null,
    accountUsername: account?.username || null,
    platform: account?.platform || null,
    promptText,
    workflow,
    referenceImages: refImages,
    resultUrl: resultUrl || null,
    resultType,
    createdAt: new Date()
  });

  toast('Prompt saved!', 'success');
  closeModal();
  loadPrompts();
}

async function submitContent() {
  const accountId = document.getElementById('contentAccount').value;
  const contentType = document.getElementById('contentType').value;
  const mediaUrl = document.getElementById('contentMediaUrl').value.trim();
  const description = document.getElementById('contentDesc').value.trim();

  if (!accountId) return toast('Select an account', 'error');
  if (!mediaUrl) return toast('Enter media URL', 'error');

  const accounts = await DB.getAll('posting_accounts');
  const account = accounts.find(a => a.id === accountId);

  const isVideo = mediaUrl.includes('vimeo') || mediaUrl.includes('.mp4') || contentType === 'reels' || contentType === 'video';

  await DB.add('content', {
    userId: userId,
    accountId: accountId,
    accountUsername: account?.username || '',
    platform: account?.platform || '',
    contentType: contentType,
    mediaUrl: mediaUrl,
    mediaType: isVideo ? 'video' : 'image',
    description: description,
    status: 'pending',
    spoofed: false,
    posted: false,
    createdAt: new Date()
  });

  toast('Content submitted!', 'success');
  closeModal();
  loadContent();
}

// ============================================
// POSTING
// ============================================
async function loadPosting() {
  const accs = await DB.getAll('posting_accounts');
  let html = '';

  accs.forEach(a => {
    const counts = a.typesCounts || {};
    const typesHtml = Object.entries(counts).map(([type, count]) =>
      `<span class="type-badge">${type}: ${count}/day</span>`
    ).join('') || '<span style="color:#666">No posts set</span>';

    const totalPosts = Object.values(counts).reduce((sum, c) => sum + c, 0);

    html += `<div class="box">
      <div class="box-header">
        <span>${(a.platform || '').toUpperCase()} - @${a.username}</span>
        <span style="color:#0f0">${totalPosts} posts/day</span>
      </div>
      <div class="box-body">
        <div style="margin-bottom:10px">${typesHtml}</div>
        ${a.notes ? `<div style="color:#666;font-size:11px;font-style:italic">${a.notes}</div>` : ''}
        <div style="margin-top:12px;display:flex;gap:10px">
          <button class="btn btn-sm" onclick="editPosting('${a.id}')">Edit</button>
          <button class="btn btn-sm" onclick="delPosting('${a.id}')">Delete</button>
        </div>
      </div>
    </div>`;
  });

  document.getElementById('postList').innerHTML = html || '<div class="empty-state">No posting accounts</div>';
}

async function delPosting(id) {
  if (await confirmDialog('Delete this posting account?')) {
    await DB.delete('posting_accounts', id);
    toast('Posting account deleted', 'success');
    loadPosting();
  }
}

// ============================================
// SETTINGS
// ============================================
// ============================================
// SECTION VISIBILITY
// ============================================
let sectionVisConfig = null;

const SECTION_LABELS = {
  daily: 'Daily', ai: 'AI Chats', outreach: 'Outreach', leads: 'Leads',
  models: 'Models', chatters: 'Chatters', spy: 'Spy', content: 'Content', posting: 'Posting'
};
const TAB_LABELS = {
  'o-ig': 'Instagram', 'o-tw': 'Twitter', 'o-wc': 'Webcams', 'o-of': 'OnlyFans',
  'o-tk': 'TikTok', 'o-os': 'OFautopilot', 'o-op': 'Openers', 'o-fu': 'Follow-ups', 'o-sc': 'Scripts'
};

const DEFAULT_SECTION_VIS = {
  sections: { leads: false },
  tabs: { 'o-ig': false, 'o-tw': false, 'o-wc': false, 'o-of': false, 'o-tk': false, 'o-os': false }
};

async function loadSectionVisibility() {
  let doc = await DB.getSetting('section_visibility');
  if (!doc) {
    sectionVisConfig = JSON.parse(JSON.stringify(DEFAULT_SECTION_VIS));
    await DB.saveSetting('section_visibility', sectionVisConfig);
  } else {
    sectionVisConfig = { sections: doc.sections || {}, tabs: doc.tabs || {} };
  }
  renderVisibilityToggles();
  applySectionVisibility(sectionVisConfig);
}

function makeToggle(key, label, type) {
  const on = sectionVisConfig[type][key] !== false;
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 5px;border-bottom:1px solid #222">
    <span style="font-size:13px">${label}</span>
    <label class="sv-toggle">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="toggleSectionVisibility('${type}','${key}',this.checked)">
      <span class="sv-slider"></span>
    </label>
  </div>`;
}

function renderVisibilityToggles() {
  const sEl = document.getElementById('sectionToggles');
  const tEl = document.getElementById('tabToggles');
  if (!sEl || !tEl) return;
  sEl.innerHTML = Object.entries(SECTION_LABELS).map(([k, l]) => makeToggle(k, l, 'sections')).join('');
  tEl.innerHTML = Object.entries(TAB_LABELS).map(([k, l]) => makeToggle(k, l, 'tabs')).join('');
}

function applySectionVisibility(config) {
  document.querySelectorAll('.nav-link[data-s]').forEach(el => {
    if (el.dataset.s === 'settings') return;
    el.style.display = (config.sections && config.sections[el.dataset.s] === false) ? 'none' : '';
  });
  document.querySelectorAll('#outreach .tab[data-t]').forEach(el => {
    el.style.display = (config.tabs && config.tabs[el.dataset.t] === false) ? 'none' : '';
  });
  const activeNav = document.querySelector('.nav-link.active');
  if (activeNav && activeNav.style.display === 'none') {
    const first = document.querySelector('.nav-link:not([style*="display: none"]):not([style*="display:none"])');
    if (first) first.click();
  }
  const outreach = document.getElementById('outreach');
  if (outreach) {
    const activeTab = outreach.querySelector('.tab.active');
    if (activeTab && activeTab.style.display === 'none') {
      const firstTab = outreach.querySelector('.tab:not([style*="display: none"]):not([style*="display:none"])');
      if (firstTab) firstTab.click();
    }
  }
}

async function toggleSectionVisibility(type, key, val) {
  sectionVisConfig[type][key] = val;
  await DB.saveSetting('section_visibility', sectionVisConfig);
  renderVisibilityToggles();
  applySectionVisibility(sectionVisConfig);
  const name = type === 'sections' ? SECTION_LABELS[key] : TAB_LABELS[key];
  toast(`${name} ${val ? 'visible' : 'hidden'}`, 'success');
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
  // Load Users
  await loadUsers();

  // Task Presets
  const presets = await DB.getTaskPresets();
  let html = '';
  presets.forEach((p, i) => {
    html += `<div class="list-item">
      <div style="display:flex;flex-direction:column;gap:2px;margin-right:8px">
        <button class="btn btn-sm" onclick="movePresetUp('${p.id}')" ${i === 0 ? 'disabled' : ''} style="padding:0 4px;font-size:10px;line-height:1">▲</button>
        <button class="btn btn-sm" onclick="movePresetDown('${p.id}')" ${i === presets.length - 1 ? 'disabled' : ''} style="padding:0 4px;font-size:10px;line-height:1">▼</button>
      </div>
      <div style="flex:1">
        <strong>${i+1}. ${p.name}</strong>${p.operative ? ' <span style="color:#4CAF50;font-weight:bold;font-size:11px">[OPERATIVE]</span>' : ''}
        ${p.guide ? `<div style="font-size:10px;color:#666;margin-top:3px">${p.guide.substring(0, 50)}...</div>` : ''}
        <div style="font-size:10px;color:#999">
          ${p.images ? 'Has images ' : ''}${p.video ? 'Has video' : ''}
        </div>
      </div>
      <button class="btn btn-sm" onclick="editPreset('${p.id}')">Edit</button>
      <button class="btn btn-sm" onclick="delPreset('${p.id}')">Delete</button>
    </div>`;
  });
  document.getElementById('presetList').innerHTML = html || '<div class="empty-state">No task presets. Add daily tasks for your assistant.</div>';

  // Hourly Rate
  const rate = await DB.getSetting('hourly_rate');
  document.getElementById('rateInput').value = rate?.value || CONFIG.hourlyRate;

  // Section Visibility
  loadSectionVisibility();
}

// ============================================
// USER MANAGEMENT
// ============================================
async function loadUsers() {
  console.log('📋 Loading users...');
  const usersListEl = document.getElementById('usersList');

  if (!usersListEl) {
    console.error('❌ usersList element not found!');
    return;
  }

  try {
    // Check if DB is initialized
    if (!DB || !DB.db) {
      console.error('❌ DB not initialized!');
      usersListEl.innerHTML = '<div class="empty-state" style="color:#f55">ERROR: Database not initialized. Refresh the page.</div>';
      return;
    }

    console.log('📡 Fetching users from Firestore...');
    const snapshot = await DB.db.collection('users').get();
    const users = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        password: data.password || 'NO_PASSWORD_SET',
        role: data.role || 'assistant'
      });
    });

    console.log('✅ Loaded users:', users.length);

    let html = '';
    if (users.length === 0) {
      html = '<div class="empty-state">No users found. Add your first user!</div>';
    } else {
      html = '<div style="display:grid;gap:10px">';
      users.forEach(user => {
        const roleColor = user.role === 'admin' ? '#0f0' : '#ff0';
        const roleBadge = (user.role || 'assistant').toUpperCase();
        const password = user.password || 'NO_PASSWORD';
        const passwordLength = password.length;

        html += `
          <div style="background:#000;border:1px solid #333;padding:15px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div style="flex:1;min-width:200px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
                <strong style="color:#0f0;font-size:16px;font-family:'Courier New',monospace">@${user.id}</strong>
                <span style="background:${roleColor};color:#000;padding:2px 8px;font-size:10px;font-weight:bold;border-radius:3px">${roleBadge}</span>
              </div>
              <div style="font-size:12px;color:#666;font-family:'Courier New',monospace;word-break:break-all">
                Password: <span style="color:#999">${password}</span> <span style="color:#555">(${passwordLength} chars)</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-sm" onclick="editUser('${user.id}')" style="font-size:11px;padding:6px 12px">Edit</button>
              <button class="btn btn-sm" style="background:#000;border:1px solid #f55;color:#f55;font-size:11px;padding:6px 12px" onclick="deleteUser('${user.id}')">Delete</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    usersListEl.innerHTML = html;
  } catch (err) {
    console.error('❌ Error loading users:', err);
    usersListEl.innerHTML = `<div class="empty-state" style="color:#f55">ERROR: ${err.message}<br><br>Check console for details.</div>`;
    if (typeof toast === 'function') {
      toast('Error loading users: ' + err.message, 'error');
    }
  }
}

function showAddUserForm() {
  document.getElementById('userForm').style.display = 'block';
  document.getElementById('userFormTitle').textContent = 'Add New User';
  document.getElementById('saveUserBtnText').textContent = 'Create User';
  document.getElementById('editUserId').value = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').value = 'assistant';
}

async function editUser(userId) {
  try {
    const doc = await DB.db.collection('users').doc(userId).get();
    if (!doc.exists) {
      toast('User not found', 'error');
      return;
    }

    const user = doc.data();
    document.getElementById('userForm').style.display = 'block';
    document.getElementById('userFormTitle').textContent = 'Edit User: ' + userId;
    document.getElementById('saveUserBtnText').textContent = 'Update User';
    document.getElementById('editUserId').value = userId;
    document.getElementById('userUsername').value = userId;
    document.getElementById('userUsername').disabled = true; // Can't change username
    document.getElementById('userPassword').value = user.password;
    document.getElementById('userRole').value = user.role;

    document.getElementById('userForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('Error editing user:', err);
    toast('Error loading user: ' + err.message, 'error');
  }
}

async function saveUser() {
  const editUserId = document.getElementById('editUserId').value;
  const username = document.getElementById('userUsername').value.trim().toLowerCase();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;

  console.log('💾 Saving user:', { username, role, passwordLength: password.length });

  // Validation
  if (!username) {
    toast('Username is required', 'error');
    return;
  }
  if (!password) {
    toast('Password is required', 'error');
    return;
  }
  if (username.length < 2) {
    toast('Username must be at least 2 characters', 'error');
    return;
  }
  if (password.length < 4) {
    toast('Password must be at least 4 characters', 'error');
    return;
  }

  try {
    const userData = {
      password: password,
      role: role
    };

    if (editUserId) {
      // UPDATE existing user
      console.log('📝 Updating user:', editUserId);
      await DB.db.collection('users').doc(editUserId).update(userData);
      toast('User updated! ✅', 'success');
    } else {
      // CREATE new user
      console.log('✨ Creating new user:', username);
      // Check if user already exists
      const existing = await DB.db.collection('users').doc(username).get();
      if (existing.exists) {
        toast('User already exists! Choose a different username.', 'error');
        return;
      }
      await DB.db.collection('users').doc(username).set(userData);
      toast('User created! ✅', 'success');
    }

    cancelUserForm();
    await loadUsers();
  } catch (err) {
    console.error('❌ Error saving user:', err);
    toast('Error: ' + err.message, 'error');
  }
}

function cancelUserForm() {
  document.getElementById('userForm').style.display = 'none';
  document.getElementById('editUserId').value = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').value = 'assistant';
}

async function deleteUser(userId) {
  if (!confirm(`Delete user "${userId}"? This cannot be undone!`)) {
    return;
  }

  try {
    console.log('🗑️ Deleting user:', userId);
    await DB.db.collection('users').doc(userId).delete();
    toast('User deleted! ✅', 'success');
    await loadUsers();
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    toast('Error: ' + err.message, 'error');
  }
}

async function delPreset(id) {
  if (await confirmDialog('Delete this task preset?')) {
    await DB.delete('task_presets', id);
    toast('Task preset deleted', 'success');
    loadSettings();
  }
}

async function movePresetUp(id) {
  const presets = await DB.getTaskPresets();
  const idx = presets.findIndex(p => p.id === id);
  if (idx <= 0) return;
  const prevOrder = presets[idx - 1].order;
  const currOrder = presets[idx].order;
  await DB.update('task_presets', presets[idx].id, { order: prevOrder });
  await DB.update('task_presets', presets[idx - 1].id, { order: currOrder });
  loadSettings();
}

async function movePresetDown(id) {
  const presets = await DB.getTaskPresets();
  const idx = presets.findIndex(p => p.id === id);
  if (idx < 0 || idx >= presets.length - 1) return;
  const nextOrder = presets[idx + 1].order;
  const currOrder = presets[idx].order;
  await DB.update('task_presets', presets[idx].id, { order: nextOrder });
  await DB.update('task_presets', presets[idx + 1].id, { order: currOrder });
  loadSettings();
}

async function saveRate() {
  await DB.saveSetting('hourly_rate', { value: parseFloat(document.getElementById('rateInput').value) });
  toast('Hourly rate saved!', 'success');
}

// ============================================
// MODAL
// ============================================
async function modal(type, data) {
  const m = document.getElementById('modal');
  const title = document.getElementById('mTitle');
  const body = document.getElementById('mBody');
  document.getElementById('mBox').className = 'modal-box';

  switch(type) {
    case 'kb':
      title.textContent = 'Add Knowledge Entry';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Question/Topic:</label>
          <input type="text" class="form-input" id="kbQ" placeholder="What question should this answer?">
        </div>
        <div class="form-group">
          <label class="form-label">Answer/Info:</label>
          <textarea class="form-textarea" id="kbA" style="min-height:150px" placeholder="The answer or information..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveKB()">Save</button>
      `;
      break;

    case 'kbEdit':
      showKbEditModal(data);
      return;

    case 'answerQ':
      title.textContent = 'Add to Knowledge Base';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Question:</label>
          <input type="text" class="form-input" id="ansQ" value="${data.question}">
        </div>
        ${data.aiResponse ? `
        <div class="form-group">
          <label class="form-label">AI's Response (for reference):</label>
          <div style="padding:10px;background:#0a0a0a;border:1px solid #333;font-size:11px;color:#999;max-height:100px;overflow-y:auto">${data.aiResponse}</div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">Correct Answer (will be added to KB):</label>
          <textarea class="form-textarea" id="ansA" style="min-height:150px" placeholder="Write the correct, complete answer..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveAnswer('${data.id}')">Save to Knowledge Base</button>
      `;
      break;

    case 'acc':
      title.textContent = `Add ${data} Account`;
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Username:</label>
          <input type="text" class="form-input" id="accUser">
        </div>
        <div class="form-group">
          <label class="form-label">Location:</label>
          <select class="form-select" id="accLoc">
            <option>Phone</option>
            <option>PC</option>
            <option>AdsPower</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Proxy Status:</label>
          <select class="form-select" id="accProxy">
            <option>Live</option>
            <option>Expired</option>
            <option>None</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="saveAcc('${data}')">Save</button>
      `;
      break;

    case 'script':
      title.textContent = `Add ${data.charAt(0).toUpperCase() + data.slice(1)}`;
      // Load accounts for assignment
      const accs = await DB.getAll('accounts', [{ field: 'userId', value: userId }]);
      let accountOptions = '<option value="">None (General)</option>';
      accs.forEach(a => {
        accountOptions += `<option value="${a.id}">@${a.username} (${a.type})</option>`;
      });

      body.innerHTML = `
        ${data !== 'script' ? `
        <div class="form-group">
          <label class="form-label">Platforms (select multiple):</label>
          <div style="display:flex;gap:15px;flex-wrap:wrap;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="instagram" style="width:18px;height:18px">
              <span>Instagram</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="twitter" style="width:18px;height:18px">
              <span>Twitter</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="webcam" style="width:18px;height:18px">
              <span>Webcam</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="onlyfans" style="width:18px;height:18px">
              <span>OnlyFans</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="tiktok" style="width:18px;height:18px">
              <span>TikTok</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign to Accounts (select multiple):</label>
          <div id="scriptAccountsContainer" style="max-height:150px;overflow-y:auto;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
              <input type="checkbox" class="scriptAccCheck" value="" style="width:18px;height:18px">
              <span style="color:#999">None (General)</span>
            </label>
            ${accs.map(a => `
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
                <input type="checkbox" class="scriptAccCheck" value="${a.id}" style="width:18px;height:18px">
                <span>@${a.username} (${a.type})</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" id="scriptActive" style="width:20px;height:20px">
            <span>Mark as Active (currently using)</span>
          </label>
        </div>` : `
        <div class="form-group">
          <label class="form-label">Title:</label>
          <input type="text" class="form-input" id="scriptTitle">
        </div>
        <div class="form-group">
          <label class="form-label">Category:</label>
          <select class="form-select" id="scriptCategory">
            <option value="response">Response</option>
            <option value="small_talk">Small Talk</option>
            <option value="pricing">Pricing</option>
            <option value="content">Content Discussion</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Platforms (select multiple):</label>
          <div style="display:flex;gap:15px;flex-wrap:wrap;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="instagram" style="width:18px;height:18px">
              <span>Instagram</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="twitter" style="width:18px;height:18px">
              <span>Twitter</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="webcam" style="width:18px;height:18px">
              <span>Webcam</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="onlyfans" style="width:18px;height:18px">
              <span>OnlyFans</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="tiktok" style="width:18px;height:18px">
              <span>TikTok</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign to Accounts (select multiple):</label>
          <div id="scriptAccountsContainer" style="max-height:150px;overflow-y:auto;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
              <input type="checkbox" class="scriptAccCheck" value="" style="width:18px;height:18px">
              <span style="color:#999">None (General)</span>
            </label>
            ${accs.map(a => `
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
                <input type="checkbox" class="scriptAccCheck" value="${a.id}" style="width:18px;height:18px">
                <span>@${a.username} (${a.type})</span>
              </label>
            `).join('')}
          </div>
        </div>`}
        <div class="form-group">
          <label class="form-label">Text:</label>
          <textarea class="form-textarea" id="scriptTxt" style="min-height:150px" placeholder="Enter the ${data}..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Notes (internal):</label>
          <textarea class="form-textarea" id="scriptNotes" style="min-height:60px" placeholder="Usage notes, success rate, etc..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveScript('${data}')">Save ${data.charAt(0).toUpperCase() + data.slice(1)}</button>
      `;
      break;

    case 'script-edit':
      const scriptType = data.scriptType;
      title.textContent = `Edit ${scriptType.charAt(0).toUpperCase() + scriptType.slice(1)}`;
      // Load accounts for assignment
      const accsEdit = await DB.getAll('accounts', [{ field: 'userId', value: userId }]);

      // Convert old single platform/accountId to arrays if needed
      const platforms = data.platforms || (data.platform ? [data.platform] : []);
      const accountIds = data.accountIds || (data.accountId ? [data.accountId] : []);

      body.innerHTML = `
        <input type="hidden" id="scriptEditId" value="${data.id}">
        ${scriptType !== 'script' ? `
        <div class="form-group">
          <label class="form-label">Platforms (select multiple):</label>
          <div style="display:flex;gap:15px;flex-wrap:wrap;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="instagram" ${platforms.includes('instagram') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Instagram</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="twitter" ${platforms.includes('twitter') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Twitter</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="webcam" ${platforms.includes('webcam') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Webcam</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="onlyfans" ${platforms.includes('onlyfans') ? 'checked' : ''} style="width:18px;height:18px">
              <span>OnlyFans</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="tiktok" ${platforms.includes('tiktok') ? 'checked' : ''} style="width:18px;height:18px">
              <span>TikTok</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign to Accounts (select multiple):</label>
          <div style="max-height:150px;overflow-y:auto;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
              <input type="checkbox" class="scriptAccCheck" value="" ${accountIds.includes('') || accountIds.length === 0 ? 'checked' : ''} style="width:18px;height:18px">
              <span style="color:#999">None (General)</span>
            </label>
            ${accsEdit.map(a => `
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
                <input type="checkbox" class="scriptAccCheck" value="${a.id}" ${accountIds.includes(a.id) ? 'checked' : ''} style="width:18px;height:18px">
                <span>@${a.username} (${a.type})</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" id="scriptActive" style="width:20px;height:20px" ${data.active ? 'checked' : ''}>
            <span>Mark as Active (currently using)</span>
          </label>
        </div>` : `
        <div class="form-group">
          <label class="form-label">Title:</label>
          <input type="text" class="form-input" id="scriptTitle" value="${data.title || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Category:</label>
          <select class="form-select" id="scriptCategory">
            <option value="response" ${data.category === 'response' ? 'selected' : ''}>Response</option>
            <option value="small_talk" ${data.category === 'small_talk' ? 'selected' : ''}>Small Talk</option>
            <option value="pricing" ${data.category === 'pricing' ? 'selected' : ''}>Pricing</option>
            <option value="content" ${data.category === 'content' ? 'selected' : ''}>Content Discussion</option>
            <option value="other" ${data.category === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Platforms (select multiple):</label>
          <div style="display:flex;gap:15px;flex-wrap:wrap;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="instagram" ${platforms.includes('instagram') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Instagram</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="twitter" ${platforms.includes('twitter') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Twitter</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="webcam" ${platforms.includes('webcam') ? 'checked' : ''} style="width:18px;height:18px">
              <span>Webcam</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="onlyfans" ${platforms.includes('onlyfans') ? 'checked' : ''} style="width:18px;height:18px">
              <span>OnlyFans</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
              <input type="checkbox" class="scriptPlatCheck" value="tiktok" ${platforms.includes('tiktok') ? 'checked' : ''} style="width:18px;height:18px">
              <span>TikTok</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign to Accounts (select multiple):</label>
          <div style="max-height:150px;overflow-y:auto;padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:3px">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
              <input type="checkbox" class="scriptAccCheck" value="" ${accountIds.includes('') || accountIds.length === 0 ? 'checked' : ''} style="width:18px;height:18px">
              <span style="color:#999">None (General)</span>
            </label>
            ${accsEdit.map(a => `
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-bottom:8px">
                <input type="checkbox" class="scriptAccCheck" value="${a.id}" ${accountIds.includes(a.id) ? 'checked' : ''} style="width:18px;height:18px">
                <span>@${a.username} (${a.type})</span>
              </label>
            `).join('')}
          </div>
        </div>`}
        <div class="form-group">
          <label class="form-label">Text:</label>
          <textarea class="form-textarea" id="scriptTxt" style="min-height:150px" placeholder="Enter the ${scriptType}...">${data.text || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Notes (internal):</label>
          <textarea class="form-textarea" id="scriptNotes" style="min-height:60px" placeholder="Usage notes, success rate, etc...">${data.notes || ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="updateScript('${scriptType}')">Update ${scriptType.charAt(0).toUpperCase() + scriptType.slice(1)}</button>
      `;
      break;

    case 'outreach-acc':
      title.textContent = `Add ${data.charAt(0).toUpperCase() + data.slice(1)} Account`;
      if (data === 'webcam' || data === 'onlyfans') {
        body.innerHTML = `
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Username:</label>
              <input type="text" class="form-input" id="accUser" placeholder="Username">
            </div>
            <div class="form-group">
              <label class="form-label">Site:</label>
              <input type="text" class="form-input" id="accSite" placeholder="e.g. Chaturbate, StripChat">
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Location:</label>
              <select class="form-select" id="accLoc">
                <option>Phone</option>
                <option>PC</option>
                <option>AdsPower</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Device Name:</label>
              <input type="text" class="form-input" id="accDevice" placeholder="e.g. iPhone 13, PC-Office, AdsPower #5">
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Account Status:</label>
              <select class="form-select" id="accHealthy">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Proxy Status:</label>
              <select class="form-select" id="accProxyStat">
                <option>Live</option>
                <option>Expired</option>
                <option>None</option>
              </select>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Proxy Type:</label>
              <select class="form-select" id="accProxyType">
                <option>HTTPS</option>
                <option>SOCKS5</option>
                <option>None</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Proxy Expiration:</label>
              <input type="date" class="form-input" id="accProxyExp">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Details:</label>
            <input type="text" class="form-input" id="accProxyDetails" placeholder="IP:Port:User:Pass">
          </div>
          <div class="form-group">
            <label class="form-label">Outreach Method:</label>
            <textarea class="form-textarea" id="accMethod" style="min-height:80px" placeholder="Jak přesně outreachovat na tomto webcam site..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Notes:</label>
            <textarea class="form-textarea" id="accNotes" style="min-height:60px" placeholder="Interní poznámky..."></textarea>
          </div>
          <button class="btn btn-primary" onclick="saveOutreachAcc('${data}')">Save Account</button>
        `;
      } else {
        // Instagram or Twitter
        body.innerHTML = `
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Username:</label>
              <input type="text" class="form-input" id="accUser" placeholder="@username">
            </div>
            <div class="form-group">
              <label class="form-label">Account Status:</label>
              <select class="form-select" id="accHealthy">
                <option value="true">Healthy</option>
                <option value="false">Expired</option>
              </select>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Location:</label>
              <select class="form-select" id="accLoc">
                <option>Phone</option>
                <option>PC</option>
                <option>AdsPower</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Device Name:</label>
              <input type="text" class="form-input" id="accDevice" placeholder="e.g. iPhone 13, PC-Office, AdsPower #5">
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Warmup Status:</label>
              <select class="form-select" id="accWarmup">
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Complete</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Proxy Status:</label>
              <select class="form-select" id="accProxyStat">
                <option>Live</option>
                <option>Expired</option>
                <option>None</option>
              </select>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Proxy Type:</label>
              <select class="form-select" id="accProxyType">
                <option>HTTPS</option>
                <option>SOCKS5</option>
                <option>None</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Proxy Expiration:</label>
              <input type="date" class="form-input" id="accProxyExp">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Details:</label>
            <input type="text" class="form-input" id="accProxyDetails" placeholder="IP:Port:User:Pass">
          </div>
          <div class="form-group">
            <label class="form-label">Notes:</label>
            <textarea class="form-textarea" id="accNotes" style="min-height:60px" placeholder="Interní poznámky..."></textarea>
          </div>
          <button class="btn btn-primary" onclick="saveOutreachAcc('${data}')">Save Account</button>
        `;
      }
      break;

    case 'outreach-acc-edit':
      title.textContent = 'Edit Account';
      if (data.type === 'webcam') {
        body.innerHTML = `
          <input type="hidden" id="editAccId" value="${data.id}">
          <div class="form-group">
            <label class="form-label">Username:</label>
            <input type="text" class="form-input" id="accUser" value="${data.username || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Site:</label>
            <input type="text" class="form-input" id="accSite" value="${data.site || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Location:</label>
            <select class="form-select" id="accLoc">
              <option ${data.location === 'Phone' ? 'selected' : ''}>Phone</option>
              <option ${data.location === 'PC' ? 'selected' : ''}>PC</option>
              <option ${data.location === 'AdsPower' ? 'selected' : ''}>AdsPower</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status:</label>
            <select class="form-select" id="accHealthy">
              <option value="true" ${data.healthy ? 'selected' : ''}>Active</option>
              <option value="false" ${!data.healthy ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="updateOutreachAcc('webcam')">Update</button>
        `;
      } else {
        body.innerHTML = `
          <input type="hidden" id="editAccId" value="${data.id}">
          <div class="form-group">
            <label class="form-label">Username:</label>
            <input type="text" class="form-input" id="accUser" value="${data.username || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Location:</label>
            <select class="form-select" id="accLoc">
              <option ${data.location === 'Phone' ? 'selected' : ''}>Phone</option>
              <option ${data.location === 'PC' ? 'selected' : ''}>PC</option>
              <option ${data.location === 'AdsPower' ? 'selected' : ''}>AdsPower</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status:</label>
            <select class="form-select" id="accHealthy">
              <option value="true" ${data.healthy ? 'selected' : ''}>Healthy</option>
              <option value="false" ${!data.healthy ? 'selected' : ''}>Expired</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Status:</label>
            <select class="form-select" id="accProxyStat">
              <option ${data.proxyStatus === 'Live' ? 'selected' : ''}>Live</option>
              <option ${data.proxyStatus === 'Expired' ? 'selected' : ''}>Expired</option>
              <option ${data.proxyStatus === 'None' ? 'selected' : ''}>None</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Type:</label>
            <select class="form-select" id="accProxyType">
              <option ${data.proxyType === 'HTTPS' ? 'selected' : ''}>HTTPS</option>
              <option ${data.proxyType === 'SOCKS5' ? 'selected' : ''}>SOCKS5</option>
              <option ${data.proxyType === 'None' ? 'selected' : ''}>None</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Details:</label>
            <input type="text" class="form-input" id="accProxyDetails" value="${data.proxyDetails || ''}">
          </div>
          <button class="btn btn-primary" onclick="updateOutreachAcc('${data.type}')">Update</button>
        `;
      }
      break;

    case 'outseeker':
      title.textContent = data ? 'Edit OFautopilot Log' : 'Log OFautopilot Data';
      const isEditOfBombex = data && data.id;
      body.innerHTML = `
        ${isEditOfBombex ? `<input type="hidden" id="osEditId" value="${data.id}">` : ''}
        <div class="form-group">
          <label class="form-label">Accounts Running:</label>
          <input type="number" class="form-input" id="osAcc" value="${isEditOfBombex ? data.activeAccounts || 0 : 0}" min="0">
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">USA Running Today:</label>
            <input type="number" class="form-input" id="osUSAIn" value="${isEditOfBombex ? data.usaRunning || 0 : 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ESP Running Today:</label>
            <input type="number" class="form-input" id="osESPIn" value="${isEditOfBombex ? data.espRunning || 0 : 0}" min="0">
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Outreached Today (USA):</label>
            <input type="number" class="form-input" id="osOutreachedUSA" value="${isEditOfBombex ? data.usaOutreached || 0 : 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Outreached Today (ESP):</label>
            <input type="number" class="form-input" id="osOutreachedESP" value="${isEditOfBombex ? data.espOutreached || 0 : 0}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes (optional):</label>
          <textarea class="form-textarea" id="osNotes" style="min-height:60px" placeholder="Poznámky k dnešnímu dni...">${isEditOfBombex ? data.notes || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveOfBombex()">${isEditOfBombex ? 'Update' : 'Save'} Data</button>
      `;
      break;

    case 'modelOutreach':
      const isEditMO = data && data.id;
      title.textContent = isEditMO ? 'Edit Model Outreach Log' : 'Log Model Outreach';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        ${isEditMO ? `<input type="hidden" id="moEditId" value="${data.id}">` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <label class="form-label" style="margin:0">Models</label>
          <button class="btn btn-sm btn-primary" style="font-size:11px" onclick="addModelOutreachRow()">+ Add Model</button>
        </div>
        <div id="moModelsContainer"></div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Notes (optional):</label>
          <textarea class="form-textarea" id="moNotes" style="min-height:60px" placeholder="Notes about today's outreach...">${isEditMO ? data.notes || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveModelOutreach()">${isEditMO ? 'Update' : 'Save'} Data</button>
      `;
      // Populate model rows after DOM is ready
      setTimeout(() => {
        if (isEditMO && data.models && data.models.length) {
          data.models.forEach(m => addModelOutreachRow(m));
        } else {
          addModelOutreachRow();
        }
      }, 10);
      break;

    case 'logComm':
      // data should be the model object
      if (!data || !data.id) {
        toast('Invalid model data', 'error');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastComm = data.lastCommunication ? new Date(data.lastCommunication).toISOString().split('T')[0] : null;
      const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000 * 60 * 60 * 24)) : null;
      const streak = data.communicationStreak || 0;
      const isActive = data.status === 'active';

      title.textContent = `Log Communication - ${data.name}`;
      document.getElementById('mBox').className = 'modal-box';
      body.innerHTML = `
        <input type="hidden" id="commModelId" value="${data.id}">
        <input type="hidden" id="commModelStatus" value="${data.status}">

        <div style="margin-bottom:20px;padding:15px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#999;font-size:12px">Last Communication:</span>
            <span style="color:${daysSince === null ? '#f00' : (daysSince === 0 ? '#0f0' : '#ff0')};font-size:12px;font-weight:bold">
              ${daysSince === null ? 'Never' : (daysSince === 0 ? 'Today' : `${daysSince} days ago`)}
            </span>
          </div>
          ${streak > 0 ? `<div style="color:#ff0;font-size:12px">🔥 Current Streak: ${streak} days</div>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Communication Notes (What happened today?):</label>
          <textarea class="form-textarea" id="commNote" style="min-height:100px" placeholder="Describe today's communication..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Progress Status:</label>
          <select class="form-select" id="commProgress">
            <option value="positive">✅ Positive (Moving forward, good response)</option>
            <option value="neutral">➖ Neutral (Regular check-in, no change)</option>
            <option value="negative">❌ Negative (Issues, concerns, problems)</option>
          </select>
        </div>

        ${isActive ? `
        <div class="form-group">
          <label class="form-label">Content Update (Optional - for active models):</label>
          <textarea class="form-textarea" id="commContent" style="min-height:80px" placeholder="Any content performance updates, what she posted, results..."></textarea>
        </div>
        ` : ''}

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick="saveCommLog()" style="flex:1">Save Communication</button>
          <button class="btn" onclick="closeModal()" style="flex:0;min-width:100px">Cancel</button>
        </div>
      `;
      break;

    case 'leadCollection':
      const isEditColl = data && data.id;
      title.textContent = isEditColl ? `Edit ${data.name}` : 'Create Lead Collection';
      document.getElementById('mBox').className = 'modal-box';
      body.innerHTML = `
        ${isEditColl ? `<input type="hidden" id="collEditId" value="${data.id}">` : ''}

        <div class="form-group">
          <label class="form-label">Collection Name:</label>
          <input type="text" class="form-input" id="collName" value="${isEditColl ? data.name || '' : ''}" placeholder="e.g., USA Models Instagram">
        </div>

        <div class="form-group">
          <label class="form-label">Platform:</label>
          <select class="form-select" id="collPlatform">
            <option value="instagram" ${isEditColl && data.platform === 'instagram' ? 'selected' : ''}>📷 Instagram</option>
            <option value="twitter" ${isEditColl && data.platform === 'twitter' ? 'selected' : ''}>🐦 Twitter</option>
            <option value="webcams" ${isEditColl && data.platform === 'webcams' ? 'selected' : ''}>🎥 Webcams</option>
            <option value="onlyfans" ${isEditColl && data.platform === 'onlyfans' ? 'selected' : ''}>💖 OnlyFans</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Assign to Accounts (optional):</label>
          <div id="collAccountsWrap" style="max-height:200px;overflow-y:auto;border:1px solid #333;padding:10px;border-radius:3px;background:#0a0a0a"></div>
        </div>

        <button class="btn btn-primary" onclick="saveLeadCollection()">${isEditColl ? 'Update' : 'Create'} Collection</button>
      `;

      // Load accounts for assignment
      DB.getAll('accounts', [{ field: 'userId', value: userId }]).then(accounts => {
        const wrap = document.getElementById('collAccountsWrap');
        if (accounts.length === 0) {
          wrap.innerHTML = '<div style="color:#666;font-size:11px">No accounts available</div>';
          return;
        }
        let html = '';
        accounts.forEach(acc => {
          const checked = isEditColl && data.accountIds && data.accountIds.includes(acc.id);
          html += `<label style="display:flex;align-items:center;gap:8px;margin:5px 0;cursor:pointer">
            <input type="checkbox" class="collAccCheck" value="${acc.id}" ${checked ? 'checked' : ''} style="width:16px;height:16px">
            <span style="font-size:11px">@${acc.username} (${acc.type})</span>
          </label>`;
        });
        wrap.innerHTML = html;
      });
      break;

    case 'leadItem':
      const isEditLead = data && data.id;
      const platform = data.platform || 'instagram';
      title.textContent = isEditLead ? `Edit Lead` : 'Add Lead';
      document.getElementById('mBox').className = 'modal-box';
      body.innerHTML = `
        ${isEditLead ? `<input type="hidden" id="leadEditId" value="${data.id}">` : ''}
        <input type="hidden" id="leadCollId" value="${data.collectionId}">
        <input type="hidden" id="leadPlatform" value="${platform}">

        <div class="form-group">
          <label class="form-label">Model Name:</label>
          <input type="text" class="form-input" id="leadName" value="${isEditLead ? data.name || '' : ''}" placeholder="Full name">
        </div>

        ${platform === 'instagram' ? `
        <div class="form-group">
          <label class="form-label">Instagram Username:</label>
          <input type="text" class="form-input" id="leadIgUser" value="${isEditLead ? data.igUsername || '' : ''}" placeholder="@username">
        </div>` : ''}

        ${platform === 'twitter' ? `
        <div class="form-group">
          <label class="form-label">Twitter Username:</label>
          <input type="text" class="form-input" id="leadTwUser" value="${isEditLead ? data.twitterUsername || '' : ''}" placeholder="@username">
        </div>` : ''}

        ${platform === 'webcams' ? `
        <div class="form-group">
          <label class="form-label">Webcam Username:</label>
          <input type="text" class="form-input" id="leadWcUser" value="${isEditLead ? data.webcamUsername || '' : ''}" placeholder="username">
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">Notes (optional):</label>
          <textarea class="form-textarea" id="leadNotes" style="min-height:80px" placeholder="Any additional info...">${isEditLead ? data.notes || '' : ''}</textarea>
        </div>

        <div class="form-group">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="leadOutreached" style="width:20px;height:20px" ${isEditLead && data.outreached ? 'checked' : ''}>
            <span>Already Outreached</span>
          </label>
        </div>

        <button class="btn btn-primary" onclick="saveLeadItem()">${isEditLead ? 'Update' : 'Add'} Lead</button>
      `;
      break;

    case 'marketModel':
      const isEditMkt = data && data.id;
      title.textContent = isEditMkt ? `Edit ${data.name}` : 'Add Market Model';
      body.innerHTML = `
        <input type="hidden" id="mktEditId" value="${isEditMkt ? data.id : ''}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input type="text" class="form-input" id="mktName" value="${isEditMkt ? (data.name||'') : ''}" placeholder="Model name">
          </div>
          <div class="form-group">
            <label class="form-label">Photo URL</label>
            <input type="text" class="form-input" id="mktPhoto" value="${isEditMkt ? (data.photo||'') : ''}" placeholder="https://...">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px">
          <div class="form-group">
            <label class="form-label">Country</label>
            <input type="text" class="form-input" id="mktCountry" value="${isEditMkt ? (data.country||'') : ''}" placeholder="e.g. Colombia">
          </div>
          <div class="form-group">
            <label class="form-label">Age</label>
            <input type="number" class="form-input" id="mktAge" value="${isEditMkt ? (data.age||'') : ''}" min="18" max="60">
          </div>
          <div class="form-group">
            <label class="form-label">Contract Price ($)</label>
            <input type="number" class="form-input" id="mktPrice" value="${isEditMkt ? (data.marketPrice||'') : ''}" placeholder="e.g. 500">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Contact Info (Telegram, WhatsApp, etc.)</label>
          <input type="text" class="form-input" id="mktContact" value="${isEditMkt ? (data.contactInfo||'') : ''}" placeholder="@telegram or phone">
        </div>
        <div class="form-group">
          <label class="form-label">Notes (experience, what she offers, etc.)</label>
          <textarea class="form-textarea" id="mktNotes" style="min-height:80px" placeholder="Details about this model for the marketplace...">${isEditMkt ? (data.marketNotes||'') : ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Market Status</label>
          <select class="form-select" id="mktStatus">
            <option value="available" ${isEditMkt && data.marketStatus==='available' ? 'selected' : ''}>Available</option>
            <option value="in_talks" ${isEditMkt && data.marketStatus==='in_talks' ? 'selected' : ''}>In Talks with Agency</option>
            <option value="contract_sent" ${isEditMkt && data.marketStatus==='contract_sent' ? 'selected' : ''}>Contract Sent</option>
            <option value="sold" ${isEditMkt && data.marketStatus==='sold' ? 'selected' : ''}>Sold</option>
            <option value="on_hold" ${isEditMkt && data.marketStatus==='on_hold' ? 'selected' : ''}>On Hold</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="saveMarketModel()">${isEditMkt ? 'Update' : 'Save'} Market Model</button>
      `;
      break;

    case 'model':
      const isEditModel = data && data.id;
      title.textContent = isEditModel ? `Edit ${data.name}` : 'Add New Model';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        ${isEditModel ? `<input type="hidden" id="modEditId" value="${data.id}">` : ''}

        <div style="margin-bottom:20px;padding:15px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
          <label class="form-label">Model Status:</label>
          <select class="form-select" id="modStatus" onchange="toggleActiveFields()">
            <option value="potential" ${!isEditModel || data.status === 'potential' ? 'selected' : ''}>Potential (Not working yet)</option>
            <option value="active" ${isEditModel && data.status === 'active' ? 'selected' : ''}>Active (Currently working)</option>
          </select>
        </div>

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Basic Info</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Name:</label>
              <input type="text" class="form-input" id="modName" value="${isEditModel ? data.name || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Photo URL (Imgur recommended):</label>
              <input type="text" class="form-input" id="modPhoto" placeholder="https://i.imgur.com/..." value="${isEditModel ? data.photo || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Country:</label>
              <input type="text" class="form-input" id="modCountry" value="${isEditModel ? data.country || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Age:</label>
              <input type="number" class="form-input" id="modAge" value="${isEditModel ? data.age || '' : ''}">
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Contact Status</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modOnAssistTg" style="width:20px;height:20px" ${isEditModel && data.onAssistantTelegram ? 'checked' : ''}>
                <span>On My Telegram</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modOnAssistWa" style="width:20px;height:20px" ${isEditModel && data.onAssistantWhatsApp ? 'checked' : ''}>
                <span>On My WhatsApp</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modOnBossTg" style="width:20px;height:20px" ${isEditModel && data.onBossTelegram ? 'checked' : ''}>
                <span>On Boss's Telegram</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modOnBossWa" style="width:20px;height:20px" ${isEditModel && data.onBossWhatsApp ? 'checked' : ''}>
                <span>On Boss's WhatsApp</span>
              </label>
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Experience & Skills</h3>
          <div class="form-group">
            <label class="form-label">Experience Description (Detailně popiš její zkušenosti):</label>
            <textarea class="form-textarea" id="modExpDesc" style="min-height:100px" placeholder="Jaké má zkušenosti s adult contentem, webcams, OnlyFans... Co už dělala, jak dlouho...">${isEditModel ? data.experienceDescription || '' : ''}</textarea>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Adult Industry Experience:</label>
              <select class="form-select" id="modExperience">
                <option value="none" ${isEditModel && data.adultExperience === 'none' ? 'selected' : ''}>No Experience</option>
                <option value="some" ${isEditModel && data.adultExperience === 'some' ? 'selected' : ''}>Some Experience</option>
                <option value="experienced" ${isEditModel && data.adultExperience === 'experienced' ? 'selected' : ''}>Experienced</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Payment Preference:</label>
              <select class="form-select" id="modPayment">
                <option value="percentage" ${isEditModel && data.paymentPreference === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                <option value="salary" ${isEditModel && data.paymentPreference === 'salary' ? 'selected' : ''}>Salary</option>
                <option value="flexible" ${isEditModel && data.paymentPreference === 'flexible' ? 'selected' : ''}>Flexible</option>
              </select>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modCanEnglish" style="width:20px;height:20px" ${isEditModel && data.canSpeakEnglish ? 'checked' : ''} onchange="document.getElementById('modEnglishLevelWrap').style.display = this.checked ? 'block' : 'none'">
                <span>Speaks English</span>
              </label>
            </div>
            <div class="form-group" id="modEnglishLevelWrap" style="display:${isEditModel && data.canSpeakEnglish ? 'block' : 'none'}">
              <label class="form-label">English Level (1-10):</label>
              <input type="number" class="form-input" id="modEnglishLevel" min="1" max="10" value="${isEditModel ? data.englishLevel || 5 : 5}">
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Work Type & Setup</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modCanWebcam" style="width:20px;height:20px" ${isEditModel && data.canDoWebcams ? 'checked' : ''}>
                <span>Can Do Webcams</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modCanContent" style="width:20px;height:20px" ${isEditModel && data.canDoContent ? 'checked' : ''}>
                <span>Can Do Content & OnlyFans</span>
              </label>
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Phone (Model telefonu):</label>
              <input type="text" class="form-input" id="modPhone" placeholder="iPhone 13, Samsung S21..." value="${isEditModel ? data.phone || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">PC/Laptop:</label>
              <input type="text" class="form-input" id="modPC" placeholder="MacBook Pro, Gaming PC..." value="${isEditModel ? data.pc || '' : ''}">
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modHasWebcam" style="width:20px;height:20px" ${isEditModel && data.hasWebcam ? 'checked' : ''}>
                <span>Has Webcam</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modHasLovense" style="width:20px;height:20px" ${isEditModel && data.hasLovense ? 'checked' : ''}>
                <span>Has Lovense Lush</span>
              </label>
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Background & Motivation</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modHasJob" style="width:20px;height:20px" ${isEditModel && data.hasJob ? 'checked' : ''}>
                <span>Has a Job</span>
              </label>
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="checkbox" id="modStudying" style="width:20px;height:20px" ${isEditModel && data.isStudying ? 'checked' : ''}>
                <span>Is Studying</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Motivation (What motivates her?):</label>
            <textarea class="form-textarea" id="modMotivation" style="min-height:80px">${isEditModel ? data.motivation || '' : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Why Does She Want This? (Her reasons):</label>
            <textarea class="form-textarea" id="modWhy" style="min-height:80px">${isEditModel ? data.whyDoThis || '' : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Life Situation & Problems:</label>
            <textarea class="form-textarea" id="modLifeSituation" style="min-height:80px">${isEditModel ? data.lifeSituation || '' : ''}</textarea>
          </div>
        </div>

        <div id="activeModelFields" style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333;display:${isEditModel && data.status === 'active' ? 'block' : 'none'}">
          <h3 style="color:#ff0;margin-bottom:15px">🟢 Active Model - System Access</h3>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="modHasSystemAccess" style="width:20px;height:20px" ${isEditModel && data.hasSystemAccess ? 'checked' : ''} onchange="document.getElementById('modSystemLoginWrap').style.display = this.checked ? 'block' : 'none'">
              <span>Has Access to Models System</span>
            </label>
          </div>
          <div id="modSystemLoginWrap" style="display:${isEditModel && data.hasSystemAccess ? 'block' : 'none'}">
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Login Username:</label>
                <input type="text" class="form-input" id="modSystemUser" value="${isEditModel ? data.systemUsername || '' : ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Login Password:</label>
                <input type="text" class="form-input" id="modSystemPass" value="${isEditModel ? data.systemPassword || '' : ''}">
              </div>
            </div>
          </div>
        </div>

        <div id="activeModelPerf" style="margin-bottom:20px;display:${isEditModel && data.status === 'active' ? 'block' : 'none'}">
          <h3 style="color:#0f0;margin-bottom:15px">Active Model - Performance</h3>
          <div class="form-group">
            <label class="form-label">Content Performance (How is she doing with content creation?):</label>
            <textarea class="form-textarea" id="modContentPerf" style="min-height:80px">${isEditModel ? data.contentPerformance || '' : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Overall Status & Report:</label>
            <textarea class="form-textarea" id="modOverallStatus" style="min-height:80px">${isEditModel ? data.overallStatus || '' : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Checklist Progress Notes:</label>
            <textarea class="form-textarea" id="modChecklistProgress" style="min-height:60px">${isEditModel ? data.checklistProgress || '' : ''}</textarea>
          </div>
        </div>

        <button class="btn btn-primary" onclick="saveModel()">${isEditModel ? 'Update' : 'Save'} Model</button>
      `;
      break;

    case 'modelView':
      loadModelView(data);
      return;

    case 'posting':
      const isEdit = data && data.id;
      title.textContent = isEdit ? 'Edit Posting Account' : 'Add Posting Account';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        <input type="hidden" id="postEditId" value="${isEdit ? data.id : ''}">
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Platform:</label>
            <select class="form-select" id="postPlat" onchange="updatePostTypes()" ${isEdit ? 'disabled' : ''}>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="reddit">Reddit</option>
              <option value="twitter">Twitter</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Username:</label>
            <input type="text" class="form-input" id="postUser" placeholder="@username" value="${isEdit ? data.username || '' : ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Posts per day by type:</label>
          <div id="postTypesContainer"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes:</label>
          <textarea class="form-textarea" id="postNotes" placeholder="Hashtags, posting times, special instructions...">${isEdit ? data.notes || '' : ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="savePosting()">${isEdit ? 'Update' : 'Add'} Account</button>
      `;
      if (isEdit) document.getElementById('postPlat').value = data.platform;
      setTimeout(() => updatePostTypes(isEdit ? data.typesCounts : null), 10);
      break;

    case 'taskPreset':
      title.textContent = 'Add Task Preset';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Task Name:</label>
          <input type="text" class="form-input" id="presetName" placeholder="What should assistant do?">
        </div>
        <div class="form-group">
          <label class="form-label">Guide/Instructions (shows on hover):</label>
          <textarea class="form-textarea" id="presetGuide" style="min-height:150px" placeholder="Detailed explanation of how to complete this task..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Images (imgur URLs, comma separated):</label>
          <input type="text" class="form-input" id="presetImages" placeholder="https://i.imgur.com/xxx.jpg, https://i.imgur.com/yyy.png">
        </div>
        <div class="form-group">
          <label class="form-label">Video (Loom or Vimeo URL):</label>
          <input type="text" class="form-input" id="presetVideo" placeholder="https://www.loom.com/share/xxx">
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" id="presetOperative" style="width:20px;height:20px">
            <span>Operative task</span>
          </label>
        </div>
        <button class="btn btn-primary" onclick="savePreset()">Save Task</button>
      `;
      break;

    case 'wallet':
      title.textContent = 'Add Wallet';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Wallet Type:</label>
          <select class="form-select" id="walletType">
            <option value="USDT TRC20">USDT TRC20</option>
            <option value="USDT ERC20">USDT ERC20</option>
            <option value="Bitcoin">Bitcoin</option>
            <option value="PayPal">PayPal</option>
            <option value="Wise">Wise</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Address:</label>
          <input type="text" class="form-input" id="walletAddress" placeholder="Wallet address or email...">
        </div>
        <div class="form-group">
          <label class="form-label">Label (optional):</label>
          <input type="text" class="form-input" id="walletLabel" placeholder="e.g. Main wallet">
        </div>
        <button class="btn btn-primary" onclick="saveWallet()">Save Wallet</button>
      `;
      break;

    case 'content':
      title.textContent = 'Submit New Content';
      document.getElementById('mBox').className = 'modal-box large';
      loadContentModal();
      return;

    case 'prompt':
      title.textContent = 'Save Prompt';
      document.getElementById('mBox').className = 'modal-box large';
      loadPromptModal();
      return;

    case 'spoofer':
      title.textContent = 'Spoof Content';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        <p style="color:#999;font-size:11px;margin-bottom:15px">Upload photos/videos to remove AI markers, strip metadata, apply subtle transforms, and add fake iPhone EXIF.</p>

        <div class="grid grid-2" style="margin-bottom:15px">
          <div class="form-group">
            <label class="form-label">City (GPS metadata):</label>
            <select class="form-select" id="spoofCity">
              <option value="New York">New York, USA</option>
              <option value="Los Angeles">Los Angeles, USA</option>
              <option value="Miami">Miami, USA</option>
              <option value="Chicago">Chicago, USA</option>
              <option value="London">London, UK</option>
              <option value="Prague">Prague, CZ</option>
              <option value="Paris">Paris, France</option>
              <option value="Berlin">Berlin, Germany</option>
              <option value="Tokyo">Tokyo, Japan</option>
              <option value="Sydney">Sydney, Australia</option>
              <option value="Dubai">Dubai, UAE</option>
              <option value="Toronto">Toronto, Canada</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Device (EXIF):</label>
            <select class="form-select" id="spoofDevice">
              <option value="iPhone 16 Pro">iPhone 16 Pro</option>
              <option value="iPhone 16 Pro Max">iPhone 16 Pro Max</option>
              <option value="iPhone 17 Pro">iPhone 17 Pro</option>
              <option value="iPhone 17 Pro Max">iPhone 17 Pro Max</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Upload Files (photos or videos, multiple allowed):</label>
          <input type="file" class="form-input" id="spoofFileInput" multiple accept="image/*,video/*" onchange="handleSpoofFiles(this)" style="padding:10px">
        </div>

        <div id="spoofPreview" style="margin:15px 0;min-height:50px"></div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="processSpoof()">Process & Download</button>
          <button class="btn" onclick="markSpoofedManually()">Mark as Spoofed (already done)</button>
        </div>

        <div id="spoofStatus" style="margin-top:15px"></div>
        <div id="spoofResults" style="margin-top:10px"></div>

        <div style="margin-top:20px;padding:12px;background:#0a0a0a;border-radius:4px;border:1px solid #222">
          <strong style="font-size:11px;color:#0f0">Photos:</strong>
          <ul style="font-size:10px;color:#888;margin:5px 0 10px 15px;line-height:1.5">
            <li>Strip all metadata + random crop/rotate/flip</li>
            <li>Subtle color adjustments + fake iPhone EXIF with GPS</li>
          </ul>
          <strong style="font-size:11px;color:#0af">Videos:</strong>
          <ul style="font-size:10px;color:#888;margin:5px 0 0 15px;line-height:1.5">
            <li>Strip all metadata + trim 0.1-0.3s from start</li>
            <li>Random crop 1-2% + 50% horizontal flip</li>
            <li>Subtle color adjustments + re-encoded (WebM)</li>
          </ul>
        </div>
      `;
      break;

    case 'viewContent':
      const c = data;
      title.textContent = 'Content Details';
      document.getElementById('mBox').className = 'modal-box large';
      const isVid = c.mediaType === 'video';
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            ${isVid ?
              `<video src="${c.spoofedUrl || c.mediaUrl}" controls style="width:100%;border-radius:4px"></video>` :
              `<img src="${c.spoofedUrl || c.mediaUrl}" style="width:100%;border-radius:4px">`}
          </div>
          <div>
            <div style="margin-bottom:10px"><strong>Account:</strong> @${c.accountUsername}</div>
            <div style="margin-bottom:10px"><strong>Platform:</strong> ${c.platform}</div>
            <div style="margin-bottom:10px"><strong>Type:</strong> ${c.contentType}</div>
            <div style="margin-bottom:10px"><strong>Status:</strong> ${c.status}</div>
            ${c.spoofed ? `<div style="margin-bottom:10px;color:#0f0"><strong>Spoofed:</strong> ✓ (${c.spoofDevice}, ${c.spoofCity})</div>` : ''}
            ${c.posted ? `<div style="margin-bottom:10px;color:#0f0"><strong>Posted:</strong> ✓</div>` : ''}
            ${c.description ? `<div style="margin-bottom:10px"><strong>Description:</strong><br>${c.description}</div>` : ''}
            <div style="margin-top:20px">
              <strong>URLs:</strong>
              <div style="font-size:10px;word-break:break-all;margin-top:5px">
                <div>Original: <a href="${c.mediaUrl}" target="_blank" style="color:#0af">${c.mediaUrl}</a></div>
                ${c.spoofedUrl ? `<div>Spoofed: <a href="${c.spoofedUrl}" target="_blank" style="color:#0f0">${c.spoofedUrl}</a></div>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
      break;

    case 'chatter':
      const isEditChatter = data && data.id;
      title.textContent = isEditChatter ? `Edit ${data.name}` : 'Add New Chatter';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        ${isEditChatter ? `<input type="hidden" id="chatterEditId" value="${data.id}">` : ''}

        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #333">
          <h3 style="color:#0f0;margin-bottom:15px">Basic Info</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Name:</label>
              <input type="text" class="form-input" id="chatterName" value="${isEditChatter ? data.name || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Telegram Username:</label>
              <input type="text" class="form-input" id="chatterTelegram" placeholder="without @" value="${isEditChatter ? data.telegram || '' : ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Info / Notes:</label>
            <textarea class="form-textarea" id="chatterInfo" style="min-height:60px" placeholder="Any notes about this applicant...">${isEditChatter ? data.info || '' : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Status:</label>
            <select class="form-select" id="chatterStatus">
              <option value="applying" ${!isEditChatter || data.status === 'applying' ? 'selected' : ''}>Applying</option>
              <option value="approved" ${isEditChatter && data.status === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${isEditChatter && data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </div>
        </div>

        <div>
          <h3 style="color:#0f0;margin-bottom:15px">Test Results</h3>
          <div class="grid grid-2" style="gap:12px">
            <div class="form-group" style="margin:0">
              <label class="form-label">English Quality <span style="color:#666;font-size:10px">— Speaking good, Clearly speaking</span></label>
              <input type="text" class="form-input" id="chatterEnglishQuality" placeholder="e.g. Good, Average, Bad" value="${isEditChatter ? data.englishQuality || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Speedtest <a href="https://www.speedtest.net" target="_blank" style="color:#0af;font-size:10px">speedtest.net</a> <span style="color:#666;font-size:10px">— 100mbps+</span></label>
              <input type="text" class="form-input" id="chatterSpeedtest" placeholder="e.g. 150mbps" value="${isEditChatter ? data.speedtest || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Computer Stress <a href="https://mprep.info/gpu/" target="_blank" style="color:#0af;font-size:10px">mprep.info/gpu/</a> <span style="color:#666;font-size:10px">— CPU&GPU good</span></label>
              <input type="text" class="form-input" id="chatterComputerStress" placeholder="e.g. CPU Good, GPU Good" value="${isEditChatter ? data.computerStress || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Typing Test <a href="https://www.typingtest.com" target="_blank" style="color:#0af;font-size:10px">typingtest.com</a> <span style="color:#666;font-size:10px">— 50-60wpm+</span></label>
              <input type="text" class="form-input" id="chatterTypingTest" placeholder="e.g. 65wpm" value="${isEditChatter ? data.typingTest || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">IQ Test <a href="https://brght.org" target="_blank" style="color:#0af;font-size:10px">brght.org</a> <span style="color:#666;font-size:10px">— 100+</span></label>
              <input type="text" class="form-input" id="chatterIqTest" placeholder="e.g. 115" value="${isEditChatter ? data.iqTest || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">EQ Test <a href="https://www.mindtools.com/a3tbat1/how-emotionally-intelligent-are-you" target="_blank" style="color:#0af;font-size:10px">mindtools.com</a> <span style="color:#666;font-size:10px">— 75-85/100+</span></label>
              <input type="text" class="form-input" id="chatterEqTest" placeholder="e.g. 82/100" value="${isEditChatter ? data.eqTest || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Empathy Test <a href="https://psychology-tools.com/test/empathy-quotient" target="_blank" style="color:#0af;font-size:10px">psychology-tools.com</a> <span style="color:#666;font-size:10px">— 50-60/80+</span></label>
              <input type="text" class="form-input" id="chatterEmpathyTest" placeholder="e.g. 58/80" value="${isEditChatter ? data.empathyTest || '' : ''}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">English Test <a href="https://www.cambridgeenglish.org/test-your-english/general-english/" target="_blank" style="color:#0af;font-size:10px">cambridgeenglish.org</a> <span style="color:#666;font-size:10px">— good + on call</span></label>
              <input type="text" class="form-input" id="chatterEnglishTest" placeholder="e.g. B2 level" value="${isEditChatter ? data.englishTest || '' : ''}">
            </div>
          </div>
        </div>

        <button class="btn btn-primary" style="margin-top:20px" onclick="saveChatter()">Save Chatter</button>
      `;
      break;

    case 'spyApply':
      const isEditSpy = data && data.id;
      title.textContent = isEditSpy ? `Edit Apply — ${data.agency}` : 'Add New Apply';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        ${isEditSpy ? `<input type="hidden" id="spyEditId" value="${data.id}">` : ''}

        <div class="grid grid-2" style="margin-bottom:15px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Agency Name:</label>
            <input type="text" class="form-input" id="spyAgency" placeholder="e.g. ModelHub Agency" value="${isEditSpy ? data.agency || '' : ''}">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Date Applied:</label>
            <input type="date" class="form-input" id="spyDate" value="${isEditSpy ? data.dateApplied || '' : new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Status:</label>
          <select class="form-select" id="spyStatus">
            <option value="applying" ${!isEditSpy || data.status === 'applying' ? 'selected' : ''}>Applying</option>
            <option value="accepted" ${isEditSpy && data.status === 'accepted' ? 'selected' : ''}>Accepted</option>
            <option value="rejected" ${isEditSpy && data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>

        <div style="padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px;margin-bottom:15px">
          <div style="font-size:11px;color:#999;margin-bottom:10px">Progress Tracking</div>
          <div style="display:flex;flex-wrap:wrap;gap:15px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="spyInterview" style="width:18px;height:18px" ${isEditSpy && data.hadInterview ? 'checked' : ''}>
              <span>Had Interview</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="spyLogins" style="width:18px;height:18px" ${isEditSpy && data.gotLogins ? 'checked' : ''}>
              <span>Got Logins</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="spyFansAccess" style="width:18px;height:18px" ${isEditSpy && data.accessToFans ? 'checked' : ''}>
              <span>Access to Fans</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="spyImportedAP" style="width:18px;height:18px" ${isEditSpy && data.importedToAutopilot ? 'checked' : ''}>
              <span>Imported to OFautopilot</span>
            </label>
          </div>
        </div>

        <div style="margin-bottom:15px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <label class="form-label" style="margin:0">Models / Accounts</label>
            <button class="btn btn-sm btn-primary" style="font-size:11px" onclick="addSpyModelRow()">+ Add Model</button>
          </div>
          <div id="spyModelsContainer"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes:</label>
          <textarea class="form-textarea" id="spyNotes" style="min-height:60px" placeholder="Notes, observations, login details...">${isEditSpy ? data.notes || '' : ''}</textarea>
        </div>

        <button class="btn btn-primary" onclick="saveSpyApply()">Save Apply</button>
      `;
      // Populate model rows after DOM ready
      setTimeout(() => {
        if (isEditSpy && data.models && data.models.length) {
          data.models.forEach(m => addSpyModelRow(m));
        } else {
          addSpyModelRow();
        }
      }, 10);
      break;

  }

  m.classList.add('active');
}

async function loadContentModal() {
  const body = document.getElementById('mBody');
  const accounts = await DB.getAll('posting_accounts');

  let accountOptions = '<option value="">Select account...</option>';
  accounts.forEach(a => {
    accountOptions += `<option value="${a.id}">${a.platform.toUpperCase()} - @${a.username}</option>`;
  });

  body.innerHTML = `
    <div class="grid grid-2">
      <div class="form-group">
        <label class="form-label">Account:</label>
        <select class="form-select" id="contentAccount" onchange="updateContentTypes()">
          ${accountOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Content Type:</label>
        <select class="form-select" id="contentType">
          <option value="photo">Photo</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Media URL:</label>
      <input type="text" class="form-input" id="contentMediaUrl" placeholder="imgur.com link for photos, vimeo.com for videos">
      <small style="color:#666;font-size:10px">Upload photo to imgur.com, video to vimeo.com first</small>
    </div>
    <div class="form-group">
      <label class="form-label">Description (optional):</label>
      <textarea class="form-textarea" id="contentDesc" placeholder="Notes about this content..."></textarea>
    </div>
    <button class="btn btn-primary" onclick="submitContent()">Submit Content</button>
  `;

  document.getElementById('modal').classList.add('active');
}

async function updateContentTypes() {
  const accountId = document.getElementById('contentAccount').value;
  const typeSelect = document.getElementById('contentType');

  if (!accountId) {
    typeSelect.innerHTML = '<option value="photo">Photo</option>';
    return;
  }

  const accounts = await DB.getAll('posting_accounts');
  const account = accounts.find(a => a.id === accountId);

  if (!account) return;

  const types = {
    instagram: ['picture', 'reels', 'carousel', 'stories'],
    tiktok: ['video', 'stories', 'photo'],
    reddit: ['picture', 'video', 'gif'],
    twitter: ['picture', 'video', 'text']
  };

  const platformTypes = types[account.platform] || ['photo'];
  typeSelect.innerHTML = platformTypes.map(t =>
    `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join('');
}

async function loadPromptModal() {
  const body = document.getElementById('mBody');
  const accounts = await DB.getAll('posting_accounts');

  let accountOptions = '<option value="">General (no account)</option>';
  accounts.forEach(a => {
    accountOptions += `<option value="${a.id}">${a.platform.toUpperCase()} - @${a.username}</option>`;
  });

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Account (optional):</label>
      <select class="form-select" id="promptAccount">
        ${accountOptions}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Prompt Text:</label>
      <textarea class="form-textarea" id="promptText" style="min-height:150px;font-family:monospace" placeholder="The prompt you used..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Workflow/Process:</label>
      <textarea class="form-textarea" id="promptWorkflow" placeholder="Steps you followed, settings used, etc..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Reference Images (imgur URLs, comma separated):</label>
      <input type="text" class="form-input" id="promptRefs" placeholder="https://i.imgur.com/xxx.jpg, https://i.imgur.com/yyy.jpg">
    </div>
    <div class="form-group">
      <label class="form-label">Result URL (the generated content):</label>
      <input type="text" class="form-input" id="promptResult" placeholder="https://i.imgur.com/result.jpg or vimeo link">
    </div>
    <button class="btn btn-primary" onclick="savePrompt()">Save Prompt</button>
  `;

  document.getElementById('modal').classList.add('active');
}

async function loadModelView(id) {
  const model = await DB.get('models', id);
  if (!model) {
    toast('Model not found', 'error');
    return;
  }

  const m = document.getElementById('modal');
  const title = document.getElementById('mTitle');
  const body = document.getElementById('mBody');

  title.textContent = `${model.name} - Overview`;
  document.getElementById('mBox').className = 'modal-box large';

  const today = new Date().toISOString().split('T')[0];
  const lastComm = model.lastCommunication ? new Date(model.lastCommunication).toISOString().split('T')[0] : null;
  const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000 * 60 * 60 * 24)) : null;
  const streak = model.communicationStreak || 0;
  const commNotes = model.communicationNotes || [];

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:200px 1fr;gap:20px;margin-bottom:20px">
      <div>
        ${model.photo ? `<img src="${model.photo}" style="width:100%;border-radius:4px;border:1px solid #333">` :
          '<div style="height:200px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;color:#666;border-radius:4px">No Photo</div>'}
      </div>
      <div>
        <h3 style="color:#0f0;margin-bottom:10px">${model.name}</h3>
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <span style="background:${model.status === 'active' ? '#0f0' : '#666'};color:#000;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:bold">${model.status.toUpperCase()}</span>
        </div>
        <div style="font-size:12px;line-height:1.8">
          <div><strong style="color:#999">Country:</strong> ${model.country || '-'}</div>
          <div><strong style="color:#999">Age:</strong> ${model.age || '-'}</div>
          <div><strong style="color:#999">Last Contact:</strong> <span style="color:${daysSince === null ? '#f00' : (daysSince === 0 ? '#0f0' : '#ff0')}">${daysSince === null ? 'Never' : (daysSince === 0 ? 'Today' : `${daysSince} days ago`)}</span></div>
          ${streak > 0 ? `<div><strong style="color:#999">Streak:</strong> <span style="color:#ff0">🔥 ${streak} days</span></div>` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px">
      <div style="padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
        <h4 style="color:#0f0;margin-bottom:10px;font-size:13px">📞 Contact Status</h4>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${model.onAssistantTelegram ? '<span style="background:#0088cc;color:#fff;padding:3px 8px;border-radius:2px;font-size:10px">My TG</span>' : ''}
          ${model.onAssistantWhatsApp ? '<span style="background:#25D366;color:#fff;padding:3px 8px;border-radius:2px;font-size:10px">My WA</span>' : ''}
          ${model.onBossTelegram ? '<span style="background:#0088cc;color:#fff;padding:3px 8px;border-radius:2px;font-size:10px">Boss TG</span>' : ''}
          ${model.onBossWhatsApp ? '<span style="background:#25D366;color:#fff;padding:3px 8px;border-radius:2px;font-size:10px">Boss WA</span>' : ''}
          ${!model.onAssistantTelegram && !model.onAssistantWhatsApp && !model.onBossTelegram && !model.onBossWhatsApp ? '<span style="color:#666;font-size:11px">No contacts</span>' : ''}
        </div>
      </div>

      <div style="padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
        <h4 style="color:#0f0;margin-bottom:10px;font-size:13px">💼 Work Type</h4>
        <div style="font-size:11px;color:#ccc">
          ${model.canDoWebcams ? '<div>✅ Can do Webcams</div>' : '<div style="color:#666">❌ No Webcams</div>'}
          ${model.canDoContent ? '<div>✅ Can do Content/OF</div>' : '<div style="color:#666">❌ No Content</div>'}
        </div>
      </div>
    </div>

    <div style="margin-bottom:15px;padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
      <h4 style="color:#0f0;margin-bottom:10px;font-size:13px">🎯 Experience & Skills</h4>
      ${model.experienceDescription ? `<div style="font-size:11px;color:#ccc;margin-bottom:8px;line-height:1.6">${model.experienceDescription}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:11px">
        <div><strong style="color:#999">Adult Experience:</strong> ${model.adultExperience || 'none'}</div>
        <div><strong style="color:#999">Payment:</strong> ${model.paymentPreference || 'flexible'}</div>
        ${model.canSpeakEnglish ? `<div><strong style="color:#999">English:</strong> ${model.englishLevel || 5}/10</div>` : '<div style="color:#666">No English</div>'}
      </div>
    </div>

    <div style="margin-bottom:15px;padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
      <h4 style="color:#0f0;margin-bottom:10px;font-size:13px">🖥️ Setup & Equipment</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px">
        <div><strong style="color:#999">Phone:</strong> ${model.phone || '-'}</div>
        <div><strong style="color:#999">PC:</strong> ${model.pc || '-'}</div>
        <div>${model.hasWebcam ? '✅' : '❌'} Webcam</div>
        <div>${model.hasLovense ? '✅' : '❌'} Lovense Lush</div>
      </div>
    </div>

    ${model.status === 'active' && model.hasSystemAccess ? `
    <div style="margin-bottom:15px;padding:12px;background:#111;border:1px solid #ff0;border-radius:4px">
      <h4 style="color:#ff0;margin-bottom:10px;font-size:13px">🔐 System Access</h4>
      <div style="font-size:11px">
        <div><strong style="color:#999">Username:</strong> <code style="background:#000;padding:2px 6px;border-radius:2px">${model.systemUsername || '-'}</code></div>
        <div style="margin-top:5px"><strong style="color:#999">Password:</strong> <code style="background:#000;padding:2px 6px;border-radius:2px">${model.systemPassword || '-'}</code></div>
      </div>
    </div>` : ''}

    <div style="margin-bottom:15px;padding:12px;background:#0a0a0a;border:1px solid #333;border-radius:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="color:#0f0;font-size:13px;margin:0">💬 Communication Logs (${commNotes.length})</h4>
        ${commNotes.length > 0 ? `<span id="toggleAllLogs" style="font-size:10px;color:#0f0;cursor:pointer" onclick="document.getElementById('allLogsView').style.display = document.getElementById('allLogsView').style.display === 'none' ? 'block' : 'none'; this.textContent = document.getElementById('allLogsView').style.display === 'none' ? 'Show All ▼' : 'Hide ▲'">Show All ▼</span>` : ''}
      </div>
      <div id="allLogsView" style="display:none;max-height:400px;overflow-y:auto">
        ${commNotes.length > 0 ? [...commNotes].reverse().map(note => {
          const noteDate = new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const progressIcon = note.progress === 'positive' ? '✅' : (note.progress === 'negative' ? '❌' : '➖');
          const progressColor = note.progress === 'positive' ? '#0f0' : (note.progress === 'negative' ? '#f00' : '#ff0');
          return `<div style="margin-bottom:10px;padding:10px;background:#111;border-left:3px solid ${progressColor};border-radius:3px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <span style="font-size:10px;color:#999">${noteDate}</span>
              <span style="font-size:12px">${progressIcon}</span>
            </div>
            <div style="font-size:11px;color:#ccc;line-height:1.5">${note.note || 'No note'}</div>
            ${note.contentUpdate ? `<div style="margin-top:6px;padding:6px;background:#0a0a0a;border-radius:2px">
              <div style="font-size:9px;color:#0f0;margin-bottom:2px">Content Update:</div>
              <div style="font-size:10px;color:#999">${note.contentUpdate}</div>
            </div>` : ''}
          </div>`;
        }).join('') : '<div style="color:#666;font-size:11px">No communication logs yet</div>'}
      </div>
      ${commNotes.length === 0 ? '<div style="color:#666;font-size:11px">No communication logs yet</div>' : ''}
    </div>

    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" onclick="closeModal();logCommunication('${model.id}')" style="flex:1">Log Communication</button>
      <button class="btn" onclick="closeModal();modal('model',${JSON.stringify(model).replace(/"/g, '&quot;')})" style="flex:1">Edit Model</button>
      <button class="btn" onclick="closeModal()" style="flex:0;min-width:100px">Close</button>
    </div>
  `;

  m.classList.add('active');
}

async function toggleModelCheck(modelId, checkId) {
  const model = await DB.get('models', modelId);
  let checklist = model.checklist || [];
  if (checklist.includes(checkId)) {
    checklist = checklist.filter(c => c !== checkId);
  } else {
    checklist.push(checkId);
  }
  await DB.update('models', modelId, { checklist });
  loadModelView(modelId);
}

async function updateModelStatus(id) {
  const status = document.getElementById('modStatus').value;
  await DB.update('models', id, { status });
  loadModels();
}

function addContact(modelId) {
  document.getElementById('mBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Contact Type:</label>
      <select class="form-select" id="contType">
        <option>DM</option>
        <option>Telegram</option>
        <option>WhatsApp</option>
        <option>Call</option>
        <option>Other</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes:</label>
      <textarea class="form-textarea" id="contNotes" placeholder="What was discussed?"></textarea>
    </div>
    <button class="btn btn-primary" onclick="saveContact('${modelId}')">Save</button>
    <button class="btn" onclick="loadModelView('${modelId}')">Cancel</button>
  `;
}

async function saveContact(modelId) {
  await DB.add('model_contacts', {
    modelId,
    type: document.getElementById('contType').value,
    notes: document.getElementById('contNotes').value,
    date: new Date().toISOString().split('T')[0]
  });
  loadModelView(modelId);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.getElementById('mBox').className = 'modal-box';
}

document.getElementById('modal').onclick = (e) => {
  if (e.target.id === 'modal') closeModal();
};

// ============================================
// SAVE FUNCTIONS
// ============================================
async function saveKB() {
  await DB.add('knowledge_base', {
    question: document.getElementById('kbQ').value,
    answer: document.getElementById('kbA').value
  });
  closeModal();
  loadAI();
}

async function saveAnswer(id) {
  const question = document.getElementById('ansQ').value.trim();
  const answer = document.getElementById('ansA').value.trim();

  if (!question || !answer) {
    return toast('Please fill in both question and answer', 'error');
  }

  await DB.add('knowledge_base', {
    question: question,
    answer: answer,
    addedFrom: 'uncertain_question',
    originalId: id
  });
  await DB.update('uncertain_questions', id, { answered: true });

  // Notify via Telegram that KB was updated
  sendTelegramUpdate(`✅ Knowledge Base Updated\n\nQ: ${question}\nA: ${answer.substring(0, 200)}...`);

  closeModal();
  loadAI();
}

async function sendTelegramUpdate(text) {
  try {
    await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.telegram.adminChatId,
        text: text
      })
    });
  } catch (e) {
    console.error('Telegram error:', e);
  }
}

async function sendTelegramReview(reviewId, question, aiAnswer) {
  const text = `❓ ${question}

💬 ${aiAnswer}

---
Reply with your feedback or "ok" to approve`;

  try {
    const resp = await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.telegram.adminChatId,
        text: text
      })
    });
    const data = await resp.json();
    console.log('TG sent:', data);

    if (data.ok && data.result) {
      return data.result.message_id;
    }
    return null;
  } catch (e) {
    console.error('Telegram error:', e);
    return null;
  }
}

// Parse Mori's feedback intelligently
function parseFeedback(text) {
  const feedback = {
    recommendedAnswer: null,
    concerns: [],
    positives: [],
    rawText: text
  };

  // Patterns for recommended answer
  const answerPatterns = [
    /(?:napsal bych|odepsal bych|rekl bych|odpoved[eě]l bych|spravna odpoved|lepsi odpoved|moje odpoved)[:\s]*(.+)/i,
    /(?:mel bys rict|rekni|odpovez|napis)[:\s]*(.+)/i,
    /(?:takhle|takto|tak)[:\s]*["\"]?(.+?)["\"]?$/i
  ];

  // Patterns for concerns/issues
  const concernPatterns = [
    /(?:spatn[eéa]|chyb[ií]|zapomn[eě]l|schazi|neni tam|nemelo by|nemel bys|problem)[:\s]*(.+)/gi,
    /(?:ne tak|nerekej|neodpovidej|vyhni se)[:\s]*(.+)/gi
  ];

  // Patterns for positives
  const positivePatterns = [
    /(?:dob[rř][eéy]|spravne|libi se mi|ok je|v poradku je|super je)[:\s]*(.+)/gi,
    /(?:tohle je ok|tohle nech|tohle je dobre)[:\s]*(.+)/gi
  ];

  // Extract recommended answer
  for (const pattern of answerPatterns) {
    const match = text.match(pattern);
    if (match) {
      feedback.recommendedAnswer = match[1].trim();
      break;
    }
  }

  // If no pattern matched but text is a direct answer (no concerns indicators), use whole text
  if (!feedback.recommendedAnswer && !text.match(/spatn|chyb|zapomn|schazi|problem|nemel/i)) {
    feedback.recommendedAnswer = text.trim();
  }

  // Extract concerns
  for (const pattern of concernPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      feedback.concerns.push(match[1].trim());
    }
  }

  // Extract positives
  for (const pattern of positivePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      feedback.positives.push(match[1].trim());
    }
  }

  return feedback;
}

// Check Telegram for boss feedback - runs every 5 seconds
async function checkTelegramReplies() {
  try {
    // Get oldest pending review
    const allReviews = await DB.getAll('ai_reviews');
    const pending = allReviews.filter(r => r.status === 'pending');

    if (pending.length === 0) return;

    // Sort by createdAt to get oldest first
    pending.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    const oldestReview = pending[0];

    // Get Telegram updates
    const resp = await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/getUpdates`);
    const data = await resp.json();

    if (!data.ok || !data.result || data.result.length === 0) return;

    for (const update of data.result) {
      const msg = update.message;

      // Clear this update first
      await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/getUpdates?offset=${update.update_id + 1}`);

      // Skip if no text or if it's from bot itself
      if (!msg || !msg.text) continue;
      if (msg.from?.is_bot) continue;

      // Skip "ok" approval messages
      const text = msg.text.trim();
      if (text.toLowerCase() === 'ok') {
        await DB.set('ai_reviews', oldestReview.id, { status: 'approved' });
        await sendTelegramUpdate('✅ Approved');
        loadAI();
        continue;
      }

      // This is feedback from boss - save it!
      console.log('SAVING FEEDBACK:', text);

      await DB.add('knowledge_base', {
        type: 'training',
        keywords: oldestReview.question.toLowerCase(),
        question: oldestReview.question,
        aiAnswer: oldestReview.aiAnswer,
        moriFeedback: text,
        content: `Q: ${oldestReview.question}\nAI: ${oldestReview.aiAnswer}\nBOSS: ${text}`,
        source: 'telegram',
        createdAt: new Date()
      });

      await DB.set('ai_reviews', oldestReview.id, { status: 'trained' });
      await sendTelegramUpdate('✅ Saved! AI is learning.');
      loadAI();
    }
  } catch (e) {
    console.error('TG error:', e);
  }
}

// Check for Telegram replies every 5 seconds - fully automatic
let telegramCheckInterval = null;
function startTelegramCheck() {
  if (telegramCheckInterval) return;
  checkTelegramReplies(); // Check immediately
  telegramCheckInterval = setInterval(checkTelegramReplies, 5000); // Every 5 sec
}
function stopTelegramCheck() {
  if (telegramCheckInterval) {
    clearInterval(telegramCheckInterval);
    telegramCheckInterval = null;
  }
}

// Update AI stats display
async function updateAIStats() {
  try {
    const chatCount = chatMessages.length;
    const allKb = await DB.getKnowledge();
    const trainingCount = allKb.filter(k => k.type === 'training' || k.source === 'telegram_training').length;
    const reviews = await DB.getAll('ai_reviews');
    const pendingCount = reviews.filter(r => r.status === 'pending').length;

    document.getElementById('statChat').textContent = chatCount;
    document.getElementById('statTraining').textContent = trainingCount;
    document.getElementById('statPending').textContent = pendingCount;

    // Color pending if there are any
    document.getElementById('statPending').style.color = pendingCount > 0 ? '#ff0' : '#0f0';
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// Debug Telegram - manual check with full output
async function debugTelegram() {
  toast('Kontroluji Telegram...', 'info');

  try {
    // Get pending reviews
    const reviews = await DB.getAll('ai_reviews');
    const pending = reviews.filter(r => r.status === 'pending');

    console.log('=== TELEGRAM DEBUG ===');
    console.log('All reviews:', reviews);
    console.log('Pending reviews:', pending);
    console.log('Pending with telegramMsgId:', pending.filter(r => r.telegramMsgId));

    if (pending.length === 0) {
      toast('Žádné pending reviews', 'info');
      return;
    }

    // Get Telegram updates
    const resp = await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/getUpdates`);
    const data = await resp.json();

    console.log('Telegram response:', data);

    if (!data.ok) {
      toast('Telegram API chyba: ' + JSON.stringify(data), 'error');
      return;
    }

    if (!data.result || data.result.length === 0) {
      toast('Žádné nové zprávy na Telegramu', 'info');
      return;
    }

    // Show updates
    let found = 0;
    for (const update of data.result) {
      const msg = update.message;
      if (!msg) continue;

      console.log('Update:', update.update_id, 'Message:', msg.text?.substring(0, 50));

      if (msg.reply_to_message) {
        console.log('Reply to message_id:', msg.reply_to_message.message_id);
        const review = pending.find(r => r.telegramMsgId === msg.reply_to_message.message_id);
        if (review) {
          console.log('MATCH FOUND! Review:', review.id);
          found++;
        }
      }
    }

    if (found > 0) {
      toast(`Nalezeno ${found} odpovědí, zpracovávám...`, 'success');
      await checkTelegramReplies();
      await updateAIStats();
      loadAI();
    } else {
      toast(`${data.result.length} zpráv, ale žádná odpověď na pending reviews`, 'info');
    }

  } catch (e) {
    console.error('Debug Telegram error:', e);
    toast('Chyba: ' + e.message, 'error');
  }
}

async function saveAcc(type) {
  await DB.add('accounts', {
    type,
    username: document.getElementById('accUser').value,
    location: document.getElementById('accLoc').value,
    proxyStatus: document.getElementById('accProxy').value,
    healthy: true,
    userId: userId
  });
  closeModal();
  loadOutreach();
}

async function saveOutreachAcc(type) {
  alert('Save function called! Type: ' + type);
  console.log('💾 saveOutreachAcc called with type:', type);

  const username = document.getElementById('accUser')?.value?.trim();
  if (!username) {
    alert('Username is empty!');
    toast('Username is required', 'error');
    return;
  }

  const data = {
    type,
    userId: userId,
    username: username,
    location: document.getElementById('accLoc')?.value || 'Phone',
    deviceName: document.getElementById('accDevice')?.value?.trim() || '',
    healthy: document.getElementById('accHealthy')?.value === 'true',
    proxyStatus: document.getElementById('accProxyStat')?.value || 'None',
    proxyType: document.getElementById('accProxyType')?.value || 'None',
    proxyDetails: document.getElementById('accProxyDetails')?.value?.trim() || '',
    proxyExpiration: document.getElementById('accProxyExp')?.value || '',
    notes: document.getElementById('accNotes')?.value?.trim() || ''
  };

  if (type === 'webcam' || type === 'onlyfans') {
    data.site = document.getElementById('accSite')?.value?.trim() || '';
    data.outreachMethod = document.getElementById('accMethod')?.value?.trim() || '';
  } else {
    data.warmupStatus = document.getElementById('accWarmup')?.value || 'Not Started';
  }

  console.log('💾 Saving account data:', data);

  try {
    const result = await DB.add('accounts', data);
    console.log('✅ Account saved, result:', result);
    closeModal();
    toast('Account added successfully!', 'success');
    await loadOutreachAccounts();
    console.log('✅ Outreach accounts reloaded');
  } catch (error) {
    console.error('❌ Error saving account:', error);
    toast('Error: ' + error.message, 'error');
  }
}

async function updateOutreachAcc(type) {
  const id = document.getElementById('editAccId')?.value;
  if (!id) {
    toast('Account ID missing', 'error');
    return;
  }

  const username = document.getElementById('accUser')?.value?.trim();
  if (!username) {
    toast('Username is required', 'error');
    return;
  }

  const data = {
    username: username,
    location: document.getElementById('accLoc')?.value || 'Phone',
    deviceName: document.getElementById('accDevice')?.value?.trim() || '',
    healthy: document.getElementById('accHealthy')?.value === 'true',
    proxyStatus: document.getElementById('accProxyStat')?.value || 'None',
    proxyType: document.getElementById('accProxyType')?.value || 'None',
    proxyDetails: document.getElementById('accProxyDetails')?.value?.trim() || '',
    proxyExpiration: document.getElementById('accProxyExp')?.value || '',
    notes: document.getElementById('accNotes')?.value?.trim() || ''
  };

  if (type === 'webcam' || type === 'onlyfans') {
    data.site = document.getElementById('accSite')?.value?.trim() || '';
    data.outreachMethod = document.getElementById('accMethod')?.value?.trim() || '';
  } else {
    data.warmupStatus = document.getElementById('accWarmup')?.value || 'Not Started';
  }

  await DB.update('accounts', id, data);
  closeModal();
  toast('Account updated successfully!', 'success');
  loadOutreachAccounts();
}

async function saveOfBombex() {
  const editId = document.getElementById('osEditId')?.value;
  const usaOutreached = parseInt(document.getElementById('osOutreachedUSA').value) || 0;
  const espOutreached = parseInt(document.getElementById('osOutreachedESP').value) || 0;

  const data = {
    userId: userId,
    date: editId ? editId.split('_')[1] : new Date().toISOString().split('T')[0],
    activeAccounts: parseInt(document.getElementById('osAcc').value) || 0,
    usaRunning: parseInt(document.getElementById('osUSAIn').value) || 0,
    espRunning: parseInt(document.getElementById('osESPIn').value) || 0,
    usaOutreached: usaOutreached,
    espOutreached: espOutreached,
    outreached: usaOutreached + espOutreached,
    notes: document.getElementById('osNotes')?.value?.trim() || ''
  };

  const logId = editId || `${userId}_${data.date}`;
  await DB.set('outseeker_logs', logId, data);

  closeModal();
  toast(editId ? 'OFautopilot log updated!' : 'OFautopilot data saved!', 'success');
  loadOfBombex();
}

async function editOfBombex(logId) {
  try {
    const log = await DB.get('outseeker_logs', logId);
    if (!log) {
      toast('Log not found', 'error');
      return;
    }
    log.id = logId;
    modal('outseeker', log);
  } catch (e) {
    console.error('editOfBombex error:', e);
    toast('Error loading log', 'error');
  }
}

async function delOfBombex(logId) {
  if (await confirmDialog('Delete this OFautopilot log?')) {
    try {
      await DB.delete('outseeker_logs', logId);
      toast('Log deleted', 'success');
      loadOfBombex();
    } catch (e) {
      console.error('delOfBombex error:', e);
      toast('Error deleting log', 'error');
    }
  }
}

// ============================================
// OFautopilot MODELS OUTREACH
// ============================================

async function loadModelOutreach() {
  try {
    // Fetch without orderBy to avoid composite index requirement, sort client-side
    let logs = await DB.getAll('model_outreach_logs', [{ field: 'userId', value: userId }]);
    logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    logs = logs.slice(0, 30);

    const latest = logs[0];
    if (latest && latest.models) {
      document.getElementById('moTotalModels').textContent = latest.models.length;
      document.getElementById('moTotalOutreached').textContent = latest.models.reduce((s, m) => s + (m.outreachedToday || 0), 0);
      document.getElementById('moTotalRemaining').textContent = latest.models.reduce((s, m) => s + (m.collectionRemaining || 0), 0);
    } else {
      document.getElementById('moTotalModels').textContent = '0';
      document.getElementById('moTotalOutreached').textContent = '0';
      document.getElementById('moTotalRemaining').textContent = '0';
    }

    const today = new Date().toISOString().split('T')[0];
    let html = '';
    logs.forEach(l => {
      const isToday = l.date === today;
      const models = l.models || [];
      const totalOut = models.reduce((s, m) => s + (m.outreachedToday || 0), 0);
      const totalRem = models.reduce((s, m) => s + (m.collectionRemaining || 0), 0);
      const totalAcc = models.reduce((s, m) => s + (m.activeAccounts || 0), 0);
      const logId = l.id;

      html += `<div class="list-item" style="${isToday ? 'background:#001a00;border-left:3px solid #0f0' : ''};padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:${models.length ? '8' : '0'}px">
          <div style="flex:0 0 auto">
            <div style="font-weight:${isToday ? 'bold' : 'normal'};color:${isToday ? '#0f0' : '#eee'};font-size:13px;margin-bottom:2px">${l.date}</div>
            ${isToday ? '<div style="font-size:9px;color:#0f0">TODAY</div>' : ''}
          </div>
          <div style="flex:1;display:flex;gap:8px;align-items:center;font-size:11px;flex-wrap:wrap">
            <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
              <span style="color:#666">Models:</span> <strong style="color:#0f0">${models.length}</strong>
            </div>
            <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
              <span style="color:#666">Total Accounts:</span> <strong style="color:#4af">${totalAcc}</strong>
            </div>
            <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
              <span style="color:#666">Outreached:</span> <strong style="color:#ff0">${totalOut}</strong>
            </div>
            <div style="padding:4px 8px;background:#0a0a0a;border:1px solid #333;border-radius:2px">
              <span style="color:#666">Remaining:</span> <strong style="color:#f4a">${totalRem}</strong>
            </div>
          </div>
          <div style="flex:0 0 auto;display:flex;gap:5px">
            <button class="btn btn-sm" style="font-size:10px;padding:2px 8px" onclick="editModelOutreach('${logId}')">Edit</button>
            <button class="btn btn-sm" style="font-size:10px;padding:2px 8px" onclick="delModelOutreach('${logId}')">Delete</button>
          </div>
        </div>
        ${models.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">
          ${models.map(m => `<div style="padding:6px 8px;background:#0a0a0a;border:1px solid #222;border-radius:3px;font-size:10px">
            <strong style="color:#0f0">${m.name || 'Unnamed'}</strong>
            <div style="display:flex;gap:10px;margin-top:3px">
              <span><span style="color:#666">Acc:</span> <strong style="color:#4af">${m.activeAccounts || 0}</strong></span>
              <span><span style="color:#666">Out:</span> <strong style="color:#ff0">${m.outreachedToday || 0}</strong></span>
              <span><span style="color:#666">Rem:</span> <strong style="color:#f4a">${m.collectionRemaining || 0}</strong></span>
            </div>
          </div>`).join('')}
        </div>` : ''}
        ${l.notes ? `<div style="margin-top:8px;padding:6px 8px;background:#0a0a0a;border:1px solid #222;border-radius:2px;font-size:10px;color:#999"><strong style="color:#666;font-size:9px;margin-right:5px">Notes:</strong>${l.notes}</div>` : ''}
      </div>`;
    });

    document.getElementById('moLog').innerHTML = html || '<div class="empty-state">No model outreach logs</div>';
  } catch (e) {
    console.error('loadModelOutreach error:', e);
    document.getElementById('moLog').innerHTML = '<div class="empty-state">Error loading logs</div>';
  }
}

async function saveModelOutreach() {
  const editId = document.getElementById('moEditId')?.value;

  // Collect models from dynamic rows
  const rows = document.querySelectorAll('.mo-model-row');
  const models = [];
  rows.forEach(row => {
    const name = row.querySelector('.mo-name')?.value?.trim();
    if (!name) return;
    models.push({
      name: name,
      activeAccounts: parseInt(row.querySelector('.mo-accounts')?.value) || 0,
      outreachedToday: parseInt(row.querySelector('.mo-outreached')?.value) || 0,
      collectionRemaining: parseInt(row.querySelector('.mo-remaining')?.value) || 0
    });
  });

  if (!models.length) {
    toast('Add at least one model', 'error');
    return;
  }

  const date = editId ? editId.split('_').slice(1).join('_') : new Date().toISOString().split('T')[0];
  const logId = editId || `${userId}_${date}`;

  const data = {
    userId: userId,
    date: date,
    models: models,
    notes: document.getElementById('moNotes')?.value?.trim() || ''
  };

  await DB.set('model_outreach_logs', logId, data);

  closeModal();
  toast(editId ? 'Model outreach log updated!' : 'Model outreach data saved!', 'success');
  loadModelOutreach();
}

function addModelOutreachRow(model) {
  const container = document.getElementById('moModelsContainer');
  const row = document.createElement('div');
  row.className = 'mo-model-row';
  row.style.cssText = 'padding:10px;background:#0a0a0a;border:1px solid #333;border-radius:4px;margin-bottom:8px';
  row.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <input type="text" class="form-input mo-name" placeholder="Model name" value="${model?.name || ''}" style="flex:1;margin-right:8px">
      <button class="btn btn-sm" style="font-size:10px;padding:2px 8px;background:#c62828;color:#fff" onclick="this.closest('.mo-model-row').remove()">Remove</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div>
        <label style="display:block;color:#666;font-size:9px;margin-bottom:3px">Active Accounts</label>
        <input type="number" class="form-input mo-accounts" min="0" value="${model?.activeAccounts || 0}" style="width:100%">
      </div>
      <div>
        <label style="display:block;color:#666;font-size:9px;margin-bottom:3px">Outreached Today</label>
        <input type="number" class="form-input mo-outreached" min="0" value="${model?.outreachedToday || 0}" style="width:100%">
      </div>
      <div>
        <label style="display:block;color:#666;font-size:9px;margin-bottom:3px">Collection Remaining</label>
        <input type="number" class="form-input mo-remaining" min="0" value="${model?.collectionRemaining || 0}" style="width:100%">
      </div>
    </div>
  `;
  container.appendChild(row);
}

async function editModelOutreach(logId) {
  try {
    let log = await DB.get('model_outreach_logs', logId);
    if (!log) {
      toast('Log not found', 'error');
      return;
    }
    if (!log.id) log.id = logId;
    modal('modelOutreach', log);
  } catch (e) {
    console.error('editModelOutreach error:', e);
    toast('Error loading log', 'error');
  }
}

async function delModelOutreach(logId) {
  if (await confirmDialog('Delete this model outreach log?')) {
    try {
      await DB.delete('model_outreach_logs', logId);
      toast('Log deleted', 'success');
      loadModelOutreach();
    } catch (e) {
      console.error('delModelOutreach error:', e);
      toast('Error deleting log', 'error');
    }
  }
}

async function saveScript(type) {
  const text = document.getElementById('scriptTxt')?.value?.trim();
  if (!text) {
    toast('Text is required', 'error');
    return;
  }

  // Collect selected platforms
  const platforms = Array.from(document.querySelectorAll('.scriptPlatCheck:checked')).map(cb => cb.value);

  // Collect selected accounts
  const accountIds = Array.from(document.querySelectorAll('.scriptAccCheck:checked')).map(cb => cb.value).filter(v => v !== '');

  const data = {
    type,
    text: text,
    notes: document.getElementById('scriptNotes')?.value?.trim() || '',
    usageCount: 0,
    platforms: platforms,
    accountIds: accountIds
  };

  if (type === 'script') {
    data.title = document.getElementById('scriptTitle')?.value?.trim() || '';
    data.category = document.getElementById('scriptCategory')?.value || 'other';
  } else {
    // Opener or followup
    data.active = document.getElementById('scriptActive')?.checked || false;
  }

  await DB.add('scripts', data);
  closeModal();
  toast(`${type.charAt(0).toUpperCase() + type.slice(1)} added!`, 'success');
  loadOutreach();
}

async function updateScript(type) {
  const id = document.getElementById('scriptEditId')?.value;
  if (!id) {
    toast('Script ID not found', 'error');
    return;
  }

  const text = document.getElementById('scriptTxt')?.value?.trim();
  if (!text) {
    toast('Text is required', 'error');
    return;
  }

  // Collect selected platforms
  const platforms = Array.from(document.querySelectorAll('.scriptPlatCheck:checked')).map(cb => cb.value);

  // Collect selected accounts
  const accountIds = Array.from(document.querySelectorAll('.scriptAccCheck:checked')).map(cb => cb.value).filter(v => v !== '');

  const data = {
    text: text,
    notes: document.getElementById('scriptNotes')?.value?.trim() || '',
    platforms: platforms,
    accountIds: accountIds
  };

  if (type === 'script') {
    data.title = document.getElementById('scriptTitle')?.value?.trim() || '';
    data.category = document.getElementById('scriptCategory')?.value || 'other';
  } else {
    // Opener or followup
    data.active = document.getElementById('scriptActive')?.checked || false;
  }

  await DB.update('scripts', id, data);
  closeModal();
  toast(`${type.charAt(0).toUpperCase() + type.slice(1)} updated!`, 'success');

  // Reload the appropriate list
  if (type === 'opener') loadOpeners();
  else if (type === 'followup') loadFollowups();
  else loadScripts();
}

async function saveLeadCollection() {
  try {
    console.log('=== SAVE COLLECTION START ===');
    const editId = document.getElementById('collEditId')?.value?.trim();
    const name = document.getElementById('collName')?.value?.trim();
    const notes = document.getElementById('collNotes')?.value?.trim() || '';
    const platform = document.getElementById('collPlatform')?.value;

    console.log('editId:', editId);
    console.log('name:', name);
    console.log('platform:', platform);
    console.log('notes:', notes);

    // Validation
    if (!name) {
      toast('Collection name is required', 'error');
      return;
    }
    if (!platform) {
      toast('Platform is required', 'error');
      return;
    }

    // Get selected accounts
    const checkboxes = document.querySelectorAll('.collAccCheck:checked');
    const accountIds = Array.from(checkboxes).map(cb => cb.value);
    console.log('accountIds:', accountIds);

    const db = firebase.firestore();

    if (editId && editId !== '') {
      // ===== UPDATE EXISTING COLLECTION =====
      console.log('UPDATING collection:', editId);

      // Only send fields that need to be updated - NO createdAt!
      const updateData = {
        name: name,
        notes: notes,
        platform: platform,
        accountIds: accountIds,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('updateData:', JSON.stringify({...updateData, updatedAt: '[ServerTimestamp]'}));

      // Use Firebase update() method directly
      await db.collection('lead_collections').doc(editId).update(updateData);

      console.log('✅ Update SUCCESS');
      toast('Collection updated! ✅', 'success');
    } else {
      // ===== CREATE NEW COLLECTION =====
      console.log('CREATING new collection');

      const createData = {
        userId: userId,
        name: name,
        notes: notes,
        platform: platform,
        accountIds: accountIds,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('createData:', JSON.stringify({...createData, createdAt: '[ServerTimestamp]', updatedAt: '[ServerTimestamp]'}));

      await db.collection('lead_collections').add(createData);

      console.log('✅ Create SUCCESS');
      toast('Collection created! ✅', 'success');
    }

    cancelCollectionForm();
    await loadLeads();
    console.log('=== SAVE COLLECTION END ===');
  } catch (err) {
    console.error('❌ ERROR:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    toast('ERROR: ' + err.message, 'error');
  }
}

async function saveLeadItem() {
  const editId = document.getElementById('leadEditId')?.value;
  const collId = document.getElementById('leadCollId')?.value;
  const platform = document.getElementById('leadPlatform')?.value;
  const name = document.getElementById('leadName')?.value?.trim();
  const notes = document.getElementById('leadNotes')?.value?.trim();
  const outreached = document.getElementById('leadOutreached')?.checked;

  if (!name) {
    toast('Model name is required', 'error');
    return;
  }

  const data = {
    userId: userId,
    collectionId: collId,
    name: name,
    igUsername: document.getElementById('leadIgUser')?.value?.trim() || '',
    twitterUsername: document.getElementById('leadTwUser')?.value?.trim() || '',
    webcamUsername: document.getElementById('leadWcUser')?.value?.trim() || '',
    notes: notes,
    outreached: outreached,
    addedDate: editId ? undefined : new Date().toISOString()
  };

  if (editId) {
    await DB.update('leads', editId, data);
    toast('Lead updated!', 'success');
  } else {
    await DB.add('leads', data);
    toast('Lead added!', 'success');
  }

  closeModal();
  viewLeadCollection(collId);
}

async function saveModel() {
  const editId = document.getElementById('modEditId')?.value;
  const name = document.getElementById('modName')?.value?.trim();
  const status = document.getElementById('modStatus')?.value || 'potential';

  if (!name) {
    toast('Name is required', 'error');
    return;
  }

  // Get existing model data if editing (to preserve communication history)
  let existingData = {};
  if (editId) {
    const existing = await DB.get('models', editId);
    if (existing) {
      existingData = {
        communicationNotes: existing.communicationNotes || [],
        lastCommunication: existing.lastCommunication || null,
        communicationStreak: existing.communicationStreak || 0,
        addedDate: existing.addedDate || new Date().toISOString()
      };
    }
  }

  const data = {
    userId: userId,
    name: name,
    photo: document.getElementById('modPhoto')?.value?.trim() || '',
    country: document.getElementById('modCountry')?.value?.trim() || '',
    age: parseInt(document.getElementById('modAge')?.value) || null,
    status: status,

    // Contact status
    onAssistantTelegram: document.getElementById('modOnAssistTg')?.checked || false,
    onAssistantWhatsApp: document.getElementById('modOnAssistWa')?.checked || false,
    onBossTelegram: document.getElementById('modOnBossTg')?.checked || false,
    onBossWhatsApp: document.getElementById('modOnBossWa')?.checked || false,

    // Experience & Skills
    experienceDescription: document.getElementById('modExpDesc')?.value?.trim() || '',
    adultExperience: document.getElementById('modExperience')?.value || 'none',
    paymentPreference: document.getElementById('modPayment')?.value || 'flexible',
    canSpeakEnglish: document.getElementById('modCanEnglish')?.checked || false,
    englishLevel: parseInt(document.getElementById('modEnglishLevel')?.value) || 5,

    // Work type & Setup
    canDoWebcams: document.getElementById('modCanWebcam')?.checked || false,
    canDoContent: document.getElementById('modCanContent')?.checked || false,
    phone: document.getElementById('modPhone')?.value?.trim() || '',
    pc: document.getElementById('modPC')?.value?.trim() || '',
    hasWebcam: document.getElementById('modHasWebcam')?.checked || false,
    hasLovense: document.getElementById('modHasLovense')?.checked || false,

    // Background
    hasJob: document.getElementById('modHasJob')?.checked || false,
    isStudying: document.getElementById('modStudying')?.checked || false,
    motivation: document.getElementById('modMotivation')?.value?.trim() || '',
    whyDoThis: document.getElementById('modWhy')?.value?.trim() || '',
    lifeSituation: document.getElementById('modLifeSituation')?.value?.trim() || '',

    // Communication tracking (preserve existing or initialize)
    communicationNotes: existingData.communicationNotes || [],
    lastCommunication: existingData.lastCommunication || null,
    communicationStreak: existingData.communicationStreak || 0
  };

  // For active models - system access and performance data
  if (status === 'active') {
    data.hasSystemAccess = document.getElementById('modHasSystemAccess')?.checked || false;
    data.systemUsername = document.getElementById('modSystemUser')?.value?.trim() || '';
    data.systemPassword = document.getElementById('modSystemPass')?.value?.trim() || '';
    data.contentPerformance = document.getElementById('modContentPerf')?.value?.trim() || '';
    data.overallStatus = document.getElementById('modOverallStatus')?.value?.trim() || '';
    data.checklistProgress = document.getElementById('modChecklistProgress')?.value?.trim() || '';

    // Set activation date if newly activated
    if (editId) {
      const existing = await DB.get('models', editId);
      if (existing && existing.status !== 'active') {
        data.activatedDate = new Date().toISOString();
      } else if (existing && existing.activatedDate) {
        data.activatedDate = existing.activatedDate;
      }
    } else {
      data.activatedDate = new Date().toISOString();
    }
  }

  if (editId) {
    // Update existing model
    await DB.update('models', editId, data);
    toast('Model updated!', 'success');
  } else {
    // Add new model
    data.addedDate = new Date().toISOString();
    await DB.add('models', data);
    toast('Model added!', 'success');
  }

  closeModal();
  loadModels();
}

async function saveCommLog() {
  const modelId = document.getElementById('commModelId')?.value;
  const modelStatus = document.getElementById('commModelStatus')?.value;
  const note = document.getElementById('commNote')?.value?.trim();
  const progress = document.getElementById('commProgress')?.value;
  const contentUpdate = document.getElementById('commContent')?.value?.trim();

  if (!modelId) {
    toast('Model ID missing', 'error');
    return;
  }

  // Get current model data
  const model = await DB.get('models', modelId);
  if (!model) {
    toast('Model not found', 'error');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastComm = model.lastCommunication ? new Date(model.lastCommunication).toISOString().split('T')[0] : null;

  // Calculate streak
  let streak = model.communicationStreak || 0;
  if (lastComm) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastComm === yesterdayStr) {
      streak += 1; // Continue streak
    } else {
      streak = 1; // Reset streak
    }
  } else {
    streak = 1; // First communication
  }

  // Prepare communication note entry
  const commNotes = model.communicationNotes || [];
  const noteEntry = {
    date: today,
    note: note || '',
    progress: progress,
    timestamp: new Date().toISOString()
  };

  // Add content update if provided and model is active
  if (contentUpdate && modelStatus === 'active') {
    noteEntry.contentUpdate = contentUpdate;
  }

  commNotes.push(noteEntry);

  // Update model
  const updateData = {
    lastCommunication: new Date().toISOString(),
    communicationStreak: streak,
    communicationNotes: commNotes
  };

  // If content update provided for active model, update contentPerformance field
  if (contentUpdate && modelStatus === 'active') {
    const existingPerf = model.contentPerformance || '';
    const dateStamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    updateData.contentPerformance = existingPerf
      ? `${existingPerf}\n\n[${dateStamp}] ${contentUpdate}`
      : `[${dateStamp}] ${contentUpdate}`;
  }

  await DB.update('models', modelId, updateData);

  const progressEmoji = progress === 'positive' ? '✅' : (progress === 'negative' ? '❌' : '➖');
  toast(`${progressEmoji} Communication logged! 🔥 ${streak} day streak`, 'success');

  closeModal();
  loadModels();
}

function updatePostTypes(typesCounts = null) {
  const platform = document.getElementById('postPlat').value;
  const container = document.getElementById('postTypesContainer');

  const types = {
    instagram: [
      { value: 'picture', label: 'Picture' },
      { value: 'reels', label: 'Reels' },
      { value: 'carousel', label: 'Carousel' },
      { value: 'stories', label: 'Stories' }
    ],
    tiktok: [
      { value: 'video', label: 'Video' },
      { value: 'stories', label: 'Stories' },
      { value: 'photo', label: 'Photo' }
    ],
    reddit: [
      { value: 'picture', label: 'Picture' },
      { value: 'video', label: 'Video' },
      { value: 'gif', label: 'GIF' }
    ],
    twitter: [
      { value: 'picture', label: 'Picture' },
      { value: 'video', label: 'Video' },
      { value: 'text', label: 'Text' }
    ]
  };

  const platformTypes = types[platform] || [];
  const counts = typesCounts || {};

  container.innerHTML = platformTypes.map(t => `
    <div class="type-count-row">
      <span class="type-label">${t.label}</span>
      <input type="number" class="form-input type-count-input" data-type="${t.value}" value="${counts[t.value] || 0}" min="0" max="50">
      <span class="type-unit">/day</span>
    </div>
  `).join('');
}

async function savePosting() {
  const editId = document.getElementById('postEditId').value;

  if (!document.getElementById('postUser').value.trim()) {
    return toast('Enter username', 'error');
  }

  const typesCounts = {};
  document.querySelectorAll('.type-count-input').forEach(input => {
    const val = parseInt(input.value) || 0;
    if (val > 0) typesCounts[input.dataset.type] = val;
  });

  const data = {
    platform: document.getElementById('postPlat').value,
    username: document.getElementById('postUser').value.trim(),
    typesCounts: typesCounts,
    notes: document.getElementById('postNotes').value.trim()
  };

  if (editId) {
    await DB.update('posting_accounts', editId, data);
    toast('Account updated', 'success');
  } else {
    await DB.add('posting_accounts', data);
    toast('Account added', 'success');
  }

  closeModal();
  loadPosting();
}

async function editPosting(id) {
  const acc = await DB.get('posting_accounts', id);
  if (acc) modal('posting', acc);
}

async function savePreset() {
  const presets = await DB.getTaskPresets();
  await DB.add('task_presets', {
    name: document.getElementById('presetName').value,
    guide: document.getElementById('presetGuide').value,
    images: document.getElementById('presetImages').value,
    video: document.getElementById('presetVideo').value,
    operative: document.getElementById('presetOperative')?.checked || false,
    order: presets.length
  });
  closeModal();
  loadSettings();
}

async function editPreset(id) {
  const p = await DB.get('task_presets', id);
  modal('taskPreset');
  setTimeout(() => {
    document.getElementById('presetName').value = p.name || '';
    document.getElementById('presetGuide').value = p.guide || '';
    document.getElementById('presetImages').value = p.images || '';
    document.getElementById('presetVideo').value = p.video || '';
    document.getElementById('presetOperative').checked = p.operative || false;
    // Change save button to update
    document.querySelector('#mBody button').onclick = () => updatePreset(id);
    document.querySelector('#mBody button').textContent = 'Update Task';
  }, 100);
}

async function updatePreset(id) {
  await DB.update('task_presets', id, {
    name: document.getElementById('presetName').value,
    guide: document.getElementById('presetGuide').value,
    images: document.getElementById('presetImages').value,
    video: document.getElementById('presetVideo').value,
    operative: document.getElementById('presetOperative')?.checked || false
  });
  closeModal();
  loadSettings();
}

async function saveWallet() {
  const type = document.getElementById('walletType').value;
  const address = document.getElementById('walletAddress').value.trim();
  const label = document.getElementById('walletLabel').value.trim();

  if (!address) {
    return toast('Enter wallet address', 'error');
  }

  await DB.add('wallets', {
    userId: userId,
    type: type,
    address: address,
    label: label || null
  });

  closeModal();
  toast('Wallet added', 'success');
  loadWallets();
}

// ============================================
// TOAST & CONFIRM DIALOG
// ============================================
function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✓', error: '✗', warning: '⚠' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 300); }, duration);
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-message">${message}</div>
        <div class="confirm-buttons">
          <button class="btn btn-primary confirm-yes">Yes</button>
          <button class="btn confirm-no">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('.confirm-no').onclick = () => { overlay.remove(); resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

// ============================================
// INIT
// ============================================
(async () => {
  try {
    const visDoc = await DB.getSetting('section_visibility');
    if (visDoc && visDoc.tabs) {
      sectionVisConfig = { sections: visDoc.sections || {}, tabs: visDoc.tabs || {} };
    } else {
      sectionVisConfig = JSON.parse(JSON.stringify(DEFAULT_SECTION_VIS));
      await DB.saveSetting('section_visibility', sectionVisConfig);
    }
    applySectionVisibility(sectionVisConfig);
  } catch(e) {
    console.error('Section visibility init error:', e);
  }
  loadDaily();
})();
