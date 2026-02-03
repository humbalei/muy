// ============================================
// ADMIN SETTINGS - Only loaded on admin.html
// ============================================

// Add settings to loadSection
const originalLoadSection = loadSection;
loadSection = function(s) {
  if (s === 'settings') {
    loadSettings();
  } else {
    originalLoadSection(s);
  }
};

// ============================================
// SETTINGS SECTION
// ============================================
async function loadSettings() {
  await loadTaskPresets();
  await loadChecklist();
  await loadWarmupGuide();
  await loadHourlyRate();
}

async function loadTaskPresets() {
  const presets = await DB.getTaskPresets();
  let html = '';
  if (presets.length === 0) {
    html = '<div class="empty-state">No task presets. Add daily tasks for your assistant.</div>';
  } else {
    presets.forEach((p, i) => {
      html += `<div class="list-item">
        <div style="flex:1">
          <strong>${i+1}. ${p.name}</strong>
          ${p.guide ? `<div style="font-size:10px;color:#666;margin-top:3px">${p.guide.substring(0, 50)}...</div>` : ''}
        </div>
        <button class="btn btn-sm" onclick="editPreset('${p.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delPreset('${p.id}')">Delete</button>
      </div>`;
    });
  }
  document.getElementById('presetList').innerHTML = html;
}

async function loadChecklist() {
  const checks = await DB.getAll('checklist_items', [], 'order', 'asc');
  let html = '';
  if (checks.length === 0) {
    html = '<div class="empty-state">No checklist items</div>';
  } else {
    checks.forEach((c, i) => {
      html += `<div class="list-item">
        <span>${i+1}. ${c.name}</span>
        <button class="btn btn-sm" onclick="delCheck('${c.id}')">Delete</button>
      </div>`;
    });
  }
  document.getElementById('checkList').innerHTML = html;
}

async function loadWarmupGuide() {
  const warmup = await DB.getSetting('warmup_guide');
  document.getElementById('warmupTxt').value = warmup?.text || '';
}

async function loadHourlyRate() {
  const rate = await DB.getSetting('hourly_rate');
  document.getElementById('rateInput').value = rate?.value || CONFIG.hourlyRate;
}

async function delPreset(id) {
  if (await confirmDialog('Delete this task preset?')) {
    await DB.delete('task_presets', id);
    loadTaskPresets();
    toast('Task preset deleted', 'success');
  }
}

async function delCheck(id) {
  if (await confirmDialog('Delete this checklist item?')) {
    await DB.delete('checklist_items', id);
    loadChecklist();
    toast('Checklist item deleted', 'success');
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

async function editPreset(id) {
  const p = await DB.get('task_presets', id);
  modal('taskPreset');
  setTimeout(() => {
    document.getElementById('presetName').value = p.name || '';
    document.getElementById('presetGuide').value = p.guide || '';
    document.getElementById('presetImages').value = p.images || '';
    document.getElementById('presetVideo').value = p.video || '';
    const btn = document.querySelector('#mBody button');
    btn.onclick = () => updatePreset(id);
    btn.textContent = 'Update Task';
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
  loadTaskPresets();
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
  loadTaskPresets();
}

async function saveCheckItem() {
  const items = await DB.getAll('checklist_items');
  await DB.add('checklist_items', {
    name: document.getElementById('checkName').value,
    order: items.length
  });
  closeModal();
  loadChecklist();
}

// Add settings modals to the modal function
const originalModal = modal;
modal = function(type, data) {
  if (type === 'taskPreset') {
    const m = document.getElementById('modal');
    document.getElementById('mTitle').textContent = 'Add Task Preset';
    document.getElementById('mBox').className = 'modal-box large';
    document.getElementById('mBody').innerHTML = `
      <div class="form-group">
        <label class="form-label">Task Name:</label>
        <input type="text" class="form-input" id="presetName" placeholder="What should assistant do?">
      </div>
      <div class="form-group">
        <label class="form-label">Guide/Instructions (shows on hover):</label>
        <textarea class="form-textarea" id="presetGuide" style="min-height:150px" placeholder="Detailed explanation..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Images (imgur URLs, comma separated):</label>
        <input type="text" class="form-input" id="presetImages" placeholder="https://i.imgur.com/xxx.jpg">
      </div>
      <div class="form-group">
        <label class="form-label">Video (Loom or Vimeo URL):</label>
        <input type="text" class="form-input" id="presetVideo" placeholder="https://www.loom.com/share/xxx">
      </div>
      <button class="btn btn-primary" onclick="savePreset()">Save Task</button>
    `;
    m.classList.add('active');
  } else if (type === 'checkItem') {
    const m = document.getElementById('modal');
    document.getElementById('mTitle').textContent = 'Add Model Checklist Item';
    document.getElementById('mBody').innerHTML = `
      <div class="form-group">
        <label class="form-label">Item Name:</label>
        <input type="text" class="form-input" id="checkName" placeholder="e.g. Verified Identity, Signed Contract...">
      </div>
      <button class="btn btn-primary" onclick="saveCheckItem()">Save</button>
    `;
    m.classList.add('active');
  } else {
    originalModal(type, data);
  }
};
