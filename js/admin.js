// ============================================
// TEAM APP - Admin Interface
// ============================================

DB.init();

// Auth check
if (!DB.isLoggedIn() || DB.getUser().role !== 'admin') {
  location.href = 'index.html';
}

document.getElementById('userName').textContent = DB.getUser().id;

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
    case 'models': loadModels(); break;
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
const userId = CONFIG.assistant;

async function loadDaily() {
  await loadDayDetail();
  await loadPayroll();
  await loadWallets();
  await loadCalendar();
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

  // Toggle off if clicking same status
  if (existing.length > 0 && existing[0].status === status) {
    newStatus = 'planned';
  }

  if (existing.length > 0) {
    await DB.update('work_days', existing[0].id, { status: newStatus });
  } else {
    await DB.add('work_days', {
      userId: userId,
      date: curDate,
      status: newStatus,
      hours: 0,
      report: '',
      createdAt: new Date()
    });
  }

  toast('Day status updated', 'success');
  loadDayDetail();
  loadCalendar();
}

// Save day report (hours + report text)
async function saveDayReport() {
  const hours = parseFloat(document.getElementById('dayHours').value) || 0;
  const report = document.getElementById('reportTxt').value.trim();

  const existing = await DB.getAll('work_days', [
    { field: 'userId', value: userId },
    { field: 'date', value: curDate }
  ]);

  if (existing.length > 0) {
    await DB.update('work_days', existing[0].id, { hours, report });
  } else {
    await DB.add('work_days', {
      userId: userId,
      date: curDate,
      status: 'planned',
      hours: hours,
      report: report,
      createdAt: new Date()
    });
  }

  toast('Report saved!', 'success');
  loadDayDetail();
  loadCalendar();
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
      <span class="task-name">${p.name}</span>
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
  loadTasks();
  toast('Task added', 'success');
}

async function toggleManualTask(id, done) {
  await DB.update('manual_tasks', id, { done });
  loadTasks();
}

async function deleteManualTask(id) {
  if (await confirmDialog('Delete this task?')) {
    await DB.delete('manual_tasks', id);
    loadTasks();
    toast('Task deleted', 'success');
  }
}


// --- PAYROLL ---
async function loadPayroll() {
  const payrolls = await DB.getPayroll(userId);
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
}

async function markPaid(id) {
  if (await confirmDialog('Mark this payment as paid?')) {
    await DB.update('payroll', id, { status: 'paid', paidAt: new Date() });
    toast('Payment marked as paid', 'success');
    loadPayroll();
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
  try {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
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

    // Calculate month stats
    let totalHours = 0;
    let daysWorked = 0;
    const daysData = {};

    monthLogs.forEach(log => {
      const dayHours = log.hours || 0;
      totalHours += dayHours;
      if (log.status === 'completed') daysWorked++;
      daysData[log.date] = { hours: dayHours, status: log.status };
    });

    totalHours = Math.round(totalHours * 10) / 10;
    const rateSetting = await DB.getSetting('hourly_rate');
    const rate = rateSetting?.value || CONFIG.hourlyRate || 5;
    const earned = totalHours * rate;

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

    document.getElementById('calendarGrid').innerHTML = html;

    // Daily history - simple version
    let histHtml = '';
    if (monthLogs.length === 0) {
      histHtml = '<div class="empty-state">No work logged this month</div>';
    } else {
      histHtml = '<table class="table"><thead><tr><th>Date</th><th>Status</th><th>Hours</th><th>Report</th></tr></thead><tbody>';

      const sortedLogs = [...monthLogs].sort((a, b) => b.date.localeCompare(a.date));

      for (const log of sortedLogs.slice(0, 20)) {
        const dayHours = log.hours || 0;
        const statusColor = log.status === 'completed' ? '#0f0' : log.status === 'dayoff' ? '#f55' : '#ff0';
        const statusLabel = log.status === 'completed' ? '✓' : log.status === 'dayoff' ? 'Off' : 'Plan';

        histHtml += `<tr onclick="selectDate('${log.date}')" style="cursor:pointer">
          <td>${log.date}</td>
          <td style="color:${statusColor}">${statusLabel}</td>
          <td>${dayHours}h</td>
          <td style="color:${log.report ? '#0f0' : '#f55'}">${log.report ? '✓' : '✗'}</td>
        </tr>`;
      }

      histHtml += '</tbody></table>';
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
    // Load ALL chat history - no limit, everything saved forever
    const chatHistory = await DB.getAll('ai_chat_history', [
      { field: 'userId', value: 'admin' }
    ]);

    // Sort by timestamp
    chatMessages = chatHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    console.log('Loaded chat history:', chatMessages.length, 'messages');

    // Display messages
    let html = `<div class="chat-msg ai">
      <div class="chat-msg-bubble">Hi Boss! I'm your AI Expert Assistant. Ask me anything!</div>
    </div>`;

    chatMessages.forEach(m => {
      html += `<div class="chat-msg ${m.role === 'ai' ? 'ai' : 'user'}">
        <div class="chat-msg-bubble">${escapeHtml(m.content)}</div>
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
  const ig = await DB.getAccounts('instagram');
  const tw = await DB.getAccounts('twitter');
  const wc = await DB.getAccounts('webcam');

  document.getElementById('igList').innerHTML = renderAccounts(ig);
  document.getElementById('twList').innerHTML = renderAccounts(tw);
  document.getElementById('wcList').innerHTML = renderAccounts(wc);

  // Outseeker
  const logs = await DB.getOutseekerLogs();
  const latest = logs[0];
  if (latest) {
    document.getElementById('osA').textContent = latest.activeAccounts || 0;
    document.getElementById('osU').textContent = latest.usaRunning || 0;
    document.getElementById('osE').textContent = latest.espRunning || 0;
  }

  let osHtml = '';
  logs.forEach(l => {
    osHtml += `<div class="list-item">
      <span>${l.date}</span>
      <span>Active: ${l.activeAccounts} | USA: ${l.usaRunning} | ESP: ${l.espRunning} | Outreached: ${l.outreached || 0}</span>
    </div>`;
  });
  document.getElementById('osLog').innerHTML = osHtml || '<div class="empty-state">No outseeker logs</div>';

  // Scripts
  const scripts = await DB.getScripts();
  document.getElementById('scOpen').innerHTML = renderScripts(scripts.filter(s => s.type === 'opener'));
  document.getElementById('scFollow').innerHTML = renderScripts(scripts.filter(s => s.type === 'followup'));
  document.getElementById('scScript').innerHTML = renderScripts(scripts.filter(s => s.type === 'script'));
}

function renderAccounts(accs) {
  if (!accs.length) return '<div class="empty-state">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">@${a.username}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Healthy' : 'Expired'}</span>
      </div>
      <div class="acc-card-body">
        <div>Location: ${a.location || '-'}</div>
        ${a.proxyStatus ? `<div>Proxy: ${a.proxyStatus} ${a.proxyType || ''}</div>` : ''}
      </div>
      <div class="acc-card-actions">
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
    loadOutreach();
  }
}

async function delScript(id) {
  if (await confirmDialog('Delete this script?')) {
    await DB.delete('scripts', id);
    toast('Script deleted', 'success');
    loadOutreach();
  }
}

// ============================================
// MODELS
// ============================================
async function loadModels() {
  const pot = await DB.getModels('potential');
  const act = await DB.getModels('active');

  document.getElementById('potList').innerHTML = renderModels(pot) || '<div class="empty-state">No potential models</div>';
  document.getElementById('actList').innerHTML = renderModels(act) || '<div class="empty-state">No active models</div>';
}

function renderModels(models) {
  if (!models.length) return '';
  let html = '';
  models.forEach(m => {
    html += `<div class="model-card" onclick="modal('modelView','${m.id}')">
      <div class="model-card-img">
        ${m.photo ? `<img src="${m.photo}" alt="${m.name}">` : 'No Photo'}
      </div>
      <div class="model-card-body">
        <div class="model-card-name">${m.name}</div>
        <div class="model-card-info">
          <div>${m.country || '-'}, ${m.age || '-'}y</div>
          <span class="status status-${m.status}">${m.status}</span>
        </div>
      </div>
    </div>`;
  });
  return html;
}

// ============================================
// CONTENT
// ============================================
async function loadContent() {
  const pend = await DB.getContent('pending');
  const appr = await DB.getContent('approved');

  document.getElementById('pendList').innerHTML = renderContent(pend, true) || '<div class="empty-state">No pending content</div>';
  document.getElementById('apprList').innerHTML = renderContent(appr, false) || '<div class="empty-state">No approved content</div>';
}

function renderContent(items, showActions) {
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
        <div style="font-weight:bold;margin-bottom:5px">${c.accountName || 'Unknown'}</div>
        <div style="font-size:10px;color:#999">${c.description || ''}</div>
        <span class="status status-${c.status}">${c.status}</span>
        ${showActions ? `<div style="margin-top:10px">
          <button class="btn btn-sm btn-primary" onclick="approveContent('${c.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectContent('${c.id}')">Reject</button>
        </div>` : ''}
      </div>
    </div>`;
  });
  return html;
}

async function approveContent(id) {
  await DB.update('content', id, { status: 'approved' });
  loadContent();
}

async function rejectContent(id) {
  const note = prompt('Rejection reason (optional):');
  await DB.update('content', id, { status: 'rejected', rejectNote: note || null });
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
async function loadSettings() {
  // Task Presets
  const presets = await DB.getTaskPresets();
  let html = '';
  presets.forEach((p, i) => {
    html += `<div class="list-item">
      <div style="flex:1">
        <strong>${i+1}. ${p.name}</strong>
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

  // Model Checklist
  const checks = await DB.getAll('checklist_items', [], 'order', 'asc');
  let chkHtml = '';
  checks.forEach((c, i) => {
    chkHtml += `<div class="list-item">
      <span>${i+1}. ${c.name}</span>
      <button class="btn btn-sm" onclick="delCheck('${c.id}')">Delete</button>
    </div>`;
  });
  document.getElementById('checkList').innerHTML = chkHtml || '<div class="empty-state">No checklist items</div>';

  // Warmup Guide
  const warmup = await DB.getSetting('warmup_guide');
  document.getElementById('warmupTxt').value = warmup?.text || '';

  // Hourly Rate
  const rate = await DB.getSetting('hourly_rate');
  document.getElementById('rateInput').value = rate?.value || CONFIG.hourlyRate;
}

async function delPreset(id) {
  if (await confirmDialog('Delete this task preset?')) {
    await DB.delete('task_presets', id);
    toast('Task preset deleted', 'success');
    loadSettings();
  }
}

async function delCheck(id) {
  if (await confirmDialog('Delete this checklist item?')) {
    await DB.delete('checklist_items', id);
    toast('Checklist item deleted', 'success');
    loadSettings();
  }
}

async function saveWarmup() {
  await DB.saveSetting('warmup_guide', { text: document.getElementById('warmupTxt').value });
  toast('Warmup guide saved!', 'success');
}

async function saveRate() {
  await DB.saveSetting('hourly_rate', { value: parseFloat(document.getElementById('rateInput').value) });
  toast('Hourly rate saved!', 'success');
}

// ============================================
// MODAL
// ============================================
function modal(type, data) {
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
          <textarea class="form-textarea" id="scriptTxt" style="min-height:150px"></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveScript('${data}')">Save</button>
      `;
      break;

    case 'model':
      title.textContent = 'Add Model';
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
        </div>
        <div class="form-group">
          <label class="form-label">Notes:</label>
          <textarea class="form-textarea" id="modNotes"></textarea>
        </div>
        <button class="btn btn-primary" onclick="saveModel()">Save Model</button>
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
        <button class="btn btn-primary" onclick="savePreset()">Save Task</button>
      `;
      break;

    case 'checkItem':
      title.textContent = 'Add Model Checklist Item';
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Item Name:</label>
          <input type="text" class="form-input" id="checkName" placeholder="e.g. Verified Identity, Signed Contract...">
        </div>
        <button class="btn btn-primary" onclick="saveCheckItem()">Save</button>
      `;
      break;

  }

  m.classList.add('active');
}

async function loadModelView(id) {
  const model = await DB.get('models', id);
  const checks = await DB.getAll('checklist_items', [], 'order', 'asc');
  const contacts = await DB.getAll('model_contacts', [{ field: 'modelId', value: id }], 'createdAt', 'desc');

  document.getElementById('mTitle').textContent = model.name;
  document.getElementById('mBox').className = 'modal-box large';

  let checkHtml = '';
  checks.forEach(c => {
    const done = model.checklist?.includes(c.id);
    checkHtml += `<div class="task-item ${done ? 'done' : ''}" style="cursor:pointer" onclick="toggleModelCheck('${id}','${c.id}')">
      <span style="color:${done ? '#0f0' : '#666'}">${done ? '✓' : '○'}</span>
      <span class="task-name">${c.name}</span>
    </div>`;
  });

  let contHtml = '';
  contacts.slice(0, 10).forEach(c => {
    contHtml += `<div class="contact-item">
      <span class="contact-date">${c.date}</span> - ${c.type}: ${c.notes}
    </div>`;
  });

  document.getElementById('mBody').innerHTML = `
    <div class="grid grid-2">
      <div>
        ${model.photo ? `<img src="${model.photo}" style="width:100%;max-height:250px;object-fit:cover;border:1px solid #333">` :
          '<div style="height:150px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;color:#333">No Photo</div>'}
        <div style="margin-top:10px;font-size:11px">
          <div><strong>Country:</strong> ${model.country || '-'}</div>
          <div><strong>Age:</strong> ${model.age || '-'}</div>
        </div>
      </div>
      <div>
        <div class="form-group">
          <label class="form-label">Status:</label>
          <select class="form-select" id="modStatus" onchange="updateModelStatus('${id}')">
            <option ${model.status === 'potential' ? 'selected' : ''}>potential</option>
            <option ${model.status === 'active' ? 'selected' : ''}>active</option>
            <option ${model.status === 'inactive' ? 'selected' : ''}>inactive</option>
          </select>
        </div>
        <div style="margin-top:15px">
          <strong>Notes:</strong>
          <div style="font-size:11px;color:#999;white-space:pre-wrap">${model.notes || '-'}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:20px">
      <div class="box-header">Checklist</div>
      <div style="margin-top:10px">${checkHtml || '<div class="empty-state">No checklist items defined</div>'}</div>
    </div>

    <div style="margin-top:20px">
      <div class="box-header">Contact Log <button class="btn btn-sm btn-primary" onclick="addContact('${id}')">Log Contact</button></div>
      <div class="contact-log" style="margin-top:10px">${contHtml || '<div class="empty-state">No contacts logged</div>'}</div>
    </div>
  `;

  document.getElementById('modal').classList.add('active');
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

async function saveScript(type) {
  const data = {
    type,
    text: document.getElementById('scriptTxt').value
  };
  if (type === 'script') {
    data.title = document.getElementById('scriptTitle')?.value || '';
  } else {
    data.platform = document.getElementById('scriptPlat')?.value || '';
  }
  await DB.add('scripts', data);
  closeModal();
  loadOutreach();
}

async function saveModel() {
  await DB.add('models', {
    name: document.getElementById('modName').value,
    photo: document.getElementById('modPhoto').value,
    country: document.getElementById('modCountry').value,
    age: parseInt(document.getElementById('modAge').value) || null,
    notes: document.getElementById('modNotes').value,
    status: 'potential',
    checklist: []
  });
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
    video: document.getElementById('presetVideo').value
  });
  closeModal();
  loadSettings();
}

async function saveCheckItem() {
  const items = await DB.getAll('checklist_items');
  await DB.add('checklist_items', {
    name: document.getElementById('checkName').value,
    order: items.length
  });
  closeModal();
  loadSettings();
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
loadDaily();
