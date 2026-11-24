// EduMind AI - Frontend Application

// API Configuration
const API_BASE_URL = window.location.port === '8000' ? '' : 'http://localhost:8000';

// Configure Marked.js options immediately
if (window.marked && typeof window.marked.use === 'function') {
    try {
        window.marked.use({ breaks: true, gfm: true });
    } catch (e) {
        console.warn('Marked.use error:', e);
    }
}

// Application State
let currentSection = 'dashboard';
let selectedPDFFile = null;
let quizData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let quizScore = 0;
let currentTheme = 'dark';
let isGenerating = false;

// Mock Data for PDF Summaries
const mockPDFSummary = `
<h4>Key Points:</h4>
<p>• The document covers fundamental concepts and principles of the subject matter.</p>
<p>• Several important theories and frameworks are discussed in detail.</p>
<p>• Practical applications and real-world examples are provided throughout.</p>
<p>• The author emphasizes the importance of understanding core concepts before advancing to complex topics.</p>

<h4>Main Themes:</h4>
<p>• Conceptual foundations and theoretical background</p>
<p>• Practical implementation strategies</p>
<p>• Case studies and examples</p>
<p>• Future directions and research opportunities</p>

<h4>Recommendations:</h4>
<p>• Focus on understanding the fundamental principles first</p>
<p>• Practice with the provided examples</p>
<p>• Review the case studies for real-world context</p>
<p>• Explore additional resources mentioned in the references</p>
`;

// Mock Quiz Questions
const mockQuizQuestions = [
    {
        question: "What is the primary function of this concept?",
        options: [
            "To organize and structure information",
            "To process and analyze data",
            "To facilitate communication",
            "To optimize performance"
        ],
        correct: 0
    },
    {
        question: "Which of the following is a key characteristic?",
        options: [
            "Scalability",
            "Flexibility",
            "Efficiency",
            "All of the above"
        ],
        correct: 3
    },
    {
        question: "What is the main benefit of this approach?",
        options: [
            "Reduced complexity",
            "Improved performance",
            "Better user experience",
            "All of the above"
        ],
        correct: 3
    },
    {
        question: "Which factor is most important for success?",
        options: [
            "Technical expertise",
            "Planning and preparation",
            "Resource allocation",
            "Team collaboration"
        ],
        correct: 1
    },
    {
        question: "What is the recommended best practice?",
        options: [
            "Start with simple implementations",
            "Focus on optimization early",
            "Use complex solutions",
            "Ignore documentation"
        ],
        correct: 0
    }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeNavigation();
    initializeMobileMenu();
    initializeChat();
    initializePDFUpload();
    initializeQuiz();
    initializeGlobalFunctions();
    updateDashboardUI();
    // Periodically sync dashboard stats every 4 seconds
    setInterval(updateDashboardUI, 4000);
});

// Theme System
function initializeTheme() {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Add event listener to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update theme toggle button icon
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Navigation System
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            navigateTo(targetSection);
        });
    });
}

function navigateTo(sectionId) {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    // Update navigation
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });

    // Update sections
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });

    currentSection = sectionId;

    // Refresh dashboard stats whenever dashboard is opened
    if (sectionId === 'dashboard') {
        updateDashboardUI();
    }

    // Close mobile menu if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
}

// Make navigateTo available globally immediately
window.navigateTo = navigateTo;

// Helper to update stat DOM elements
function setStatElements(questions, notes, quizzes, avgScore) {
    const qEl = document.getElementById('statQuestions');
    const nEl = document.getElementById('statNotes');
    const quizEl = document.getElementById('statQuizzes');
    const scoreEl = document.getElementById('statScore');

    if (qEl && questions !== undefined) qEl.textContent = questions;
    if (nEl && notes !== undefined) nEl.textContent = notes;
    if (quizEl && quizzes !== undefined) quizEl.textContent = quizzes;
    if (scoreEl && avgScore !== undefined) scoreEl.textContent = avgScore + '%';
}

// Format timestamp into clean relative or local time
function formatActivityTime(timestamp) {
    if (!timestamp) return 'Just now';
    try {
        const date = new Date(timestamp.replace(' ', 'T') + 'Z');
        if (isNaN(date.getTime())) return timestamp;
        const diffSec = Math.floor((new Date() - date) / 1000);
        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return timestamp;
    }
}

// Render dynamic recent learning activity list
function renderActivities(activities) {
    const listEl = document.getElementById('activityList');
    if (!listEl) return;

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
        listEl.innerHTML = '<p class="empty-activity">No learning activities recorded yet. Ask a question, analyze notes, or take a quiz to get started!</p>';
        return;
    }

    listEl.innerHTML = activities.map(act => {
        let icon = '💬';
        if (act.type === 'note') icon = '📄';
        if (act.type === 'quiz') icon = '❓';

        const safeTitle = String(act.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeDetails = String(act.details || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return `
            <div class="activity-item">
                <div class="activity-item-icon">${icon}</div>
                <div class="activity-item-content">
                    <p class="activity-item-title">${safeTitle}</p>
                    <p class="activity-item-details">${safeDetails}</p>
                </div>
                <div class="activity-item-time">${formatActivityTime(act.time)}</div>
            </div>
        `;
    }).join('');
}

// Dashboard Statistics Tracking System (Backed by SQLite Database)
async function updateDashboardUI() {
    // 1. Immediately paint cached values from localStorage so UI is never stuck at 0
    const cachedQ = localStorage.getItem('edumind_questions');
    const cachedN = localStorage.getItem('edumind_notes');
    const cachedZ = localStorage.getItem('edumind_quizzes');
    const cachedScore = localStorage.getItem('edumind_avg_score');

    if (cachedQ !== null || cachedN !== null || cachedZ !== null) {
        setStatElements(
            cachedQ !== null ? cachedQ : 0,
            cachedN !== null ? cachedN : 0,
            cachedZ !== null ? cachedZ : 0,
            cachedScore !== null ? cachedScore : 0
        );
    }

    // 2. Fetch fresh stats directly from SQLite database backend
    const statEndpoints = [
        `${API_BASE_URL}/api/dashboard/stats`,
        `${API_BASE_URL}/stats`,
        `${API_BASE_URL}/chat/stats`,
        '/api/dashboard/stats',
        '/stats'
    ];

    for (const url of statEndpoints) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setStatElements(data.questions, data.notes, data.quizzes, data.avg_score);

                // Update localStorage cache with authoritative SQLite database metrics
                localStorage.setItem('edumind_questions', data.questions);
                localStorage.setItem('edumind_notes', data.notes);
                localStorage.setItem('edumind_quizzes', data.quizzes);
                localStorage.setItem('edumind_avg_score', data.avg_score);
                break;
            }
        } catch (e) {
            // Try next endpoint fallback
        }
    }

    // 3. Fetch recent real activity records from SQLite database
    const actEndpoints = [
        `${API_BASE_URL}/api/dashboard/activity`,
        `${API_BASE_URL}/chat/activity`,
        '/api/dashboard/activity'
    ];

    for (const url of actEndpoints) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const activities = await response.json();
                renderActivities(activities);
                break;
            }
        } catch (e) {
            // Try next endpoint fallback
        }
    }
}

async function recordQuizResult(score, total, topic) {
    try {
        const res = await fetch(`${API_BASE_URL}/chat/record-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: score, total: total, topic: topic || 'Practice Quiz' })
        });
        if (res.ok) {
            const data = await res.json();
            const quizEl = document.getElementById('statQuizzes');
            const scoreEl = document.getElementById('statScore');
            if (quizEl) quizEl.textContent = data.quizzes;
            if (scoreEl) scoreEl.textContent = data.avg_score + '%';
        }
    } catch (e) {
        console.warn('Error recording quiz in database:', e);
    }
    await updateDashboardUI();
}

// Mobile Menu
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Global Functions
function initializeGlobalFunctions() {
    // Make navigateTo available globally
    window.navigateTo = navigateTo;
}

// Chat System
function initializeChat() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const clearChatButton = document.getElementById('clearChat');

    if (sendButton && chatInput) {
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    if (clearChatButton) {
        clearChatButton.addEventListener('click', clearChat);
    }
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const message = chatInput.value.trim();

    if (!message || isGenerating) return;

    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Set generating state
    isGenerating = true;
    sendButton.disabled = true;
    chatInput.disabled = true;

    // Create empty AI message container for streaming with Thinking indicator
    const aiMessageDiv = addStreamingMessage();
    showChatLoading(false);

    // Optimistically increment questions counter for instant dashboard update
    const curQ = parseInt(localStorage.getItem('edumind_questions') || '0', 10);
    localStorage.setItem('edumind_questions', curQ + 1);
    updateDashboardUI();

    try {
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessageContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            aiMessageContent += chunk;
            
            // Update the AI message content progressively
            updateStreamingMessage(aiMessageDiv, aiMessageContent);
            
            // Auto-scroll to bottom
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Finalize formatting and render math formulas
        finalizeStreamingMessage(aiMessageDiv, aiMessageContent);
        // Refresh dashboard metrics directly from SQLite database
        updateDashboardUI();

    } catch (error) {
        console.error('Error sending message:', error);
        updateStreamingMessage(aiMessageDiv, `Error: ${error.message}. Please check if the backend is running.`);
    } finally {
        // Re-enable input
        isGenerating = false;
        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

function addMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    if (type === 'user') {
        const escaped = String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        content.innerHTML = `<p>${escaped}</p>`;
    } else {
        content.innerHTML = formatMarkdown(text);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addStreamingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant streaming';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `
        <div class="thinking-state">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-label">EduMind is thinking...</span>
        </div>
    `;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return content;
}

function updateStreamingMessage(contentDiv, text) {
    if (!text || !text.trim()) return;
    const formatted = formatMarkdown(text);
    contentDiv.innerHTML = formatted + '<span class="typing-cursor"></span>';
}

function finalizeStreamingMessage(contentDiv, text) {
    contentDiv.innerHTML = formatMarkdown(text);
    const parentMsg = contentDiv.closest('.message');
    if (parentMsg) {
        parentMsg.classList.remove('streaming');
    }
}

// Normalize markdown text so headings, bullets, lists and math always start on fresh lines
function normalizeMarkdownText(raw) {
    if (!raw) return '';
    let text = String(raw).trim();

    // Step A: Protect fenced code blocks (```...```) so code comments and indentation are untouched
    const codeBlocks = [];
    text = text.replace(/```[\s\S]*?```/g, function(match) {
        codeBlocks.push(match);
        return '%%%CODE_BLOCK_' + (codeBlocks.length - 1) + '%%%';
    });

    // Step B: Protect inline code (`...`)
    const inlineCodes = [];
    text = text.replace(/`[^`\n]+?`/g, function(match) {
        inlineCodes.push(match);
        return '%%%INLINE_CODE_' + (inlineCodes.length - 1) + '%%%';
    });

    // Step C: Protect display math ($$...$$)
    const mathBlocks = [];
    text = text.replace(/\$\$[\s\S]+?\$\$/g, function(match) {
        mathBlocks.push(match);
        return '%%%MATH_BLOCK_' + (mathBlocks.length - 1) + '%%%';
    });

    // Step D: Normalize structure outside code/math blocks:
    // 1. Separate headings that run into previous text without newlines (protect ## from breaking into # #)
    text = text.replace(/([^\n#])\s*(#{1,4}\s+)/g, '$1\n\n$2');

    // 2. Separate headings that run directly into bold text or paragraph without newline (e.g. "## Title **Text**")
    text = text.replace(/(#{1,4}\s+[^\n*#]+?)\s+(\*\*[A-Za-z0-9])/g, '$1\n\n$2');

    // 3. Separate headings that have an inline bullet or dash on the same line
    text = text.replace(/(#{1,4}\s+[^\n\-–—]+?)\s*[-–—]\s+/g, '$1\n\n- ');

    // 4. Ensure a double newline follows every heading title
    text = text.replace(/(#{1,4}\s+[^\n]+?)\n(?=[^\n#])/g, '$1\n\n');

    // 5. Separate squashed Markdown table rows (e.g. "| Role | |---|---| | Thylakoid |")
    text = text.replace(/\|\s*\|\s*(?=[^-\n|])/g, '|\n| ');
    text = text.replace(/\|\s*\|\s*---/g, '|\n|---');
    text = text.replace(/([^\n|])\s*(\|[^\n]+\|)/g, '$1\n\n$2');

    // 6. If multiple-choice option (A) B) C) D)) is inline, make it a clean bullet point
    text = text.replace(/([•\-*]\s+)([A-D]\)\s*)/g, '- **$2** ');
    text = text.replace(/([^\n•\-*])\s+([A-D]\)\s*)/g, '$1\n- **$2** ');

    // 7. If bullet point (- or • or * followed by text) is inline, force newline
    text = text.replace(/([^\n])\s+([•\-*]\s+)/g, '$1\n$2');

    // 8. If numbered list (1. 2.) is inline, force newline
    text = text.replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n$2');

    // 9. Ensure horizontal rules (---) have clean double newlines (excluding table borders)
    text = text.replace(/([^\n|])\s*(---)\s*([^\n|])/g, '$1\n\n$2\n\n$3');

    // Step E: Restore protected blocks cleanly
    text = text.replace(/%%%MATH_BLOCK_(\d+)%%%/g, function(_, idx) {
        return '\n\n' + (mathBlocks[parseInt(idx, 10)] || '') + '\n\n';
    });
    text = text.replace(/%%%INLINE_CODE_(\d+)%%%/g, function(_, idx) {
        return inlineCodes[parseInt(idx, 10)] || '';
    });
    text = text.replace(/%%%CODE_BLOCK_(\d+)%%%/g, function(_, idx) {
        return '\n\n' + (codeBlocks[parseInt(idx, 10)] || '') + '\n\n';
    });

    return text.trim();
}

// Format Markdown with KaTeX math and DOMPurify sanitization
function formatMarkdown(content) {
    if (!content) return '';

    // Step 0: Normalize linebreaks for inline headings and bullet points
    var normalizedText = normalizeMarkdownText(content);

    // Step 1: Protect math formulas from markdown parser (so _ and * don't get converted to <em>)
    var mathBlocks = [];
    var protectedText = normalizedText.replace(/\$\$([\s\S]+?)\$\$/g, function(match, math) {
        mathBlocks.push({ display: true, math: math.trim() });
        return '\n\n%%%MATH_BLOCK_' + (mathBlocks.length - 1) + '%%%\n\n';
    });
    protectedText = protectedText.replace(/\$([^\$\n]+?)\$/g, function(match, math) {
        mathBlocks.push({ display: false, math: math.trim() });
        return '%%%MATH_BLOCK_' + (mathBlocks.length - 1) + '%%%';
    });

    // Step 2: Parse Markdown
    var html = '';
    if (window.marked) {
        try {
            var parseOpts = { breaks: true, gfm: true };
            html = typeof marked.parse === 'function' ? marked.parse(protectedText, parseOpts) : marked(protectedText, parseOpts);
        } catch (e) {
            console.warn('Marked parsing error:', e);
            html = renderMarkdownToHtml(protectedText);
        }
    } else {
        html = renderMarkdownToHtml(protectedText);
    }

    // Step 3: Restore and render math with KaTeX
    html = html.replace(/%%%MATH_BLOCK_(\d+)%%%/g, function(match, idx) {
        var item = mathBlocks[parseInt(idx, 10)];
        if (!item) return match;
        if (window.katex && typeof window.katex.renderToString === 'function') {
            try {
                return window.katex.renderToString(item.math, {
                    displayMode: item.display,
                    throwOnError: false
                });
            } catch (err) {
                console.warn('KaTeX render error:', err);
                return item.display ? '<p class="katex-fallback">$$' + item.math + '$$</p>' : '$' + item.math + '$';
            }
        }
        return item.display ? '$$' + item.math + '$$' : '$' + item.math + '$';
    });

    // Step 4: Sanitize HTML while preserving KaTeX elements and attributes
    if (window.DOMPurify && typeof DOMPurify.sanitize === 'function') {
        html = DOMPurify.sanitize(html, {
            ADD_TAGS: [
                'span', 'div', 'math', 'annotation', 'semantics', 
                'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac',
                'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote',
                'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'p', 'hr', 'strong', 'em', 'code', 'pre'
            ],
            ADD_ATTR: ['class', 'style', 'aria-hidden']
        });
    }

    return html;
}

function showChatLoading(show) {
    const loadingIndicator = document.getElementById('chatLoading');
    if (loadingIndicator) {
        if (show) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }
    }
}

async function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    // Clear backend conversation
    try {
        await fetch(`${API_BASE_URL}/chat/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error) {
        console.error('Error clearing chat:', error);
    }
    
    // Add welcome message
    addMessage("Hello! I'm your AI Tutor. Ask me any academic question and I'll help you understand the topic better. What would you like to learn today?", 'assistant');
}

// PDF Upload System
function initializePDFUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const pdfInput = document.getElementById('pdfInput');
    const browseButton = document.getElementById('browseButton');
    const removeFileButton = document.getElementById('removeFile');
    const analyzeButton = document.getElementById('analyzeButton');
    const closeSummaryButton = document.getElementById('closeSummary');

    if (uploadArea && pdfInput) {
        uploadArea.addEventListener('click', () => pdfInput.click());
    }

    if (browseButton && pdfInput) {
        browseButton.addEventListener('click', () => pdfInput.click());
    }

    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#764ba2';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                handlePDFUpload(file);
            }
        });
    }

    if (pdfInput) {
        pdfInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePDFUpload(file);
            }
        });
    }

    if (removeFileButton) {
        removeFileButton.addEventListener('click', removePDF);
    }

    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzePDF);
    }

    if (closeSummaryButton) {
        closeSummaryButton.addEventListener('click', closeSummary);
    }
}

function handlePDFUpload(file) {
    selectedPDFFile = file;
    
    // Update UI
    document.getElementById('uploadArea').classList.add('hidden');
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
}

function removePDF() {
    selectedPDFFile = null;
    document.getElementById('uploadArea').classList.remove('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('pdfInput').value = '';
}

async function analyzePDF() {
    if (!selectedPDFFile) return;

    const fileInfo = document.getElementById('fileInfo');
    const processingIndicator = document.getElementById('processingIndicator');
    const summaryResult = document.getElementById('summaryResult');
    const summaryContent = document.getElementById('summaryContent');

    fileInfo.classList.add('hidden');
    processingIndicator.classList.remove('hidden');
    summaryResult.classList.add('hidden');

    const formData = new FormData();
    formData.append('file', selectedPDFFile);

    try {
        const response = await fetch(`${API_BASE_URL}/chat/analyze-pdf`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Unable to analyze PDF.');
        }

        summaryContent.innerHTML = formatMarkdown(data.summary || '');
        summaryResult.classList.remove('hidden');
        // Refresh dashboard metrics directly from SQLite database
        updateDashboardUI();
    } catch (error) {
        summaryContent.innerHTML = `<p class="error-message">${error.message}</p>`;
        summaryResult.classList.remove('hidden');
    } finally {
        processingIndicator.classList.add('hidden');
    }
}

function renderMarkdownToHtml(markdown) {
    if (!markdown) {
        return '<p>No summary available.</p>';
    }

    const normalized = normalizeMarkdownText(markdown);
    const escaped = String(normalized)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lines = escaped.split(/\r?\n/);
    let html = '';
    let inList = false;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            return;
        }

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            const level = headingMatch[1].length === 1 ? 1 : (headingMatch[1].length === 2 ? 2 : 3);
            const headingText = headingMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<h${level}>${headingText}</h${level}>`;
            return;
        }

        if (/^[•\-*]\s+/.test(trimmed)) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            const itemText = trimmed.replace(/^[•\-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<li>${itemText}</li>`;
            return;
        }

        if (inList) {
            html += '</ul>';
            inList = false;
        }

        html += `<p>${trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
    });

    if (inList) {
        html += '</ul>';
    }

    return html;
}

function closeSummary() {
    document.getElementById('summaryResult').classList.add('hidden');
    document.getElementById('uploadArea').classList.remove('hidden');
    selectedPDFFile = null;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Quiz System
function initializeQuiz() {
    const generateQuizButton = document.getElementById('generateQuiz');
    const prevQuestionButton = document.getElementById('prevQuestion');
    const nextQuestionButton = document.getElementById('nextQuestion');
    const submitQuizButton = document.getElementById('submitQuiz');
    const newQuizButton = document.getElementById('newQuiz');

    if (generateQuizButton) {
        generateQuizButton.addEventListener('click', generateQuiz);
    }

    if (prevQuestionButton) {
        prevQuestionButton.addEventListener('click', previousQuestion);
    }

    if (nextQuestionButton) {
        nextQuestionButton.addEventListener('click', nextQuestion);
    }

    if (submitQuizButton) {
        submitQuizButton.addEventListener('click', submitQuiz);
    }

    if (newQuizButton) {
        newQuizButton.addEventListener('click', resetQuiz);
    }
}

async function generateQuiz() {
    const topicInput = document.getElementById('quizTopic');
    const difficultySelect = document.getElementById('quizDifficulty');
    const countSelect = document.getElementById('quizCount');

    const topic = topicInput.value.trim();
    const difficulty = difficultySelect.value;
    const count = parseInt(countSelect.value);

    if (!topic) {
        alert('Please enter a topic');
        return;
    }

    document.getElementById('quizSetup').classList.add('hidden');
    document.getElementById('quizLoading').classList.remove('hidden');
    document.getElementById('quizResult').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/chat/generate-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic,
                difficulty,
                number_of_questions: count
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Unable to generate quiz questions.');
        }

        quizData = normalizeQuizData(data);
        currentQuestionIndex = 0;
        userAnswers = {};
        quizScore = 0;

        document.getElementById('quizLoading').classList.add('hidden');
        document.getElementById('quizContainer').classList.remove('hidden');
        document.getElementById('quizTitle').textContent = `Quiz: ${topic}`;
        document.getElementById('totalQuestions').textContent = quizData.questions.length;

        displayQuestion(0);
    } catch (error) {
        document.getElementById('quizLoading').classList.add('hidden');
        document.getElementById('quizSetup').classList.remove('hidden');
        alert(error.message);
    }
}

function normalizeQuizData(data) {
    const questions = (data.questions || []).map((question) => {
        const options = Array.isArray(question.options) ? question.options.map(option => String(option)) : [];
        const correctAnswer = typeof question.correct_answer === 'string' ? question.correct_answer : '';
        const correctIndex = correctAnswer ? options.findIndex(option => option === correctAnswer) : 0;

        return {
            question: question.question || 'Question',
            options,
            correct: correctIndex >= 0 ? correctIndex : 0,
            explanation: question.explanation || 'No explanation provided.'
        };
    });

    return {
        topic: data.topic || '',
        difficulty: data.difficulty || '',
        questions
    };
}

function displayQuestion(index) {
    const question = quizData.questions[index];
    const quizContent = document.getElementById('quizContent');
    
    document.getElementById('currentQuestion').textContent = index + 1;
    
    const questionHTML = `
        <div class="question-card">
            <p class="question-text">${index + 1}. ${question.question}</p>
            <div class="options-grid">
                ${question.options.map((option, i) => `
                    <div class="option-item ${userAnswers[index] === i ? 'selected' : ''}" 
                         data-index="${i}" 
                         onclick="selectOption(${index}, ${i})">
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        <span>${option}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    quizContent.innerHTML = questionHTML;

    // Update navigation buttons
    document.getElementById('prevQuestion').disabled = index === 0;
    
    const isLastQuestion = index === quizData.questions.length - 1;
    document.getElementById('nextQuestion').classList.toggle('hidden', isLastQuestion);
    document.getElementById('submitQuiz').classList.toggle('hidden', !isLastQuestion);
}

function selectOption(questionIndex, optionIndex) {
    userAnswers[questionIndex] = optionIndex;
    
    // Update UI
    const options = document.querySelectorAll('.option-item');
    options.forEach(option => {
        option.classList.remove('selected');
        if (parseInt(option.dataset.index) === optionIndex) {
            option.classList.add('selected');
        }
    });
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion(currentQuestionIndex);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < quizData.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion(currentQuestionIndex);
    }
}

function submitQuiz() {
    quizScore = 0;
    const reviewItems = quizData.questions.map((question, index) => {
        const selectedIndex = userAnswers[index];
        const isCorrect = selectedIndex === question.correct;
        if (isCorrect) {
            quizScore++;
        }

        const selectedAnswer = selectedIndex !== undefined ? question.options[selectedIndex] : 'Not answered';
        const correctAnswer = question.options[question.correct];

        return `
            <div class="quiz-review-item">
                <p class="review-question">${index + 1}. ${question.question}</p>
                <p class="review-answer">Your answer: ${selectedAnswer}</p>
                <p class="feedback ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct' : 'Incorrect'}</p>
                <p class="correct-answer">Correct answer: ${correctAnswer}</p>
                <p class="review-explanation">${question.explanation}</p>
            </div>
        `;
    }).join('');

    document.getElementById('quizContainer').classList.add('hidden');
    document.getElementById('quizResult').classList.remove('hidden');

    const percentage = Math.round((quizScore / quizData.questions.length) * 100);
    document.getElementById('finalScore').textContent = quizScore;
    document.getElementById('totalScore').textContent = quizData.questions.length;
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    document.getElementById('quizReview').innerHTML = reviewItems;

    const currentTopic = (quizData && quizData.topic) ? quizData.topic : (document.getElementById('quizTopic') ? document.getElementById('quizTopic').value : 'Practice Quiz');
    recordQuizResult(quizScore, quizData.questions.length, currentTopic);
}

function resetQuiz() {
    document.getElementById('quizResult').classList.add('hidden');
    document.getElementById('quizSetup').classList.remove('hidden');
    document.getElementById('quizTopic').value = '';
    document.getElementById('quizReview').innerHTML = '';

    quizData = null;
    currentQuestionIndex = 0;
    userAnswers = {};
    quizScore = 0;
}

// Health Check Function
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('Health check:', data);
        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        return null;
    }
}
