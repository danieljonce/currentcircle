/**
 * Database Module for CurrentCircle
 * Handles IndexedDB operations for user profile, connections, and messages
 */

const DB = (() => {
    const DB_NAME = 'currentCircleDB';
    const DB_VERSION = 1;
    let db;

    // Object stores (tables)
    const STORES = {
        PROFILE: 'profile',
        CONNECTIONS: 'connections',
        MESSAGES: 'messages',
        RELAYS: 'relays'
    };

    /**
     * Initialize the database
     * @returns {Promise} - Resolves when DB is ready
     */
    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // Handle database upgrades (structure changes)
            request.onupgradeneeded = (event) => {
                db = event.target.result;
                console.log('Creating database structure...');

                // Create Profile store
                if (!db.objectStoreNames.contains(STORES.PROFILE)) {
                    const profileStore = db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
                    profileStore.createIndex('did', 'did', { unique: true });
                }

                // Create Connections store
                if (!db.objectStoreNames.contains(STORES.CONNECTIONS)) {
                    const connectionsStore = db.createObjectStore(STORES.CONNECTIONS, { keyPath: 'id' });
                    connectionsStore.createIndex('did', 'did', { unique: true });
                    connectionsStore.createIndex('lastConnected', 'lastConnected', { unique: false });
                    connectionsStore.createIndex('expiresOn', 'expiresOn', { unique: false });
                }

                // Create Messages store
                if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
                    const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
                    messagesStore.createIndex('senderId', 'senderId', { unique: false });
                    messagesStore.createIndex('recipientId', 'recipientId', { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    messagesStore.createIndex('status', 'status', { unique: false });
                }

                // Create Relays store
                if (!db.objectStoreNames.contains(STORES.RELAYS)) {
                    const relaysStore = db.createObjectStore(STORES.RELAYS, { keyPath: 'id' });
                    relaysStore.createIndex('originalSenderId', 'originalSenderId', { unique: false });
                    relaysStore.createIndex('targetRecipientId', 'targetRecipientId', { unique: false });
                    relaysStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            // Handle success
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database initialized successfully');
                resolve(db);
            };

            // Handle errors
            request.onerror = (event) => {
                console.error('Database initialization error:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Perform a database transaction
     * @param {string} storeName - Name of the object store
     * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
     * @param {Function} callback - Function to execute with the transaction
     * @returns {Promise} - Resolves with the result of the callback
     */
    const transaction = (storeName, mode, callback) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);

            // Call the callback with the store object
            const result = callback(store);

            // Handle transaction completion
            tx.oncomplete = () => resolve(result);
            tx.onerror = (event) => reject(event.target.error);
        });
    };

    /**
     * Save the user's profile
     * @param {Object} profile - User profile object
     * @returns {Promise} - Resolves when profile is saved
     */
    const saveProfile = (profile) => {
        return transaction(STORES.PROFILE, 'readwrite', (store) => {
            // Only one profile record should exist
            return store.put(profile);
        });
    };

    /**
     * Get the user's profile
     * @returns {Promise} - Resolves with the profile object or null if not found
     */
    const getProfile = () => {
        return transaction(STORES.PROFILE, 'readonly', (store) => {
            return new Promise((resolve) => {
                // Get all profiles (should only be one)
                const request = store.getAll();
                request.onsuccess = () => {
                    // Return the first profile or null
                    resolve(request.result.length > 0 ? request.result[0] : null);
                };
            });
        });
    };

    /**
     * Save a connection
     * @param {Object} connection - Connection object
     * @returns {Promise} - Resolves when connection is saved
     */
    const saveConnection = (connection) => {
        return transaction(STORES.CONNECTIONS, 'readwrite', (store) => {
            return store.put(connection);
        });
    };

    /**
     * Get all connections
     * @returns {Promise} - Resolves with an array of connections
     */
    const getAllConnections = () => {
        return transaction(STORES.CONNECTIONS, 'readonly', (store) => {
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Get a connection by ID
     * @param {string} id - Connection ID
     * @returns {Promise} - Resolves with the connection or null if not found
     */
    const getConnection = (id) => {
        return transaction(STORES.CONNECTIONS, 'readonly', (store) => {
            return new Promise((resolve) => {
                const request = store.get(id);
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
            });
        });
    };

    /**
     * Get a connection by DID
     * @param {string} did - Decentralized Identifier
     * @returns {Promise} - Resolves with the connection or null if not found
     */
    const getConnectionByDID = (did) => {
        return transaction(STORES.CONNECTIONS, 'readonly', (store) => {
            return new Promise((resolve) => {
                const index = store.index('did');
                const request = index.get(did);
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
            });
        });
    };

    /**
     * Delete a connection
     * @param {string} id - Connection ID
     * @returns {Promise} - Resolves when connection is deleted
     */
    const deleteConnection = (id) => {
        return transaction(STORES.CONNECTIONS, 'readwrite', (store) => {
            return store.delete(id);
        });
    };

    /**
     * Get connections close to expiration
     * @param {number} withinDays - Number of days to expiration
     * @returns {Promise} - Resolves with an array of connections
     */
    const getConnectionsNearExpiration = (withinDays) => {
        return getAllConnections().then(connections => {
            const now = new Date();
            const threshold = new Date();
            threshold.setDate(threshold.getDate() + withinDays);

            return connections.filter(conn => {
                const expiryDate = new Date(conn.expiresOn);
                return expiryDate > now && expiryDate < threshold;
            });
        });
    };

    /**
     * Get expired connections
     * @returns {Promise} - Resolves with an array of expired connections
     */
    const getExpiredConnections = () => {
        return getAllConnections().then(connections => {
            const now = new Date();
            return connections.filter(conn => {
                return new Date(conn.expiresOn) < now;
            });
        });
    };

    /**
     * Save a message
     * @param {Object} message - Message object
     * @returns {Promise} - Resolves when message is saved
     */
    const saveMessage = (message) => {
        return transaction(STORES.MESSAGES, 'readwrite', (store) => {
            return store.put(message);
        });
    };

    /**
     * Get all messages
     * @returns {Promise} - Resolves with an array of messages
     */
    const getAllMessages = () => {
        return transaction(STORES.MESSAGES, 'readonly', (store) => {
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Get received messages
     * @param {string} recipientId - Recipient ID (user's DID)
     * @returns {Promise} - Resolves with an array of messages
     */
    const getReceivedMessages = (recipientId) => {
        return transaction(STORES.MESSAGES, 'readonly', (store) => {
            return new Promise((resolve) => {
                const index = store.index('recipientId');
                const request = index.getAll(recipientId);
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Get sent messages
     * @param {string} senderId - Sender ID (user's DID)
     * @returns {Promise} - Resolves with an array of messages
     */
    const getSentMessages = (senderId) => {
        return transaction(STORES.MESSAGES, 'readonly', (store) => {
            return new Promise((resolve) => {
                const index = store.index('senderId');
                const request = index.getAll(senderId);
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Save a relay message
     * @param {Object} relay - Relay message object
     * @returns {Promise} - Resolves when relay is saved
     */
    const saveRelay = (relay) => {
        return transaction(STORES.RELAYS, 'readwrite', (store) => {
            return store.put(relay);
        });
    };

    /**
     * Get all relay messages
     * @returns {Promise} - Resolves with an array of relay messages
     */
    const getAllRelays = () => {
        return transaction(STORES.RELAYS, 'readonly', (store) => {
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Get relay messages for a specific recipient
     * @param {string} targetRecipientId - Target recipient ID
     * @returns {Promise} - Resolves with an array of relay messages
     */
    const getRelaysForRecipient = (targetRecipientId) => {
        return transaction(STORES.RELAYS, 'readonly', (store) => {
            return new Promise((resolve) => {
                const index = store.index('targetRecipientId');
                const request = index.getAll(targetRecipientId);
                request.onsuccess = () => {
                    resolve(request.result);
                };
            });
        });
    };

    /**
     * Delete a relay message
     * @param {string} id - Relay ID
     * @returns {Promise} - Resolves when relay is deleted
     */
    const deleteRelay = (id) => {
        return transaction(STORES.RELAYS, 'readwrite', (store) => {
            return store.delete(id);
        });
    };

    /**
     * Clear all data (for testing or reset)
     * @returns {Promise} - Resolves when all data is cleared
     */
    const clearAllData = () => {
        const promises = [
            transaction(STORES.PROFILE, 'readwrite', store => store.clear()),
            transaction(STORES.CONNECTIONS, 'readwrite', store => store.clear()),
            transaction(STORES.MESSAGES, 'readwrite', store => store.clear()),
            transaction(STORES.RELAYS, 'readwrite', store => store.clear())
        ];
        return Promise.all(promises);
    };

    // Public API
    return {
        init,
        saveProfile,
        getProfile,
        saveConnection,
        getAllConnections,
        getConnection,
        getConnectionByDID,
        deleteConnection,
        getConnectionsNearExpiration,
        getExpiredConnections,
        saveMessage,
        getAllMessages,
        getReceivedMessages,
        getSentMessages,
        saveRelay,
        getAllRelays,
        getRelaysForRecipient,
        deleteRelay,
        clearAllData,
        STORES
    };
})();
