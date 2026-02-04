const DB = {
  db: null,
  user: null,

  init() {
    console.log('🔧 DB.init() START - v1007');
    firebase.initializeApp(CONFIG.firebase);
    this.db = firebase.firestore();

    // CRITICAL: Enable network for Firestore (prevent offline errors)
    this.db.enableNetwork().then(() => {
      console.log('✅ Firebase network enabled');
    }).catch(err => {
      console.log('⚠️ Firebase network enable failed:', err);
    });

    console.log('✅ Firebase initialized');

    // Check for persistent session (Remember Me)
    const savedLocal = localStorage.getItem('teamUser');
    const savedSession = sessionStorage.getItem('teamUser');
    const rememberMe = localStorage.getItem('teamRememberMe');

    console.log('💾 savedLocal:', savedLocal ? 'EXISTS' : 'NULL');
    console.log('💾 savedSession:', savedSession ? 'EXISTS' : 'NULL');
    console.log('💾 rememberMe:', rememberMe);

    if (savedLocal && rememberMe === 'true') {
      // Restore persistent session (Remember Me was ON)
      this.user = JSON.parse(savedLocal);
      console.log('🔐 Restored persistent session for:', this.user.id);
    } else if (savedSession && rememberMe === 'false') {
      // Restore temporary session (Remember Me was OFF)
      this.user = JSON.parse(savedSession);
      console.log('🔐 Restored temporary session for:', this.user.id);
    } else if (savedLocal && rememberMe === 'false') {
      // Old data in localStorage but Remember Me is OFF - clear it
      console.log('🧹 Clearing old localStorage (Remember Me is OFF)');
      localStorage.removeItem('teamUser');
      this.user = null;
    } else if (savedLocal) {
      // Old sessions (before Remember Me feature) - keep them for backwards compatibility
      this.user = JSON.parse(savedLocal);
      console.log('🔐 Restored legacy session for:', this.user.id);
    } else {
      console.log('❌ No saved session found');
      this.user = null;
    }

    console.log('🔧 DB.init() END - user:', this.user ? this.user.id : 'NULL');
  },

  async login(username, password, rememberMe = true) {
    console.log('🔐 DB.login() START');
    console.log('👤 Username:', username);
    console.log('💾 Remember Me:', rememberMe);

    try {
      console.log('📡 Fetching user from Firestore...');
      const doc = await this.db.collection('users').doc(username.toLowerCase()).get();

      console.log('📋 Document exists:', doc.exists);
      if (!doc.exists) {
        console.error('❌ User not found in Firestore');
        return { error: 'User not found' };
      }

      const data = doc.data();
      console.log('📄 User data retrieved:', { id: doc.id, role: data.role });

      if (data.password !== password) {
        console.error('❌ Wrong password');
        return { error: 'Wrong password' };
      }

      console.log('✅ Password correct!');
      this.user = { id: doc.id, ...data };

      // Save session based on Remember Me preference
      if (rememberMe) {
        console.log('💾 Saving to localStorage (Remember Me ON)');
        localStorage.setItem('teamUser', JSON.stringify(this.user));
        localStorage.setItem('teamRememberMe', 'true');
        localStorage.setItem('teamLoginTime', new Date().toISOString());
        console.log('✅ Session saved with Remember Me');
      } else {
        console.log('💾 Saving to sessionStorage (Remember Me OFF)');
        sessionStorage.setItem('teamUser', JSON.stringify(this.user));
        localStorage.setItem('teamRememberMe', 'false');
        console.log('✅ Temporary session saved');
      }

      console.log('🔐 DB.login() SUCCESS');
      return { success: true, user: this.user };
    } catch (e) {
      console.error('❌ DB.login() ERROR:', e);
      return { error: e.message };
    }
  },

  logout() {
    this.user = null;
    localStorage.removeItem('teamUser');
    localStorage.removeItem('teamRememberMe');
    localStorage.removeItem('teamLoginTime');
    sessionStorage.removeItem('teamUser');
    console.log('🔐 Logged out - all sessions cleared');
  },

  getUser() { return this.user; },
  isLoggedIn() { return this.user !== null; },

  async get(col, id) {
    const doc = await this.db.collection(col).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getAll(col, where = [], order = null, dir = 'desc', limit = null) {
    let ref = this.db.collection(col);
    where.forEach(w => ref = ref.where(w.field, w.op || '==', w.value));
    if (order) ref = ref.orderBy(order, dir);
    if (limit) ref = ref.limit(limit);
    const snap = await ref.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async add(col, data) {
    const ref = await this.db.collection(col).add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: this.user?.id || null
    });
    return { id: ref.id, ...data };
  },

  async set(col, id, data) {
    await this.db.collection(col).doc(id).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { id, ...data };
  },

  async update(col, id, data) {
    await this.db.collection(col).doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async delete(col, id) {
    await this.db.collection(col).doc(id).delete();
  },

  // Helpers
  async getDailyLog(userId, date) {
    return this.get('daily_logs', `${userId}_${date}`);
  },

  async saveDailyLog(userId, date, data) {
    return this.set('daily_logs', `${userId}_${date}`, { userId, date, ...data });
  },

  async getDailyTasks(userId, date) {
    return this.getAll('daily_tasks', [
      { field: 'userId', value: userId },
      { field: 'date', value: date }
    ]);
  },

  async getTaskPresets() {
    return this.getAll('task_presets', [], 'order', 'asc');
  },

  async getPayroll(userId = null) {
    const w = userId ? [{ field: 'userId', value: userId }] : [];
    return this.getAll('payroll', w, 'createdAt', 'desc');
  },

  async getWallets(userId = null) {
    const w = userId ? [{ field: 'userId', value: userId }] : [];
    return this.getAll('wallets', w);
  },

  async getAccounts(type = null, userId = null) {
    const w = [];
    if (type) w.push({ field: 'type', value: type });
    if (userId) w.push({ field: 'userId', value: userId });
    return this.getAll('accounts', w);
  },

  async getModels(status = null) {
    const w = status ? [{ field: 'status', value: status }] : [];
    return this.getAll('models', w, 'createdAt', 'desc');
  },

  async getContent(status = null) {
    const w = status ? [{ field: 'status', value: status }] : [];
    return this.getAll('content', w, 'createdAt', 'desc');
  },

  async getScripts(type = null) {
    const w = type ? [{ field: 'type', value: type }] : [];
    return this.getAll('scripts', w);
  },

  async getOutseekerLogs(userId = null) {
    const w = userId ? [{ field: 'userId', value: userId }] : [];
    return this.getAll('outseeker_logs', w, 'date', 'desc', 30);
  },

  async getKnowledge() {
    return this.getAll('knowledge_base');
  },

  async getVoiceNotes(userId = null) {
    const w = userId ? [{ field: 'userId', value: userId }] : [];
    return this.getAll('voice_notes', w, 'createdAt', 'desc');
  },

  async getUncertain() {
    return this.getAll('uncertain_questions', [{ field: 'answered', value: false }]);
  },

  async getAiSessions(userId) {
    return this.getAll('ai_sessions', [{ field: 'userId', value: userId }], 'updatedAt', 'desc');
  },

  async getAiMessages(sessionId) {
    return this.getAll('ai_messages', [{ field: 'sessionId', value: sessionId }], 'createdAt', 'asc');
  },

  async getSetting(key) {
    return this.get('settings', key);
  },

  async saveSetting(key, data) {
    return this.set('settings', key, data);
  }
};
