/**
 * WebRTC Module for CurrentCircle
 * Handles real-time peer-to-peer connections between devices
 */

const WebRTC = (() => {
    // WebRTC configuration
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ]
    };
    
    // Connection state
    let peerConnection = null;
    let dataChannel = null;
    let isInitiator = false;
    let connectionState = 'disconnected';
    
    // Callbacks
    let onConnectionStateChange = null;
    let onDataReceived = null;
    let onLocalDescriptionGenerated = null;
    
    /**
     * Initialize WebRTC module
     * @param {Object} callbacks - Callback functions
     */
    const init = (callbacks = {}) => {
        // Set callbacks
        onConnectionStateChange = callbacks.onConnectionStateChange || (() => {});
        onDataReceived = callbacks.onDataReceived || (() => {});
        onLocalDescriptionGenerated = callbacks.onLocalDescriptionGenerated || (() => {});
        
        // Reset connection state
        resetConnection();
    };
    
    /**
     * Reset connection state
     */
    const resetConnection = () => {
        // Close existing connections
        if (dataChannel) {
            dataChannel.close();
            dataChannel = null;
        }
        
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        // Reset state
        isInitiator = false;
        connectionState = 'disconnected';
        
        // Notify state change
        onConnectionStateChange(connectionState);
    };
    
    /**
     * Create a new peer connection
     * @param {boolean} initiator - Whether this peer is the connection initiator
     * @returns {RTCPeerConnection} - The created peer connection
     */
    const createPeerConnection = (initiator) => {
        // Set initiator flag
        isInitiator = initiator;
        
        // Create new peer connection
        peerConnection = new RTCPeerConnection(config);
        
        // Set up data channel
        if (isInitiator) {
            // Create data channel as initiator
            dataChannel = peerConnection.createDataChannel('currentCircleData', {
                ordered: true
            });
            setupDataChannel(dataChannel);
        } else {
            // Set up to receive data channel as non-initiator
            peerConnection.ondatachannel = (event) => {
                dataChannel = event.channel;
                setupDataChannel(dataChannel);
            };
        }
        
        // Set up ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // In a real app, we'd send this to the other peer through signaling
                // Here, we'll store it with the local description for QR code
                const serializedCandidate = JSON.stringify(event.candidate);
                console.log('New ICE candidate:', serializedCandidate);
                
                // Add to local description
                if (peerConnection.localDescription) {
                    const description = {
                        type: peerConnection.localDescription.type,
                        sdp: peerConnection.localDescription.sdp,
                        candidate: serializedCandidate
                    };
                    
                    // Notify local description change
                    onLocalDescriptionGenerated(description);
                }
            }
        };
        
        // Set up connection state change handling
        peerConnection.onconnectionstatechange = () => {
            connectionState = peerConnection.connectionState;
            console.log('Connection state changed:', connectionState);
            onConnectionStateChange(connectionState);
        };
        
        // Set up ICE connection state change handling
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };
        
        return peerConnection;
    };
    
    /**
     * Set up data channel event handlers
     * @param {RTCDataChannel} channel - The data channel to set up
     */
    const setupDataChannel = (channel) => {
        channel.onopen = () => {
            console.log('Data channel opened');
            connectionState = 'connected';
            onConnectionStateChange(connectionState);
        };
        
        channel.onclose = () => {
            console.log('Data channel closed');
            connectionState = 'disconnected';
            onConnectionStateChange(connectionState);
        };
        
        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            connectionState = 'failed';
            onConnectionStateChange(connectionState);
        };
        
        channel.onmessage = (event) => {
            // Process received data
            console.log('Data received:', event.data);
            try {
                const data = JSON.parse(event.data);
                onDataReceived(data);
            } catch (error) {
                console.error('Error parsing received data:', error);
            }
        };
    };
    
    /**
     * Initiate connection as the caller
     * @returns {Promise<Object>} - Resolves with the local session description
     */
    const initiateConnection = async () => {
        try {
            // Create peer connection as initiator
            createPeerConnection(true);
            
            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            // Return local description
            const description = {
                type: peerConnection.localDescription.type,
                sdp: peerConnection.localDescription.sdp
            };
            
            // Notify local description generated
            onLocalDescriptionGenerated(description);
            
            return description;
        } catch (error) {
            console.error('Error initiating connection:', error);
            throw error;
        }
    };
    
    /**
     * Accept connection as the callee
     * @param {Object} remoteDescription - Remote session description from QR code
     * @returns {Promise<Object>} - Resolves with the local answer description
     */
    const acceptConnection = async (remoteDescription) => {
        try {
            // Create peer connection as non-initiator
            createPeerConnection(false);
            
            // Set remote description
            const rtcSessionDescription = new RTCSessionDescription({
                type: remoteDescription.type,
                sdp: remoteDescription.sdp
            });
            
            await peerConnection.setRemoteDescription(rtcSessionDescription);
            
            // If remote ICE candidate was provided, add it
            if (remoteDescription.candidate) {
                try {
                    const candidate = JSON.parse(remoteDescription.candidate);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            }
            
            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            // Return local description
            const description = {
                type: peerConnection.localDescription.type,
                sdp: peerConnection.localDescription.sdp
            };
            
            // Notify local description generated
            onLocalDescriptionGenerated(description);
            
            return description;
        } catch (error) {
            console.error('Error accepting connection:', error);
            throw error;
        }
    };
    
    /**
     * Complete connection with remote answer
     * @param {Object} remoteAnswer - Remote answer description
     * @returns {Promise<boolean>} - Resolves when connection is completed
     */
    const completeConnection = async (remoteAnswer) => {
        try {
            if (!peerConnection) {
                throw new Error('Peer connection not initialized');
            }
            
            // Set remote description
            const rtcSessionDescription = new RTCSessionDescription({
                type: remoteAnswer.type,
                sdp: remoteAnswer.sdp
            });
            
            await peerConnection.setRemoteDescription(rtcSessionDescription);
            
            // If remote ICE candidate was provided, add it
            if (remoteAnswer.candidate) {
                try {
                    const candidate = JSON.parse(remoteAnswer.candidate);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error completing connection:', error);
            throw error;
        }
    };
    
    /**
     * Send data through the data channel
     * @param {Object} data - Data to send
     * @returns {boolean} - True if data was sent successfully
     */
    const sendData = (data) => {
        if (!dataChannel || dataChannel.readyState !== 'open') {
            console.error('Data channel not open');
            return false;
        }
        
        try {
            // Convert data to JSON string
            const jsonData = JSON.stringify(data);
            
            // Send data
            dataChannel.send(jsonData);
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    };
    
    /**
     * Get connection state
     * @returns {string} - Current connection state
     */
    const getConnectionState = () => {
        return connectionState;
    };
    
    /**
     * Close current connection
     */
    const closeConnection = () => {
        resetConnection();
    };
    
    // Public API
    return {
        init,
        initiateConnection,
        acceptConnection,
        completeConnection,
        sendData,
        getConnectionState,
        closeConnection
    };
})();
