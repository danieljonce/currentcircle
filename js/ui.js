/**
 * UI Module for CurrentCircle
 * Handles all user interface interactions and updates
 */

const UI = (() => {
    // DOM Elements cache
    const elements = {
        screens: {
            setup: document.getElementById('setup-screen'),
            home: document.getElementById('home-screen'),
            connect: document.getElementById('connect-screen'),
            messages: document.getElementById('messages-screen'),
            profile: document.getElementById('profile-screen')
        },
        nav: {
            items: document.querySelectorAll('.nav-item')
        },
        setup: {
            profileImage: document.getElementById('profile-image-display'),
            profileImageInput: document.getElementById('profile-image-input'),
            selectImageBtn: document.getElementById('select-image-btn'),
            firstNameInput: document.getElementById('first-name'),
            lastNameInput: document.getElementById('last-name'),
            nicknameInput: document.getElementById('nickname'),
            bioInput: document.getElementById('bio'),
            createProfileBtn: document.getElementById('create-profile-btn')
        },
        home: {
            connectionGraph: document.getElementById('connection-graph'),
            connectionList: document.getElementById('connection-list')
        },
        connect: {
            tabs: {
                showQr: document.querySelector('[data-tab="show-qr"]'),
                scanQr: document.querySelector('[data-tab="scan-qr"]')
            },
            tabContents: {
                showQr: document.getElementById('show-qr-tab'),
                scanQr: document.getElementById('scan-qr-tab')
            },
            qrcode: document.getElementById('qrcode'),
            scannerView: document.getElementById('scanner-view'),
            scanner: document.getElementById('scanner'),
            startScanBtn: document.getElementById('start-scan-btn')
        },
        messages: {
            tabs: {
                inbox: document.querySelector('[data-tab="inbox"]'),
                outbox: document.querySelector('[data-tab="outbox"]'),
                relay: document.querySelector('[data-tab="relay"]')
            },
            tabContents: {
                inbox: document.getElementById('inbox-tab'),
                outbox: document.getElementById('outbox-tab'),
                relay: document.getElementById('relay-tab')
            },
            inboxMessages: document.getElementById('inbox-messages'),
            outboxMessages: document.getElementById('outbox-messages'),
            relayMessages: document.getElementById('relay-messages'),
            composeBtn: document.getElementById('compose-btn'),
            relayBadge: document.getElementById('relay-badge'),
            relayCount: document.getElementById('relay-count')
        },
        profile: {
            profileImage: document.getElementById('current-profile-image'),
            profileName: document.getElementById('profile-name'),
            profileNickname: document.getElementById('profile-nickname'),
            profileBio: document.getElementById('profile-bio'),
            exportIdentityBtn: document.getElementById('export-identity-btn'),
            importIdentityBtn: document.getElementById('import-identity-btn'),
            editProfileBtn: document.getElementById('edit-profile-btn')
        },
        modals: {
            compose: {
                modal: document.getElementById('compose-modal'),
                closeBtn: document.getElementById('close-compose-modal'),
                recipientSelect: document.getElementById('message-recipient'),
                messageContent: document.getElementById('message-content'),
                characterCount: document.getElementById('character-count'),
                isRelay: document.getElementById('is-relay'),
                sendBtn: document.getElementById('send-message-btn')
            },
            connection: {
                modal: document.getElementById('connection-modal'),
                closeBtn: document.getElementById('close-connection-modal'),
                profileImage: document.getElementById('connection-profile-image'),
                name: document.getElementById('connection-name'),
                nickname: document.getElementById('connection-nickname'),
                bio: document.getElementById('connection-bio'),
                firstDate: document.getElementById('connection-first-date'),
                lastDate: document.getElementById('connection-last-date'),
                expiryDate: document.getElementById('connection-expiry-date'),
                messageBtn: document.getElementById('message-connection-btn'),
                removeBtn: document.getElementById('remove-connection-btn')
            },
            confirmation: {
                modal: document.getElementById('confirmation-modal'),
                closeBtn: document.getElementById('close-confirmation-modal'),
                profileImage: document.getElementById('confirm-profile-image'),
                name: document.getElementById('confirm-name'),
                nickname: document.getElementById('confirm-nickname'),
                yesBtn: document.getElementById('confirm-yes-btn'),
                noBtn: document.getElementById('confirm-no-btn')
            },
            export: {
                modal: document.getElementById('export-modal'),
                closeBtn: document.getElementById('close-export-modal'),
                identityKey: document.getElementById('identity-key'),
                copyBtn: document.getElementById('copy-key-btn'),
                downloadBtn: document.getElementById('download-key-btn')
            },
            import: {
                modal: document.getElementById('import-modal'),
                closeBtn: document.getElementById('close-import-modal'),
                importKey: document.getElementById('import-key'),
                uploadBtn: document.getElementById('upload-key-btn'),
                keyFileInput: document.getElementById('key-file-input'),
                importError: document.getElementById('import-error'),
                importBtn: document.getElementById('import-key-btn')
            }
        }
    };

    // Graph visualization instance
    let connectionGraph = null;

    /**
     * Initialize event listeners
     */
    const initEventListeners = () => {
        // Bottom navigation
        elements.nav.items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = item.getAttribute('data-screen');
                showScreen(screenId);
                
                // Update active nav item
                elements.nav.items.forEach(navItem => {
                    navItem.classList.remove('active');
                });
                item.classList.add('active');
            });
        });

        // Setup screen events
        elements.setup.selectImageBtn.addEventListener('click', () => {
            elements.setup.profileImageInput.click();
        });

        elements.setup.profileImageInput.addEventListener('change', handleProfileImageSelection);

        elements.setup.createProfileBtn.addEventListener('click', handleProfileCreation);

        // Connect screen tab events
        elements.connect.tabs.showQr.addEventListener('click', () => {
            switchTab('show-qr', elements.connect.tabs, elements.connect.tabContents);
        });

        elements.connect.tabs.scanQr.addEventListener('click', () => {
            switchTab('scan-qr', elements.connect.tabs, elements.connect.tabContents);
        });

        elements.connect.startScanBtn.addEventListener('click', startQRScanner);

        // Messages screen tab events
        elements.messages.tabs.inbox.addEventListener('click', () => {
            switchTab('inbox', elements.messages.tabs, elements.messages.tabContents);
        });

        elements.messages.tabs.outbox.addEventListener('click', () => {
            switchTab('outbox', elements.messages.tabs, elements.messages.tabContents);
        });

        elements.messages.tabs.relay.addEventListener('click', () => {
            switchTab('relay', elements.messages.tabs, elements.messages.tabContents);
        });

        elements.messages.composeBtn.addEventListener('click', showComposeModal);

        // Profile screen events
        elements.profile.exportIdentityBtn.addEventListener('click', showExportModal);
        elements.profile.importIdentityBtn.addEventListener('click', showImportModal);
        elements.profile.editProfileBtn.addEventListener('click', showEditProfileModal);

        // Modal events - Compose
        elements.modals.compose.closeBtn.addEventListener('click', () => {
            hideModal(elements.modals.compose.modal);
        });

        elements.modals.compose.messageContent.addEventListener('input', updateCharacterCount);

        elements.modals.compose.sendBtn.addEventListener('click', handleMessageSend);

        // Modal events - Connection
        elements.modals.connection.closeBtn.addEventListener('click', () => {
            hideModal(elements.modals.connection.modal);
        });

        elements.modals.connection.messageBtn.addEventListener('click', () => {
            // Get active connection ID from the modal
            const connectionId = elements.modals.connection.modal.getAttribute('data-connection-id');
            hideModal(elements.modals.connection.modal);
            showComposeModal(connectionId);
        });

        elements.modals.connection.removeBtn.addEventListener('click', handleConnectionRemoval);

        // Modal events - Confirmation
        elements.modals.confirmation.closeBtn.addEventListener('click', () => {
            hideModal(elements.modals.confirmation.modal);
        });

        elements.modals.confirmation.yesBtn.addEventListener('click', handleConnectionConfirmation);

        elements.modals.confirmation.noBtn.addEventListener('click', () => {
            hideModal(elements.modals.confirmation.modal);
        });

        // Modal events - Export
        elements.modals.export.closeBtn.addEventListener('click', () => {
            hideModal(elements.modals.export.modal);
        });

        elements.modals.export.copyBtn.addEventListener('click', copyIdentityToClipboard);

        elements.modals.export.downloadBtn.addEventListener('click', downloadIdentityFile);

        // Modal events - Import
        elements.modals.import.closeBtn.addEventListener('click', () => {
            hideModal(elements.modals.import.modal);
        });

        elements.modals.import.uploadBtn.addEventListener('click', () => {
            elements.modals.import.keyFileInput.click();
        });

        elements.modals.import.keyFileInput.addEventListener('change', handleKeyFileUpload);

        elements.modals.import.importBtn.addEventListener('click', handleIdentityImport);
    };

    /**
     * Show a specific screen
     * @param {string} screenId - ID of the screen to show
     */
    const showScreen = (screenId) => {
        // Hide all screens
        Object.values(elements.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show the requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }

        // Perform additional actions for specific screens
        if (screenId === 'connect-screen') {
            generateQRCode();
        } else if (screenId === 'home-screen') {
            // Refresh connection graph
            if (connectionGraph) {
                connectionGraph.destroy();
                initConnectionGraph(App.getState().connections, App.getState().profile);
            }
        }
    };

    /**
     * Switch between tabs in a tabbed interface
     * @param {string} tabId - ID of the tab to activate
     * @param {Object} tabs - Object containing tab elements
     * @param {Object} contents - Object containing tab content elements
     */
    const switchTab = (tabId, tabs, contents) => {
        // Deactivate all tabs and content
        Object.values(tabs).forEach(tab => {
            tab.classList.remove('active');
        });
        
        Object.values(contents).forEach(content => {
            content.classList.remove('active');
        });

        // Activate the selected tab and content
        tabs[tabId].classList.add('active');
        contents[tabId].classList.add('active');
    };

    /**
     * Show a modal
     * @param {HTMLElement} modal - The modal element to show
     */
    const showModal = (modal) => {
        modal.classList.add('active');
    };

    /**
     * Hide a modal
     * @param {HTMLElement} modal - The modal element to hide
     */
    const hideModal = (modal) => {
        modal.classList.remove('active');
    };

    /**
     * Handle profile image selection
     * @param {Event} event - Change event from file input
     */
    const handleProfileImageSelection = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check file type and size
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        if (file.size > 1024 * 1024 * 2) { // 2MB limit
            alert('Image is too large. Please select an image smaller than 2MB.');
            return;
        }

        // Read and display the image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                // Resize the image if it's too large
                const maxWidth = 400;
                const maxHeight = 400;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress the image
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL (JPEG for better compression)
                const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                
                // Display the image
                const imageElement = elements.setup.profileImage.querySelector('img') || new Image();
                imageElement.src = dataURL;
                
                // Replace placeholder with image
                elements.setup.profileImage.innerHTML = '';
                elements.setup.profileImage.appendChild(imageElement);
                
                // Store the data URL for later use
                elements.setup.profileImage.setAttribute('data-image', dataURL);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    /**
     * Handle profile creation
     */
    const handleProfileCreation = async () => {
        // Validate inputs
        const firstName = elements.setup.firstNameInput.value.trim();
        const lastName = elements.setup.lastNameInput.value.trim();
        
        if (!firstName || !lastName) {
            alert('First name and last name are required.');
            return;
        }

        try {
            // Get profile data
            const profileData = {
                firstName,
                lastName,
                nickname: elements.setup.nicknameInput.value.trim(),
                bio: elements.setup.bioInput.value.trim(),
                profilePicture: elements.setup.profileImage.getAttribute('data-image') || null
            };

            // Create profile
            const profile = await App.createProfile(profileData);

            // Update UI
            updateProfileDisplay(profile);
            
            // Show home screen
            showScreen('home-screen');
            
            // Initialize connection graph
            initConnectionGraph([], profile);
            
            // Update nav
            elements.nav.items.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-screen') === 'home-screen') {
                    item.classList.add('active');
                }
            });
        } catch (error) {
            console.error('Profile creation failed:', error);
            alert('Failed to create profile. Please try again.');
        }
    };

    /**
     * Update profile display
     * @param {Object} profile - User profile object
     */
    const updateProfileDisplay = (profile) => {
        // Update profile screen
        if (profile.profilePicture) {
            const img = document.createElement('img');
            img.src = profile.profilePicture;
            elements.profile.profileImage.innerHTML = '';
            elements.profile.profileImage.appendChild(img);
        }

        elements.profile.profileName.textContent = `${profile.firstName} ${profile.lastName}`;
        elements.profile.profileNickname.textContent = profile.nickname || '';
        elements.profile.profileBio.textContent = profile.bio || 'No bio provided.';
    };

    /**
     * Generate QR code for connection
     */
    const generateQRCode = async () => {
        try {
            // Get QR data
            const qrData = await App.prepareConnectionQRData();
            
            // Generate QR code
            new QRious({
                element: elements.connect.qrcode,
                value: qrData,
                size: 250,
                level: 'H' // High error correction
            });
        } catch (error) {
            console.error('QR code generation failed:', error);
            elements.connect.qrcode.innerHTML = 'Failed to generate QR code.';
        }
    };

    /**
     * Start QR code scanner
     */
    const startQRScanner = async () => {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            // Set up video stream
            elements.connect.scanner.srcObject = stream;
            elements.connect.scanner.play();
            
            // Change button text
            elements.connect.startScanBtn.textContent = 'Scanning...';
            elements.connect.startScanBtn.disabled = true;
            
            // Start scanning for QR codes
            scanQRCode(stream);
        } catch (error) {
            console.error('Camera access failed:', error);
            alert('Failed to access camera. Please ensure you have granted camera permissions.');
            elements.connect.startScanBtn.textContent = 'Try Again';
            elements.connect.startScanBtn.disabled = false;
        }
    };

    /**
     * Scan for QR codes in video stream
     * @param {MediaStream} stream - Video stream
     */
    const scanQRCode = (stream) => {
        // Set up canvas for frame analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = elements.connect.scanner;
        
        // Function to analyze video frames
        const scanFrame = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Resize canvas to match video dimensions
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Draw current frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Scan for QR code
                try {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (code) {
                        // QR code found
                        handleScannedQRCode(code.data, stream);
                        return; // Stop scanning
                    }
                } catch (error) {
                    console.error('QR processing error:', error);
                }
            }
            
            // Continue scanning
            requestAnimationFrame(scanFrame);
        };
        
        // Start scanning
        scanFrame();
    };

    /**
     * Handle scanned QR code data
     * @param {string} data - QR code data
     * @param {MediaStream} stream - Video stream to stop
     */
    const handleScannedQRCode = (data, stream) => {
        try {
            // Stop video stream
            stream.getTracks().forEach(track => track.stop());
            
            // Reset button
            elements.connect.startScanBtn.textContent = 'Start Scanning';
            elements.connect.startScanBtn.disabled = false;
            
            // Parse QR code data
            const qrData = JSON.parse(data);
            
            // Check QR code type
            if (qrData.type === 'connection') {
                // Show confirmation modal
                showConnectionConfirmation(qrData);
            } else {
                alert('Invalid QR code. Please scan a CurrentCircle connection QR code.');
            }
        } catch (error) {
            console.error('QR code handling failed:', error);
            alert('Failed to process QR code. Please try again.');
            
            // Reset button
            elements.connect.startScanBtn.textContent = 'Start Scanning';
            elements.connect.startScanBtn.disabled = false;
        }
    };

    /**
     * Show connection confirmation modal
     * @param {Object} connectionData - Data from QR code
     */
    const showConnectionConfirmation = (connectionData) => {
        // Set connection data for confirmation modal
        elements.modals.confirmation.modal.setAttribute('data-connection-data', JSON.stringify(connectionData));
        
        // Update modal content
        elements.modals.confirmation.name.textContent = `${connectionData.profile.firstName} ${connectionData.profile.lastName}`;
        elements.modals.confirmation.nickname.textContent = connectionData.profile.nickname || '';
        
        // Show modal
        showModal(elements.modals.confirmation.modal);
    };

    /**
     * Handle connection confirmation
     */
    const handleConnectionConfirmation = async () => {
        try {
            // Get connection data from modal
            const connectionDataString = elements.modals.confirmation.modal.getAttribute('data-connection-data');
            const connectionData = JSON.parse(connectionDataString);
            
            // Hide modal
            hideModal(elements.modals.confirmation.modal);
            
            // Process connection data
            await App.handleDataTransfer(connectionData, true);
            
            // Show success message
            alert('Connection successful!');
            
            // Switch to home screen
            showScreen('home-screen');
            
            // Update active nav item
            elements.nav.items.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-screen') === 'home-screen') {
                    item.classList.add('active');
                }
            });
        } catch (error) {
            console.error('Connection confirmation failed:', error);
            alert('Failed to establish connection. Please try again.');
        }
    };

    /**
     * Initialize connection graph visualization
     * @param {Array} connections - Array of connection objects
     * @param {Object} profile - User profile object
     */
    const initConnectionGraph = (connections, profile) => {
        // Create graph container if it doesn't exist
        if (!elements.home.connectionGraph) {
            console.error('Connection graph container not found');
            return;
        }
        
        // Prepare nodes and edges
        const nodes = [];
        const edges = [];
        
        // Add user node
        nodes.push({
            data: {
                id: 'user',
                name: `${profile.firstName} ${profile.lastName}`,
                type: 'user',
                image: profile.profilePicture
            }
        });
        
        // Add connection nodes
        connections.forEach(connection => {
            // Add node
            nodes.push({
                data: {
                    id: connection.id,
                    name: `${connection.firstName} ${connection.lastName}`,
                    type: 'connection',
                    image: connection.profilePicture,
                    lastConnected: connection.lastConnected
                }
            });
            
            // Add edge
            edges.push({
                data: {
                    id: `e-user-${connection.id}`,
                    source: 'user',
                    target: connection.id
                }
            });
        });
        
        // Create graph
        connectionGraph = cytoscape({
            container: elements.home.connectionGraph,
            elements: {
                nodes: nodes,
                edges: edges
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'background-color': '#4a90e2',
                        'width': 50,
                        'height': 50,
                        'border-width': 2,
                        'border-color': '#ffffff',
                        'font-size': 12
                    }
                },
                {
                    selector: 'node[type = "user"]',
                    style: {
                        'background-color': '#38a169',
                        'width': 60,
                        'height': 60
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#a0aec0',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'concentric',
                concentric: function(node) {
                    return node.data('type') === 'user' ? 2 : 1;
                },
                levelWidth: function() { return 1; },
                minNodeSpacing: 50
            }
        });
        
        // Add event listener for node click
        connectionGraph.on('tap', 'node', function(evt) {
            const node = evt.target;
            const nodeId = node.id();
            
            // Don't handle clicks on user node
            if (nodeId === 'user') return;
            
            // Show connection details modal
            showConnectionDetails(nodeId);
        });
    };

    /**
     * Update connection graph
     * @param {Array} connections - Array of connection objects
     * @param {Object} profile - User profile object
     */
    const updateConnectionGraph = (connections, profile) => {
        // If graph doesn't exist, initialize it
        if (!connectionGraph) {
            initConnectionGraph(connections, profile);
            return;
        }
        
        // Remove all existing elements
        connectionGraph.elements().remove();
        
        // Add user node
        connectionGraph.add({
            group: 'nodes',
            data: {
                id: 'user',
                name: `${profile.firstName} ${profile.lastName}`,
                type: 'user',
                image: profile.profilePicture
            }
        });
        
        // Add connection nodes and edges
        connections.forEach(connection => {
            // Add node
            connectionGraph.add({
                group: 'nodes',
                data: {
                    id: connection.id,
                    name: `${connection.firstName} ${connection.lastName}`,
                    type: 'connection',
                    image: connection.profilePicture,
                    lastConnected: connection.lastConnected
                }
            });
            
            // Add edge
            connectionGraph.add({
                group: 'edges',
                data: {
                    id: `e-user-${connection.id}`,
                    source: 'user',
                    target: connection.id
                }
            });
        });
        
        // Refresh layout
        connectionGraph.layout({
            name: 'concentric',
            concentric: function(node) {
                return node.data('type') === 'user' ? 2 : 1;
            },
            levelWidth: function() { return 1; },
            minNodeSpacing: 50
        }).run();
    };

    /**
     * Update connections list
     * @param {Array} connections - Array of connection objects
     */
    const updateConnectionsList = (connections) => {
        // Clear current list
        elements.home.connectionList.innerHTML = '';
        
        // Add connections to list
        connections.forEach(connection => {
            // Create connection element
            const connectionElement = document.createElement('div');
            connectionElement.className = 'connection-item';
            connectionElement.dataset.id = connection.id;
            
            // Create avatar
            const avatar = document.createElement('div');
            avatar.className = 'connection-avatar';
            
            // Add profile image if available
            if (connection.profilePicture) {
                const img = document.createElement('img');
                img.src = connection.profilePicture;
                avatar.appendChild(img);
            } else {
                avatar.innerHTML = `<i class="fas fa-user"></i>`;
            }
            
            // Create info section
            const info = document.createElement('div');
            info.className = 'connection-info';
            
            // Calculate days until expiration
            const now = new Date();
            const expiryDate = new Date(connection.expiresOn);
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            // Format last connected date
            const lastConnected = new Date(connection.lastConnected);
            const lastConnectedStr = lastConnected.toLocaleDateString();
            
            // Add name and date info
            info.innerHTML = `
                <div class="connection-name">${connection.firstName} ${connection.lastName}</div>
                <div class="connection-date">
                    Last connected: ${lastConnectedStr}
                </div>
                <div class="connection-date ${daysUntilExpiry <= 30 ? 'expiring-soon' : ''}">
                    ${daysUntilExpiry <= 30 ? `Expires in ${daysUntilExpiry} days` : ''}
                </div>
            `;
            
            // Assemble connection item
            connectionElement.appendChild(avatar);
            connectionElement.appendChild(info);
            
            // Add click event
            connectionElement.addEventListener('click', () => {
                showConnectionDetails(connection.id);
            });
            
            // Add to list
            elements.home.connectionList.appendChild(connectionElement);
        });
        
        // Show message if no connections
        if (connections.length === 0) {
            elements.home.connectionList.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>No connections yet. Go to the Connect tab to add connections.</p>
                </div>
            `;
        }
    };

    /**
     * Show connection details
     * @param {string} connectionId - ID of the connection to show
     */
    const showConnectionDetails = async (connectionId) => {
        try {
            // Get connection from database
            const connection = await DB.getConnection(connectionId);
            
            if (!connection) {
                throw new Error('Connection not found');
            }
            
            // Set connection ID on modal
            elements.modals.connection.modal.setAttribute('data-connection-id', connectionId);
            
            // Update modal content
            if (connection.profilePicture) {
                const img = document.createElement('img');
                img.src = connection.profilePicture;
                elements.modals.connection.profileImage.innerHTML = '';
                elements.modals.connection.profileImage.appendChild(img);
            } else {
                elements.modals.connection.profileImage.innerHTML = `<div class="profile-image-placeholder"><i class="fas fa-user"></i></div>`;
            }
            
            elements.modals.connection.name.textContent = `${connection.firstName} ${connection.lastName}`;
            elements.modals.connection.nickname.textContent = connection.nickname || '';
            elements.modals.connection.bio.textContent = connection.bio || 'No bio provided.';
            
            // Format dates
            const firstDate = new Date(connection.firstConnected);
            const lastDate = new Date(connection.lastConnected);
            const expiryDate = new Date(connection.expiresOn);
            
            elements.modals.connection.firstDate.textContent = firstDate.toLocaleDateString();
            elements.modals.connection.lastDate.textContent = lastDate.toLocaleDateString();
            elements.modals.connection.expiryDate.textContent = expiryDate.toLocaleDateString();
            
            // Show modal
            showModal(elements.modals.connection.modal);
        } catch (error) {
            console.error('Showing connection details failed:', error);
            alert('Failed to load connection details. Please try again.');
        }
    };

    /**
     * Handle connection removal
     */
    const handleConnectionRemoval = async () => {
        try {
            // Get connection ID from modal
            const connectionId = elements.modals.connection.modal.getAttribute('data-connection-id');
            
            if (!connectionId) {
                throw new Error('Connection ID not found');
            }
            
            // Confirm deletion
            const confirm = window.confirm('Are you sure you want to remove this connection? This action cannot be undone.');
            
            if (!confirm) {
                return;
            }
            
            // Hide modal
            hideModal(elements.modals.connection.modal);
            
            // Remove connection
            await App.removeConnection(connectionId);
            
            // Update UI
            updateConnectionsList(App.getState().connections);
            updateConnectionGraph(App.getState().connections, App.getState().profile);
            
            // Show success message
            alert('Connection removed successfully.');
        } catch (error) {
            console.error('Removing connection failed:', error);
            alert('Failed to remove connection. Please try again.');
        }
    };
    
    /**
     * Show compose message modal
     * @param {string} [connectionId] - Optional connection ID to pre-select
     */
    const showComposeModal = async (connectionId) => {
        try {
            // Get connections to populate recipient select
            const connections = App.getState().connections;
            
            // Clear and populate recipient select
            elements.modals.compose.recipientSelect.innerHTML = '<option value="">Select recipient...</option>';
            
            connections.forEach(connection => {
                const option = document.createElement('option');
                option.value = connection.id;
                option.textContent = `${connection.firstName} ${connection.lastName}`;
                elements.modals.compose.recipientSelect.appendChild(option);
            });
            
            // Pre-select connection if provided
            if (connectionId) {
                elements.modals.compose.recipientSelect.value = connectionId;
            }
            
            // Clear message content
            elements.modals.compose.messageContent.value = '';
            elements.modals.compose.isRelay.checked = false;
            
            // Update character count
            updateCharacterCount();
            
            // Show modal
            showModal(elements.modals.compose.modal);
        } catch (error) {
            console.error('Showing compose modal failed:', error);
            alert('Failed to open compose modal. Please try again.');
        }
    };
    
    /**
     * Update character count for message
     */
    const updateCharacterCount = () => {
        const content = elements.modals.compose.messageContent.value;
        const count = content.length;
        elements.modals.compose.characterCount.textContent = `${count}/1000`;
        
        // Change color if approaching limit
        if (count > 900) {
            elements.modals.compose.characterCount.style.color = '#e53e3e';
        } else {
            elements.modals.compose.characterCount.style.color = '';
        }
    };
    
    /**
     * Handle message sending
     */
    const handleMessageSend = async () => {
        try {
            // Get form values
            const recipientId = elements.modals.compose.recipientSelect.value;
            const content = elements.modals.compose.messageContent.value.trim();
            const isRelay = elements.modals.compose.isRelay.checked;
            
            // Validate
            if (!recipientId) {
                alert('Please select a recipient.');
                return;
            }
            
            if (!content) {
                alert('Please enter a message.');
                return;
            }
            
            if (content.length > 1000) {
                alert('Message is too long. Please limit to 1000 characters.');
                return;
            }
            
            // Send message
            await App.createMessage({
                recipientId,
                content,
                isRelay
            });
            
            // Hide modal
            hideModal(elements.modals.compose.modal);
            
            // Show success message
            alert('Message sent successfully.');
            
            // Navigate to messages screen
            showScreen('messages-screen');
            
            // Update nav
            elements.nav.items.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-screen') === 'messages-screen') {
                    item.classList.add('active');
                }
            });
            
            // Switch to outbox tab
            switchTab('outbox', elements.messages.tabs, elements.messages.tabContents);
        } catch (error) {
            console.error('Sending message failed:', error);
            alert('Failed to send message. Please try again.');
        }
    };
    
    /**
     * Update message lists
     * @param {Object} messages - Object containing received, sent, and relay messages
     */
    const updateMessageLists = (messages) => {
        // Update inbox
        updateMessageList(elements.messages.inboxMessages, messages.received, 'inbox');
        
        // Update outbox
        updateMessageList(elements.messages.outboxMessages, messages.sent, 'outbox');
        
        // Update relay messages
        updateRelayList(elements.messages.relayMessages, messages.relays);
        
        // Update counts
        updateMessageCounts(messages.received.length, messages.sent.length, messages.relays.length);
    };
    
    /**
     * Update a message list
     * @param {HTMLElement} container - Container for the message list
     * @param {Array} messages - Array of message objects
     * @param {string} type - Type of messages ('inbox' or 'outbox')
     */
    const updateMessageList = (container, messages, type) => {
        // Clear container
        container.innerHTML = '';
        
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...messages].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Add messages to container
        sortedMessages.forEach(message => {
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            
            // Determine sender/recipient label
            const nameLabel = type === 'inbox' ? 'From: ' : 'To: ';
            const name = type === 'inbox' ? message.senderName : message.recipientName;
            
            // Format date
            const date = new Date(message.timestamp);
            const dateStr = date.toLocaleString();
            
            // Create message content
            messageElement.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">${nameLabel}${name}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
                <div class="message-content">${message.content}</div>
            `;
            
            // Add to container
            container.appendChild(messageElement);
        });
        
        // Show message if no messages
        if (sortedMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>No messages.</p>
                </div>
            `;
        }
    };
    
    /**
     * Update relay list
     * @param {HTMLElement} container - Container for the relay list
     * @param {Array} relays - Array of relay objects
     */
    const updateRelayList = (container, relays) => {
        // Clear container
        container.innerHTML = '';
        
        // Sort relays by timestamp (newest first)
        const sortedRelays = [...relays].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Add relays to container
        sortedRelays.forEach(relay => {
            // Create relay element
            const relayElement = document.createElement('div');
            relayElement.className = 'message';
            
            // Format date
            const date = new Date(relay.timestamp);
            const dateStr = date.toLocaleString();
            
            // Create relay content
            relayElement.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">To: ${relay.targetRecipientName}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
                <div class="message-content">
                    <p><strong>From:</strong> ${relay.originalSenderName}</p>
                    <p><em>Message is encrypted and can only be read by the recipient.</em></p>
                </div>
            `;
            
            // Add to container
            container.appendChild(relayElement);
        });
        
        // Show message if no relays
        if (sortedRelays.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>No messages to relay.</p>
                </div>
            `;
        }
    };
    
    /**
     * Update message counts
     * @param {number} inboxCount - Number of inbox messages
     * @param {number} outboxCount - Number of outbox messages
     * @param {number} relayCount - Number of relay messages
     */
    const updateMessageCounts = (inboxCount, outboxCount, relayCount) => {
        // Update relay badge and count
        elements.messages.relayBadge.textContent = relayCount;
        elements.messages.relayBadge.style.display = relayCount > 0 ? 'flex' : 'none';
        
        // Update relay tab count
        if (elements.messages.relayCount) {
            elements.messages.relayCount.textContent = relayCount > 0 ? `(${relayCount})` : '';
        }
    };
    
    /**
     * Update relay count
     * @param {number} count - Number of relay messages
     */
    const updateRelayCount = (count) => {
        elements.messages.relayBadge.textContent = count;
        elements.messages.relayBadge.style.display = count > 0 ? 'flex' : 'none';
        
        if (elements.messages.relayCount) {
            elements.messages.relayCount.textContent = count > 0 ? `(${count})` : '';
        }
    };
    
    /**
     * Show export identity modal
     */
    const showExportModal = () => {
        try {
            // Get identity
            const exportedIdentity = App.exportIdentity('CurrentCircle');
            
            // Update modal content
            elements.modals.export.identityKey.textContent = exportedIdentity;
            
            // Show modal
            showModal(elements.modals.export.modal);
        } catch (error) {
            console.error('Exporting identity failed:', error);
            alert('Failed to export identity. Please try again.');
        }
    };
    
    /**
     * Copy identity key to clipboard
     */
    const copyIdentityToClipboard = () => {
        try {
            // Get identity key
            const identityKey = elements.modals.export.identityKey.textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(identityKey)
                .then(() => {
                    alert('Identity key copied to clipboard.');
                })
                .catch((error) => {
                    console.error('Clipboard write failed:', error);
                    
                    // Fallback selection method
                    const range = document.createRange();
                    range.selectNodeContents(elements.modals.export.identityKey);
                    
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    document.execCommand('copy');
                    selection.removeAllRanges();
                    
                    alert('Identity key copied to clipboard.');
                });
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            alert('Failed to copy identity key. Please try again or manually select and copy the text.');
        }
    };
    
    /**
     * Download identity key as a file
     */
    const downloadIdentityFile = () => {
        try {
            // Get identity key
            const identityKey = elements.modals.export.identityKey.textContent;
            
            // Create blob and download link
            const blob = new Blob([identityKey], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'currentcircle-identity.txt';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Download identity failed:', error);
            alert('Failed to download identity key. Please try again or manually copy the text.');
        }
    };
    
    /**
     * Show import identity modal
     */
    const showImportModal = () => {
        // Clear previous values
        elements.modals.import.importKey.value = '';
        elements.modals.import.importError.classList.add('hidden');
        
        // Show modal
        showModal(elements.modals.import.modal);
    };
    
    /**
     * Handle key file upload
     * @param {Event} event - Change event from file input
     */
    const handleKeyFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type and size
        if (!file.type.match('text.*') && !file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
            alert('Please select a text or JSON file.');
            return;
        }
        
        if (file.size > 1024 * 1024) { // 1MB limit
            alert('File is too large. Please select a file smaller than 1MB.');
            return;
        }
        
        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.modals.import.importKey.value = e.target.result;
        };
        reader.readAsText(file);
    };
    
    /**
     * Handle identity import
     */
    const handleIdentityImport = async () => {
        try {
            // Get identity key
            const identityKey = elements.modals.import.importKey.value.trim();
            
            if (!identityKey) {
                throw new Error('Please enter or upload an identity key.');
            }
            
            // Import identity
            const profile = await App.importIdentity(identityKey, 'CurrentCircle');
            
            // Hide modal
            hideModal(elements.modals.import.modal);
            
            // Update UI
            updateProfileDisplay(profile);
            
            // Show success message
            alert('Identity imported successfully.');
            
            // Reload page to refresh state
            window.location.reload();
        } catch (error) {
            console.error('Importing identity failed:', error);
            
            // Show error message
            elements.modals.import.importError.textContent = 'Failed to import identity. Please check your key and try again.';
            elements.modals.import.importError.classList.remove('hidden');
        }
    };
    
    /**
     * Show edit profile modal
     * Note: Since we didn't include this modal in the HTML, we'd normally implement it,
     * but for this demo we'll just use a simple prompt-based approach
     */
    const showEditProfileModal = async () => {
        try {
            // Get current profile
            const profile = App.getState().profile;
            
            // Simple prompt-based editing for demo
            const firstName = prompt('First Name:', profile.firstName);
            if (firstName === null) return; // User cancelled
            
            const lastName = prompt('Last Name:', profile.lastName);
            if (lastName === null) return; // User cancelled
            
            const nickname = prompt('Nickname:', profile.nickname || '');
            if (nickname === null) return; // User cancelled
            
            const bio = prompt('Bio:', profile.bio || '');
            if (bio === null) return; // User cancelled
            
            // Update profile
            if (firstName || lastName) {
                const updatedProfile = await App.updateProfile({
                    firstName: firstName || profile.firstName,
                    lastName: lastName || profile.lastName,
                    nickname,
                    bio
                });
                
                // Update UI
                updateProfileDisplay(updatedProfile);
                
                // Show success message
                alert('Profile updated successfully.');
            }
        } catch (error) {
            console.error('Editing profile failed:', error);
            alert('Failed to update profile. Please try again.');
        }
    };
    
    // Public API
    return {
        initEventListeners,
        showScreen,
        updateProfileDisplay,
        updateConnectionsList,
        updateConnectionGraph,
        initConnectionGraph,
        updateMessageLists,
        updateMessageCounts,
        updateRelayCount
    };
})();