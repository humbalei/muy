// ============================================
// MODAL CASES FOR OUTREACH - ADD TO MODAL FUNCTION
// ============================================

// Add these cases to your modal(type, data) function's switch statement

case 'outreach-acc':
  title.textContent = `Add ${data.charAt(0).toUpperCase() + data.slice(1)} Account`;
  if (data === 'webcam') {
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Username:</label>
        <input type="text" class="form-input" id="accUser" placeholder="Enter username">
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
      <button class="btn btn-primary" onclick="saveOutreachAcc('webcam')">Save Account</button>
    `;
  } else {
    // Instagram or Twitter
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Username:</label>
        <input type="text" class="form-input" id="accUser" placeholder="Enter username">
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
          <option value="true">Healthy</option>
          <option value="false">Expired</option>
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
      <button class="btn btn-primary" onclick="updateOutreachAcc('webcam')">Update Account</button>
    `;
  } else {
    // Instagram or Twitter
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
      <button class="btn btn-primary" onclick="updateOutreachAcc('${data.type}')">Update Account</button>
    `;
  }
  break;

case 'outseeker':
  title.textContent = 'Log Outseeker Data';
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Active OF Accounts:</label>
      <input type="number" class="form-input" id="osAcc" value="0" min="0">
    </div>
    <div class="form-group">
      <label class="form-label">USA Running Today:</label>
      <input type="number" class="form-input" id="osUSAIn" value="0" min="0">
    </div>
    <div class="form-group">
      <label class="form-label">ESP Running Today:</label>
      <input type="number" class="form-input" id="osESPIn" value="0" min="0">
    </div>
    <div class="form-group">
      <label class="form-label">Accounts Outreached Today:</label>
      <input type="number" class="form-input" id="osOutreached" value="0" min="0">
    </div>
    <button class="btn btn-primary" onclick="saveOutseeker()">Save Data</button>
  `;
  break;
