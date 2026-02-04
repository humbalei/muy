/**
 * Crypto module for end-to-end encryption
 * Even with Firebase access, data is encrypted with master password
 */
const CRYPTO = {
  // Derive encryption key from password using PBKDF2
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  // Hash password for storage (one-way, can't be reversed)
  async hashPassword(password, salt = null) {
    const enc = new TextEncoder();
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
    } else if (typeof salt === 'string') {
      salt = this.base64ToBuffer(salt);
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return {
      hash: this.bufferToBase64(new Uint8Array(hash)),
      salt: this.bufferToBase64(salt)
    };
  },

  // Verify password against stored hash
  async verifyPassword(password, storedHash, salt) {
    const result = await this.hashPassword(password, salt);
    return result.hash === storedHash;
  },

  // Encrypt data with AES-GCM
  async encrypt(data, masterKey) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const key = await this.deriveKey(masterKey, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(JSON.stringify(data))
    );

    return {
      data: this.bufferToBase64(new Uint8Array(encrypted)),
      iv: this.bufferToBase64(iv),
      salt: this.bufferToBase64(salt)
    };
  },

  // Decrypt data
  async decrypt(encryptedObj, masterKey) {
    try {
      const salt = this.base64ToBuffer(encryptedObj.salt);
      const iv = this.base64ToBuffer(encryptedObj.iv);
      const data = this.base64ToBuffer(encryptedObj.data);

      const key = await this.deriveKey(masterKey, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (e) {
      console.error('Decryption failed:', e);
      return null;
    }
  },

  // Encrypt sensitive fields in object
  async encryptFields(obj, fields, masterKey) {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field] !== undefined) {
        result[field] = await this.encrypt(result[field], masterKey);
        result[field]._encrypted = true;
      }
    }
    return result;
  },

  // Decrypt sensitive fields in object
  async decryptFields(obj, fields, masterKey) {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field]?._encrypted) {
        result[field] = await this.decrypt(result[field], masterKey);
      }
    }
    return result;
  },

  // Helper: Buffer to Base64
  bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  // Helper: Base64 to Buffer
  base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  // Generate secure session token
  generateToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return this.bufferToBase64(bytes);
  }
};
