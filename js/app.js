/**
 * Main Application Module for CurrentCircle
 * Handles core functionality and state management
 */

const App = (() => {
    // Application state
    let state = {
        initialized: false,
        profile: null,
        identity: null,
        connections: [],
        messages: {
            received: [],
            sent: [],
            relays: []
        },
        activeConnection: null
    };

    /**
     * Initialize the application
     * @returns {Promise} - Resolves when app is initialized
     */
    const init = async () => {
        try {
            // Initialize database
            await DB.init();
            
            // Load user profile if exists
            const profile = await DB.getProfile();
            if (profile) {
                state.profile = profile;
                state.identity = profile.identity;
                state.initialized = true;
                
                // Load connections and messages
                await loadConnections();
                await loadMessages();
                
                // Check for expired connections
                cleanupExpiredConnections();
                
                // Show the home screen
                UI.showScreen('home-screen');
                UI.updateProfileDisplay(profile);
                
                // Initialize connection graph
                UI.initConnectionGraph(state.connections, profile);
            } else {
                // Show setup screen for new users
                UI.showScreen('setup-screen');
            }
            
            // Parse URL parameters (for onboarding)
            checkUrlParameters();
            
            // Initialize event listeners
            UI.initEventListeners();
            Connect.init();
            Messages.init();
            
            return true;
        } catch (error) {
            console.error('App initialization failed:', error);
            return false;
        }
    };

    /**
     * Create a new user profile
     * @param {Object} profileData - Profile data from setup form
     * @returns {Promise} - Resolves with the created profile
     */
    const createProfile = async (profileData) => {
        try {
            // Create identity
            const identity = Crypto.createIdentity();
            
            // Create profile object
            const profile = {
                id: uuid.v4(),
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                nickname: profileData.nickname,
                bio: profileData.bio,
                profilePicture: profileData.profilePicture,
                identity: identity,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };
            
            // Save to database
            await DB.saveProfile(profile);
            
            // Update application state
            state.profile = profile;
            state.identity = identity;
            state.initialized = true;
            
            return profile;
        } catch (error) {
            console.error('Profile creation failed:', error);
            throw error;
        }
    };

    /**
     * Update the user's profile
     * @param {Object} profileData - Updated profile data
     * @returns {Promise} - Resolves with the updated profile
     */
    const updateProfile = async (profileData) => {
        try {
            // Get current profile
            const currentProfile = state.profile;
            
            // Update profile fields
            const updatedProfile = {
                ...currentProfile,
                firstName: profileData.firstName || currentProfile.firstName,
                lastName: profileData.lastName || currentProfile.lastName,
                nickname: profileData.nickname || currentProfile.nickname,
                bio: profileData.bio || currentProfile.bio,
                profilePicture: profileData.profilePicture || currentProfile.profilePicture,
                updated: new Date().toISOString()
            };
            
            // Save to database
            await DB.saveProfile(updatedProfile);
            
            // Update application state
            state.profile = updatedProfile;
            
            return updatedProfile;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    };

    /**
     * Load all connections from the database
     * @returns {Promise} - Resolves when connections are loaded
     */
    const loadConnections = async () => {
        try {
            const connections = await DB.getAllConnections();
            state.connections = connections;
            return connections;
        } catch (error) {
            console.error('Loading connections failed:', error);
            throw error;
        }
    };

    /**
     * Load all messages from the database
     * @returns {Promise} - Resolves when messages are loaded
     */
    const loadMessages = async () => {
        try {
            // Get user DID
            const userDID = state.identity.did;
            
            // Load received messages
            const received = await DB.getReceivedMessages(userDID);
            
            // Load sent messages
            const sent = await DB.getSentMessages(userDID);
            
            // Load relay messages
            const relays = await DB.getAllRelays();
            
            // Update state
            state.messages = {
                received,
                sent,
                relays
            };
            
            // Update UI
            UI.updateMessageCounts(received.length, sent.length, relays.length);
            
            return state.messages;
        } catch (error) {
            console.error('Loading messages failed:', error);
            throw error;
        }
    };

    /**
     * Add a new connection
     * @param {Object} connectionData - Connection data from QR code/WebRTC
     * @returns {Promise} - Resolves with the created connection
     */
    const addConnection = async (connectionData) => {
        try {
            // Check if this connection already exists
            const existingConnection = await DB.getConnectionByDID(connectionData.did);
            
            if (existingConnection) {
                // Update the existing connection
                return updateExistingConnection(existingConnection, connectionData);
            } else {
                // Create a new connection
                return createNewConnection(connectionData);
            }
        } catch (error) {
            console.error('Adding connection failed:', error);
            throw error;
        }
    };

    /**
     * Create a new connection
     * @param {Object} connectionData - Connection data
     * @returns {Promise} - Resolves with the created connection
     */
    const createNewConnection = async (connectionData) => {
        // Calculate expiration date (1 year from now)
        const expiresOn = new Date();
        expiresOn.setFullYear(expiresOn.getFullYear() + 1);
        
        // Create connection object
        const connection = {
            id: uuid.v4(),
            did: connectionData.did,
            publicKey: connectionData.publicKey,
            firstName: connectionData.profile.firstName,
            lastName: connectionData.profile.lastName,
            nickname: connectionData.profile.nickname,
            bio: connectionData.profile.bio,
            profilePicture: connectionData.profilePicture || null,
            firstConnected: new Date().toISOString(),
            lastConnected: new Date().toISOString(),
            expiresOn: expiresOn.toISOString(),
            connectionCount: 1,
            backupData: Crypto.createBackupData(state.profile, state.identity)
        };
        
        // Save to database
        await DB.saveConnection(connection);
        
        // Update state
        state.connections.push(connection);
        
        // Update UI
        UI.updateConnectionsList(state.connections);
        UI.updateConnectionGraph(state.connections, state.profile);
        
        return connection;
    };

    /**
     * Update an existing connection
     * @param {Object} existingConnection - Existing connection object
     * @param {Object} newData - New connection data
     * @returns {Promise} - Resolves with the updated connection
     */
    const updateExistingConnection = async (existingConnection, newData) => {
        // Calculate new expiration date (1 year from now)
        const expiresOn = new Date();
        expiresOn.setFullYear(expiresOn.getFullYear() + 1);
        
        // Update connection object
        const updatedConnection = {
            ...existingConnection,
            publicKey: newData.publicKey || existingConnection.publicKey,
            firstName: newData.profile.firstName || existingConnection.firstName,
            lastName: newData.profile.lastName || existingConnection.lastName,
            nickname: newData.profile.nickname || existingConnection.nickname,
            bio: newData.profile.bio || existingConnection.bio,
            lastConnected: new Date().toISOString(),
            expiresOn: expiresOn.toISOString(),
            connectionCount: existingConnection.connectionCount + 1,
            backupData: Crypto.createBackupData(state.profile, state.identity)
        };
        
        // Update profile picture if provided
        if (newData.profilePicture) {
            updatedConnection.profilePicture = newData.profilePicture;
        }
        
        // Save to database
        await DB.saveConnection(updatedConnection);
        
        // Update state
        const index = state.connections.findIndex(c => c.id === updatedConnection.id);
        if (index !== -1) {
            state.connections[index] = updatedConnection;
        }
        
        // Update UI
        UI.updateConnectionsList(state.connections);
        UI.updateConnectionGraph(state.connections, state.profile);
        
        return updatedConnection;
    };

    /**
     * Remove a connection
     * @param {string} connectionId - Connection ID to remove
     * @returns {Promise} - Resolves when connection is removed
     */
    const removeConnection = async (connectionId) => {
        try {
            // Remove from database
            await DB.deleteConnection(connectionId);
            
            // Update state
            state.connections = state.connections.filter(c => c.id !== connectionId);
            
            // Update UI
            UI.updateConnectionsList(state.connections);
            UI.updateConnectionGraph(state.connections, state.profile);
            
            return true;
        } catch (error) {
            console.error('Removing connection failed:', error);
            throw error;
        }
    };

    /**
     * Check for and clean up expired connections
     * @returns {Promise} - Resolves when cleanup is complete
     */
    const cleanupExpiredConnections = async () => {
        try {
            // Get expired connections
            const expiredConnections = await DB.getExpiredConnections();
            
            // Remove each expired connection
            for (const connection of expiredConnections) {
                await removeConnection(connection.id);
            }
            
            return expiredConnections.length;
        } catch (error) {
            console.error('Connection cleanup failed:', error);
            throw error;
        }
    };

    /**
     * Create and send a message
     * @param {Object} messageData - Message data
     * @returns {Promise} - Resolves with the created message
     */
    const createMessage = async (messageData) => {
        try {
            // Get recipient connection
            const recipient = await DB.getConnection(messageData.recipientId);
            
            if (!recipient) {
                throw new Error('Recipient not found');
            }
            
            // Create message object
            const message = {
                id: uuid.v4(),
                senderId: state.identity.did,
                senderName: `${state.profile.firstName} ${state.profile.lastName}`,
                recipientId: recipient.did,
                recipientName: `${recipient.firstName} ${recipient.lastName}`,
                content: messageData.content,
                encrypted: Crypto.encryptMessage(messageData.content, recipient.publicKey),
                timestamp: new Date().toISOString(),
                status: 'sent',
                isRelay: messageData.isRelay || false
            };
            
            // Save to database
            await DB.saveMessage(message);
            
            // Update state
            state.messages.sent.push(message);
            
            // If relay is needed, create a relay entry
            if (messageData.isRelay) {
                await createRelay(message, recipient);
            }
            
            // Update UI
            UI.updateMessageLists(state.messages);
            
            return message;
        } catch (error) {
            console.error('Message creation failed:', error);
            throw error;
        }
    };

    /**
     * Create a relay message
     * @param {Object} message - Original message
     * @param {Object} recipient - Target recipient
     * @returns {Promise} - Resolves with the created relay
     */
    const createRelay = async (message, recipient) => {
        // Create relay object
        const relay = {
            id: uuid.v4(),
            messageId: message.id,
            originalSenderId: message.senderId,
            originalSenderName: message.senderName,
            targetRecipientId: recipient.did,
            targetRecipientName: `${recipient.firstName} ${recipient.lastName}`,
            encryptedContent: message.encrypted,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        // Save to database
        await DB.saveRelay(relay);
        
        // Update state
        state.messages.relays.push(relay);
        
        // Update UI
        UI.updateRelayCount(state.messages.relays.length);
        
        return relay;
    };

    /**
     * Process received messages from WebRTC connection
     * @param {Array} messages - Array of received messages
     * @returns {Promise} - Resolves when processing is complete
     */
    const processReceivedMessages = async (messages) => {
        try {
            // Process each message
            for (const message of messages) {
                // Check if message already exists
                const existingMessage = state.messages.received.find(m => m.id === message.id);
                
                if (!existingMessage) {
                    // Decrypt the message content
                    message.content = Crypto.decryptMessage(
                        message.encrypted, 
                        state.identity.privateKey
                    );
                    
                    // Save to database
                    await DB.saveMessage(message);
                    
                    // Add to state
                    state.messages.received.push(message);
                }
            }
            
            // Update UI
            UI.updateMessageLists(state.messages);
            
            return messages.length;
        } catch (error) {
            console.error('Processing received messages failed:', error);
            throw error;
        }
    };

    /**
     * Process relay messages for connections
     * @param {Object} connection - Connection to check for relays
     * @returns {Promise} - Resolves with array of delivered relays
     */
    const processRelaysForConnection = async (connection) => {
        try {
            // Find relays for this connection
            const relaysToDeliver = state.messages.relays.filter(
                r => r.targetRecipientId === connection.did
            );
            
            if (relaysToDeliver.length === 0) {
                return [];
            }
            
            // Process each relay
            const deliveredRelays = [];
            
            for (const relay of relaysToDeliver) {
                // Create message from relay
                const message = {
                    id: uuid.v4(),
                    senderId: relay.originalSenderId,
                    senderName: relay.originalSenderName,
                    recipientId: relay.targetRecipientId,
                    recipientName: relay.targetRecipientName,
                    encrypted: relay.encryptedContent,
                    timestamp: new Date().toISOString(),
                    status: 'delivered',
                    isRelay: true
                };
                
                // Remove relay from database
                await DB.deleteRelay(relay.id);
                
                // Remove from state
                state.messages.relays = state.messages.relays.filter(r => r.id !== relay.id);
                
                // Add to delivered list
                deliveredRelays.push(message);
            }
            
            // Update UI
            UI.updateRelayCount(state.messages.relays.length);
            
            return deliveredRelays;
        } catch (error) {
            console.error('Processing relays failed:', error);
            throw error;
        }
    };

    /**
     * Prepare connection QR data
     * @returns {Promise<string>} - Resolves with QR data string
     */
    const prepareConnectionQRData = async () => {
        try {
            // This is a placeholder - actual implementation is now in Connect module
            // which calls WebRTC to create the connection offer
            return JSON.stringify({
                type: 'connection',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Preparing QR data failed:', error);
            throw error;
        }
    };

    /**
     * Prepare onboarding QR code data
     * @returns {Promise<string>} - Resolves with QR data string
     */
    const prepareOnboardingQRData = async () => {
        try {
            // Get user profile and identity
            const profile = state.profile;
            const identity = state.identity;
            
            // Create onboarding data
            const qrData = Crypto.createOnboardingQRData(profile, identity);
            
            return qrData;
        } catch (error) {
            console.error('Preparing onboarding QR data failed:', error);
            throw error;
        }
    };

    /**
     * Check URL parameters for onboarding
     */
    const checkUrlParameters = () => {
        const params = new URLSearchParams(window.location.search);
        
        // Check if this is an onboarding URL
        if (params.get('type') === 'onboarding') {
            const referrerDID = params.get('did');
            const referrerName = params.get('name');
            
            if (referrerDID && referrerName) {
                // Store onboarding data to connect after setup
                localStorage.setItem('onboarding', JSON.stringify({
                    did: referrerDID,
                    name: referrerName,
                    timestamp: new Date().toISOString()
                }));
                
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };

    /**
     * Export user identity
     * @param {string} password - Password to encrypt the export
     * @returns {string} - Encrypted identity string
     */
    const exportIdentity = (password) => {
        try {
            return Crypto.exportIdentity(state.identity, password);
        } catch (error) {
            console.error('Identity export failed:', error);
            throw error;
        }
    };

    /**
     * Import user identity
     * @param {string} encryptedIdentity - Encrypted identity string
     * @param {string} password - Password to decrypt the import
     * @returns {Promise} - Resolves with imported profile
     */
    const importIdentity = async (encryptedIdentity, password) => {
        try {
            // Decrypt identity
            const identity = Crypto.importIdentity(encryptedIdentity, password);
            
            if (!identity) {
                throw new Error('Invalid identity or password');
            }
            
            // Check if profile exists
            let profile = await DB.getProfile();
            
            if (profile) {
                // Update existing profile with new identity
                profile.identity = identity;
                profile.updated = new Date().toISOString();
            } else {
                // Create minimal profile with imported identity
                profile = {
                    id: uuid.v4(),
                    firstName: 'Imported',
                    lastName: 'User',
                    nickname: '',
                    bio: '',
                    profilePicture: null,
                    identity: identity,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };
            }
            
            // Save profile
            await DB.saveProfile(profile);
            
            // Update state
            state.profile = profile;
            state.identity = identity;
            state.initialized = true;
            
            return profile;
        } catch (error) {
            console.error('Identity import failed:', error);
            throw error;
        }
    };

    /**
     * Process data received during WebRTC connection
     * @param {Object} data - Received data object
     * @returns {Promise} - Resolves when processing is complete
     */
    const processReceivedData = async (data) => {
        try {
            // Process profile and create/update connection
            if (data.profile && data.profile.did) {
                await addConnection({
                    did: data.profile.did,
                    publicKey: data.profile.publicKey,
                    profile: {
                        firstName: data.profile.firstName,
                        lastName: data.profile.lastName,
                        nickname: data.profile.nickname,
                        bio: data.profile.bio
                    },
                    profilePicture: data.profilePicture || null
                });
            }
            
            // Process connections (second-degree)
            // In a real app, we would add these to a separate store
            // For this demo, we'll just log them
            if (data.connections && data.connections.length > 0) {
                console.log(`Received ${data.connections.length} second-degree connections`);
            }
            
            // Process messages
            if (data.messages && data.messages.length > 0) {
                await processReceivedMessages(data.messages);
            }
            
            // Process relays
            if (data.relays && data.relays.length > 0) {
                for (const relay of data.relays) {
                    // Save as regular message
                    const message = {
                        id: relay.id || uuid.v4(),
                        senderId: relay.senderId,
                        senderName: relay.senderName,
                        recipientId: state.identity.did,
                        recipientName: `${state.profile.firstName} ${state.profile.lastName}`,
                        encrypted: relay.encrypted,
                        timestamp: relay.timestamp || new Date().toISOString(),
                        status: 'received',
                        isRelay: true
                    };
                    
                    // Decrypt content
                    message.content = Crypto.decryptMessage(
                        message.encrypted,
                        state.identity.privateKey
                    );
                    
                    // Save to database
                    await DB.saveMessage(message);
                    
                    // Add to state
                    state.messages.received.push(message);
                }
                
                // Update UI
                UI.updateMessageLists(state.messages);
            }
            
            return true;
        } catch (error) {
            console.error('Processing received data failed:', error);
            throw error;
        }
    };

    // Public API
    return {
        init,
        createProfile,
        updateProfile,
        addConnection,
        removeConnection,
        createMessage,
        prepareConnectionQRData,
        prepareOnboardingQRData,
        processReceivedData,
        processReceivedMessages,
        processRelaysForConnection,
        exportIdentity,
        importIdentity,
        getState: () => ({ ...state }) // Return a copy of the state
    };
    })();

    // Initialize the app when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(error => {
        console.error('Application initialization failed:', error);
        alert('Failed to initialize the app. Please check console for details.');
    });
});
