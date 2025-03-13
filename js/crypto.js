/**
 * Cryptography Module for CurrentCircle
 * Handles encryption, decryption, and DID (Decentralized Identifier) operations
 */

const Crypto = (() => {
    // Salt for key derivation
    const SALT = 'CurrentCircle_v1_';
    
    /**
     * Generate a new Decentralized Identifier (DID)
     * @returns {string} - A unique DID
     */
    const generateDID = () => {
        // Generate a UUID v4 and prefix it with 'did:cc:'
        return 'did:cc:' + uuid.v4();
    };
    
    /**
     * Generate key pair for asymmetric encryption
     * @returns {Object} - Contains publicKey and privateKey
     */
    const generateKeyPair = () => {
        // For simplicity in this demo, we'll use a derived RSA-like approach
        const privateKey = CryptoJS.lib.WordArray.random(32).toString();
        const publicKey = CryptoJS.SHA256(privateKey).toString();
        
        return {
            publicKey,
            privateKey
        };
    };
    
    /**
     * Create a complete identity object
     * @param {string} did - Optional DID (generates new one if not provided)
     * @returns {Object} - Complete identity object
     */
    const createIdentity = (did = null) => {
        const keyPair = generateKeyPair();
        return {
            did: did || generateDID(),
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            created: new Date().toISOString()
        };
    };
    
    /**
     * Encrypt a message using AES encryption
     * @param {string} message - The message to encrypt
     * @param {string} key - Encryption key (recipient's public key)
     * @returns {string} - Encrypted message
     */
    const encryptMessage = (message, key) => {
        const encrypted = CryptoJS.AES.encrypt(message, key).toString();
        return encrypted;
    };
    
    /**
     * Decrypt a message using AES decryption
     * @param {string} encryptedMessage - The encrypted message
     * @param {string} key - Decryption key (recipient's private key)
     * @returns {string} - Decrypted message
     */
    const decryptMessage = (encryptedMessage, key) => {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key).toString(CryptoJS.enc.Utf8);
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    };
    
    /**
     * Export identity as a secure string
     * @param {Object} identity - The identity object
     * @param {string} password - Password to encrypt the export
     * @returns {string} - Encrypted identity string
     */
    const exportIdentity = (identity, password) => {
        const identityString = JSON.stringify(identity);
        const encrypted = CryptoJS.AES.encrypt(identityString, SALT + password).toString();
        return encrypted;
    };
    
    /**
     * Import identity from a secure string
     * @param {string} encryptedIdentity - Encrypted identity string
     * @param {string} password - Password to decrypt the import
     * @returns {Object|null} - Decrypted identity object or null if failed
     */
    const importIdentity = (encryptedIdentity, password) => {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedIdentity, SALT + password).toString(CryptoJS.enc.Utf8);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Identity import failed:', error);
            return null;
        }
    };
    
    /**
     * Create a QR code data string for identity
     * @param {Object} profile - User profile
     * @param {Object} identity - Identity object
     * @returns {string} - JSON string for QR code
     */
    const createConnectionQRData = (profile, identity) => {
        const qrData = {
            type: 'connection',
            did: identity.did,
            publicKey: identity.publicKey,
            profile: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                nickname: profile.nickname,
                bio: profile.bio,
                profilePicture: profile.profilePicture ? true : false // Only include flag, not actual image
            },
            timestamp: new Date().toISOString()
        };
        
        return JSON.stringify(qrData);
    };
    
    /**
     * Create an onboarding QR code for non-users
     * @param {Object} profile - User profile
     * @param {Object} identity - Identity object
     * @returns {string} - URL for QR code
     */
    const createOnboardingQRData = (profile, identity) => {
        // Create a URL with profile info embedded
        const baseUrl = window.location.origin;
        const params = new URLSearchParams();
        params.append('type', 'onboarding');
        params.append('did', identity.did);
        params.append('pubKey', identity.publicKey);
        params.append('name', `${profile.firstName} ${profile.lastName}`);
        params.append('referrer', profile.id);
        
        return `${baseUrl}?${params.toString()}`;
    };
    
    /**
     * Verify DID ownership using asymmetric cryptography
     * @param {string} did - Decentralized Identifier to verify
     * @param {string} publicKey - Public key associated with the DID
     * @param {string} challenge - Challenge string
     * @param {string} signature - Signature of the challenge
     * @returns {boolean} - True if verification succeeds
     */
    const verifyDID = (did, publicKey, challenge, signature) => {
        // For demo purposes, we'll do a simplified verification
        // In a real implementation, this would use proper asymmetric verification
        const expectedSignature = CryptoJS.HmacSHA256(challenge, publicKey).toString();
        return signature === expectedSignature;
    };
    
    /**
     * Sign a challenge string using private key
     * @param {string} challenge - Challenge string to sign
     * @param {string} privateKey - Private key for signing
     * @returns {string} - Signature
     */
    const signChallenge = (challenge, privateKey) => {
        // For demo purposes, we'll do a simplified signing
        // In a real implementation, this would use proper asymmetric signing
        return CryptoJS.HmacSHA256(challenge, privateKey).toString();
    };
    
    /**
     * Generate a random challenge string
     * @returns {string} - Random challenge
     */
    const generateChallenge = () => {
        return CryptoJS.lib.WordArray.random(16).toString();
    };
    
    /**
     * Hash sensitive data for storage or comparison
     * @param {string} data - Data to hash
     * @returns {string} - Hash of the data
     */
    const hashData = (data) => {
        return CryptoJS.SHA256(data).toString();
    };

    /**
     * Create a backup data package for a connection
     * @param {Object} profile - User profile
     * @param {Object} identity - User identity
     * @returns {string} - Encrypted backup data
     */
    const createBackupData = (profile, identity) => {
        // Create a backup package with essential data
        const backupData = {
            profile: {
                id: profile.id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                nickname: profile.nickname,
                bio: profile.bio,
                // Don't include profile picture in backup to reduce size
            },
            identity: {
                did: identity.did,
                publicKey: identity.publicKey,
                privateKey: identity.privateKey,
                created: identity.created
            },
            backupDate: new Date().toISOString()
        };
        
        // Encrypt with the user's public key
        return encryptMessage(JSON.stringify(backupData), identity.publicKey);
    };
    
    /**
     * Decrypt a backup data package
     * @param {string} encryptedBackup - Encrypted backup data
     * @param {string} privateKey - Private key to decrypt
     * @returns {Object|null} - Decrypted backup data or null if failed
     */
    const decryptBackupData = (encryptedBackup, privateKey) => {
        try {
            const decrypted = decryptMessage(encryptedBackup, privateKey);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Backup decryption failed:', error);
            return null;
        }
    };
    
    // Public API
    return {
        generateDID,
        generateKeyPair,
        createIdentity,
        encryptMessage,
        decryptMessage,
        exportIdentity,
        importIdentity,
        createConnectionQRData,
        createOnboardingQRData,
        verifyDID,
        signChallenge,
        generateChallenge,
        hashData,
        createBackupData,
        decryptBackupData
    };
})();
