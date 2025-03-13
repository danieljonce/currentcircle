/**
 * Messages Module for CurrentCircle
 * Handles message creation, display, and relay functionality
 */

const Messages = (() => {
    /**
     * Initialize the messages module
     */
    const init = () => {
        // Set up event listeners
        setupEventListeners();
        
        // Load messages
        loadMessages();
    };
    
    /**
     * Set up event listeners for messages interface
     */
    const setupEventListeners = () => {
        // Get elements
        const inboxTab = document.querySelector('[data-tab="inbox"]');
        const outboxTab = document.querySelector('[data-tab="outbox"]');
        const relayTab = document.querySelector('[data-tab="relay"]');
        const composeBtn = document.getElementById('compose-btn');
        const sendMessageBtn = document.getElementById('send-message-btn');
        const messageContent = document.getElementById('message-content');
        
        // Add tab switching listeners
        if (inboxTab) {
            inboxTab.addEventListener('click', () => switchTab('inbox'));
        }
        
        if (outboxTab) {
            outboxTab.addEventListener('click', () => switchTab('outbox'));
        }
        
        if (relayTab) {
            relayTab.addEventListener('click', () => switchTab('relay'));
        }
        
        // Compose button listener
        if (composeBtn) {
            composeBtn.addEventListener('click', showComposeModal);
        }
        
        // Send message button listener
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', sendMessage);
        }
        
        // Character count listener
        if (messageContent) {
            messageContent.addEventListener('input', updateCharacterCount);
        }
    };
    
    /**
     * Switch between message tabs
     * @param {string} tabName - Name of the tab to show
     */
    const switchTab = (tabName) => {
        // Get tab elements
        const tabs = {
            inbox: document.querySelector('[data-tab="inbox"]'),
            outbox: document.querySelector('[data-tab="outbox"]'),
            relay: document.querySelector('[data-tab="relay"]')
        };
        
        // Get content elements
        const contents = {
            inbox: document.getElementById('inbox-tab'),
            outbox: document.getElementById('outbox-tab'),
            relay: document.getElementById('relay-tab')
        };
        
        // Validate
        if (!tabs[tabName] || !contents[tabName]) return;
        
        // Remove active class from all tabs and contents
        Object.values(tabs).forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
        
        Object.values(contents).forEach(content => {
            if (content) content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        tabs[tabName].classList.add('active');
        contents[tabName].classList.add('active');
    };
    
    /**
     * Load messages from the database
     */
    const loadMessages = async () => {
        try {
            // Get app state with messages
            const state = App.getState();
            
            if (!state.initialized) return;
            
            // Update inbox messages
            updateInboxMessages(state.messages.received);
            
            // Update outbox messages
            updateOutboxMessages(state.messages.sent);
            
            // Update relay messages
            updateRelayMessages(state.messages.relays);
            
            // Update message counts
            updateMessageCounts(
                state.messages.received.length,
                state.messages.sent.length,
                state.messages.relays.length
            );
        } catch (error) {
            console.error('Loading messages failed:', error);
        }
    };
    
    /**
     * Update inbox messages display
     * @param {Array} messages - Array of received messages
     */
    const updateInboxMessages = (messages) => {
        const container = document.getElementById('inbox-messages');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...messages].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Add each message to the container
        sortedMessages.forEach(message => {
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = 'message';
            
            // Format date
            const date = new Date(message.timestamp);
            const dateStr = date.toLocaleString();
            
            // Build message HTML
            messageEl.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">From: ${message.senderName}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
                <div class="message-content">${message.content}</div>
            `;
            
            // Add to container
            container.appendChild(messageEl);
        });
        
        // Show empty state if no messages
        if (sortedMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>No messages in your inbox.</p>
                </div>
            `;
        }
    };
    
    /**
     * Update outbox messages display
     * @param {Array} messages - Array of sent messages
     */
    const updateOutboxMessages = (messages) => {
        const container = document.getElementById('outbox-messages');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Sort messages by timestamp (newest first)
        const sortedMessages = [...messages].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Add each message to the container
        sortedMessages.forEach(message => {
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = 'message';
            
            // Format date
            const date = new Date(message.timestamp);
            const dateStr = date.toLocaleString();
            
            // Build message HTML
            messageEl.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">To: ${message.recipientName}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
                <div class="message-content">${message.content}</div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #718096;">
                    ${message.isRelay ? 'Will be delivered via relay' : 'Direct message'}
                </div>
            `;
            
            // Add to container
            container.appendChild(messageEl);
        });
        
        // Show empty state if no messages
        if (sortedMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>No sent messages.</p>
                </div>
            `;
        }
    };
    
    /**
     * Update relay messages display
     * @param {Array} relays - Array of relay messages
     */
    const updateRelayMessages = (relays) => {
        const container = document.getElementById('relay-messages');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Sort relays by timestamp (newest first)
        const sortedRelays = [...relays].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Add each relay to the container
        sortedRelays.forEach(relay => {
            // Create relay element
            const relayEl = document.createElement('div');
            relayEl.className = 'message';
            
            // Format date
            const date = new Date(relay.timestamp);
            const dateStr = date.toLocaleString();
            
            // Build relay HTML
            relayEl.innerHTML = `
                <div class="message-header">
                    <div class="message-sender">To: ${relay.targetRecipientName}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
                <div class="message-content">
                    <p><strong>From:</strong> ${relay.originalSenderName}</p>
                    <p><em>Message is encrypted and will be delivered when you connect with ${relay.targetRecipientName}.</em></p>
                </div>
            `;
            
            // Add to container
            container.appendChild(relayEl);
        });
        
        // Show empty state if no relays
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
        const relayBadge = document.getElementById('relay-badge');
        const relayCountEl = document.getElementById('relay-count');
        
        if (relayBadge) {
            relayBadge.textContent = relayCount;
            relayBadge.style.display = relayCount > 0 ? 'flex' : 'none';
        }
        
        if (relayCountEl) {
            relayCountEl.textContent = relayCount > 0 ? `(${relayCount})` : '';
        }
    };
    
    /**
     * Show compose message modal
     * @param {string} [recipientId] - Optional ID of pre-selected recipient
     */
    const showComposeModal = (recipientId) => {
        // Get modal and form elements
        const modal = document.getElementById('compose-modal');
        const recipientSelect = document.getElementById('message-recipient');
        const messageContent = document.getElementById('message-content');
        const isRelayCheckbox = document.getElementById('is-relay');
        
        if (!modal || !recipientSelect) return;
        
        // Clear previous values
        messageContent.value = '';
        isRelayCheckbox.checked = false;
        
        // Populate recipient select
        populateRecipientSelect(recipientSelect, recipientId);
        
        // Update character count
        updateCharacterCount();
        
        // Show modal
        modal.classList.add('active');
    };
    
    /**
     * Populate recipient select dropdown
     * @param {HTMLSelectElement} selectElement - Select element to populate
     * @param {string} [selectedId] - Optional ID to pre-select
     */
    const populateRecipientSelect = (selectElement, selectedId) => {
        // Clear existing options
        selectElement.innerHTML = '<option value="">Select recipient...</option>';
        
        // Get connections from app state
        const connections = App.getState().connections;
        
        // Add each connection as an option
        connections.forEach(connection => {
            const option = document.createElement('option');
            option.value = connection.id;
            option.textContent = `${connection.firstName} ${connection.lastName}`;
            
            // Pre-select if ID matches
            if (selectedId && connection.id === selectedId) {
                option.selected = true;
            }
            
            selectElement.appendChild(option);
        });
    };
    
    /**
     * Update character count for message composition
     */
    const updateCharacterCount = () => {
        const messageContent = document.getElementById('message-content');
        const characterCount = document.getElementById('character-count');
        
        if (!messageContent || !characterCount) return;
        
        const count = messageContent.value.length;
        characterCount.textContent = `${count}/1000`;
        
        // Change color when approaching limit
        if (count > 900) {
            characterCount.style.color = '#e53e3e';
        } else {
            characterCount.style.color = '';
        }
    };
    
    /**
     * Send a message
     */
    const sendMessage = async () => {
        try {
            // Get form values
            const recipientSelect = document.getElementById('message-recipient');
            const messageContent = document.getElementById('message-content');
            const isRelayCheckbox = document.getElementById('is-relay');
            const modal = document.getElementById('compose-modal');
            
            if (!recipientSelect || !messageContent || !isRelayCheckbox || !modal) {
                throw new Error('Required elements not found');
            }
            
            const recipientId = recipientSelect.value;
            const content = messageContent.value.trim();
            const isRelay = isRelayCheckbox.checked;
            
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
            modal.classList.remove('active');
            
            // Reload messages
            loadMessages();
            
            // Show success message
            alert('Message sent successfully!');
            
            // Switch to outbox tab
            switchTab('outbox');
        } catch (error) {
            console.error('Sending message failed:', error);
            alert('Failed to send message. Please try again.');
        }
    };
    
    // Public API
    return {
        init,
        loadMessages,
        showComposeModal,
        sendMessage
    };
})();
