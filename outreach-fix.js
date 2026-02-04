// ============================================
// OUTREACH SECTION - COMPLETE WORKING VERSION
// ============================================

// Main loader - calls all sub-loaders
async function loadOutreach() {
  try {
    await loadOutreachAccounts();
    await loadWarmupGuides();
    await loadOutseeker();
    await loadOpeners();
    await loadFollowups();
    await loadScripts();
  } catch (e) {
    console.error('loadOutreach error:', e);
    toast('Error loading Outreach section', 'error');
  }
}

// Load warmup guides
async function loadWarmupGuides() {
  try {
    const guide = await DB.getSetting('warmup_guide');
    if (guide?.text) {
      const html = `<div class="box" style="background:#001a00;border-color:#0f0">
        <div class="box-header">Warmup Guide</div>
        <div class="box-body" style="white-space:pre-wrap;font-size:11px">${guide.text}</div>
      </div>`;
      const igGuide = document.getElementById('warmupGuideIg');
      const twGuide = document.getElementById('warmupGuideTw');
      if (igGuide) igGuide.innerHTML = html;
      if (twGuide) twGuide.innerHTML = html;
    }
  } catch (e) {
    console.error('loadWarmupGuides error:', e);
  }
}

// Load all outreach accounts
async function loadOutreachAccounts() {
  try {
    const ig = await DB.getAccounts('instagram');
    const tw = await DB.getAccounts('twitter');
    const wc = await DB.getAccounts('webcam');

    const igList = document.getElementById('igList');
    const twList = document.getElementById('twList');
    const wcList = document.getElementById('wcList');

    if (igList) igList.innerHTML = renderOutreachAccounts(ig);
    if (twList) twList.innerHTML = renderOutreachAccounts(tw);
    if (wcList) wcList.innerHTML = renderWebcamAccounts(wc);
  } catch (e) {
    console.error('loadOutreachAccounts error:', e);
    toast('Error loading accounts', 'error');
  }
}

// Render Instagram/Twitter accounts
function renderOutreachAccounts(accs) {
  if (!accs || !accs.length) return '<div class="empty-state">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">@${a.username || 'unknown'}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Healthy' : 'Expired'}</span>
      </div>
      <div class="acc-card-body">
        <div>Location: ${a.location || '-'}</div>
        <div>Proxy: ${a.proxyStatus || '-'} ${a.proxyType || ''}</div>
        ${a.proxyDetails ? `<div style="font-size:10px;color:#666">Proxy: ${a.proxyDetails}</div>` : ''}
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delOutreachAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

// Render Webcam accounts
function renderWebcamAccounts(accs) {
  if (!accs || !accs.length) return '<div class="empty-state">No accounts</div>';
  let html = '';
  accs.forEach(a => {
    html += `<div class="acc-card">
      <div class="acc-card-header">
        <span class="acc-card-title">${a.username || 'unknown'}</span>
        <span class="status ${a.healthy ? 'status-healthy' : 'status-expired'}">${a.healthy ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="acc-card-body">
        <div>Site: ${a.site || '-'}</div>
        <div>Location: ${a.location || '-'}</div>
      </div>
      <div class="acc-card-actions">
        <button class="btn btn-sm" onclick="editOutreachAcc('${a.id}')">Edit</button>
        <button class="btn btn-sm" onclick="delOutreachAcc('${a.id}')">Delete</button>
      </div>
    </div>`;
  });
  return html;
}

// Edit account
async function editOutreachAcc(id) {
  try {
    const acc = await DB.get('accounts', id);
    if (!acc) {
      toast('Account not found', 'error');
      return;
    }
    modal('outreach-acc-edit', acc);
  } catch (e) {
    console.error('editOutreachAcc error:', e);
    toast('Error loading account', 'error');
  }
}

// Delete account
async function delOutreachAcc(id) {
  if (await confirmDialog('Delete this account?')) {
    try {
      await DB.delete('accounts', id);
      toast('Account deleted', 'success');
      loadOutreachAccounts();
    } catch (e) {
      console.error('delOutreachAcc error:', e);
      toast('Error deleting account', 'error');
    }
  }
}

// Save new account
async function saveOutreachAcc(type) {
  try {
    const username = document.getElementById('accUser')?.value?.trim();
    if (!username) {
      toast('Username required', 'error');
      return;
    }

    const data = {
      type: type,
      userId: userId,
      username: username,
      location: document.getElementById('accLoc')?.value || 'Phone',
      healthy: document.getElementById('accHealthy')?.value === 'true'
    };

    if (type === 'webcam') {
      data.site = document.getElementById('accSite')?.value?.trim() || '';
    } else {
      data.proxyStatus = document.getElementById('accProxyStat')?.value || 'None';
      data.proxyType = document.getElementById('accProxyType')?.value || 'None';
      data.proxyDetails = document.getElementById('accProxyDetails')?.value?.trim() || '';
    }

    await DB.add('accounts', data);
    closeModal();
    toast('Account added!', 'success');
    loadOutreachAccounts();
  } catch (e) {
    console.error('saveOutreachAcc error:', e);
    toast('Error saving account: ' + e.message, 'error');
  }
}

// Update existing account
async function updateOutreachAcc(type) {
  try {
    const id = document.getElementById('editAccId')?.value;
    if (!id) {
      toast('Account ID missing', 'error');
      return;
    }

    const username = document.getElementById('accUser')?.value?.trim();
    if (!username) {
      toast('Username required', 'error');
      return;
    }

    const data = {
      username: username,
      location: document.getElementById('accLoc')?.value || 'Phone',
      healthy: document.getElementById('accHealthy')?.value === 'true'
    };

    if (type === 'webcam') {
      data.site = document.getElementById('accSite')?.value?.trim() || '';
    } else {
      data.proxyStatus = document.getElementById('accProxyStat')?.value || 'None';
      data.proxyType = document.getElementById('accProxyType')?.value || 'None';
      data.proxyDetails = document.getElementById('accProxyDetails')?.value?.trim() || '';
    }

    await DB.update('accounts', id, data);
    closeModal();
    toast('Account updated!', 'success');
    loadOutreachAccounts();
  } catch (e) {
    console.error('updateOutreachAcc error:', e);
    toast('Error updating account: ' + e.message, 'error');
  }
}

// Load Outseeker data
async function loadOutseeker() {
  try {
    const logs = await DB.getOutseekerLogs();
    const latest = logs && logs[0];

    const osActive = document.getElementById('osActive');
    const osUSA = document.getElementById('osUSA');
    const osESP = document.getElementById('osESP');
    const osLog = document.getElementById('osLog');

    if (osActive) osActive.textContent = (latest?.activeAccounts || 0).toString();
    if (osUSA) osUSA.textContent = (latest?.usaRunning || 0).toString();
    if (osESP) osESP.textContent = (latest?.espRunning || 0).toString();

    if (osLog) {
      let html = '';
      if (logs && logs.length > 0) {
        logs.forEach(l => {
          html += `<div class="list-item">
            <span>${l.date || '-'}</span>
            <span>Active: ${l.activeAccounts || 0} | USA: ${l.usaRunning || 0} | ESP: ${l.espRunning || 0} | Outreached: ${l.outreached || 0}</span>
          </div>`;
        });
      } else {
        html = '<div class="empty-state">No logs yet</div>';
      }
      osLog.innerHTML = html;
    }
  } catch (e) {
    console.error('loadOutseeker error:', e);
  }
}

// Save Outseeker data
async function saveOutseeker() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      userId: userId,
      date: today,
      activeAccounts: parseInt(document.getElementById('osAcc')?.value) || 0,
      usaRunning: parseInt(document.getElementById('osUSAIn')?.value) || 0,
      espRunning: parseInt(document.getElementById('osESPIn')?.value) || 0,
      outreached: parseInt(document.getElementById('osOutreached')?.value) || 0
    };

    await DB.set('outseeker_logs', `${userId}_${today}`, data);
    closeModal();
    toast('Outseeker data saved!', 'success');
    loadOutseeker();
  } catch (e) {
    console.error('saveOutseeker error:', e);
    toast('Error saving data: ' + e.message, 'error');
  }
}

// Load Openers
async function loadOpeners() {
  try {
    const filter = document.getElementById('openerFilter')?.value || '';
    let scripts = await DB.getScripts('opener');
    if (filter && scripts) {
      scripts = scripts.filter(s => s.platform === filter);
    }

    const list = document.getElementById('openerList');
    if (!list) return;

    if (!scripts || scripts.length === 0) {
      list.innerHTML = '<div class="empty-state">No openers</div>';
      return;
    }

    let html = '';
    scripts.forEach(s => {
      const platformClass = s.platform === 'instagram' ? 'healthy' : s.platform === 'twitter' ? 'pending' : 'live';
      html += `<div class="script-box" onclick="copyToClipboard('${encodeURIComponent(s.text || '')}')">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span class="status status-${platformClass}">${s.platform || 'unknown'}</span>
        </div>
        <div>${s.text || ''}</div>
        <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
      </div>`;
    });
    list.innerHTML = html;
  } catch (e) {
    console.error('loadOpeners error:', e);
  }
}

// Load Follow-ups
async function loadFollowups() {
  try {
    const filter = document.getElementById('followupFilter')?.value || '';
    let scripts = await DB.getScripts('followup');
    if (filter && scripts) {
      scripts = scripts.filter(s => s.platform === filter);
    }

    const list = document.getElementById('followupList');
    if (!list) return;

    if (!scripts || scripts.length === 0) {
      list.innerHTML = '<div class="empty-state">No follow-ups</div>';
      return;
    }

    let html = '';
    scripts.forEach(s => {
      const platformClass = s.platform === 'instagram' ? 'healthy' : s.platform === 'twitter' ? 'pending' : 'live';
      html += `<div class="script-box" onclick="copyToClipboard('${encodeURIComponent(s.text || '')}')">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span class="status status-${platformClass}">${s.platform || 'unknown'}</span>
        </div>
        <div>${s.text || ''}</div>
        <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
      </div>`;
    });
    list.innerHTML = html;
  } catch (e) {
    console.error('loadFollowups error:', e);
  }
}

// Load Scripts
async function loadScripts() {
  try {
    const scripts = await DB.getScripts('script');
    const list = document.getElementById('scriptList');
    if (!list) return;

    if (!scripts || scripts.length === 0) {
      list.innerHTML = '<div class="empty-state">No scripts</div>';
      return;
    }

    let html = '';
    scripts.forEach(s => {
      html += `<div class="script-box" onclick="copyToClipboard('${encodeURIComponent(s.text || '')}')">
        <div style="margin-bottom:5px"><strong>${s.title || 'Script'}</strong></div>
        <div>${s.text || ''}</div>
        <div style="margin-top:5px;font-size:10px;color:#666">Click to copy</div>
      </div>`;
    });
    list.innerHTML = html;
  } catch (e) {
    console.error('loadScripts error:', e);
  }
}

// Copy to clipboard
function copyToClipboard(text) {
  try {
    const decoded = decodeURIComponent(text);
    navigator.clipboard.writeText(decoded);
    toast('Copied to clipboard!', 'success');
  } catch (e) {
    console.error('copyToClipboard error:', e);
    toast('Failed to copy', 'error');
  }
}
