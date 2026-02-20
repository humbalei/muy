// ============================================
// TEAM APP - Assistant Interface
// ============================================

DB.init();

// ============================================
// TOAST NOTIFICATIONS (replaces alert/confirm)
// ============================================
function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠'
  };

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <span class="toast-icon">${icons[type] || '•'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(t);

  // Auto remove
  setTimeout(() => {
    t.classList.add('hiding');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// Custom confirm dialog
function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center';

    overlay.innerHTML = `
      <div style="background:#111;border:2px solid #0f0;padding:20px;max-width:400px;text-align:center">
        <div style="margin-bottom:20px;font-size:14px;color:#fff">${message}</div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-primary" id="confirmYes">Yes</button>
          <button class="btn" id="confirmNo">No</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirmYes').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    overlay.querySelector('#confirmNo').onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}

// Auth check
if (!DB.isLoggedIn()) {
  location.href = 'index.html';
}

const user = DB.getUser();
document.getElementById('userName').textContent = user.id;

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
  console.log(`📍 Loading section: ${s}`);
  switch(s) {
    case 'daily': loadDaily(); break;
    case 'ai':
      console.log('🔄 Force reloading AI chat...');
      loadAI();
      break;
    case 'outreach': loadOutreach(); break;
    case 'models': loadModels(); break;
    case 'content': loadContent(); break;
    case 'posting': loadPosting(); break;
    case 'voice': loadVoice(); break;
  }
}

// ============================================
// DAILY SECTION - Calendar Based System
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

async function loadDaily() {
  await loadCalendar();
  await loadDayDetail();
  await loadPayroll();
}

// --- DAY DETAIL ---
async function loadDayDetail() {
  const day = await getDayData(curDate);
  const presets = await DB.getTaskPresets();
  const tasks = await DB.getDailyTasks(user.id, curDate);
  const manualTasks = await DB.getAll('manual_tasks', [
    { field: 'userId', value: user.id },
    { field: 'date', value: curDate }
  ]);

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

  // Load tasks and get bonus from completed bonus tasks
  await loadTasks(presets, tasks, manualTasks);

  // Calculate bonus from completed bonus tasks
  const completedBonus = manualTasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);

  // Load report data
  document.getElementById('dayHours').value = day.hours || '';
  document.getElementById('reportTxt').value = day.report || '';

  // Calculate day earnings
  const rateSetting = await DB.getSetting('hourly_rate');
  const rate = rateSetting?.value || CONFIG.hourlyRate;
  const hours = day.hours || 0;
  const total = (hours * rate) + completedBonus;

  document.getElementById('dayHoursDisplay').textContent = hours + 'h';
  document.getElementById('dayRate').textContent = '$' + rate;
  document.getElementById('dayTotal').textContent = '$' + total.toFixed(2);

  // Bonus display - shows completed bonus tasks total
  const bonusDisplay = document.getElementById('dayBonusDisplay');
  if (bonusDisplay) {
    bonusDisplay.textContent = '$' + completedBonus;
  }
}

// Calculate bonus from manual_tasks for current user+date
async function calcBonusForUser(date) {
  const tasks = await DB.getAll('manual_tasks', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date }
  ]);
  return tasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);
}

// Sync work_days.bonus and payroll amount for current user+date
async function syncBonusAndPayrollForUser(date) {
  const bonus = await calcBonusForUser(date);
  const wds = await DB.getAll('work_days', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date }
  ]);
  if (wds.length > 0) {
    await DB.update('work_days', wds[0].id, { bonus });
    const hours = wds[0].hours || 0;
    if (wds[0].status === 'completed') {
      const rateSetting = await DB.getSetting('hourly_rate');
      const rate = rateSetting?.value || CONFIG.hourlyRate;
      const amount = (hours * rate) + bonus;
      const payrolls = await DB.getAll('payroll', [
        { field: 'userId', value: user.id },
        { field: 'date', value: date }
      ]);
      const pending = payrolls.filter(p => p.status === 'pending');
      if (pending.length > 0) {
        await DB.update('payroll', pending[0].id, { hours, bonus, amount });
      }
    }
  }
}

async function getDayData(date) {
  const days = await DB.getAll('work_days', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date }
  ]);
  return days[0] || { date, status: null, hours: 0, report: '', bonus: 0 };
}

async function setDayStatus(status) {
  const existing = await DB.getAll('work_days', [
    { field: 'userId', value: user.id },
    { field: 'date', value: curDate }
  ]);

  let dayData;
  let newStatus = status;

  // Toggle off if clicking same status
  if (existing.length > 0 && existing[0].status === status) {
    newStatus = 'planned'; // Reset to planned
  }

  const bonus = await calcBonusForUser(curDate);

  if (existing.length > 0) {
    await DB.update('work_days', existing[0].id, { status: newStatus, bonus });
    dayData = { ...existing[0], status: newStatus, bonus };
  } else {
    const newDay = {
      userId: user.id,
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

  // If completing day, auto-create pending payment
  if (newStatus === 'completed') {
    await createPendingPayment(curDate, dayData.hours || 0, bonus);
  }

  // If un-completing day, remove pending payment
  if (status === 'completed' && newStatus === 'planned') {
    await removePendingPayment(curDate);
  }

  loadDayDetail();
  loadCalendar();
}

// Remove pending payment when day is un-completed
async function removePendingPayment(date) {
  const existing = await DB.getAll('payroll', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date },
    { field: 'status', value: 'pending' }
  ]);

  for (const p of existing) {
    await DB.delete('payroll', p.id);
  }
}

// Create pending payment for a completed day
async function createPendingPayment(date, hours, bonus) {
  // Check if payment already exists for this date
  const existing = await DB.getAll('payroll', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date }
  ]);

  const rateSetting = await DB.getSetting('hourly_rate');
  const rate = rateSetting?.value || CONFIG.hourlyRate;
  const amount = (hours * rate) + bonus;

  if (existing.length > 0) {
    // Update existing payment if it's still pending
    if (existing[0].status === 'pending') {
      await DB.update('payroll', existing[0].id, { hours, bonus, amount });
    }
    return;
  }

  // Create new pending payment
  await DB.add('payroll', {
    userId: user.id,
    date: date,
    hours: hours,
    bonus: bonus,
    amount: amount,
    status: 'pending',
    createdAt: new Date()
  });
}

async function saveDayReport() {
  const hours = parseFloat(document.getElementById('dayHours').value) || 0;
  const report = document.getElementById('reportTxt').value.trim();

  const existing = await DB.getAll('work_days', [
    { field: 'userId', value: user.id },
    { field: 'date', value: curDate }
  ]);

  const bonus = await calcBonusForUser(curDate);
  let dayStatus = 'planned';
  if (existing.length > 0) {
    dayStatus = existing[0].status;
    await DB.update('work_days', existing[0].id, { hours, report, bonus });
  } else {
    await DB.add('work_days', {
      userId: user.id,
      date: curDate,
      status: 'planned',
      hours: hours,
      report: report,
      bonus: bonus,
      createdAt: new Date()
    });
  }

  // If day is already completed, update the pending payment
  if (dayStatus === 'completed') {
    await updatePendingPayment(curDate, hours, bonus);
  }

  toast('Report saved!', 'success');
  loadDayDetail();
  loadCalendar();
}

// Update pending payment amount when hours change
async function updatePendingPayment(date, hours, bonus) {
  const rateSetting = await DB.getSetting('hourly_rate');
  const rate = rateSetting?.value || CONFIG.hourlyRate;
  const amount = (hours * rate) + bonus;

  const existing = await DB.getAll('payroll', [
    { field: 'userId', value: user.id },
    { field: 'date', value: date }
  ]);

  if (existing.length > 0 && existing[0].status === 'pending') {
    await DB.update('payroll', existing[0].id, { hours, bonus, amount });
  } else if (existing.length === 0) {
    // Create payment if it doesn't exist
    await createPendingPayment(date, hours, bonus);
  }
}

// Plan next 7 days as work days
async function planNextWeek() {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const existing = await DB.getAll('work_days', [
      { field: 'userId', value: user.id },
      { field: 'date', value: dateStr }
    ]);

    if (existing.length === 0) {
      await DB.add('work_days', {
        userId: user.id,
        date: dateStr,
        status: 'planned',
        hours: 0,
        report: '',
        bonus: 0,
        createdAt: new Date()
      });
    }
  }

  toast('Next 7 days planned!', 'success');
  loadCalendar();
}

// --- TASKS ---
async function loadTasks(presets, tasks, manualTasks) {
  // Count completions
  const presetDone = tasks.filter(t => t.done).length;
  const manualDone = manualTasks.filter(t => t.done).length;
  const totalTasks = presets.length + manualTasks.length;
  const totalDone = presetDone + manualDone;

  // Calculate bonus from completed bonus tasks
  const completedBonus = manualTasks.filter(t => t.done && t.bonus > 0).reduce((sum, t) => sum + (t.bonus || 0), 0);

  document.getElementById('taskProg').textContent = `${totalDone}/${totalTasks}`;

  let html = '';

  // Preset tasks (Daily Tasks)
  if (presets.length > 0) {
    html += '<div style="font-size:10px;color:#0f0;margin-bottom:8px;font-weight:bold">DAILY TASKS:</div>';
    for (const p of presets) {
      const t = tasks.find(x => x.taskId === p.id);
      const isDone = t?.done || false;
      const hasGuide = p.guide || p.images || p.video;
      html += `
        <div class="task-item ${isDone ? 'done' : ''}">
          <input type="checkbox" class="task-check" ${isDone ? 'checked' : ''}
            onchange="toggleTask('${p.id}', this.checked)">
          <span class="task-name">${p.name}</span>
          ${hasGuide ? `<span class="task-guide-btn" onmouseenter="showGuide(event, '${p.id}')" onmouseleave="hideGuide()">?</span>` : ''}
        </div>
      `;
    }
  } else {
    html += '<div class="empty-state" style="padding:10px;margin-bottom:10px">No daily tasks configured. Go to Settings → Task Presets to add.</div>';
  }

  // Manual tasks (Additional + Bonus)
  if (manualTasks.length > 0) {
    html += '<div style="font-size:10px;color:#ff0;margin:15px 0 8px 0;font-weight:bold">ADDITIONAL TASKS:</div>';
    for (const m of manualTasks) {
      const bonusLabel = m.bonus > 0 ? `<span style="color:#0f0;font-weight:bold;margin-left:5px">+$${m.bonus}</span>` : '';
      html += `
        <div class="task-item ${m.done ? 'done' : ''}" style="${m.bonus > 0 ? 'border-left:3px solid #0f0' : ''}">
          <input type="checkbox" class="task-check" ${m.done ? 'checked' : ''}
            onchange="toggleManualTask('${m.id}', this.checked)">
          <span class="task-name">${m.name}${bonusLabel}</span>
          <button class="btn btn-sm" onclick="delManualTask('${m.id}')" style="margin-left:auto">×</button>
        </div>
      `;
    }
  }

  // Add task button + Add bonus task button
  const isAdmin = user.role === 'admin';
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

  document.getElementById('taskList').innerHTML = html;

  // Return completed bonus for earnings calculation
  return completedBonus;
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
  const bonus = parseFloat(document.getElementById('newTaskBonus')?.value) || 0;
  if (!name) return toast('Enter task name', 'error');

  await DB.add('manual_tasks', {
    userId: user.id,
    date: curDate,
    name: name,
    bonus: bonus,
    done: false,
    createdAt: new Date()
  });

  hideAddTask();
  await syncBonusAndPayrollForUser(curDate);
  loadDayDetail();
  loadPayroll();
}

async function toggleManualTask(id, done) {
  await DB.update('manual_tasks', id, { done });
  await syncBonusAndPayrollForUser(curDate);
  loadDayDetail();
  loadPayroll();
}

async function delManualTask(id) {
  if (await confirmDialog('Delete this task?')) {
    await DB.delete('manual_tasks', id);
    await syncBonusAndPayrollForUser(curDate);
    loadDayDetail();
    loadPayroll();
  }
}

async function toggleTask(taskId, done) {
  const existing = await DB.getAll('daily_tasks', [
    { field: 'userId', value: user.id },
    { field: 'date', value: curDate },
    { field: 'taskId', value: taskId }
  ]);

  if (existing.length > 0) {
    await DB.update('daily_tasks', existing[0].id, { done });
  } else {
    await DB.add('daily_tasks', { userId: user.id, date: curDate, taskId, done });
  }
  loadDayDetail();
}

let guideCache = {};
async function showGuide(event, taskId) {
  if (!guideCache[taskId]) {
    const preset = await DB.get('task_presets', taskId);
    guideCache[taskId] = preset;
  }
  const p = guideCache[taskId];
  if (!p) return;

  const tip = document.getElementById('taskGuide');
  document.getElementById('guideTitle').textContent = p.name;
  document.getElementById('guideText').textContent = p.guide || 'No guide available';

  // Images from imgur
  let imgHtml = '';
  if (p.images) {
    const imgs = p.images.split(',').map(s => s.trim()).filter(s => s);
    imgs.forEach(url => {
      imgHtml += `<img src="${url}" onclick="window.open('${url}','_blank')" title="Click to view full size">`;
    });
  }
  document.getElementById('guideImages').innerHTML = imgHtml;

  // Video from loom or vimeo
  let vidHtml = '';
  if (p.video) {
    if (p.video.includes('loom.com')) {
      const loomId = p.video.split('/').pop().split('?')[0];
      vidHtml = `<iframe src="https://www.loom.com/embed/${loomId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (p.video.includes('vimeo.com')) {
      const vimeoId = p.video.split('/').pop().split('?')[0];
      vidHtml = `<iframe src="https://player.vimeo.com/video/${vimeoId}" frameborder="0" allowfullscreen></iframe>`;
    }
  }
  document.getElementById('guideVideo').innerHTML = vidHtml;

  // Position tooltip
  const rect = event.target.getBoundingClientRect();
  const x = Math.min(rect.right + 10, window.innerWidth - 470);
  const y = Math.max(10, Math.min(rect.top, window.innerHeight - 400));

  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
  tip.classList.add('show');
}

function hideGuide() {
  document.getElementById('taskGuide').classList.remove('show');
}

// --- PAYROLL ---
async function loadPayroll() {
  await loadWallets();

  // Get payroll items
  const payrolls = await DB.getPayroll(user.id);
  const pendingPayrolls = payrolls.filter(p => p.status === 'pending').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const paidPayrolls = payrolls.filter(p => p.status === 'paid').sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));

  const pendingAmount = pendingPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = paidPayrolls.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Update totals
  document.getElementById('pendingTotal').textContent = '$' + pendingAmount.toFixed(2);
  document.getElementById('paidTotal').textContent = '$' + paidAmount.toFixed(2) + ' paid';

  // Check if admin (for marking as paid)
  const isAdmin = user.role === 'admin';

  // Pending payments
  let pendHtml = '';
  pendingPayrolls.forEach(p => {
    const rateSetting = CONFIG.hourlyRate;
    pendHtml += `<div class="payroll-item">
      <div style="flex:1">
        <div class="payroll-amount">$${(p.amount || 0).toFixed(2)}</div>
        <div class="payroll-info">${p.date || 'Unknown date'} • ${p.hours || 0}h${p.bonus > 0 ? ' + $' + p.bonus + ' bonus' : ''}</div>
      </div>
      ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="markAsPaid('${p.id}')">Mark Paid</button>` : '<span class="payroll-status pending">Pending</span>'}
    </div>`;
  });
  document.getElementById('payrollPending').innerHTML = pendHtml || '<div class="empty-state">No pending payments</div>';

  // Payment history
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
}

// Mark payment as paid (admin only)
async function markAsPaid(payrollId) {
  if (!await confirmDialog('Mark this payment as paid?')) return;

  await DB.update('payroll', payrollId, {
    status: 'paid',
    paidAt: new Date()
  });

  loadPayroll();
}

// --- WALLETS ---
async function loadWallets() {
  const wallets = await DB.getWallets(user.id);
  let html = '';
  wallets.forEach(w => {
    html += `<div class="list-item">
      <div style="flex:1">
        <div><strong>${w.type}</strong>${w.label ? ` - ${w.label}` : ''}</div>
        <div style="font-size:10px;color:#999;word-break:break-all">${w.address}</div>
      </div>
      <button class="btn btn-sm" onclick="delWallet('${w.id}')">Delete</button>
    </div>`;
  });
  document.getElementById('walletList').innerHTML = html || '<div class="empty">No wallets added - add your crypto wallet to receive payments</div>';
}

async function delWallet(id) {
  if (await confirmDialog('Delete this wallet?')) {
    await DB.delete('wallets', id);
    loadWallets();
  }
}

// --- CALENDAR ---
function chgMonth(d) {
  calendarDate.setMonth(calendarDate.getMonth() + d);
  loadCalendar();
}

async function loadCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;

  // Get all work days for this month
  const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month+1).padStart(2,'0')}-31`;

  const allWorkDays = await DB.getAll('work_days', [{ field: 'userId', value: user.id }]);
  const monthDays = allWorkDays.filter(d => d.date >= startDate && d.date <= endDate);

  // Get presets for task counting
  const presets = await DB.getTaskPresets();

  // Calculate month stats
  const rateSetting = await DB.getSetting('hourly_rate');
  const rate = rateSetting?.value || CONFIG.hourlyRate;

  // Fetch manual_tasks for bonus calculation
  const allManualTasks = await DB.getAll('manual_tasks', [{ field: 'userId', value: user.id }]);
  const monthBonusMap = {};
  allManualTasks.filter(t => t.done && t.bonus > 0 && t.date >= startDate && t.date <= endDate).forEach(t => {
    monthBonusMap[t.date] = (monthBonusMap[t.date] || 0) + (t.bonus || 0);
  });

  let totalHours = 0;
  let totalBonus = 0;
  let completedDays = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  for (const day of monthDays) {
    if (day.status === 'completed') {
      completedDays++;
      totalHours += day.hours || 0;
      totalBonus += monthBonusMap[day.date] || day.bonus || 0;

      // Count tasks
      const tasks = await DB.getDailyTasks(user.id, day.date);
      totalTasks += presets.length;
      completedTasks += tasks.filter(t => t.done).length;
    }
  }

  const totalEarned = (totalHours * rate) + totalBonus;
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  document.getElementById('monthHours').textContent = totalHours + 'h';
  document.getElementById('monthEarned').textContent = '$' + totalEarned.toFixed(2);
  document.getElementById('monthDays').textContent = completedDays;
  document.getElementById('monthTasks').textContent = taskRate + '%';

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  let html = '';

  // Empty cells for days before first of month
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const dayData = monthDays.find(x => x.date === dateStr);
    const isSelected = dateStr === curDate;

    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';

    // Status-based styling
    if (dayData?.status === 'completed') {
      classes += ' cal-completed';
    } else if (dayData?.status === 'dayoff') {
      classes += ' cal-dayoff';
    } else if (dayData?.status === 'planned') {
      classes += ' cal-planned';
    }

    // Day content
    let dayContent = `<div class="day-num">${d}</div>`;
    if (dayData?.hours > 0) {
      dayContent += `<div class="day-hours">${dayData.hours}h</div>`;
    }
    if (dayData?.status === 'dayoff') {
      dayContent += `<div class="day-status">🏖️</div>`;
    } else if (dayData?.status === 'completed') {
      dayContent += `<div class="day-status">✓</div>`;
    }

    html += `<div class="${classes}" onclick="selectDate('${dateStr}')">
      ${dayContent}
    </div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;

  // Work history table
  let histHtml = '';
  const sortedDays = monthDays.sort((a, b) => b.date.localeCompare(a.date));

  if (sortedDays.length === 0) {
    histHtml = '<div class="empty-state">No work days this month. Click "Plan Next 7 Days" to start.</div>';
  } else {
    histHtml = '<table class="table"><thead><tr><th>Date</th><th>Status</th><th>Hours</th><th>Earned</th></tr></thead><tbody>';

    for (const day of sortedDays) {
      const dayBonus = monthBonusMap[day.date] || day.bonus || 0;
      const earned = day.status === 'completed' ? ((day.hours || 0) * rate) + dayBonus : 0;
      const statusBadge = day.status === 'completed' ? '<span class="status status-healthy">Done</span>' :
                          day.status === 'dayoff' ? '<span class="status" style="background:#f55">Off</span>' :
                          '<span class="status status-pending">Planned</span>';

      histHtml += `<tr onclick="selectDate('${day.date}')" style="cursor:pointer">
        <td>${day.date}</td>
        <td>${statusBadge}</td>
        <td>${day.hours || '-'}</td>
        <td>${earned > 0 ? '$' + earned.toFixed(2) : '-'}</td>
      </tr>`;
    }

    histHtml += '</tbody></table>';
  }
  document.getElementById('dailyHistory').innerHTML = histHtml;
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
// AI CHAT SECTION
// ============================================
let chatMessages = [];
let aiContextCache = null;
let chatUnsubscribe = null; // For real-time listener cleanup

async function loadAI() {
  console.log('🔄 Loading AI Chat for user:', user.id);

  // Clean up previous listener if exists
  if (chatUnsubscribe) {
    console.log('🧹 Cleaning up previous listener');
    chatUnsubscribe();
    chatUnsubscribe = null;
  }

  try {
    // Load initial chat history - ALL messages for user, not just today
    // Order by timestamp ascending, limit to last 200 messages to prevent overload
    console.log('📡 Fetching chat history from Firestore...');
    const chatHistory = await DB.getAll('ai_chat_history', [
      { field: 'userId', value: user.id }
    ], 'timestamp', 'asc', 200);

    console.log(`✅ Loaded ${chatHistory.length} messages from history`);
    chatMessages = chatHistory;
    displayChatMessages();

    // Setup real-time listener for new messages across all devices
    console.log('👂 Setting up real-time listener...');
    chatUnsubscribe = DB.db.collection('ai_chat_history')
      .where('userId', '==', user.id)
      .orderBy('timestamp', 'asc')
      .limitToLast(200)
      .onSnapshot(snapshot => {
        console.log(`🔔 Real-time update: ${snapshot.docs.length} messages`);
        // Update chat messages with real-time data
        chatMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        displayChatMessages();
      }, error => {
        console.error('❌ Real-time listener error:', error);
      });

    console.log('✅ Real-time listener active');

  } catch (error) {
    console.error('❌ Error loading AI chat:', error);
    chatMessages = [];
    displayChatMessages();
  }

  // Load KB list
  loadKnowledgeBase();
}

// Force reload chat messages
async function reloadAIChat() {
  console.log('🔄 Manual reload triggered');
  await loadAI();
}

function displayChatMessages() {
  const messagesDiv = document.getElementById('chatMsgs');
  if (!messagesDiv) {
    console.error('❌ chatMsgs element not found!');
    return;
  }

  console.log(`🎨 Displaying ${chatMessages.length} messages`);

  let html = `<div class="chat-msg ai">
    <div class="chat-msg-bubble">Hi! I'm your AI Expert Assistant. Ask me anything!</div>
  </div>`;

  if (chatMessages.length === 0) {
    html += `<div class="chat-msg ai">
      <div class="chat-msg-bubble" style="color:#999;font-style:italic">No previous messages. Start chatting!</div>
    </div>`;
  }

  chatMessages.forEach((m, index) => {
    if (m.isTyping) {
      // Show typing indicator
      html += `<div class="chat-msg ai">
        <div class="chat-msg-bubble"><span class="typing">Thinking...</span></div>
      </div>`;
    } else {
      // Format timestamp
      let timeStr = '';
      if (m.timestamp) {
        const msgDate = new Date(m.timestamp);
        const now = new Date();
        const isToday = msgDate.toDateString() === now.toDateString();
        const isYesterday = new Date(now - 86400000).toDateString() === msgDate.toDateString();

        if (isToday) {
          timeStr = msgDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        } else if (isYesterday) {
          timeStr = 'Včera ' + msgDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        } else {
          timeStr = msgDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) + ' ' +
                    msgDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }
      }

      const imageHtml = m.hadImage
        ? `<div style="background:#1a1a00;border:1px solid #ff0;padding:8px;border-radius:4px;margin-bottom:8px;font-size:11px">📷 Image was sent (not stored)</div>`
        : '';
      const wasUncertainBadge = m.wasUncertain
        ? '<div style="font-size:9px;color:#ff0;margin-top:8px">⚠️ Sent to boss for review</div>'
        : '';
      const timestampHtml = timeStr
        ? `<div style="font-size:9px;color:#666;margin-top:4px">${timeStr}</div>`
        : '';
      const errorStyle = m.isError ? ' style="color:#f55"' : '';
      html += `<div class="chat-msg ${m.role === 'ai' ? 'ai' : 'user'}">
        <div class="chat-msg-bubble"${errorStyle}>${imageHtml}${escapeHtml(m.content)}${wasUncertainBadge}${timestampHtml}</div>
      </div>`;
    }
  });

  messagesDiv.innerHTML = html;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Update message counter
  const counterEl = document.getElementById('chatCount');
  if (counterEl) {
    counterEl.textContent = chatMessages.length > 0 ? `(${chatMessages.length})` : '';
  }

  console.log('✅ Messages displayed, scrolled to bottom');
}

// Toggle KB form type
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
    if (!keywords || !content) return toast('Please fill in both fields', 'error');
    data.keywords = keywords.toLowerCase();
    data.content = content;
    if (examples) data.examples = examples;
  } else if (type === 'file') {
    const title = document.getElementById('kbFileTitle').value.trim();
    const content = document.getElementById('kbFileContent').value.trim();
    const examples = document.getElementById('kbFileExamples').value.trim();
    if (!title || !content) return toast('Please fill in both fields', 'error');
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
  loadKnowledgeBase();
}

// Search knowledge base for relevant entries
async function searchKnowledge(query) {
  const allKnowledge = await DB.getKnowledge();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Score each knowledge entry by keyword matches
  const scored = allKnowledge.map(k => {
    const text = ((k.keywords || k.question || '') + ' ' + (k.content || k.answer || '')).toLowerCase();
    let score = 0;

    queryWords.forEach(word => {
      if (text.includes(word)) score += 1;
      // Bonus for exact keyword match
      if ((k.keywords || k.question || '').toLowerCase().includes(word)) score += 2;
    });

    return { ...k, score };
  });

  // Return top matches (score > 0), max 10 entries
  return scored
    .filter(k => k.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// Save chat Q&A to Database (training from chat)
async function saveToKB(question, answer) {
  const q = decodeURIComponent(question);
  const a = decodeURIComponent(answer);

  // Extract keywords from the question
  const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5).join(' ');

  await DB.add('knowledge_base', {
    type: 'text',
    keywords: keywords || q.substring(0, 50).toLowerCase(),
    content: `Q: ${q}\nA: ${a}`,
    source: 'chat',
    createdAt: new Date()
  });

  toast('Saved to database!', 'success');
  loadKnowledgeBase();
}

// Delete knowledge entry
async function delKB(id) {
  if (await confirmDialog('Delete this entry?')) {
    await DB.delete('knowledge_base', id);
    aiContextCache = null;
    loadKnowledgeBase();
  }
}

async function loadKnowledgeBase() {
  const kb = await DB.getKnowledge();

  let html = '';
  if (kb.length === 0) {
    html = '<div class="empty-state">No entries in database. Add information for AI to use.</div>';
  } else {
    kb.forEach(k => {
      const typeIcon = k.type === 'file' ? '📄' : '📝';
      const title = k.keywords || k.question || k.title || 'Entry';
      const content = k.content || k.answer || '';

      html += `<div class="kb-item">
        <div class="kb-question">
          <span style="margin-right:5px">${typeIcon}</span>
          ${title}
        </div>
        <div class="kb-answer">${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</div>
        <div style="margin-top:8px">
          <button class="btn btn-sm" onclick="delKB('${k.id}')">Delete</button>
        </div>
      </div>`;
    });
  }

  document.getElementById('kbList').innerHTML = html;
}

function clearChat() {
  chatMessages = [];
  document.getElementById('chatMsgs').innerHTML = `<div class="chat-msg ai">
    <div class="chat-msg-bubble">
      Hi! I'm your AI Expert Assistant. I know everything about your work - outreach, models, content, posting schedules, and more. Ask me anything!
    </div>
  </div>`;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// Build AI context with smart retrieval based on user query
async function buildAIContext(userQuery) {
  let context = `You are the AI EXPERT ASSISTANT for TEAM. You help boss Mori and assistant "${user.id}".

YOUR CAPABILITIES:
- You have access to a knowledge database that gets searched for each question
- You remember our conversation history
- You learn from information added to the database

RULES:
- Answer based on the RELEVANT KNOWLEDGE below - this is your database
- If no relevant knowledge found, say "I don't have information about that in my database yet"
- Be helpful, professional, concise
- Never make up specific info (dates, numbers, names) not in your database

`;

  // SMART RETRIEVAL: Search for relevant knowledge based on user query
  const relevantKnowledge = await searchKnowledge(userQuery);
  if (relevantKnowledge.length > 0) {
    context += "=== RELEVANT KNOWLEDGE FROM DATABASE ===\n";
    relevantKnowledge.forEach(k => {
      const title = k.keywords || k.question || k.title || 'Info';
      const content = k.content || k.answer || '';
      context += `[${title}]\n${content}\n`;
      // Include example Q&A if available - this teaches AI how to respond
      if (k.examples) {
        context += `\nEXAMPLE HOW TO ANSWER:\n${k.examples}\n`;
      }
      context += '\n';
    });
  } else {
    context += "=== NO MATCHING KNOWLEDGE FOUND ===\nNo entries in database match this query.\n\n";
  }

  // Always include core business info (lightweight)
  const models = await DB.getAll('models');
  if (models.length > 0) {
    context += "=== ACTIVE MODELS ===\n";
    models.forEach(m => {
      context += `- ${m.name} (${m.status})\n`;
    });
    context += "\n";
  }

  return context;
}

async function sendMsg() {
  const input = document.getElementById('chatIn');
  const msg = input.value.trim();
  if (!msg && !selectedImage) return;

  input.value = '';
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  let imageDataUrl = null;

  // Convert image to base64 data URL if selected
  if (selectedImage) {
    try {
      console.log('Processing image...', 'info');
      imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(selectedImage);
      });
      clearImagePreview();
    } catch (err) {
      console.error('Image processing error:', err);
      console.log('Failed to process image: ' + err.message, 'error');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      return;
    }
  }

  // Optimistically add user message to local chat for immediate feedback
  const chatMsgObj = {
    role: 'user',
    content: msg || 'What is in this image?',
    timestamp: Date.now()
  };
  if (imageDataUrl) {
    chatMsgObj.imageDataUrl = imageDataUrl; // Keep in memory for this conversation
    chatMsgObj.hadImage = true;
  }
  chatMessages.push(chatMsgObj);
  displayChatMessages(); // Update UI immediately

  // Save user message to database (real-time listener will sync across devices)
  const userMsgData = {
    userId: user.id,
    date: curDate,
    role: 'user',
    content: msg || 'What is in this image?',
    timestamp: chatMsgObj.timestamp
  };
  if (imageDataUrl) {
    userMsgData.hadImage = true; // Just mark that image was sent
  }
  await DB.add('ai_chat_history', userMsgData);

  // Show typing indicator
  chatMessages.push({ role: 'ai', content: '...', isTyping: true });
  displayChatMessages();

  try {
    // Build context with smart retrieval based on user's question
    const systemPrompt = await buildAIContext(msg);

    // Get ALL conversation messages for full memory (max 50 to avoid token limit)
    const recentMsgs = chatMessages.slice(-50);

    // Choose model based on whether image is present
    const model = imageDataUrl ? 'anthropic/claude-3.5-sonnet' : CONFIG.llm.model;

    // Build API messages with proper image format for OpenRouter
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMsgs.map(m => {
        if (m.role === 'ai') {
          return { role: 'assistant', content: m.content };
        } else {
          // User message - check if it has image data URL (only in current session memory)
          if (m.imageDataUrl) {
            return {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: m.imageDataUrl } },
                { type: 'text', text: m.content }
              ]
            };
          } else {
            return { role: 'user', content: m.content };
          }
        }
      })
    ];

    // Current message already included in recentMsgs mapping above
    // No need to add again

    const response = await fetch(CONFIG.llm.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.llm.apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'TEAM Assistant'
      },
      body: JSON.stringify({
        model: model,
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

    // Check if AI is uncertain
    const uncertainPhrases = [
      "i'm not sure", "i don't know", "not certain", "can't say for sure",
      "would need more information", "i'm not completely sure", "not 100% sure",
      "i cannot confirm", "i don't have specific information", "unclear"
    ];
    const isUncertain = uncertainPhrases.some(p => aiReply.toLowerCase().includes(p));

    // Always send to Telegram
    sendTelegramNotification(
      `💬 ${isUncertain ? '⚠️ Uncertain' : 'Chat'} from ${user.id}\n\n` +
      `Q: ${msg}\n\n` +
      `AI: ${aiReply.substring(0, 500)}${aiReply.length > 500 ? '...' : ''}`
    );

    if (isUncertain) {
      // Log uncertain question
      await DB.add('uncertain_questions', {
        question: msg,
        aiResponse: aiReply,
        userId: user.id,
        answered: false,
        timestamp: Date.now()
      });
    }

    // Remove typing indicator from local chat
    chatMessages = chatMessages.filter(m => !m.isTyping);

    // Optimistically add AI response to local chat for immediate feedback
    const aiTimestamp = Date.now();
    chatMessages.push({
      role: 'ai',
      content: aiReply,
      timestamp: aiTimestamp,
      wasUncertain: isUncertain
    });
    displayChatMessages(); // Update UI immediately

    // Save AI response to database (real-time listener will sync across devices)
    await DB.add('ai_chat_history', {
      userId: user.id,
      date: curDate,
      role: 'ai',
      content: aiReply,
      timestamp: aiTimestamp,
      wasUncertain: isUncertain
    });

  } catch (err) {
    console.error('AI Error:', err);
    // Remove typing indicator and show error
    chatMessages = chatMessages.filter(m => !m.isTyping);
    chatMessages.push({
      role: 'ai',
      content: `Error: ${err.message || 'Could not get response. Please try again.'}`,
      timestamp: Date.now(),
      isError: true
    });
    displayChatMessages();
  }

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';
}

async function sendTelegramNotification(text) {
  try {
    await fetch(`https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.telegram.adminChatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Telegram error:', e);
  }
}

// Send daily AI report to Telegram (call once per day)
async function sendDailyAIReport() {
  const uncertain = await DB.getAll('uncertain_questions', [
    { field: 'userId', value: user.id },
    { field: 'answered', value: false }
  ]);

  if (uncertain.length === 0) return;

  let report = `📊 AI Report for ${user.id}\n`;
  report += `Uncertain questions: ${uncertain.length}\n\n`;
  report += `⚠️ Questions to review:\n`;
  uncertain.forEach((u, i) => {
    report += `${i+1}. ${u.question.substring(0, 100)}\n`;
  });

  sendTelegramNotification(report);
}

// ============================================
// OUTREACH SECTION
// ============================================
async function loadOutreach() {
  await loadOutreachAccounts();
  await loadOutseeker();
  await loadOpeners();
  await loadFollowups();
  await loadScripts();
  await loadWarmupGuides();
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
  const ig = await DB.getAccounts('instagram', user.id);
  const tw = await DB.getAccounts('twitter', user.id);
  const wc = await DB.getAccounts('webcam', user.id);

  document.getElementById('igList').innerHTML = renderOutreachAccounts(ig);
  document.getElementById('twList').innerHTML = renderOutreachAccounts(tw);
  document.getElementById('wcList').innerHTML = renderWebcamAccounts(wc);
}

function renderOutreachAccounts(accs) {
  if (!accs.length) return '<div class="empty">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">@${a.username}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Healthy' : 'Expired'}</span>
      </div>
      <div class="acc-card-body">
        <div>Location: ${a.location || '-'}</div>
        <div>Proxy: ${a.proxyStatus || '-'} ${a.proxyType || ''}</div>
        ${a.proxyDetails ? `<div>Proxy Details: ${a.proxyDetails}</div>` : ''}
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delOutreachAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

function renderWebcamAccounts(accs) {
  if (!accs.length) return '<div class="empty">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">${a.username}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="acc-card-body">
        <div>Site: ${a.site || '-'}</div>
        <div>Location: ${a.location || '-'}</div>
        ${a.outreachMethod ? `<div style="margin-top:5px;padding:5px;background:#111;border:1px solid #333">
          <strong>Outreach Method:</strong><br>${a.outreachMethod}
        </div>` : ''}
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delOutreachAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

async function delOutreachAcc(id) {
  if (await confirmDialog('Delete this account?')) {
    await DB.delete('accounts', id);
    loadOutreachAccounts();
  }
}

async function editOutreachAcc(id) {
  const acc = await DB.get('accounts', id);
  modal('outreach-acc-edit', acc);
}

// --- OUTSEEKER ---
async function loadOutseeker() {
  const logs = await DB.getOutseekerLogs(user.id);
  const today = logs.find(l => l.date === curDate);

  document.getElementById('osActive').textContent = today?.activeAccounts || 0;
  document.getElementById('osUSA').textContent = today?.usaRunning || 0;
  document.getElementById('osESP').textContent = today?.espRunning || 0;

  let html = '';
  logs.forEach(l => {
    html += `<div class="list-item">
      <span>${l.date}</span>
      <span>Active: ${l.activeAccounts} | USA: ${l.usaRunning} | ESP: ${l.espRunning} | Outreached: ${l.outreached || 0}</span>
    </div>`;
  });
  document.getElementById('osLog').innerHTML = html || '<div class="empty">No logs</div>';
}

// --- SCRIPTS ---
async function loadOpeners() {
  const filter = document.getElementById('openerFilter')?.value || '';
  let scripts = await DB.getScripts('opener');
  if (filter) scripts = scripts.filter(s => s.platform === filter);

  let html = '';
  scripts.forEach(s => {
    html += `<div class="script-box ${s.active ? 'selected' : ''}" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span class="status status-${s.platform === 'instagram' ? 'healthy' : s.platform === 'twitter' ? 'pending' : 'live'}">${s.platform}</span>
        <span>${s.active ? '(Active)' : ''}</span>
      </div>
      ${s.text}
      <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
    </div>`;
  });
  document.getElementById('openerList').innerHTML = html || '<div class="empty">No openers</div>';
}

async function loadFollowups() {
  const filter = document.getElementById('followupFilter')?.value || '';
  let scripts = await DB.getScripts('followup');
  if (filter) scripts = scripts.filter(s => s.platform === filter);

  let html = '';
  scripts.forEach(s => {
    html += `<div class="script-box ${s.active ? 'selected' : ''}" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span class="status status-${s.platform === 'instagram' ? 'healthy' : s.platform === 'twitter' ? 'pending' : 'live'}">${s.platform}</span>
        <span>${s.active ? '(Active)' : ''}</span>
      </div>
      ${s.text}
      <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
    </div>`;
  });
  document.getElementById('followupList').innerHTML = html || '<div class="empty">No follow-ups</div>';
}

async function loadScripts() {
  const scripts = await DB.getScripts('script');

  let html = '';
  scripts.forEach(s => {
    html += `<div class="script-box" onclick="copyToClipboard('${encodeURIComponent(s.text)}')">
      <div style="margin-bottom:5px"><strong>${s.title || 'Script'}</strong></div>
      ${s.text}
      <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
    </div>`;
  });
  document.getElementById('scriptList').innerHTML = html || '<div class="empty">No scripts</div>';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(decodeURIComponent(text));
  toast('Copied to clipboard!', 'success');
}

// ============================================
// MODELS SECTION
// ============================================
async function loadModels() {
  const pot = await DB.getModels('potential');
  const act = await DB.getModels('active');
  const mkt = await DB.getModels('market');

  document.getElementById('potList').innerHTML = renderModels(pot) || '<div class="empty">No potential models</div>';
  document.getElementById('actList').innerHTML = renderModels(act) || '<div class="empty">No active models</div>';
  document.getElementById('mktList').innerHTML = renderMarketModels(mkt) || '<div class="empty">No market models</div>';
}

function renderMarketModels(models) {
  if (!models.length) return '';
  const today = new Date().toISOString().split('T')[0];
  const statusColors = { available: '#0f0', in_talks: '#ff0', contract_sent: '#0af', sold: '#e91e63', on_hold: '#999' };
  const statusLabels = { available: 'Available', in_talks: 'In Talks', contract_sent: 'Contract Sent', sold: 'Sold', on_hold: 'On Hold' };
  const contactLabels = { yes: 'In Contact', occasional: 'Occasional', no: 'No Contact', lost: 'Lost Contact' };
  const contactColors = { yes: '#0f0', occasional: '#ff0', no: '#f00', lost: '#f00' };

  return models.map(m => {
    const lastComm = m.lastCommunication ? new Date(m.lastCommunication).toISOString().split('T')[0] : null;
    const daysSince = lastComm ? Math.floor((new Date(today) - new Date(lastComm)) / (1000*60*60*24)) : null;
    const needsContact = daysSince === null || daysSince > 0;
    const reports = m.marketReports || [];
    const recentReports = reports.slice(-2).reverse();
    const ms = m.marketStatus || 'available';
    const ac = m.assistantInContact || 'no';

    return `<div class="model-card" style="cursor:default;padding:12px;border-color:${statusColors[ms] || '#333'}">
      <div class="model-card-img" style="cursor:pointer" onclick="viewMarketModelReports('${m.id}')">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#222;color:#666">No Photo</div>'}
      </div>
      <div class="model-card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
          <div>
            <div class="model-card-name">${m.name}</div>
            <div style="font-size:11px;color:#999">${m.country || '-'}, ${m.age || '-'}y</div>
          </div>
          <span style="background:${statusColors[ms]};color:#000;padding:2px 8px;border-radius:2px;font-size:9px;font-weight:bold">${statusLabels[ms]}</span>
        </div>

        ${m.marketPrice ? `<div style="font-size:13px;color:#ff0;font-weight:bold;margin-bottom:4px">$${m.marketPrice}</div>` : ''}

        <div style="margin:6px 0;padding:6px;background:#0a0a0a;border:1px solid #333;border-radius:3px;font-size:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:#666">Last contact:</span>
            <span style="color:${needsContact ? '#f00' : '#0f0'}">${needsContact ? (daysSince === null ? 'Never' : daysSince + 'd ago') : 'Today ✓'}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#666">Assistant:</span>
            <span style="color:${contactColors[ac]}">${contactLabels[ac]}</span>
          </div>
        </div>

        ${m.telegramAdLink ? `<a href="${m.telegramAdLink}" target="_blank" style="display:block;font-size:10px;color:#0af;margin:4px 0;text-decoration:none">📢 TG Channel Ad</a>` : ''}
        ${m.bossGroupLink ? `<a href="${m.bossGroupLink}" target="_blank" style="display:block;font-size:10px;color:#0af;margin:4px 0;text-decoration:none">👔 Boss TG Group</a>` : ''}

        ${recentReports.length > 0 ? `
        <div style="margin:6px 0;padding:6px;background:#0a0a0a;border:1px solid #222;border-radius:3px">
          <div style="font-size:9px;color:#e91e63;margin-bottom:4px;font-weight:bold">Reports (${reports.length}):</div>
          ${recentReports.map(r => `<div style="margin:3px 0;padding:3px;border-left:2px solid #e91e63;padding-left:6px">
            <div style="font-size:9px;color:#666">${new Date(r.date).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</div>
            <div style="font-size:10px;color:#ccc">${r.text.substring(0, 80)}${r.text.length > 80 ? '...' : ''}</div>
          </div>`).join('')}
        </div>` : '<div style="font-size:10px;color:#666;margin:6px 0;font-style:italic">No reports yet</div>'}

        <div style="display:flex;gap:4px;margin-top:8px">
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="logMarketContact('${m.id}')">Log Contact</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px;border-color:#e91e63;color:#e91e63" onclick="addMarketReport('${m.id}')">+ Report</button>
        </div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="modal('marketModel',${JSON.stringify(m).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn btn-sm" style="flex:1;font-size:10px;padding:4px" onclick="viewMarketModelReports('${m.id}')">All Reports</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderModels(models) {
  if (!models.length) return '';
  let html = '';
  models.forEach(m => {
    html += `<div class="model-card" onclick="viewModel('${m.id}')">
      <div class="model-card-img">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : 'No Photo'}
      </div>
      <div class="model-card-body">
        <div class="model-card-name">${m.name}</div>
        <div class="model-card-info">
          <div>${m.country || '-'}, ${m.age || '-'}y</div>
          <div>${m.contactLocation || '-'}</div>
          <span class="status status-${m.status}">${m.status}</span>
        </div>
      </div>
    </div>`;
  });
  return html;
}

async function viewModel(id) {
  modal('model-view', id);
}

// ============================================
// CONTENT SECTION
// ============================================
async function loadContent() {
  const pending = await DB.getContent('pending');
  const approved = await DB.getContent('approved');
  const rejected = await DB.getContent('rejected');

  document.getElementById('contentPending').innerHTML = renderContent(pending) || '<div class="empty">No pending content</div>';
  document.getElementById('contentApproved').innerHTML = renderContent(approved) || '<div class="empty">No approved content</div>';
  document.getElementById('contentRejected').innerHTML = renderContent(rejected) || '<div class="empty">No rejected content</div>';
}

function renderContent(items) {
  if (!items.length) return '';
  let html = '';
  items.forEach(c => {
    html += `<div class="content-card">
      <div class="content-card-media">
        ${c.mediaUrl ? (c.mediaType === 'video' ?
          `<video src="${c.mediaUrl}" controls></video>` :
          `<img src="${c.mediaUrl}">`) :
          '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333">No media</div>'}
      </div>
      <div class="content-card-body">
        <div style="font-weight:bold;margin-bottom:5px">${c.accountName || 'Unknown Account'}</div>
        <div style="font-size:10px;color:#999">${c.description || ''}</div>
        <span class="status status-${c.status}" style="margin-top:5px">${c.status}</span>
        ${c.rejectNote ? `<div style="margin-top:5px;padding:5px;background:#300;border:1px solid #f00;font-size:10px">${c.rejectNote}</div>` : ''}
      </div>
    </div>`;
  });
  return html;
}

// ============================================
// POSTING SECTION
// ============================================
async function loadPosting() {
  const accounts = await DB.getAll('posting_accounts');
  let html = '';
  accounts.forEach(a => {
    html += `<div class="card">
      <div class="card-title">${a.platform} - @${a.username}</div>
      <div class="card-text">${a.description || 'No description'}</div>
      ${a.contentStyle ? `<div class="card-text"><strong>Style:</strong> ${a.contentStyle}</div>` : ''}
      ${a.prompts ? `<div class="card-text"><strong>Prompts:</strong> ${a.prompts}</div>` : ''}
      ${a.examples ? `<div class="card-text"><strong>Examples:</strong> <a href="${a.examples}" target="_blank">${a.examples}</a></div>` : ''}
    </div>`;
  });
  document.getElementById('postList').innerHTML = html || '<div class="empty">No posting accounts</div>';
}

// ============================================
// VOICE SECTION
// ============================================
async function loadVoice() {
  // Load voices from settings
  const voicesSetting = await DB.getSetting('elevenlabs_voices');
  const voices = voicesSetting?.voices || [{ id: CONFIG.elevenlabs.defaultVoice, name: 'Default Voice' }];

  let html = '';
  voices.forEach(v => {
    html += `<option value="${v.id}">${v.name}</option>`;
  });
  document.getElementById('voiceSelect').innerHTML = html;

  // Load saved voice notes
  const notes = await DB.getVoiceNotes(user.id);
  let notesHtml = '';
  notes.forEach(n => {
    notesHtml += `<div class="voice-item">
      <span style="flex:1">${n.name || n.text?.substring(0,30) || 'Voice note'}</span>
      <audio controls src="${n.url}"></audio>
      <a href="${n.url}" download class="btn btn-sm">Download</a>
      <button class="btn btn-sm" onclick="delVoice('${n.id}')">Delete</button>
    </div>`;
  });
  document.getElementById('voiceList').innerHTML = notesHtml || '<div class="empty">No saved voice notes</div>';
}

async function genVoice() {
  const text = document.getElementById('voiceTxt').value.trim();
  if (!text) return toast('Please enter text', 'error');

  const voiceId = document.getElementById('voiceSelect').value;
  document.getElementById('voiceOut').innerHTML = '<div>Generating...</div>';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': CONFIG.elevenlabs.apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1'
      })
    });

    if (!response.ok) throw new Error('Generation failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    document.getElementById('voiceOut').innerHTML = `
      <audio controls src="${url}" style="width:100%"></audio>
      <div style="margin-top:10px">
        <input type="text" class="form-input" id="voiceName" placeholder="Name for this voice note" style="margin-bottom:5px">
        <button class="btn btn-primary" onclick="saveVoiceNote('${url}')">Save</button>
        <a href="${url}" download="voice.mp3" class="btn">Download</a>
      </div>
    `;
  } catch (err) {
    console.error('Voice error:', err);
    document.getElementById('voiceOut').innerHTML = '<div style="color:#f00">Error generating voice. Please try again.</div>';
  }
}

async function saveVoiceNote(url) {
  const name = document.getElementById('voiceName').value || 'Voice note';
  const text = document.getElementById('voiceTxt').value;

  await DB.add('voice_notes', {
    userId: user.id,
    name,
    text,
    url
  });

  document.getElementById('voiceTxt').value = '';
  document.getElementById('voiceOut').innerHTML = '<div style="color:#0f0">Saved!</div>';
  loadVoice();
}

async function delVoice(id) {
  if (await confirmDialog('Delete this voice note?')) {
    await DB.delete('voice_notes', id);
    loadVoice();
  }
}

// ============================================
// MODAL
// ============================================
function modal(type, data = null) {
  const m = document.getElementById('modal');
  const title = document.getElementById('mTitle');
  const body = document.getElementById('mBody');
  document.getElementById('mBox').className = 'modal-box';

  switch(type) {
    case 'payroll':
      title.textContent = 'Request Payment';
      loadPayrollModal(body);
      break;

    case 'wallet':
      title.textContent = 'Add Crypto Wallet';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Crypto Type:</label>
          <select class="form-select" id="walletType">
            <option>USDT (TRC20)</option>
            <option>USDT (ERC20)</option>
            <option>USDT (BEP20)</option>
            <option>Bitcoin (BTC)</option>
            <option>Ethereum (ETH)</option>
            <option>Litecoin (LTC)</option>
            <option>Solana (SOL)</option>
            <option>BNB (BEP20)</option>
            <option>XRP</option>
            <option>DOGE</option>
            <option>MATIC</option>
            <option>Other Crypto</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Wallet Address:</label>
          <input type="text" class="form-input" id="walletAddr" placeholder="Paste your wallet address here...">
        </div>
        <div class="form-group">
          <label class="form-label">Label (optional):</label>
          <input type="text" class="form-input" id="walletLabel" placeholder="e.g. Main wallet, Binance...">
        </div>
        <button class="btn btn-primary" onclick="saveWallet()">Add Wallet</button>
      `;
      break;

    case 'outreach-acc':
      title.textContent = `Add ${data.charAt(0).toUpperCase() + data.slice(1)} Account`;
      if (data === 'webcam') {
        body.innerHTML = `
          <div class="form-group">
            <label class="form-label">Username:</label>
            <input type="text" class="form-input" id="accUser">
          </div>
          <div class="form-group">
            <label class="form-label">Site:</label>
            <input type="text" class="form-input" id="accSite" placeholder="e.g. Chaturbate, StripChat">
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
            <label class="form-label">Status:</label>
            <select class="form-select" id="accHealthy">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="saveOutreachAcc('webcam')">Save</button>
        `;
      } else {
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
            <label class="form-label">Account Status:</label>
            <select class="form-select" id="accHealthy">
              <option value="true">Healthy</option>
              <option value="false">Expired/Banned</option>
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
          <div class="form-group">
            <label class="form-label">Proxy Type:</label>
            <select class="form-select" id="accProxyType">
              <option>HTTPS</option>
              <option>SOCKS5</option>
              <option>None</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Proxy Details:</label>
            <input type="text" class="form-input" id="accProxyDetails" placeholder="IP:Port:User:Pass">
          </div>
          <button class="btn btn-primary" onclick="saveOutreachAcc('${data}')">Save</button>
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
            <label class="form-label">Account Status:</label>
            <select class="form-select" id="accHealthy">
              <option value="true" ${data.healthy ? 'selected' : ''}>Healthy</option>
              <option value="false" ${!data.healthy ? 'selected' : ''}>Expired/Banned</option>
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
      title.textContent = 'Log Outseeker Data';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Active OF Accounts:</label>
          <input type="number" class="form-input" id="osAcc" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">USA Running:</label>
          <input type="number" class="form-input" id="osUSAIn" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">ESP Running:</label>
          <input type="number" class="form-input" id="osESPIn" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Accounts Outreached Today:</label>
          <input type="number" class="form-input" id="osOutreached" value="0">
        </div>
        <button class="btn btn-primary" onclick="saveOutseeker()">Save</button>
      `;
      break;

    case 'script':
      title.textContent = `Add ${data.charAt(0).toUpperCase() + data.slice(1)}`;
      body.innerHTML = `
        ${data !== 'script' ? `
        <div class="form-group">
          <label class="form-label">Platform:</label>
          <select class="form-select" id="scriptPlat">
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="webcam">Webcam</option>
          </select>
        </div>` : `
        <div class="form-group">
          <label class="form-label">Title:</label>
          <input type="text" class="form-input" id="scriptTitle">
        </div>`}
        <div class="form-group">
          <label class="form-label">Text:</label>
          <textarea class="form-textarea" id="scriptText" style="min-height:150px"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="scriptActive"> Set as active
          </label>
        </div>
        <button class="btn btn-primary" onclick="saveScript('${data}')">Save</button>
      `;
      break;

    case 'marketModel':
      const isEditMkt = data && data.id;
      title.textContent = isEditMkt ? `Edit ${data.name}` : 'Add Market Model';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        <input type="hidden" id="mktEditId" value="${isEditMkt ? data.id : ''}">
        <div style="margin-bottom:15px;padding-bottom:15px;border-bottom:2px solid #333">
          <h3 style="color:#e91e63;margin-bottom:10px">Basic Info</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Name *</label>
              <input type="text" class="form-input" id="mktName" value="${isEditMkt ? (data.name||'') : ''}" placeholder="Model name">
            </div>
            <div class="form-group">
              <label class="form-label">Photo URL</label>
              <input type="text" class="form-input" id="mktPhoto" value="${isEditMkt ? (data.photo||'') : ''}" placeholder="https://i.imgur.com/...">
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
        </div>
        <div style="margin-bottom:15px;padding-bottom:15px;border-bottom:2px solid #333">
          <h3 style="color:#e91e63;margin-bottom:10px">Contact & Links</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Her Contact (TG/WA/phone)</label>
              <input type="text" class="form-input" id="mktContact" value="${isEditMkt ? (data.contactInfo||'') : ''}" placeholder="@telegram or +phone">
            </div>
            <div class="form-group">
              <label class="form-label">Boss TG Group Link</label>
              <input type="text" class="form-input" id="mktBossGroup" value="${isEditMkt ? (data.bossGroupLink||'') : ''}" placeholder="https://t.me/+...">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Telegram Channel Ad Link</label>
            <input type="text" class="form-input" id="mktAdLink" value="${isEditMkt ? (data.telegramAdLink||'') : ''}" placeholder="https://t.me/channel/123">
          </div>
        </div>
        <div style="margin-bottom:15px">
          <h3 style="color:#e91e63;margin-bottom:10px">Details</h3>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="mktNotes" style="min-height:100px" placeholder="Experience, what she offers, languages...">${isEditMkt ? (data.marketNotes||'') : ''}</textarea>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label class="form-label">Market Status</label>
              <select class="form-select" id="mktStatus">
                <option value="available" ${isEditMkt && data.marketStatus==='available' ? 'selected' : ''}>Available</option>
                <option value="in_talks" ${isEditMkt && data.marketStatus==='in_talks' ? 'selected' : ''}>In Talks</option>
                <option value="contract_sent" ${isEditMkt && data.marketStatus==='contract_sent' ? 'selected' : ''}>Contract Sent</option>
                <option value="sold" ${isEditMkt && data.marketStatus==='sold' ? 'selected' : ''}>Sold</option>
                <option value="on_hold" ${isEditMkt && data.marketStatus==='on_hold' ? 'selected' : ''}>On Hold</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assistant in Contact?</label>
              <select class="form-select" id="mktInContact">
                <option value="yes" ${isEditMkt && data.assistantInContact==='yes' ? 'selected' : ''}>Yes - Regular</option>
                <option value="occasional" ${isEditMkt && data.assistantInContact==='occasional' ? 'selected' : ''}>Occasional</option>
                <option value="no" ${!isEditMkt || !data.assistantInContact || data.assistantInContact==='no' ? 'selected' : ''}>No Contact Yet</option>
                <option value="lost" ${isEditMkt && data.assistantInContact==='lost' ? 'selected' : ''}>Lost Contact</option>
              </select>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveMarketModel()">${isEditMkt ? 'Update' : 'Save'} Market Model</button>
      `;
      break;

    case 'model':
      title.textContent = 'Add New Model';
      document.getElementById('mBox').className = 'modal-box large';
      body.innerHTML = `
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Name:</label>
            <input type="text" class="form-input" id="modName">
          </div>
          <div class="form-group">
            <label class="form-label">Photo URL (imgur):</label>
            <input type="text" class="form-input" id="modPhoto" placeholder="https://i.imgur.com/...">
          </div>
          <div class="form-group">
            <label class="form-label">Country:</label>
            <input type="text" class="form-input" id="modCountry">
          </div>
          <div class="form-group">
            <label class="form-label">Age:</label>
            <input type="number" class="form-input" id="modAge">
          </div>
          <div class="form-group">
            <label class="form-label">Adult Industry Experience:</label>
            <select class="form-select" id="modExp">
              <option>None</option>
              <option>Some</option>
              <option>Experienced</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Preference:</label>
            <select class="form-select" id="modPayment">
              <option>Percentage</option>
              <option>Salary</option>
              <option>Both</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Work/Study Status:</label>
            <input type="text" class="form-input" id="modWork" placeholder="Student / Has job / Unemployed">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Location:</label>
            <select class="form-select" id="modContact">
              <option>Still in DMs</option>
              <option>Assistant's Telegram</option>
              <option>Assistant's WhatsApp</option>
              <option>Boss's Telegram</option>
              <option>Boss's WhatsApp</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Motivation - Why does she want to do this?</label>
          <textarea class="form-textarea" id="modMotivation"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Life Situation & Problems:</label>
          <textarea class="form-textarea" id="modSituation"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Notes:</label>
          <textarea class="form-textarea" id="modNotes"></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveModel()">Save Model</button>
      `;
      break;

    case 'model-view':
      loadModelView(data);
      return;

    case 'content':
      title.textContent = 'Submit Content for Approval';
      loadContentModal(body);
      break;
  }

  m.classList.add('show');
}

async function loadPayrollModal(body) {
  const wallets = await DB.getWallets(user.id);
  let walletOpts = '';
  wallets.forEach(w => {
    const label = w.label ? ` (${w.label})` : '';
    const shortAddr = w.address.substring(0, 15) + '...' + w.address.substring(w.address.length - 6);
    walletOpts += `<option value="${w.type}|${w.address}">${w.type}${label} - ${shortAddr}</option>`;
  });

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Amount to Request ($):</label>
      <input type="number" class="form-input" id="payAmount" step="0.01" placeholder="e.g. 50.00">
    </div>
    <div class="form-group">
      <label class="form-label">Send to Wallet:</label>
      <select class="form-select" id="payWallet">
        ${walletOpts || '<option value="">No wallets - add one first</option>'}
      </select>
    </div>
    ${wallets.length === 0 ? '<div style="color:#f55;margin-bottom:10px">Please add a crypto wallet first in the Wallets tab!</div>' : ''}
    <button class="btn btn-primary" onclick="requestPayment()" ${wallets.length === 0 ? 'disabled' : ''}>Request Payment</button>
  `;
}

async function loadContentModal(body) {
  const accounts = await DB.getAll('posting_accounts');
  let accOpts = '';
  accounts.forEach(a => {
    accOpts += `<option value="${a.id}" data-name="${a.platform} - @${a.username}">${a.platform} - @${a.username}</option>`;
  });

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Account:</label>
      <select class="form-select" id="contAccount" onchange="showAccountInfo()">
        ${accOpts || '<option>No accounts available</option>'}
      </select>
    </div>
    <div id="accountInfo" style="margin-bottom:15px"></div>
    <div class="form-group">
      <label class="form-label">Media Type:</label>
      <select class="form-select" id="contType">
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Media URL (imgur/vimeo):</label>
      <input type="text" class="form-input" id="contUrl" placeholder="https://i.imgur.com/... or https://vimeo.com/...">
    </div>
    <div class="form-group">
      <label class="form-label">Description:</label>
      <textarea class="form-textarea" id="contDesc"></textarea>
    </div>
    <button class="btn btn-primary" onclick="submitContent()">Submit for Approval</button>
  `;

  showAccountInfo();
}

async function showAccountInfo() {
  const accId = document.getElementById('contAccount')?.value;
  if (!accId) return;

  const acc = await DB.get('posting_accounts', accId);
  if (!acc) return;

  let html = `<div style="padding:10px;background:#0a0a0a;border:1px solid #333;font-size:11px">`;
  if (acc.description) html += `<div><strong>Description:</strong> ${acc.description}</div>`;
  if (acc.contentStyle) html += `<div><strong>Content Style:</strong> ${acc.contentStyle}</div>`;
  if (acc.prompts) html += `<div><strong>Prompts:</strong> ${acc.prompts}</div>`;
  if (acc.examples) html += `<div><strong>Examples:</strong> ${acc.examples}</div>`;
  html += `</div>`;

  document.getElementById('accountInfo').innerHTML = html;
}

async function loadModelView(id) {
  const model = await DB.get('models', id);
  if (!model) return;

  const checklistItems = await DB.getAll('checklist_items', [], 'order', 'asc');
  const contacts = await DB.getAll('model_contacts', [{ field: 'modelId', value: id }], 'createdAt', 'desc');

  document.getElementById('mTitle').textContent = model.name;
  document.getElementById('mBox').className = 'modal-box large';

  // Build checklist HTML
  let checkHtml = '';
  checklistItems.forEach(c => {
    const done = model.checklist?.includes(c.id);
    checkHtml += `<div class="task-item ${done ? 'done' : ''}" style="cursor:pointer" onclick="toggleModelCheck('${id}','${c.id}')">
      <span>${done ? '✓' : '○'}</span>
      <span class="task-name">${c.name}</span>
    </div>`;
  });

  // Build contacts HTML
  let contactHtml = '';
  contacts.slice(0, 10).forEach(c => {
    contactHtml += `<div class="contact-item">
      <span class="contact-date">${c.date}</span> - ${c.type}: ${c.notes}
    </div>`;
  });

  document.getElementById('mBody').innerHTML = `
    <div class="grid grid-2">
      <div>
        ${model.photo ? `<img src="${model.photo}" style="width:100%;max-height:300px;object-fit:cover;border:1px solid #333">` :
          '<div style="height:200px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;color:#333">No Photo</div>'}
        <div style="margin-top:10px">
          <div><strong>Country:</strong> ${model.country || '-'}</div>
          <div><strong>Age:</strong> ${model.age || '-'}</div>
          <div><strong>Experience:</strong> ${model.experience || '-'}</div>
          <div><strong>Payment:</strong> ${model.payment || '-'}</div>
          <div><strong>Work/Study:</strong> ${model.workStatus || '-'}</div>
          <div><strong>Contact:</strong> ${model.contactLocation || '-'}</div>
        </div>
        <div style="margin-top:10px">
          <label class="form-label">Status:</label>
          <select class="form-select" id="modStatus" onchange="updateModelStatus('${id}')">
            <option ${model.status === 'potential' ? 'selected' : ''}>potential</option>
            <option ${model.status === 'active' ? 'selected' : ''}>active</option>
            <option ${model.status === 'inactive' ? 'selected' : ''}>inactive</option>
          </select>
        </div>
      </div>
      <div>
        <div style="margin-bottom:15px">
          <strong>Motivation:</strong>
          <div style="font-size:11px;color:#999">${model.motivation || '-'}</div>
        </div>
        <div style="margin-bottom:15px">
          <strong>Life Situation:</strong>
          <div style="font-size:11px;color:#999">${model.situation || '-'}</div>
        </div>
        <div style="margin-bottom:15px">
          <strong>Notes:</strong>
          <div style="font-size:11px;color:#999">${model.notes || '-'}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:20px">
      <div class="box-header">Checklist / Roadmap</div>
      <div style="margin-top:10px">${checkHtml || '<div class="empty">No checklist items</div>'}</div>
    </div>

    <div style="margin-top:20px">
      <div class="box-header">Contact Log <button class="btn btn-sm btn-primary" onclick="logContact('${id}')">Log Contact</button></div>
      <div class="contact-log" style="margin-top:10px">${contactHtml || '<div class="empty">No contacts logged</div>'}</div>
    </div>
  `;

  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

// Close modal when clicking outside
document.getElementById('modal').onclick = (e) => {
  if (e.target.id === 'modal') closeModal();
};

// ============================================
// SAVE FUNCTIONS
// ============================================
async function saveWallet() {
  const addr = document.getElementById('walletAddr').value.trim();
  if (!addr) return toast('Please enter wallet address', 'error');

  await DB.add('wallets', {
    userId: user.id,
    type: document.getElementById('walletType').value,
    address: addr,
    label: document.getElementById('walletLabel').value.trim() || null
  });
  closeModal();
  loadWallets();
}

async function requestPayment() {
  const amount = parseFloat(document.getElementById('payAmount').value);
  const walletVal = document.getElementById('payWallet').value;

  if (!amount || !walletVal) return toast('Please fill all fields', 'error');

  const [walletType, walletAddr] = walletVal.split('|');

  await DB.add('payroll', {
    userId: user.id,
    amount,
    walletType,
    wallet: walletAddr,
    status: 'pending'
  });

  // Notify admin
  sendTelegramNotification(`Payment Request from ${user.id}:\n$${amount}\n${walletType}: ${walletAddr}`);

  closeModal();
  loadPayroll();
}

async function saveOutreachAcc(type) {
  const data = {
    type,
    userId: user.id,
    username: document.getElementById('accUser').value,
    location: document.getElementById('accLoc').value,
    healthy: document.getElementById('accHealthy').value === 'true'
  };

  if (type === 'webcam') {
    data.site = document.getElementById('accSite').value;
  } else {
    data.proxyStatus = document.getElementById('accProxyStat').value;
    data.proxyType = document.getElementById('accProxyType').value;
    data.proxyDetails = document.getElementById('accProxyDetails').value;
  }

  await DB.add('accounts', data);
  closeModal();
  loadOutreachAccounts();
}

async function updateOutreachAcc(type) {
  const id = document.getElementById('editAccId').value;
  const data = {
    username: document.getElementById('accUser').value,
    location: document.getElementById('accLoc').value,
    healthy: document.getElementById('accHealthy').value === 'true'
  };

  if (type === 'webcam') {
    data.site = document.getElementById('accSite').value;
  } else {
    data.proxyStatus = document.getElementById('accProxyStat').value;
    data.proxyType = document.getElementById('accProxyType').value;
    data.proxyDetails = document.getElementById('accProxyDetails').value;
  }

  await DB.update('accounts', id, data);
  closeModal();
  loadOutreachAccounts();
}

async function saveOutseeker() {
  await DB.set('outseeker_logs', `${user.id}_${curDate}`, {
    userId: user.id,
    date: curDate,
    activeAccounts: parseInt(document.getElementById('osAcc').value) || 0,
    usaRunning: parseInt(document.getElementById('osUSAIn').value) || 0,
    espRunning: parseInt(document.getElementById('osESPIn').value) || 0,
    outreached: parseInt(document.getElementById('osOutreached').value) || 0
  });
  closeModal();
  loadOutseeker();
}

async function saveScript(type) {
  const data = {
    type,
    text: document.getElementById('scriptText').value,
    active: document.getElementById('scriptActive').checked
  };

  if (type === 'script') {
    data.title = document.getElementById('scriptTitle').value;
  } else {
    data.platform = document.getElementById('scriptPlat').value;
  }

  await DB.add('scripts', data);
  closeModal();
  if (type === 'opener') loadOpeners();
  else if (type === 'followup') loadFollowups();
  else loadScripts();
}

async function saveModel() {
  await DB.add('models', {
    name: document.getElementById('modName').value,
    photo: document.getElementById('modPhoto').value,
    country: document.getElementById('modCountry').value,
    age: parseInt(document.getElementById('modAge').value) || null,
    experience: document.getElementById('modExp').value,
    payment: document.getElementById('modPayment').value,
    workStatus: document.getElementById('modWork').value,
    contactLocation: document.getElementById('modContact').value,
    motivation: document.getElementById('modMotivation').value,
    situation: document.getElementById('modSituation').value,
    notes: document.getElementById('modNotes').value,
    status: 'potential',
    checklist: []
  });
  closeModal();
  loadModels();
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

function logContact(modelId) {
  document.getElementById('mBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">Contact Type:</label>
      <select class="form-select" id="contType2">
        <option>DM</option>
        <option>Telegram</option>
        <option>WhatsApp</option>
        <option>Call</option>
        <option>Other</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes:</label>
      <textarea class="form-textarea" id="contNotes" placeholder="What did you talk about? Any progress?"></textarea>
    </div>
    <button class="btn btn-primary" onclick="saveContact('${modelId}')">Save Contact</button>
    <button class="btn" onclick="loadModelView('${modelId}')">Cancel</button>
  `;
}

async function saveContact(modelId) {
  await DB.add('model_contacts', {
    modelId,
    type: document.getElementById('contType2').value,
    notes: document.getElementById('contNotes').value,
    date: curDate,
    userId: user.id
  });
  loadModelView(modelId);
}

async function submitContent() {
  const accSelect = document.getElementById('contAccount');
  const accId = accSelect.value;
  const accName = accSelect.options[accSelect.selectedIndex]?.dataset?.name || 'Unknown';

  await DB.add('content', {
    userId: user.id,
    accountId: accId,
    accountName: accName,
    mediaType: document.getElementById('contType').value,
    mediaUrl: document.getElementById('contUrl').value,
    description: document.getElementById('contDesc').value,
    status: 'pending'
  });

  closeModal();
  loadContent();
}

// ============================================
// IMAGE UPLOAD FOR AI CHAT
// ============================================
let selectedImage = null;

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    console.log('Image too large. Max 10MB.', 'error');
    return;
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    console.log('Please select an image file.', 'error');
    return;
  }

  selectedImage = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewImg').src = e.target.result;
    document.getElementById('imagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearImagePreview() {
  selectedImage = null;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('chatImageInput').value = '';
}

async function uploadImageToR2(file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('userId', user.id);

  const response = await fetch('/upload-image', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.url;
}

// ============================================
// MARKET MODEL HELPERS
// ============================================
async function viewMarketModelReports(id) {
  const model = await DB.get('models', id);
  if (!model) return;
  const reports = model.marketReports || [];
  const commNotes = model.communicationNotes || [];
  document.getElementById('mBox').className = 'modal-box large';
  document.getElementById('mTitle').textContent = `${model.name} - Reports & Contact History`;
  document.getElementById('mBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <h3 style="color:#e91e63;margin-bottom:10px;font-size:14px">Reports (${reports.length})</h3>
        <div style="max-height:400px;overflow-y:auto">
          ${reports.length ? [...reports].reverse().map(r => `<div style="margin-bottom:10px;padding:10px;background:#0a0a0a;border-left:3px solid #e91e63;border-radius:3px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:10px;color:#666">${new Date(r.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</span>
              <span style="font-size:10px;color:#0f0">${r.status || '-'}</span>
            </div>
            <div style="font-size:12px;color:#ccc;line-height:1.5">${r.text}</div>
          </div>`).join('') : '<div style="color:#666;font-size:11px">No reports yet</div>'}
        </div>
      </div>
      <div>
        <h3 style="color:#0f0;margin-bottom:10px;font-size:14px">Contact Log (${commNotes.length})</h3>
        <div style="max-height:400px;overflow-y:auto">
          ${commNotes.length ? [...commNotes].reverse().map(n => `<div style="margin-bottom:8px;padding:8px;background:#0a0a0a;border-left:3px solid #0f0;border-radius:3px">
            <div style="font-size:10px;color:#666;margin-bottom:3px">${new Date(n.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</div>
            <div style="font-size:11px;color:#ccc">${n.note}</div>
          </div>`).join('') : '<div style="color:#666;font-size:11px">No contact logs yet</div>'}
        </div>
      </div>
    </div>
    <div style="margin-top:15px;display:flex;gap:10px">
      <button class="btn btn-sm" style="flex:1" onclick="logMarketContact('${id}');closeModal()">Log Contact</button>
      <button class="btn btn-sm" style="flex:1;border-color:#e91e63;color:#e91e63" onclick="closeModal();addMarketReport('${id}')">+ Report</button>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>
  `;
  document.getElementById('modal').style.display = 'flex';
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
  document.getElementById('mTitle').textContent = `Report: ${model.name}`;
  document.getElementById('mBody').innerHTML = `
    <input type="hidden" id="mktReportId" value="${id}">
    <div class="form-group">
      <label class="form-label">Report:</label>
      <textarea class="form-textarea" id="mktReportText" style="min-height:120px" placeholder="Status update, agency interest, contact summary..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Market Status:</label>
      <select class="form-select" id="mktReportStatus">
        <option value="available">Available</option>
        <option value="in_talks">In Talks</option>
        <option value="contract_sent">Contract Sent</option>
        <option value="sold">Sold</option>
        <option value="on_hold">On Hold</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="saveMarketReport()">Save Report</button>
  `;
  if (model.marketStatus) {
    setTimeout(() => { const s = document.getElementById('mktReportStatus'); if(s) s.value = model.marketStatus; }, 50);
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
    userId: user.id,
    name,
    photo: document.getElementById('mktPhoto')?.value?.trim() || '',
    country: document.getElementById('mktCountry')?.value?.trim() || '',
    age: parseInt(document.getElementById('mktAge')?.value) || null,
    status: 'market',
    marketPrice: parseFloat(document.getElementById('mktPrice')?.value) || null,
    contactInfo: document.getElementById('mktContact')?.value?.trim() || '',
    bossGroupLink: document.getElementById('mktBossGroup')?.value?.trim() || '',
    telegramAdLink: document.getElementById('mktAdLink')?.value?.trim() || '',
    marketNotes: document.getElementById('mktNotes')?.value?.trim() || '',
    marketStatus: document.getElementById('mktStatus')?.value || 'available',
    assistantInContact: document.getElementById('mktInContact')?.value || 'no'
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

// ============================================
// SECTION VISIBILITY (from admin settings)
// ============================================
function applySectionVisibility(config) {
  document.querySelectorAll('.nav-link[data-s]').forEach(el => {
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

// ============================================
// INIT
// ============================================
(async () => {
  try {
    const visDoc = await DB.getSetting('section_visibility');
    if (visDoc) {
      applySectionVisibility({ sections: visDoc.sections || {}, tabs: visDoc.tabs || {} });
    }
  } catch(e) {
    console.error('Section visibility init error:', e);
  }
  loadDaily();
})();
