/**
 * Connect Module for CurrentCircle
 * Handles QR code generation, scanning, and establishing connections
 */

const Connect = (() => {
    // Connection status
    let scannerActive = false;
    let scannerStream = null;
    let qrCheckInterval = null;
    
    // Connection stages
    const STAGES = {
        INIT: 'init',
        OFFER_CREATED: 'offer_created',
        SCANNING: 'scanning',
        OFFER_SCANNED: 'offer_scanned',
        ANSWER_CREATED: 'answer_created',
        ANSWER_SCANNED: 'answer_scanned',
        CONNECTED: 'connected',
        EXCHANGING: 'exchanging',
        COMPLETE: 'complete',
        FAILED: 'failed'
    };
    
    // Current connection stage
    let connectionStage = STAGES.INIT;
    
    // Connection data
    let connectionData = null;
    let localDescription = null;
    let remoteDescription = null;
    let answerQrCode = null;
    
    /**
     * Initialize the connect module
     */
    const init = () => {
        // Initialize WebRTC module
        WebRTC.init({
            onConnectionStateChange: handleConnectionStateChange,
            onDataReceived: handleDataReceived,
            onLocalDescriptionGenerated: handleLocalDescriptionGenerated
        });
        
        // Generate initial QR code
        generateQRCode();
    };
    
    /**
     * Generate QR code for connection
     */
    const generateQRCode = async () => {
        try {
            const qrElement = document.getElementById('qrcode');
            if (!qrElement) return;
            
            // Clear any existing QR code
            qrElement.innerHTML = '';
            
            // Update connection stage
            connectionStage = STAGES.INIT;
            
            // Generate initial connection offer
            await initializeConnectionOffer();
        } catch (error) {
            console.error('QR code generation failed:', error);
            const qrElement = document.getElementById('qrcode');
            if (qrElement) {
                qrElement.innerHTML = '<div class="error">Failed to generate QR code</div>';
            }
        }
    };
    
    /**
     * Initialize connection offer and generate QR code
     */
    const initializeConnectionOffer = async () => {
        try {
            // Get user profile and identity
            const state = App.getState();
            const profile = state.profile;
            const identity = profile.identity;
            
            // Create connection data
            connectionData = {
                type: 'connection',
                did: identity.did,
                publicKey: identity.publicKey,
                profile: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    nickname: profile.nickname || '',
                    bio: profile.bio || '',
                    profilePicture: profile.profilePicture ? true : false // Flag only, don't include actual image
                },
                timestamp: new Date().toISOString()
            };
            
            // Initiate WebRTC connection
            localDescription = await WebRTC.initiateConnection();
            
            // Update connection stage
            connectionStage = STAGES.OFFER_CREATED;
            
            // Display connection instructions
            updateConnectionInstructions('Showing connection QR code. Let the other person scan this code.');
            
            // Generate and display QR code with connection info
            generateConnectionQRCode();
            
            // Start checking for QR code scan interaction
            startAnswerScanCheck();
        } catch (error) {
            console.error('Connection offer initialization failed:', error);
            connectionStage = STAGES.FAILED;
            
            // Display error
            const qrElement = document.getElementById('qrcode');
            if (qrElement) {
                qrElement.innerHTML = '<div class="error">Failed to create connection. Please try again.</div>';
            }
        }
    };
    
    /**
     * Generate QR code with connection information
     */
    const generateConnectionQRCode = () => {
        const qrElement = document.getElementById('qrcode');
        if (!qrElement) return;
        
        // Combine connection data with WebRTC session description
        const qrData = {
            ...connectionData,
            webrtc: localDescription
        };
        
        // Generate QR code
        const qrCodeValue = JSON.stringify(qrData);
        
        new QRious({
            element: qrElement,
            value: qrCodeValue,
            size: 250,
            level: 'H' // High error correction
        });
    };
    
    /**
     * Generate QR code with WebRTC answer
     */
    const generateAnswerQRCode = () => {
        const qrElement = document.getElementById('qrcode');
        if (!qrElement) return;
        
        // Create answer QR code data
        const qrData = {
            type: 'connection_answer',
            did: connectionData.did,
            webrtc: localDescription,
            timestamp: new Date().toISOString()
        };
        
        // Store answer QR data
        answerQrCode = qrData;
        
        // Generate QR code
        const qrCodeValue = JSON.stringify(qrData);
        
        new QRious({
            element: qrElement,
            value: qrCodeValue,
            size: 250,
            level: 'H' // High error correction
        });
    };
    
    /**
     * Start checking for answer QR code scan
     */
    const startAnswerScanCheck = () => {
        // Clear any existing interval
        if (qrCheckInterval) {
            clearInterval(qrCheckInterval);
        }
        
        // Set interval to check for answer scan
        qrCheckInterval = setInterval(() => {
            // If connection has moved beyond OFFER_CREATED, stop checking
            if (connectionStage !== STAGES.OFFER_CREATED) {
                clearInterval(qrCheckInterval);
                qrCheckInterval = null;
                return;
            }
            
            // In a real implementation, we would check for WebRTC connection events
            // and update the connection stage accordingly
            // For now, we'll rely on the scan events
        }, 1000);
    };
    
    /**
     * Generate onboarding QR code
     */
    const generateOnboardingQRCode = async () => {
        try {
            const qrElement = document.getElementById('qrcode');
            if (!qrElement) return;
            
            // Clear any existing QR code
            qrElement.innerHTML = '';
            
            // Get onboarding data from App
            const qrData = await App.prepareOnboardingQRData();
            
            // Generate QR code
            new QRious({
                element: qrElement,
                value: qrData,
                size: 250,
                level: 'H' // High error correction
            });
        } catch (error) {
            console.error('Onboarding QR code generation failed:', error);
            const qrElement = document.getElementById('qrcode');
            if (qrElement) {
                qrElement.innerHTML = '<div class="error">Failed to generate QR code</div>';
            }
        }
    };
    
    /**
     * Start QR code scanner
     */
    const startScanner = async () => {
        if (scannerActive) return;
        
        const videoElement = document.getElementById('scanner');
        const startButton = document.getElementById('start-scan-btn');
        
        if (!videoElement || !startButton) return;
        
        try {
            // Update connection stage
            connectionStage = STAGES.SCANNING;
            
            // Update connection instructions
            updateConnectionInstructions('Point your camera at the other person\'s QR code to scan it.');
            
            // Request camera access (prefer environment/rear camera)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            // Save stream reference
            scannerStream = stream;
            
            // Set up video stream
            videoElement.srcObject = stream;
            videoElement.play();
            
            // Update button state
            startButton.textContent = 'Scanning...';
            startButton.disabled = true;
            
            // Set scanner active flag
            scannerActive = true;
            
            // Start scanning
            scanQRCode(videoElement);
        } catch (error) {
            console.error('Camera access failed:', error);
            alert('Unable to access camera. Please ensure camera permissions are granted and try again.');
            
            // Reset button
            if (startButton) {
                startButton.textContent = 'Start Scanning';
                startButton.disabled = false;
            }
            
            // Update connection stage
            connectionStage = STAGES.INIT;
        }
    };
    
    /**
     * Stop QR code scanner
     */
    const stopScanner = () => {
        if (!scannerActive || !scannerStream) return;
        
        // Stop all tracks in the stream
        scannerStream.getTracks().forEach(track => track.stop());
        
        // Clear video source
        const videoElement = document.getElementById('scanner');
        if (videoElement) {
            videoElement.srcObject = null;
        }
        
        // Reset button
        const startButton = document.getElementById('start-scan-btn');
        if (startButton) {
            startButton.textContent = 'Start Scanning';
            startButton.disabled = false;
        }
        
        // Reset scanner state
        scannerActive = false;
        scannerStream = null;
    };
    
    /**
     * Scan for QR codes in video feed
     * @param {HTMLVideoElement} videoElement - Video element to scan
     */
    const scanQRCode = (videoElement) => {
        if (!scannerActive) return;
        
        // Create canvas for frame analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Function to process video frames
        const processFrame = () => {
            if (!scannerActive) return;
            
            // Check if video is ready
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                // Set canvas dimensions to match video
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                
                // Draw video frame to canvas
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Try to find QR code in the frame
                try {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
                    
                    if (code) {
                        // QR code found - process it
                        processScannedCode(code.data);
                        return; // Stop scanning
                    }
                } catch (error) {
                    console.error('Error processing frame:', error);
                }
            }
            
            // Continue scanning
            requestAnimationFrame(processFrame);
        };
        
        // Start processing frames
        processFrame();
    };
    
    /**
     * Process scanned QR code data
     * @param {string} data - QR code data
     */
    const processScannedCode = async (data) => {
        try {
            // Stop scanner
            stopScanner();
            
            // Parse QR code data
            let qrData;
            try {
                qrData = JSON.parse(data);
            } catch (e) {
                // Check if it's a URL (for onboarding)
                if (data.startsWith('http') && data.includes('?type=onboarding')) {
                    // Handle onboarding URL
                    window.location.href = data;
                    return;
                } else {
                    throw new Error('Invalid QR code format');
                }
            }
            
            // Check QR code type
            if (qrData.type === 'connection') {
                // Handle connection offer QR code
                await handleConnectionOffer(qrData);
            } else if (qrData.type === 'connection_answer') {
                // Handle connection answer QR code
                await handleConnectionAnswer(qrData);
            } else {
                throw new Error('Unsupported QR code type');
            }
        } catch (error) {
            console.error('QR code processing failed:', error);
            alert('Unable to process QR code. Please try again.');
            
            // Reset scanner button
            const startButton = document.getElementById('start-scan-btn');
            if (startButton) {
                startButton.textContent = 'Start Scanning';
                startButton.disabled = false;
            }
            
            // Update connection stage
            connectionStage = STAGES.FAILED;
        }
    };
    
    /**
     * Handle connection offer from QR code
     * @param {Object} offerData - Connection offer data from QR code
     */
    const handleConnectionOffer = async (offerData) => {
        try {
            // Update connection state
            connectionStage = STAGES.OFFER_SCANNED;
            connectionData = offerData;
            remoteDescription = offerData.webrtc;
            
            // Update connection instructions
            updateConnectionInstructions('Connection offer received. Creating answer...');
            
            // Show connection confirmation
            showConnectionConfirmation(offerData);
        } catch (error) {
            console.error('Connection offer handling failed:', error);
            connectionStage = STAGES.FAILED;
            alert('Failed to process connection offer. Please try again.');
        }
    };
    
    /**
     * Handle connection answer from QR code
     * @param {Object} answerData - Connection answer data from QR code
     */
    const handleConnectionAnswer = async (answerData) => {
        try {
            // Verify DID matches
            if (connectionData && connectionData.did !== answerData.did) {
                throw new Error('DID mismatch in connection answer');
            }
            
            // Update connection state
            connectionStage = STAGES.ANSWER_SCANNED;
            remoteDescription = answerData.webrtc;
            
            // Update connection instructions
            updateConnectionInstructions('Connection answer received. Establishing connection...');
            
            // Complete WebRTC connection
            await WebRTC.completeConnection(remoteDescription);
            
            // Update connection stage
            connectionStage = STAGES.CONNECTED;
            
            // Update connection instructions
            updateConnectionInstructions('Connected! Exchanging data...');
            
            // Initiate data exchange
            await handleDataExchange();
        } catch (error) {
            console.error('Connection answer handling failed:', error);
            connectionStage = STAGES.FAILED;
            alert('Failed to process connection answer. Please try again.');
        }
    };
    
    /**
     * Show connection confirmation dialog
     * @param {Object} connectionData - Connection data from QR code
     */
    const showConnectionConfirmation = (connectionData) => {
        // Get confirmation modal elements
        const modal = document.getElementById('confirmation-modal');
        const nameEl = document.getElementById('confirm-name');
        const nicknameEl = document.getElementById('confirm-nickname');
        const profileImageEl = document.getElementById('confirm-profile-image');
        
        if (!modal || !nameEl) {
            console.error('Confirmation modal elements not found');
            alert('Could not display confirmation dialog. Please try again.');
            return;
        }
        
        // Store connection data in modal for later retrieval
        modal.setAttribute('data-connection-data', JSON.stringify(connectionData));
        
        // Update modal content
        nameEl.textContent = `${connectionData.profile.firstName} ${connectionData.profile.lastName}`;
        
        if (nicknameEl) {
            nicknameEl.textContent = connectionData.profile.nickname || '';
        }
        
        // Set profile image if available
        if (profileImageEl) {
            if (connectionData.profile.profilePicture) {
                profileImageEl.innerHTML = '<div class="profile-image-placeholder"><i class="fas fa-user"></i></div>';
            } else {
                profileImageEl.innerHTML = '<div class="profile-image-placeholder"><i class="fas fa-user"></i></div>';
            }
        }
        
        // Show the modal
        modal.classList.add('active');
    };
    
    /**
     * Handle connection confirmation
     * @param {boolean} confirmed - Whether the connection was confirmed
     */
    const handleConnectionConfirmation = async (confirmed) => {
        // Get modal and connection data
        const modal = document.getElementById('confirmation-modal');
        if (!modal) return;
        
        try {
            if (confirmed) {
                // Get connection data from modal
                const connectionDataStr = modal.getAttribute('data-connection-data');
                if (!connectionDataStr) {
                    throw new Error('Connection data not found');
                }
                
                // Parse connection data
                const connectionData = JSON.parse(connectionDataStr);
                
                // Hide modal
                modal.classList.remove('active');
                
                // Create WebRTC answer
                await createConnectionAnswer(connectionData);
                
                // Show QR code with answer
                generateAnswerQRCode();
                
                // Update connection stage
                connectionStage = STAGES.ANSWER_CREATED;
                
                // Update connection instructions
                updateConnectionInstructions('Now show this QR code to the other person to complete the connection.');
                
                // Switch to "Show QR" tab
                switchToShowQRTab();
            } else {
                // User declined connection
                modal.classList.remove('active');
                
                // Reset connection state
                resetConnectionState();
            }
        } catch (error) {
            console.error('Connection confirmation handling failed:', error);
            alert('Failed to process connection. Please try again.');
            modal.classList.remove('active');
            
            // Reset connection state
            resetConnectionState();
        }
    };
    
    /**
     * Create connection answer
     * @param {Object} offerData - Connection offer data
     */
    const createConnectionAnswer = async (offerData) => {
        try {
            // Accept WebRTC connection
            localDescription = await WebRTC.acceptConnection(offerData.webrtc);
            return localDescription;
        } catch (error) {
            console.error('Connection answer creation failed:', error);
            throw error;
        }
    };
    
    /**
     * Reset connection state
     */
    const resetConnectionState = () => {
        // Reset connection stage
        connectionStage = STAGES.INIT;
        
        // Reset connection data
        connectionData = null;
        localDescription = null;
        remoteDescription = null;
        answerQrCode = null;
        
        // Close WebRTC connection
        WebRTC.closeConnection();
        
        // Clear QR check interval
        if (qrCheckInterval) {
            clearInterval(qrCheckInterval);
            qrCheckInterval = null;
        }
    };
    
    /**
     * Switch to "Show QR" tab
     */
    const switchToShowQRTab = () => {
        const tabElement = document.querySelector('[data-tab="show-qr"]');
        if (tabElement) {
            tabElement.click();
        }
    };
    
    /**
     * Handle WebRTC connection state change
     * @param {string} state - New connection state
     */
    const handleConnectionStateChange = (state) => {
        console.log('WebRTC connection state changed:', state);
        
        // Handle connection states
        if (state === 'connected') {
            if (connectionStage !== STAGES.CONNECTED) {
                connectionStage = STAGES.CONNECTED;
                updateConnectionInstructions('Connected! Exchanging data...');
                
                // Start data exchange if not already started
                handleDataExchange();
            }
        } else if (state === 'disconnected' || state === 'failed') {
            if (connectionStage !== STAGES.COMPLETE && connectionStage !== STAGES.FAILED) {
                connectionStage = STAGES.FAILED;
                updateConnectionInstructions('Connection failed. Please try again.');
            }
        }
    };
    
    /**
     * Handle WebRTC data received
     * @param {Object} data - Received data
     */
    const handleDataReceived = (data) => {
        console.log('Data received:', data);
        
        // Process received data based on type
        if (data.type === 'profile') {
            // Process profile data
            processReceivedProfile(data);
        } else if (data.type === 'connections') {
            // Process connections data
            processReceivedConnections(data.connections);
        } else if (data.type === 'messages') {
            // Process messages data
            processReceivedMessages(data.messages);
        } else if (data.type === 'relays') {
            // Process relay messages
            processReceivedRelays(data.relays);
        } else if (data.type === 'complete') {
            // Transfer complete
            handleTransferComplete();
        }
    };
    
    /**
     * Process received profile data
     * @param {Object} profileData - Profile data
     */
    const processReceivedProfile = async (profileData) => {
        try {
            // Add to connection data for App processing
            const profile = profileData.profile;
            
            // Update connection data
            if (connectionData) {
                connectionData.profile = {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    nickname: profile.nickname || '',
                    bio: profile.bio || ''
                };
                
                // Add profile picture if included
                if (profileData.profilePicture) {
                    connectionData.profilePicture = profileData.profilePicture;
                }
            }
            
            // Send acknowledgement
            WebRTC.sendData({
                type: 'profile_ack',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Processing received profile failed:', error);
        }
    };
    
    /**
     * Process received connections data
     * @param {Array} connections - Array of connection objects
     */
    const processReceivedConnections = (connections) => {
        // This would be used for second-degree connections
        // For now, just acknowledge
        WebRTC.sendData({
            type: 'connections_ack',
            count: connections.length,
            timestamp: new Date().toISOString()
        });
    };
    
    /**
     * Process received messages
     * @param {Array} messages - Array of message objects
     */
    const processReceivedMessages = (messages) => {
        // Store messages for later processing by App module
        // For now, just acknowledge
        WebRTC.sendData({
            type: 'messages_ack',
            count: messages.length,
            timestamp: new Date().toISOString()
        });
    };
    
    /**
     * Process received relay messages
     * @param {Array} relays - Array of relay objects
     */
    const processReceivedRelays = (relays) => {
        // Store relays for later processing by App module
        // For now, just acknowledge
        WebRTC.sendData({
            type: 'relays_ack',
            count: relays.length,
            timestamp: new Date().toISOString()
        });
    };
    
    /**
     * Handle data exchange
     */
    const handleDataExchange = async () => {
        try {
            // Update connection stage
            connectionStage = STAGES.EXCHANGING;
            
            // Get data to send
            const state = App.getState();
            
            // Send user profile
            await sendProfileData(state.profile);
            
            // Send connections list (second-degree)
            await sendConnectionsData(state.connections);
            
            // Send pending messages
            await sendMessagesData(state.messages);
            
            // Send relay messages
            await sendRelaysData(state.messages.relays);
            
            // Send transfer complete message
            WebRTC.sendData({
                type: 'complete',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Data exchange failed:', error);
            connectionStage = STAGES.FAILED;
            updateConnectionInstructions('Data exchange failed. Please try again.');
        }
    };
    
    /**
     * Send profile data
     * @param {Object} profile - User profile
     */
    const sendProfileData = async (profile) => {
        return new Promise((resolve) => {
            // Create profile data object
            const profileData = {
                type: 'profile',
                profile: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    nickname: profile.nickname || '',
                    bio: profile.bio || '',
                    did: profile.identity.did,
                    publicKey: profile.identity.publicKey
                },
                timestamp: new Date().toISOString()
            };
            
            // Add profile picture if available
            if (profile.profilePicture) {
                profileData.profilePicture = profile.profilePicture;
            }
            
            // Send data
            WebRTC.sendData(profileData);
            
            // For now, resolve immediately (in a full implementation, we'd wait for acknowledgement)
            setTimeout(resolve, 500);
        });
    };
    
    /**
     * Send connections data
     * @param {Array} connections - User's connections
     */
    const sendConnectionsData = async (connections) => {
        return new Promise((resolve) => {
            // Create simplified connections list
            const connectionsData = connections.map(conn => ({
                firstName: conn.firstName,
                lastName: conn.lastName,
                did: conn.did
            }));
            
            // Send data
            WebRTC.sendData({
                type: 'connections',
                connections: connectionsData,
                timestamp: new Date().toISOString()
            });
            
            // For now, resolve immediately
            setTimeout(resolve, 500);
        });
    };
    
    /**
     * Send messages data
     * @param {Object} messages - User's messages
     */
    const sendMessagesData = async (messages) => {
        return new Promise((resolve) => {
            // Get messages for the recipient
            const messagesToSend = [];
            
            // In a full implementation, we would filter messages for the recipient
            // For now, send an empty array
            
            // Send data
            WebRTC.sendData({
                type: 'messages',
                messages: messagesToSend,
                timestamp: new Date().toISOString()
            });
            
            // For now, resolve immediately
            setTimeout(resolve, 500);
        });
    };
    
    /**
     * Send relay messages data
     * @param {Array} relays - Relay messages
     */
    const sendRelaysData = async (relays) => {
        return new Promise((resolve) => {
            // Get relays for the recipient
            const relaysToSend = [];
            
            // If we have connection data, filter relays for this recipient
            if (connectionData && connectionData.did) {
                // Find relays for this connection's DID
                const did = connectionData.did;
                
                relays.forEach(relay => {
                    if (relay.targetRecipientId === did) {
                        relaysToSend.push(relay);
                    }
                });
            }
            
            // Send data
            WebRTC.sendData({
                type: 'relays',
                relays: relaysToSend,
                timestamp: new Date().toISOString()
            });
            
            // For now, resolve immediately
            setTimeout(resolve, 500);
        });
    };
    
    /**
     * Handle transfer complete
     */
    const handleTransferComplete = async () => {
        // Update connection stage
        connectionStage = STAGES.COMPLETE;
        
        // Update connection instructions
        updateConnectionInstructions('Data transfer complete! Connection established.');
        
        // Process the connection data
        await completeConnection();
    };
    
    /**
     * Complete the connection process
     */
    const completeConnection = async () => {
        try {
            // Process connection with App module
            await App.addConnection({
                did: connectionData.did,
                publicKey: connectionData.publicKey,
                profile: connectionData.profile,
                profilePicture: connectionData.profilePicture || null
            });
            
            // Show success message
            alert('Connection successful!');
            
            // Navigate to home screen
            const homeScreen = document.getElementById('home-screen');
            const homeNav = document.querySelector('[data-screen="home-screen"]');
            
            if (homeScreen && homeNav) {
                // Hide all screens
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                // Show home screen
                homeScreen.classList.add('active');
                
                // Update navigation
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                homeNav.classList.add('active');
            }
            
            // Reset connection state
            resetConnectionState();
        } catch (error) {
            console.error('Connection completion failed:', error);
            alert('Failed to complete connection. Please try again.');
            
            // Reset connection state
            resetConnectionState();
        }
    };
    
    /**
     * Handle local WebRTC description generation
     * @param {Object} description - Local session description
     */
    const handleLocalDescriptionGenerated = (description) => {
        // Store local description
        localDescription = description;
        
        // If we're in offer creation stage, update the QR code
        if (connectionStage === STAGES.OFFER_CREATED) {
            generateConnectionQRCode();
        } else if (connectionStage === STAGES.ANSWER_CREATED) {
            generateAnswerQRCode();
        }
    };
    
    /**
     * Update connection instructions display
     * @param {string} message - Instruction message
     */
    const updateConnectionInstructions = (message) => {
        // Update instructions in show QR view
        const showInstructions = document.querySelector('.qr-instructions');
        if (showInstructions) {
            showInstructions.textContent = message;
        }
        
        // Update instructions in scan QR view
        const scanInstructions = document.querySelector('.scanner-instructions');
        if (scanInstructions) {
            scanInstructions.textContent = message;
        }
    };
    
    /**
     * Toggle QR code between connection and onboarding modes
     * @param {boolean} showOnboarding - Whether to show onboarding QR code
     */
    const toggleOnboardingMode = (showOnboarding) => {
        if (showOnboarding) {
            generateOnboardingQRCode();
        } else {
            generateQRCode();
        }
    };

    // Public API
    return {
        init,
        generateQRCode,
        generateOnboardingQRCode,
        startScanner,
        stopScanner,
        handleConnectionConfirmation,
        toggleOnboardingMode
    };
})();
