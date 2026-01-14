/**
 * NEP WORKBENCH - UNIVERSAL CHALLENGE WIDGET
 * Self-contained challenge system for all 44 simulations
 * 
 * Usage: Include this script in any simulation HTML
 * Auto-detects sim type and integrates seamlessly
 */

class ChallengeWidget {
    constructor(options = {}) {
        this.API_URL = options.apiUrl || 'http://localhost:3000/api';
        this.authToken = localStorage.getItem('authToken');
        this.eventId = options.eventId || window.currentEventId;
        this.simType = options.simType || this.detectSimType();
        
        this.currentChallenge = null;
        this.startTime = null;
        this.attemptNumber = 1;
        
        this.init();
    }
    
    // Auto-detect simulation type from URL or page
    detectSimType() {
        const url = window.location.pathname;
        const filename = url.substring(url.lastIndexOf('/') + 1).replace('.html', '');
        return filename || 'unknown-sim';
    }
    
    // Initialize widget
    init() {
        if (!this.authToken) {
            console.warn('Challenge Widget: No auth token found');
            return;
        }
        
        this.injectStyles();
        this.injectUI();
        this.attachEventListeners();
        
        console.log(`Challenge Widget initialized for: ${this.simType}`);
    }
    
    // Inject CSS styles
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .challenge-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
            }
            
            .challenge-fab {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #007acc, #00d4ff);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .challenge-fab:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(0, 122, 204, 0.6);
            }
            
            .challenge-fab:active {
                transform: translateY(-1px);
            }
            
            .challenge-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                animation: fadeIn 0.3s;
            }
            
            .challenge-modal.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .challenge-content {
                background: #2d2d30;
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s;
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .challenge-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #464647;
            }
            
            .challenge-title {
                font-size: 1.5rem;
                font-weight: bold;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .challenge-close {
                background: none;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            
            .challenge-close:hover {
                background: #464647;
                color: #fff;
            }
            
            .challenge-question {
                background: #333337;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #007acc;
            }
            
            .challenge-question-text {
                color: #fff;
                font-size: 1.1rem;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            
            .challenge-difficulty {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #f39c12;
                font-size: 0.9rem;
            }
            
            .challenge-hints {
                margin-bottom: 20px;
            }
            
            .challenge-hint {
                background: #3e3e42;
                padding: 12px 15px;
                border-radius: 6px;
                margin-bottom: 10px;
                color: #aaa;
                font-size: 0.9rem;
                display: flex;
                align-items: start;
                gap: 10px;
            }
            
            .challenge-hint::before {
                content: "💡";
                font-size: 1.2rem;
            }
            
            .challenge-answer-area {
                margin-bottom: 20px;
            }
            
            .challenge-label {
                color: #aaa;
                font-size: 0.9rem;
                margin-bottom: 8px;
                display: block;
            }
            
            .challenge-textarea {
                width: 100%;
                min-height: 120px;
                background: #1e1e1e;
                border: 2px solid #464647;
                border-radius: 8px;
                padding: 15px;
                color: #fff;
                font-size: 1rem;
                font-family: 'Segoe UI', sans-serif;
                resize: vertical;
                transition: border-color 0.3s;
            }
            
            .challenge-textarea:focus {
                outline: none;
                border-color: #007acc;
            }
            
            .challenge-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .challenge-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .challenge-btn-primary {
                background: linear-gradient(135deg, #007acc, #00d4ff);
                color: white;
            }
            
            .challenge-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 122, 204, 0.4);
            }
            
            .challenge-btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .challenge-btn-secondary {
                background: #464647;
                color: white;
            }
            
            .challenge-btn-secondary:hover {
                background: #3e3e42;
            }
            
            .challenge-feedback {
                margin-top: 20px;
                padding: 20px;
                border-radius: 8px;
                display: none;
            }
            
            .challenge-feedback.show {
                display: block;
                animation: slideUp 0.3s;
            }
            
            .challenge-feedback.correct {
                background: rgba(39, 174, 96, 0.2);
                border: 2px solid #27ae60;
            }
            
            .challenge-feedback.incorrect {
                background: rgba(231, 76, 60, 0.2);
                border: 2px solid #e74c3c;
            }
            
            .feedback-icon {
                font-size: 2rem;
                margin-bottom: 10px;
            }
            
            .feedback-text {
                color: #fff;
                font-size: 1.1rem;
                margin-bottom: 10px;
            }
            
            .feedback-details {
                color: #aaa;
                font-size: 0.9rem;
            }
            
            .challenge-loading {
                text-align: center;
                padding: 40px;
                color: #aaa;
            }
            
            .spinner {
                border: 3px solid #464647;
                border-top: 3px solid #007acc;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Inject UI HTML
    injectUI() {
        const widget = document.createElement('div');
        widget.className = 'challenge-widget';
        widget.innerHTML = `
            <button class="challenge-fab" id="challengeFab" title="Get AI Challenge">
                <i class="fas fa-brain"></i>
            </button>
            
            <div class="challenge-modal" id="challengeModal">
                <div class="challenge-content">
                    <div class="challenge-header">
                        <div class="challenge-title">
                            <i class="fas fa-puzzle-piece"></i>
                            AI Challenge
                        </div>
                        <button class="challenge-close" id="challengeClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div id="challengeBody">
                        <!-- Challenge content will be injected here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }
    
    // Attach event listeners
    attachEventListeners() {
        document.getElementById('challengeFab').addEventListener('click', () => {
            this.openModal();
            this.generateChallenge();
        });
        
        document.getElementById('challengeClose').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('challengeModal').addEventListener('click', (e) => {
            if (e.target.id === 'challengeModal') {
                this.closeModal();
            }
        });
    }
    
    // Open modal
    openModal() {
        document.getElementById('challengeModal').classList.add('active');
    }
    
    // Close modal
    closeModal() {
        document.getElementById('challengeModal').classList.remove('active');
    }
    
    // Generate AI challenge
    async generateChallenge() {
        const body = document.getElementById('challengeBody');
        body.innerHTML = `
            <div class="challenge-loading">
                <div class="spinner"></div>
                <div>Generating AI challenge...</div>
            </div>
        `;
        
        try {
            const response = await fetch(`${this.API_URL}/challenge/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: this.eventId,
                    simType: this.simType
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate challenge');
            }
            
            this.currentChallenge = data.challenge;
            this.startTime = Date.now();
            this.renderChallenge();
            
        } catch (error) {
            console.error('Challenge generation failed:', error);
            body.innerHTML = `
                <div class="challenge-feedback incorrect show">
                    <div class="feedback-icon">⚠️</div>
                    <div class="feedback-text">Failed to generate challenge</div>
                    <div class="feedback-details">${error.message}</div>
                    <button class="challenge-btn challenge-btn-primary" style="margin-top: 15px;" onclick="challengeWidget.generateChallenge()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
    
    // Render challenge UI
    renderChallenge() {
        const difficulty = '★'.repeat(this.currentChallenge.difficulty) + '☆'.repeat(5 - this.currentChallenge.difficulty);
        
        document.getElementById('challengeBody').innerHTML = `
            <div class="challenge-question">
                <div class="challenge-question-text">${this.currentChallenge.question}</div>
                <div class="challenge-difficulty">
                    <i class="fas fa-chart-line"></i>
                    Difficulty: ${difficulty} (${this.currentChallenge.difficulty}/5)
                </div>
            </div>
            
            ${this.currentChallenge.hints && this.currentChallenge.hints.length > 0 ? `
                <div class="challenge-hints">
                    <div class="challenge-label">💡 Hints:</div>
                    ${this.currentChallenge.hints.map(hint => `
                        <div class="challenge-hint">${hint}</div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="challenge-answer-area">
                <label class="challenge-label">Your Answer:</label>
                <textarea 
                    class="challenge-textarea" 
                    id="challengeAnswer" 
                    placeholder="Type your detailed answer here..."
                    maxlength="5000"
                ></textarea>
            </div>
            
            <div class="challenge-actions">
                <button class="challenge-btn challenge-btn-secondary" onclick="challengeWidget.closeModal()">
                    Cancel
                </button>
                <button class="challenge-btn challenge-btn-primary" id="submitChallengeBtn">
                    <i class="fas fa-paper-plane"></i> Submit Answer
                </button>
            </div>
            
            <div class="challenge-feedback" id="challengeFeedback"></div>
        `;
        
        document.getElementById('submitChallengeBtn').addEventListener('click', () => {
            this.submitAnswer();
        });
    }
    
    // Submit answer
    async submitAnswer() {
        const answerText = document.getElementById('challengeAnswer').value.trim();
        
        if (answerText.length < 3) {
            alert('Please provide a more detailed answer (at least 3 characters)');
            return;
        }
        
        const submitBtn = document.getElementById('submitChallengeBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
        
        const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
        
        try {
            const response = await fetch(`${this.API_URL}/challenge/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: this.eventId,
                    simType: this.simType,
                    challengeQuestion: this.currentChallenge.question,
                    difficulty: this.currentChallenge.difficulty,
                    hints: this.currentChallenge.hints,
                    studentAnswer: answerText,
                    timeSpent: timeSpent,
                    attemptNumber: this.attemptNumber
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Validation failed');
            }
            
            this.showFeedback(data.evaluation);
            this.attemptNumber++;
            
        } catch (error) {
            console.error('Answer submission failed:', error);
            alert('Failed to submit answer: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answer';
        }
    }
    
    // Show feedback
    showFeedback(evaluation) {
        const feedbackDiv = document.getElementById('challengeFeedback');
        feedbackDiv.className = `challenge-feedback show ${evaluation.correct ? 'correct' : 'incorrect'}`;
        
        feedbackDiv.innerHTML = `
            <div class="feedback-icon">${evaluation.correct ? '✅' : '❌'}</div>
            <div class="feedback-text">${evaluation.correct ? 'Correct!' : 'Not quite right'}</div>
            <div class="feedback-details">${evaluation.feedback}</div>
            
            ${evaluation.misconceptions && evaluation.misconceptions.length > 0 ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div class="challenge-label">⚠️ Points to review:</div>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #aaa;">
                        ${evaluation.misconceptions.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${evaluation.needsReview ? `
                <div style="margin-top: 15px; color: #f39c12;">
                    <i class="fas fa-info-circle"></i> This answer will be reviewed by your teacher
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="challenge-btn challenge-btn-primary" onclick="challengeWidget.generateChallenge()">
                    <i class="fas fa-redo"></i> New Challenge
                </button>
                <button class="challenge-btn challenge-btn-secondary" onclick="challengeWidget.closeModal()">
                    Done
                </button>
            </div>
        `;
        
        // Scroll to feedback
        feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.challengeWidget = new ChallengeWidget();
    });
} else {
    window.challengeWidget = new ChallengeWidget();
}