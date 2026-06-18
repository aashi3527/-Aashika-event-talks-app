// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let allUpdates = [];
let filteredUpdates = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdateForTweet = null;
let lastSyncedTime = null;

// Target date for relative calculations (mocking/aligning with user current time if needed,
// but standard JS new Date() is fine. We will use the browser's current date, 
// and handle timezone offsets gracefully.)
const CURRENT_TIME = new Date("2026-06-18T16:01:49+05:30"); // Aligning with system date

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const DOM = {
    cardsGrid: document.getElementById('cardsGrid'),
    loadingContainer: document.getElementById('loadingContainer'),
    errorContainer: document.getElementById('errorContainer'),
    emptyContainer: document.getElementById('emptyContainer'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    syncStatus: document.getElementById('syncStatus'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterGroup: document.getElementById('filterGroup'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweetModal'),
    modalBadge: document.getElementById('modalBadge'),
    modalDate: document.getElementById('modalDate'),
    modalTitle: document.getElementById('modalTitle'),
    tweetTextarea: document.getElementById('tweetTextarea'),
    tweetUrlText: document.getElementById('tweetUrlText'),
    charCount: document.getElementById('charCount'),
    cancelTweetBtn: document.getElementById('cancelTweetBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    submitTweetBtn: document.getElementById('submitTweetBtn'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh & Utility buttons
    DOM.refreshBtn.addEventListener('click', fetchReleaseNotes);
    DOM.retryBtn.addEventListener('click', fetchReleaseNotes);
    DOM.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Search input
    DOM.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        DOM.clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });
    
    // Clear search
    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        searchQuery = '';
        DOM.clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        DOM.searchInput.focus();
    });
    
    // Filter pills
    DOM.filterGroup.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Update active class
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');
        
        activeFilter = pill.dataset.type;
        applyFiltersAndSearch();
    });
    
    // Modal closing events
    DOM.cancelTweetBtn.addEventListener('click', closeTweetModal);
    DOM.closeModalBtn.addEventListener('click', closeTweetModal);
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) closeTweetModal();
    });
    
    // Textarea character count
    DOM.tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Submit Tweet
    DOM.submitTweetBtn.addEventListener('click', postTweet);
}

// ==========================================================================
// API CALLS
// ==========================================================================
async function fetchReleaseNotes() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/release-notes');
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
            allUpdates = result.data;
            lastSyncedTime = new Date();
            updateSyncStatus();
            applyFiltersAndSearch();
            showToast('Release notes successfully updated.', 'success');
        } else {
            throw new Error(result.error || 'Invalid API response format');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message || 'Unable to connect to Flask backend.');
        showToast('Failed to fetch updates.', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================================================
// RENDERING & STATE UI UPDATES
// ==========================================================================
function showLoading(isLoading) {
    if (isLoading) {
        DOM.cardsGrid.style.display = 'none';
        DOM.errorContainer.style.display = 'none';
        DOM.emptyContainer.style.display = 'none';
        DOM.loadingContainer.style.display = 'grid';
        
        DOM.refreshBtn.classList.add('syncing');
        DOM.refreshIcon.classList.add('fa-spin');
        
        const statusText = DOM.syncStatus.querySelector('.status-text');
        const statusDot = DOM.syncStatus.querySelector('.status-dot');
        statusText.textContent = "Syncing with BigQuery feed...";
        statusDot.classList.add('syncing');
    } else {
        DOM.loadingContainer.style.display = 'none';
        DOM.refreshBtn.classList.remove('syncing');
        DOM.refreshIcon.classList.remove('fa-spin');
        
        const statusDot = DOM.syncStatus.querySelector('.status-dot');
        statusDot.classList.remove('syncing');
    }
}

function showError(msg) {
    DOM.cardsGrid.style.display = 'none';
    DOM.loadingContainer.style.display = 'none';
    DOM.emptyContainer.style.display = 'none';
    DOM.errorContainer.style.display = 'flex';
    DOM.errorMessage.textContent = msg;
}

function updateSyncStatus() {
    const statusText = DOM.syncStatus.querySelector('.status-text');
    if (lastSyncedTime) {
        const timeString = lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        statusText.textContent = `Last synced at ${timeString}`;
    } else {
        statusText.textContent = 'Not synced';
    }
}

function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(update => {
        // Filter by Category
        const matchesFilter = activeFilter === 'all' || update.type === activeFilter;
        
        // Filter by Search Query
        const textContent = (update.type + ' ' + update.date + ' ' + stripHtml(update.content)).toLowerCase();
        const matchesSearch = textContent.includes(searchQuery);
        
        return matchesFilter && matchesSearch;
    });
    
    renderCards();
}

function renderCards() {
    DOM.cardsGrid.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        DOM.cardsGrid.style.display = 'none';
        DOM.emptyContainer.style.display = 'flex';
        return;
    }
    
    DOM.emptyContainer.style.display = 'none';
    DOM.cardsGrid.style.display = 'grid';
    
    // Add cards to grid with a slight fade-in animation
    DOM.cardsGrid.classList.add('fade-out');
    
    setTimeout(() => {
        filteredUpdates.forEach(update => {
            const card = createCardElement(update);
            DOM.cardsGrid.appendChild(card);
        });
        DOM.cardsGrid.classList.remove('fade-out');
    }, 100);
}

function createCardElement(update) {
    const card = document.createElement('div');
    const typeClass = `type-${update.type.toLowerCase()}`;
    card.className = `card ${typeClass}`;
    
    // Relative time string
    const relativeTime = getRelativeTime(update.updated);
    
    // Content sanitization - we render HTML directly as it comes from GCP feed
    // but we wrap tags with correct styling in CSS.
    card.innerHTML = `
        <div>
            <div class="card-header">
                <div class="card-meta">
                    <span class="card-date">${update.date}</span>
                    <span class="card-relative-time">${relativeTime}</span>
                </div>
                <span class="tag tag-${update.type.toLowerCase()}">${update.type}</span>
            </div>
            <div class="card-body">
                ${update.content}
            </div>
        </div>
        <div class="card-footer">
            <a href="${update.link}" target="_blank" class="link-docs" title="View GCP documentation">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <span>GCP Docs</span>
            </a>
            <div class="card-actions-group">
                <button class="btn btn-secondary btn-copy" title="Copy update to clipboard">
                    <i class="fa-regular fa-copy"></i>
                    <span>Copy</span>
                </button>
                <button class="btn btn-secondary btn-tweet" title="Share this update on X / Twitter">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        </div>
    `;
    
    // Attach event listeners to buttons
    const copyBtn = card.querySelector('.btn-copy');
    copyBtn.addEventListener('click', () => copyToClipboard(update, copyBtn));
    
    const tweetBtn = card.querySelector('.btn-tweet');
    tweetBtn.addEventListener('click', () => openTweetModal(update));
    
    return card;
}

// ==========================================================================
// TWEET COMPOSER DIALOG & TWITTER INTEGRATION
// ==========================================================================
function openTweetModal(update) {
    selectedUpdateForTweet = update;
    
    // Setup modal compact header
    DOM.modalBadge.textContent = update.type;
    DOM.modalBadge.className = `preview-type-badge tag-${update.type.toLowerCase()}`;
    DOM.modalDate.textContent = update.date;
    
    const plainTextBody = stripHtml(update.content);
    DOM.modalTitle.textContent = plainTextBody;
    
    // Auto-compose starting tweet text:
    // Format: "BigQuery [Type] ([Date]): [Snippet] #BigQuery #GoogleCloud"
    const prefix = `BigQuery ${update.type} (${update.date}): `;
    const hashtags = ` #BigQuery #GoogleCloud`;
    
    // Twitter URL intent limit calculations:
    // A link takes 23 characters. We also need 1 space between text and URL.
    // Total character limit for text content of tweet is: 280 - 24 = 256.
    // So the text inside the text area can be max 256 characters.
    const maxTextareaLen = 256;
    const prefixLen = prefix.length;
    const hashLen = hashtags.length;
    const availableSnippetLen = maxTextareaLen - prefixLen - hashLen;
    
    let snippet = plainTextBody;
    if (snippet.length > availableSnippetLen) {
        snippet = snippet.substring(0, availableSnippetLen - 3) + '...';
    }
    
    // Set text box value
    const finalTweetText = `${prefix}${snippet}${hashtags}`;
    DOM.tweetTextarea.value = finalTweetText;
    
    // Show url
    DOM.tweetUrlText.textContent = update.link;
    
    // Open modal
    DOM.tweetModal.classList.add('active');
    DOM.tweetModal.style.display = 'flex';
    DOM.tweetTextarea.focus();
    
    updateCharCounter();
}

function closeTweetModal() {
    DOM.tweetModal.classList.remove('active');
    setTimeout(() => {
        DOM.tweetModal.style.display = 'none';
        selectedUpdateForTweet = null;
    }, 200);
}

function updateCharCounter() {
    const textLen = DOM.tweetTextarea.value.length;
    
    // Available text length for Twitter Intent is 256 characters (excluding URL)
    const remaining = 256 - textLen;
    DOM.charCount.textContent = remaining;
    
    // Style adjustments based on limits
    DOM.charCount.className = '';
    if (remaining < 0) {
        DOM.charCount.classList.add('error');
        DOM.submitTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        DOM.charCount.classList.add('warning');
        DOM.submitTweetBtn.disabled = false;
    } else {
        DOM.submitTweetBtn.disabled = false;
    }
}

function postTweet() {
    if (!selectedUpdateForTweet) return;
    
    const text = DOM.tweetTextarea.value;
    const url = selectedUpdateForTweet.link;
    
    if (text.length > 256) {
        showToast('Tweet content exceeds the character limit.', 'error');
        return;
    }
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    // Open Twitter intent in a new window/tab
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    
    // Close modal and notify
    closeTweetModal();
    showToast('Redirected to Twitter to publish!', 'info');
}

// ==========================================================================
// HELPER UTILITIES
// ==========================================================================
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let text = doc.body.textContent || "";
    // Clean up excessive whitespace
    return text.replace(/\s+/g, ' ').trim();
}

function getRelativeTime(isoString) {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "";
        
        // Calculate difference using aligned current time (2026-06-18)
        const diffMs = CURRENT_TIME - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return "Just now"; // future fallback
        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMins = Math.floor(diffMs / (1000 * 60));
                if (diffMins <= 1) return "Just now";
                return `${diffMins} minutes ago`;
            }
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } catch (e) {
        return "";
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================================================
// UTILITY FUNCTIONS: COPY & CSV EXPORT
// ==========================================================================
async function copyToClipboard(update, btnElement) {
    const plainText = stripHtml(update.content);
    const textToCopy = `BigQuery Release Note (${update.date}) - ${update.type}\n\n${plainText}\n\nRead more: ${update.link}`;
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        // Success visual feedback on button
        const icon = btnElement.querySelector('i');
        const text = btnElement.querySelector('span');
        
        const originalIconClass = icon.className;
        const originalText = text.textContent;
        
        icon.className = 'fa-solid fa-check';
        text.textContent = 'Copied';
        btnElement.classList.add('copy-success');
        
        showToast('Release note copied to clipboard!', 'success');
        
        setTimeout(() => {
            icon.className = originalIconClass;
            text.textContent = originalText;
            btnElement.classList.remove('copy-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.', 'error');
    }
}

function exportToCSV() {
    if (!filteredUpdates || filteredUpdates.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }
    
    const headers = ['ID', 'Date', 'Updated Timestamp', 'Type', 'Content', 'Link'];
    
    const rows = filteredUpdates.map(u => [
        u.id,
        u.date,
        u.updated,
        u.type,
        stripHtml(u.content),
        u.link
    ]);
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let stringVal = val.toString();
        stringVal = stringVal.replace(/"/g, '""');
        if (/[",\n\r]/.test(stringVal)) {
            stringVal = `"${stringVal}"`;
        }
        return stringVal;
    };
    
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filterName = activeFilter.toLowerCase();
    link.setAttribute('download', `bigquery_release_notes_${filterName}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV export downloaded successfully!', 'success');
}
