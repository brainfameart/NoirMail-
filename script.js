// NoirMail - Vanilla JavaScript Implementation
// Powered by Mail.tm API

const API_BASE = 'https://api.mail.tm';

// Global state
let session = null;
let messages = [];
let pollingInterval = null;
let selectedMessageId = null;

// ⭐ Ad Tracking Set: Stores IDs of messages that have already triggered an ad
const adTriggeredMessages = new Set();

// DOM Elements
const domainList = document.getElementById('domainList');
const generateBtn = document.getElementById('generateBtn');
const emailBox = document.getElementById('emailBox');
const emailAddress = document.getElementById('emailAddress');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const createdTime = document.getElementById('createdTime');
const loading = document.getElementById('loading');
const inboxSection = document.getElementById('inboxSection');
const inbox = document.getElementById('inbox');
const messageCount = document.getElementById('messageCount');
const messageViewer = document.getElementById('messageViewer');
const closeViewerBtn = document.getElementById('closeViewerBtn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDomains();
    loadSession();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', generateEmail);
    copyBtn.addEventListener('click', copyEmail);
    refreshBtn.addEventListener('click', () => fetchInbox(true));
    clearBtn.addEventListener('click', clearSession);
    closeViewerBtn.addEventListener('click', closeMessageViewer);
}

// Load available domains from Mail.tm
async function loadDomains() {
    try {
        const response = await fetch(`${API_BASE}/domains`);
        const data = await response.json();
        const domainList_api = data['hydra:member'] || data;

        // Add fallback domains
        const fallbackDomains = [
            { domain: 'bugfoo.com' },
            { domain: 'cloudns.asia' },
            { domain: 'cloudns.club' },
            { domain: 'cloudns.eu' },
            { domain: 'email.de' },
            { domain: 'guerrillamail.com' },
            { domain: 'guerrillamailblock.com' },
            { domain: 'haribu.net' },
            { domain: 'vomoto.com' },
            { domain: 'disposable.com' }
        ];

        const existingDomains = domainList_api.map(d => d.domain);
        const uniqueFallbacks = fallbackDomains.filter(fb => !existingDomains.includes(fb.domain));
        const domains = [...domainList_api, ...uniqueFallbacks];

        domainList.innerHTML = '';
        domains.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain.domain;
            option.textContent = `@${domain.domain}`;
            domainList.appendChild(option);
        });

        if (domains.length > 0) {
            generateBtn.disabled = false;
        }
    } catch (error) {
        showToast('Failed to load domains', 'error');
        console.error('Error loading domains:', error);
    }
}

// Generate a new disposable email
async function generateEmail() {
    const selectedDomain = domainList.value;
    if (!selectedDomain) {
        showToast('Please select a domain', 'error');
        return;
    }
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Generate random local part (noir + 5 digits)
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        const localPart = `noir${randomNum}`;
        const address = `${localPart}@${selectedDomain}`;
        const password = `NoirPass${Date.now()}`;
        
        // Create account
        await createAccount(address, password);
        
        // Login to get token
        const token = await login(address, password);
        
        // Save session
        session = {
            email: address,
            token: token,
            password: password,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('noirmail_session', JSON.stringify(session));
        
        // Update UI
        displayEmailBox();
        startInboxPolling();
        
        showToast('Email created successfully', 'success');
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Error generating email:', error);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            Generate Email
        `;
    }
}

// Create account with Mail.tm
async function createAccount(address, password) {
    const response = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
    });
    
    if (response.status === 429) {
        throw new Error('Rate limited. Please wait a moment.');
    }
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create account');
    }
    return response.json();
}

// Login and get authentication token
async function login(address, password) {
    const response = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
    });
    
    if (response.status === 429) {
        throw new Error('Rate limited. Please wait a moment.');
    }
    if (!response.ok) {
        throw new Error('Failed to authenticate');
    }
    const data = await response.json();
    return data.token;
}

// Load session from localStorage
function loadSession() {
    const savedSession = localStorage.getItem('noirmail_session');
    if (savedSession) {
        session = JSON.parse(savedSession);
        displayEmailBox();
        startInboxPolling();
    }
}

// Display the email box with created email
function displayEmailBox() {
    emailAddress.textContent = session.email;
    createdTime.innerHTML = `
        <svg style="width: 0.75rem; height: 0.75rem; display: inline;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Created ${formatDate(session.createdAt)}
    `;
    emailBox.style.display = 'block';
    inboxSection.style.display = 'grid';
}

// Copy email to clipboard
function copyEmail() {
    navigator.clipboard.writeText(session.email).then(() => {
        showToast('Email copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy email', 'error');
    });
}

// Clear session and start fresh
function clearSession() {
    if (!confirm('Are you sure you want to clear this session?')) {
        return;
    }
    
    stopInboxPolling();
    localStorage.removeItem('noirmail_session');
    session = null;
    messages = [];
    selectedMessageId = null;
    adTriggeredMessages.clear(); // Clear the ad history for the session
    
    emailBox.style.display = 'none';
    inboxSection.style.display = 'none';
    loading.style.display = 'none';
    
    showToast('Session cleared', 'info');
}

// Start polling inbox for new messages
function startInboxPolling() {
    // Fetch immediately
    fetchInbox();
    
    // Then poll every 4 seconds
    pollingInterval = setInterval(() => {
        fetchInbox();
    }, 4000);
}

// Stop polling inbox
function stopInboxPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Fetch inbox messages
async function fetchInbox(showLoading = false) {
    if (!session || !session.token) return;
    
    if (showLoading) {
        loading.style.display = 'block';
        refreshBtn.classList.add('spinning');
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const newMessages = data['hydra:member'] || data || [];
            
            // Check if we have new messages
            if (newMessages.length > messages.length) {
                // Flash the inbox to indicate new messages
                flashInbox();
            }
            
            messages = newMessages;
            renderInbox();
        }
    } catch (error) {
        console.error('Failed to fetch inbox:', error);
    } finally {
        if (showLoading) {
            loading.style.display = 'none';
            refreshBtn.classList.remove('spinning');
        }
    }
}

// Render inbox messages
function renderInbox() {
    if (messages.length === 0) {
        inbox.innerHTML = `
            <div class="empty-inbox">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                </svg>
                <p>No messages yet</p>
                <p>Emails will appear here</p>
            </div>
        `;
        messageCount.style.display = 'none';
        return;
    }
    
    messageCount.textContent = messages.length;
    messageCount.style.display = 'inline-block';
    
    inbox.innerHTML = messages.map(msg => `
        <div class="message-item ${selectedMessageId === msg.id ? 'selected' : ''}" onclick="viewMessage('${msg.id}')">
            <div class="message-item-header">
                <div style="flex: 1; min-width: 0;">
                    <p class="message-from">${escapeHtml(msg.from?.name || msg.from?.address || 'Unknown')}</p>
                </div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="event.stopPropagation(); viewMessage('${msg.id}')" title="View">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="message-action-btn delete" onclick="event.stopPropagation(); deleteMessage('${msg.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <p class="message-subject">${escapeHtml(msg.subject || '(No subject)')}</p>
            <p class="message-date">${formatDate(msg.createdAt)}</p>
        </div>
    `).join('');
}

// View a specific message
async function viewMessage(messageId) {
    // ⭐ ADSTERRA TRIGGER: Check if ad has already been shown for this specific message
    if (!adTriggeredMessages.has(messageId)) {
        // If not, trigger the ad script
        triggerAdsterraAd();
        // Mark this message as having triggered the ad
        adTriggeredMessages.add(messageId);
    }

    if (!session || !session.token) return;
    
    selectedMessageId = messageId;
    closeViewerBtn.style.display = 'block';
    
    messageViewer.innerHTML = `
        <div class="loading-message">
            <div class="spinner"></div>
        </div>
    `;
    
    // Show viewer on mobile
    const viewerCard = document.querySelector('.viewer-card');
    const inboxCard = document.querySelector('.inbox-card');
    if (window.innerWidth < 768) {
        viewerCard.classList.add('mobile-show');
        inboxCard.classList.add('mobile-hide');
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages/${messageId}`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        
        if (response.ok) {
            const message = await response.json();
            renderMessageDetails(message);
            renderInbox(); // Re-render to highlight selected
        } else {
            messageViewer.innerHTML = `
                <div class="empty-viewer">
                    <p>Failed to load message</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load message:', error);
        messageViewer.innerHTML = `
            <div class="empty-viewer">
                <p>Failed to load message</p>
            </div>
        `;
    }
}

// Helper: Inject Adsterra Script Dynamically
function triggerAdsterraAd() {
    const script = document.createElement('script');
    script.src = "//pl28248414.effectivegatecpm.com/ac/01/63/ac01632a3b4a4dcc5d36035a140becd6.js";
    script.type = "text/javascript";
    document.body.appendChild(script);
}

// Helper function to turn text links into clickable HTML links (for text-only emails)
function linkify(text) {
    const safeText = escapeHtml(text);
    const urlRegex = /(https:\/\/[^\s]+)/g;
    return safeText.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

// Render message details
function renderMessageDetails(message) {
    // Check if we have HTML content
    const hasHtml = message.html && message.html.length > 0;
    
    // Build the frame
    messageViewer.innerHTML = `
        <div class="message-details">
            <div class="message-meta">
                <div class="message-meta-row">
                    <span class="message-meta-label">From:</span>
                    <span class="message-meta-value">
                        ${escapeHtml(message.from?.name || '')} &lt;${escapeHtml(message.from?.address)}&gt;
                    </span>
                </div>
                <div class="message-meta-row">
                    <span class="message-meta-label">Subject:</span>
                    <span class="message-meta-value message-subject-value">
                        ${escapeHtml(message.subject || '(No subject)')}
                    </span>
                </div>
                <div class="message-meta-row">
                    <span class="message-meta-label">Date:</span>
                    <span class="message-meta-value message-date-value">
                        ${formatDate(message.createdAt)}
                    </span>
                </div>
            </div>
            <div class="message-content" id="msg-content-render"></div>
        </div>
    `;

    const contentContainer = document.getElementById('msg-content-render');

    if (hasHtml) {
        // Render HTML directly
        contentContainer.innerHTML = message.html;

        // Post-process: Make all links open in new tab
        const links = contentContainer.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Styling adjustment for html content images
        const images = contentContainer.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });

    } else {
        // Fallback to text with linkify
        const content = message.text || 'No content';
        contentContainer.innerHTML = linkify(content);
    }
}

// Close message viewer (mobile)
function closeMessageViewer() {
    selectedMessageId = null;
    closeViewerBtn.style.display = 'none';
    
    const viewerCard = document.querySelector('.viewer-card');
    const inboxCard = document.querySelector('.inbox-card');
    viewerCard.classList.remove('mobile-show');
    inboxCard.classList.remove('mobile-hide');
    
    messageViewer.innerHTML = `
        <div class="empty-viewer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            <p>Select a message to view</p>
        </div>
    `;
    
    renderInbox(); // Re-render to remove selection
}

// Delete a message (UI only, Mail.tm doesn't support deletion via this endpoint)
async function deleteMessage(messageId) {
    if (!session || !session.token) return;
    if (!confirm('Delete this message?')) return;
    
    try {
        await fetch(`${API_BASE}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        
        messages = messages.filter(m => m.id !== messageId);
        if (selectedMessageId === messageId) {
            closeMessageViewer();
        }
        renderInbox();
        showToast('Message deleted', 'success');
    } catch (error) {
        console.error('Failed to delete message:', error);
        showToast('Failed to delete message', 'error');
    }
}

// Flash inbox to indicate new messages
function flashInbox() {
    const inboxCard = document.querySelector('.inbox-card');
    inboxCard.style.boxShadow = '0 0 20px rgba(0, 120, 255, 0.5)';
    setTimeout(() => {
        inboxCard.style.boxShadow = '';
    }, 500);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}



