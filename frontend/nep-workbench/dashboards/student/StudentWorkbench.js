// ============================================================================
// NEP WORKBENCH - STUDENT DASHBOARD
// Complete Backend Integration with Mathematical Model v2.0
// ============================================================================

// Configuration
const API_BASE_URL = '/api';
const COMPETENCIES = [
    'Critical Thinking', 'Communication', 'Collaboration', 'Creativity',
    'Scientific Inquiry', 'Problem Solving', 'Digital Literacy', 'Cultural Awareness',
    'Self-Direction', 'Real-world Application', 'Ethical Reasoning', 'Adaptability'
];

// Tools Database - Integrated with backend structure
const TOOLS_DATABASE = {
    'physics-sims': {
        title: 'Physics Simulations',
        icon: 'fas fa-atom',
        subtools: [
            { name: 'Motion Classifier Sim', icon: 'fas fa-running', grade: '6-8', id: 'motion-classifier-sim' },
            { name: 'Measurement Skills Sim', icon: 'fas fa-ruler-combined', grade: '6-8', id: 'measurement-skills-sim' },
            { name: 'Light Path Visualizer', icon: 'fas fa-lightbulb', grade: '7-8', id: 'light-path-visualizer' },
            { name: 'Shadow Formation Sim', icon: 'fas fa-moon', grade: '6-7', id: 'shadow-formation-sim' },
            { name: 'Simple Circuit Builder', icon: 'fas fa-bolt', grade: '6-8', id: 'simple-circuit-builder' },
            { name: 'Heat Flow Simulator', icon: 'fas fa-thermometer-half', grade: '7-8', id: 'heat-flow-simulator' },
            { name: 'Weather System Model', icon: 'fas fa-cloud-sun', grade: '7-8', id: 'weather-system-model' },
            { name: 'Force Visualizer', icon: 'fas fa-hand-rock', grade: '8-10', id: 'force-visualizer' },
            { name: 'Sound Wave Generator', icon: 'fas fa-wave-square', grade: '8-9', id: 'sound-wave-generator' },
            { name: 'Gravity Simulator', icon: 'fas fa-globe', grade: '9-10', id: 'gravity-simulator' },
            { name: 'Energy Transformation Visualizer', icon: 'fas fa-charging-station', grade: '9-10', id: 'energy-transformation-visualizer' },
            { name: 'Projectile Motion Simulator', icon: 'fas fa-basketball-ball', grade: '11-12', id: 'projectile-motion-simulator' },
            { name: 'Electric Field Mapper', icon: 'fas fa-broadcast-tower', grade: '11-12', id: 'electric-field-mapper' }
        ]
    },
    'math-sims': {
        title: 'Math Simulations',
        icon: 'fas fa-calculator',
        subtools: [
            { name: 'Fraction Pie Visualizer', icon: 'fas fa-chart-pie', grade: '6-7', id: 'fraction-pie-visualizer' },
            { name: 'Shape Builder & Measurer', icon: 'fas fa-shapes', grade: '6-8', id: 'shape-builder-measurer' },
            { name: 'Interactive Graph Maker', icon: 'fas fa-chart-line', grade: '7-9', id: 'interactive-graph-maker' },
            { name: 'Equation Balancer', icon: 'fas fa-balance-scale', grade: '7-8', id: 'equation-balancer' },
            { name: 'Coordinate Plotter', icon: 'fas fa-map-pin', grade: '8-9', id: 'coordinate-plotter' },
            { name: 'Polynomial Grapher', icon: 'fas fa-wave-square', grade: '9-10', id: 'polynomial-grapher' },
            { name: 'Trigonometry Visualizer', icon: 'fas fa-sine-wave', grade: '10-11', id: 'trigonometry-visualizer' },
            { name: 'Calculus Visualizer', icon: 'fas fa-infinity', grade: '11-12', id: 'calculus-visualizer' },
            { name: 'Probability Simulator', icon: 'fas fa-dice', grade: '10-11', id: 'probability-simulator' }
        ]
    },
    'inquiry-lab': {
        title: 'Inquiry & Hypothesis Lab',
        icon: 'fas fa-flask',
        subtools: [
            { name: 'Hypothesis Builder', icon: 'fas fa-lightbulb', id: 'hypothesis-builder' },
            { name: 'Experiment Designer', icon: 'fas fa-flask', id: 'experiment-designer' },
            { name: 'Data Collector', icon: 'fas fa-clipboard-list', id: 'data-collector' },
            { name: 'Result Analyzer', icon: 'fas fa-chart-bar', id: 'result-analyzer' }
        ]
    },
    'vocational-studio': {
        title: 'Vocational Skills Studio',
        icon: 'fas fa-tools',
        subtools: [
            { name: 'Carpentry Fundamentals', icon: 'fas fa-hammer', id: 'carpentry-fundamentals' },
            { name: 'Electrical Basics', icon: 'fas fa-plug', id: 'electrical-basics' },
            { name: 'Computer Hardware', icon: 'fas fa-laptop', id: 'computer-hardware' },
            { name: 'Digital Design', icon: 'fas fa-palette', id: 'digital-design' }
        ]
    },
    'project-builder': {
        title: 'Project Builder',
        icon: 'fas fa-project-diagram',
        subtools: [
            { name: 'Project Templates', icon: 'fas fa-folder-open', id: 'project-templates' },
            { name: 'Planning Canvas', icon: 'fas fa-pencil-ruler', id: 'planning-canvas' },
            { name: 'Collaboration Hub', icon: 'fas fa-users-cog', id: 'collaboration-hub' }
        ]
    },
    'practice-zone': {
        title: 'Practice Zone',
        icon: 'fas fa-dumbbell',
        subtools: [
            { name: 'Quick Quiz', icon: 'fas fa-question', id: 'quick-quiz' },
            { name: 'Challenge Problems', icon: 'fas fa-trophy', id: 'challenge-problems' },
            { name: 'Skill Drills', icon: 'fas fa-dumbbell', id: 'skill-drills' }
        ]
    },
    'reflection-journal': {
        title: 'Reflection Journal',
        icon: 'fas fa-book',
        subtools: [
            { name: 'Daily Entry', icon: 'fas fa-pen', id: 'daily-entry' },
            { name: 'Learning Log', icon: 'fas fa-book', id: 'learning-log' },
            { name: 'Goal Setter', icon: 'fas fa-bullseye', id: 'goal-setter' }
        ]
    },
    'evaluation-view': {
        title: 'Evaluation View',
        icon: 'fas fa-chart-line',
        subtools: [
            { name: 'Competency Dashboard', icon: 'fas fa-tachometer-alt', id: 'competency-dashboard' },
            { name: 'Progress Report', icon: 'fas fa-chart-bar', id: 'progress-report' },
            { name: 'Skills Matrix', icon: 'fas fa-th', id: 'skills-matrix' }
        ]
    }
};

// Global State
let currentStudent = null;
let authToken = null;
let sessionStartTime = Date.now();
let currentEvent = null;
let competencyData = [];
let performanceIndex = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    initializeAuth();
    initializeEventListeners();
    initializeSession();
    
    // Load student data
    await loadStudentData();
    await loadCompetencies();
    await loadPerformanceIndex();
    await loadRecentActivities();
    
    // Start periodic updates
    startPeriodicUpdates();
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

function initializeAuth() {
    // Get token from localStorage or session
    authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
        // Redirect to login
        window.location.href = '/login.html';
        return;
    }
    
    // Decode JWT to get student info
    try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        currentStudent = {
            id: payload.userId,
            role: payload.role
        };
        
        if (currentStudent.role !== 'student') {
            alert('Access denied. This is the student dashboard.');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Invalid token:', error);
        window.location.href = '/login.html';
    }
}

// ============================================================================
// API CALLS
// ============================================================================

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            // Token expired
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
            return null;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'API call failed');
        }
        
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        updateConnectionStatus(false);
        return null;
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadStudentData() {
    showLoading('Loading student data...');
    
    try {
        // Get current user info
        const user = await apiCall('/auth/me');
        
        if (user) {
            // Update UI with student info
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userGrade').textContent = `Grade ${user.grade || '--'}`;
            
            // Update avatar with initials
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('userAvatar').textContent = initials;
            
            // Update current date
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);
        }
    } catch (error) {
        console.error('Error loading student data:', error);
    } finally {
        hideLoading();
    }
}

async function loadCompetencies() {
    try {
        // Get assessment data
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const assessment = await apiCall(
            `/student/${currentStudent.id}/assessment?start=${thirtyDaysAgo.toISOString()}&end=${now.toISOString()}`
        );
        
        if (assessment && assessment.competencyScores) {
            competencyData = assessment.competencyScores;
            renderCompetencies();
            
            // Update completion stats
            const completed = competencyData.filter(score => score >= 0.5).length;
            document.getElementById('completedCount').textContent = completed;
        }
    } catch (error) {
        console.error('Error loading competencies:', error);
        // Show placeholder data
        competencyData = new Array(12).fill(0);
        renderCompetencies();
    }
}

async function loadPerformanceIndex() {
    try {
        const pi = await apiCall(`/student/${currentStudent.id}/pi`);
        
        if (pi) {
            performanceIndex = pi.piValue;
            
            // Update PI display
            document.getElementById('piValue').textContent = (pi.piValue * 100).toFixed(0);
            
            // Update global progress
            const progress = Math.round(pi.piValue * 100);
            document.getElementById('globalProgress').style.width = progress + '%';
            document.getElementById('progressText').textContent = progress + '%';
            
            // Render growth metrics
            renderGrowthMetrics(pi);
        }
    } catch (error) {
        console.error('Error loading performance index:', error);
        document.getElementById('piValue').textContent = '--';
    }
}

async function loadRecentActivities() {
    try {
        const events = await apiCall(`/student/${currentStudent.id}/events?limit=10`);
        
        if (events && events.length > 0) {
            renderActivities(events);
            
            // Update streak count (placeholder logic)
            document.getElementById('streakCount').textContent = '5';
            document.getElementById('pointsCount').textContent = events.length * 10;
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderCompetencies() {
    const grid = document.getElementById('competencyGrid');
    grid.innerHTML = '';
    
    COMPETENCIES.forEach((name, index) => {
        const score = competencyData[index] || 0;
        const percentage = Math.round(score * 100);
        
        const card = document.createElement('div');
        card.className = 'competency-card';
        card.innerHTML = `
            <div class="competency-name">${name}</div>
            <div class="competency-bar">
                <div class="competency-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="competency-value">${percentage}%</div>
        `;
        
        grid.appendChild(card);
    });
}

function renderGrowthMetrics(pi) {
    const container = document.getElementById('growthMetrics');
    
    container.innerHTML = `
        <div class="activity-item">
            <div>
                <div style="font-weight: bold;">Growth Rate</div>
                <div style="font-size: 0.75rem; color: #888;">${getGrowthLabel(pi.growth)}</div>
            </div>
            <div style="color: #28a745; font-weight: bold;">${(pi.growth * 100).toFixed(1)}%</div>
        </div>
        <div class="activity-item">
            <div>
                <div style="font-weight: bold;">Activity Level</div>
                <div style="font-size: 0.75rem; color: #888;">Events this week</div>
            </div>
            <div style="color: #007acc; font-weight: bold;">${pi.eventCount || 0}</div>
        </div>
        <div class="activity-item">
            <div>
                <div style="font-weight: bold;">Engagement</div>
                <div style="font-size: 0.75rem; color: #888;">Activity factor</div>
            </div>
            <div style="color: #ffc107; font-weight: bold;">${(pi.activityFactor * 100).toFixed(0)}%</div>
        </div>
    `;
}

function getGrowthLabel(growth) {
    if (growth > 0.7) return 'Accelerating';
    if (growth > 0.3) return 'Steady';
    return 'Emerging';
}

function renderActivities(events) {
    const list = document.getElementById('activityList');
    list.innerHTML = '';
    
    events.slice(0, 5).forEach(event => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div>
                <div style="font-weight: bold; font-size: 0.85rem;">${event.toolId}</div>
                <div style="font-size: 0.7rem; color: #888;">${new Date(event.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="activity-status"></div>
        `;
        
        list.appendChild(item);
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initializeEventListeners() {
    // Tool buttons
    document.querySelectorAll('.tool-button').forEach(button => {
        button.addEventListener('dblclick', function(e) {
            const toolId = this.getAttribute('data-tool');
            showSubtools(toolId, this);
            e.stopPropagation();
        });
        
        button.addEventListener('click', function() {
            document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Properties tabs
    document.querySelectorAll('.properties-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchPropertiesTab(tabName);
        });
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Close flyout when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.subtools-flyout') && !e.target.closest('.tool-button')) {
            document.getElementById('subtoolsFlyout').style.display = 'none';
        }
    });
    
    // User menu
    document.getElementById('userMenu').addEventListener('click', function() {
        if (confirm('Do you want to logout?')) {
            logout();
        }
    });
}

function switchPropertiesTab(tabName) {
    // Update tab styles
    document.querySelectorAll('.properties-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(tabName + 'Tab').style.display = 'block';
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    if (query.length < 2) return;
    
    // Filter tools
    const results = [];
    
    Object.keys(TOOLS_DATABASE).forEach(toolKey => {
        const tool = TOOLS_DATABASE[toolKey];
        tool.subtools.forEach(subtool => {
            if (subtool.name.toLowerCase().includes(query)) {
                results.push({
                    ...subtool,
                    category: tool.title
                });
            }
        });
    });
    
    console.log('Search results:', results);
    // TODO: Display search results
}

// ============================================================================
// SUBTOOLS FLYOUT
// ============================================================================

function showSubtools(toolId, buttonElement) {
    const tool = TOOLS_DATABASE[toolId];
    if (!tool) return;
    
    const flyout = document.getElementById('subtoolsFlyout');
    const rect = buttonElement.getBoundingClientRect();
    
    flyout.style.top = rect.top + 'px';
    flyout.style.left = (rect.right + 10) + 'px';
    
    flyout.innerHTML = `
        <div class="subtools-header">
            <i class="${tool.icon}"></i>
            ${tool.title}
        </div>
        ${tool.subtools.map(subtool => `
            <div class="subtool-item" data-subtool-id="${subtool.id}" data-tool-name="${subtool.name}">
                <div class="subtool-icon">
                    <i class="${subtool.icon}"></i>
                </div>
                <div style="flex: 1;">${subtool.name}</div>
                ${subtool.grade ? `<div class="subtool-grade">${subtool.grade}</div>` : ''}
            </div>
        `).join('')}
    `;
    
    flyout.style.display = 'flex';
    
    // Add click handlers to subtools
    flyout.querySelectorAll('.subtool-item').forEach(item => {
        item.addEventListener('click', function() {
            const subtoolId = this.getAttribute('data-subtool-id');
            const toolName = this.getAttribute('data-tool-name');
            launchSimulation(subtoolId, toolName, toolId);
        });
    });
}

// ============================================================================
// SIMULATION LAUNCH
// ============================================================================

async function launchSimulation(subtoolId, toolName, category) {
    showLoading(`Loading ${toolName}...`);
    
    // Close flyout
    document.getElementById('subtoolsFlyout').style.display = 'none';
    
    try {
        // Create event in backend
        currentEvent = {
            studentId: currentStudent.id,
            toolId: subtoolId,
            toolType: 'LAB', // Default, can be dynamic
            startTime: Date.now(),
            interactionData: {
                actions_count: 0,
                unique_tools_used: 1,
                correct_attempts: 0,
                incorrect_attempts: 0,
                retry_count: 0,
                time_seconds: 0,
                unique_parameters_tried: 0,
                total_parameter_space: 100
            }
        };
        
        // Update workspace
        const canvas = document.getElementById('canvasContainer');
        canvas.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon">
                    <i class="fas fa-rocket"></i>
                </div>
                <h2>${toolName}</h2>
                <p>Simulation is ready to begin</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 20px;">
                    This simulation will track your learning progress
                </p>
                <div style="margin-top: 30px;">
                    <button onclick="startActivity()" style="
                        background: linear-gradient(135deg, #007acc, #00d4ff);
                        border: none;
                        padding: 15px 40px;
                        border-radius: 8px;
                        color: white;
                        font-size: 1.1rem;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        <i class="fas fa-play"></i> Start Activity
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error launching simulation:', error);
        alert('Failed to load simulation. Please try again.');
    } finally {
        hideLoading();
    }
}

// Global function for start button
window.startActivity = async function() {
    if (!currentEvent) return;
    
    showLoading('Initializing activity...');
    
    try {
        // Send event to backend
        const event = await apiCall('/student/event', 'POST', currentEvent);
        
        if (event) {
            currentEvent.eventId = event._id;
            
            // Load actual simulation interface
            // TODO: Load specific simulation based on toolId
            loadSimulationInterface(currentEvent.toolId);
        }
    } catch (error) {
        console.error('Error starting activity:', error);
    } finally {
        hideLoading();
    }
};

function loadSimulationInterface(toolId) {
    // Placeholder - load actual simulation
    const canvas = document.getElementById('canvasContainer');
    canvas.innerHTML = `
        <iframe 
            src="/sims/${toolId}/index.html" 
            style="width: 100%; height: 100%; border: none;"
            id="simFrame">
        </iframe>
    `;
    
    // Track interactions
    trackSimulationInteractions();
}

function trackSimulationInteractions() {
    // Listen for messages from simulation iframe
    window.addEventListener('message', function(event) {
        if (event.data.type === 'interaction') {
            // Update interaction data
            if (currentEvent) {
                currentEvent.interactionData = {
                    ...currentEvent.interactionData,
                    ...event.data.data
                };
            }
        }
        
        if (event.data.type === 'complete') {
            completeActivity();
        }
    });
}

async function completeActivity() {
    if (!currentEvent) return;
    
    showLoading('Saving your work...');
    
    try {
        // Calculate time spent
        const timeSpent = Math.floor((Date.now() - currentEvent.startTime) / 1000);
        currentEvent.interactionData.time_seconds = timeSpent;
        
        // Update event in backend
        await apiCall(`/student/event/${currentEvent.eventId}`, 'PUT', {
            interactionData: currentEvent.interactionData
        });
        
        // Reload data
        await loadCompetencies();
        await loadPerformanceIndex();
        await loadRecentActivities();
        
        // Show success message
        alert('Activity completed successfully! Your progress has been saved.');
        
        // Reset current event
        currentEvent = null;
        
        // Return to dashboard
        returnToDashboard();
        
    } catch (error) {
        console.error('Error completing activity:', error);
        alert('Failed to save progress. Please try again.');
    } finally {
        hideLoading();
    }
}

function returnToDashboard() {
    const canvas = document.getElementById('canvasContainer');
    canvas.innerHTML = `
        <div class="welcome-screen">
            <div class="welcome-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <h2>Welcome Back!</h2>
            <p>Ready to continue your learning journey?</p>
        </div>
    `;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function initializeSession() {
    // Update session timer every minute
    setInterval(updateSessionTime, 60000);
    updateSessionTime();
}

function updateSessionTime() {
    const minutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    document.getElementById('sessionTime').textContent = `Session: ${minutes} min`;
}

function startPeriodicUpdates() {
    // Update data every 5 minutes
    setInterval(async () => {
        await loadPerformanceIndex();
        await loadRecentActivities();
    }, 5 * 60 * 1000);
}

// ============================================================================
// UI HELPERS
// ============================================================================

function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = message;
    overlay.style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = connected ? 'Connected' : 'Offline';
    statusEl.style.color = connected ? 'white' : '#ff4444';
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    updateConnectionStatus(false);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    updateConnectionStatus(false);
});

// ============================================================================
// EXPORTS (for use in other modules)
// ============================================================================

window.NEPWorkbench = {
    apiCall,
    currentStudent,
    COMPETENCIES,
    TOOLS_DATABASE
};

// ============================================================================
// MENU BAR FUNCTIONS (ADDED AT THE END)
// ============================================================================

let currentZoom = 100;
let undoStack = [];
let redoStack = [];

// Toggle dropdown menus
function toggleMenu(menuName) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
    
    const menu = document.getElementById(menuName + 'Menu');
    if (menu) {
        menu.classList.add('show');
    }
    
    setTimeout(() => {
        document.addEventListener('click', closeMenus, { once: true });
    }, 0);
}

function closeMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// FILE MENU
function newProject() {
    if (confirm('Create new project? Unsaved changes will be lost.')) {
        location.reload();
    }
    closeMenus();
}

function openProject() {
    alert('Open Project feature coming soon!');
    closeMenus();
}

function saveProject() {
    const projectData = {
        timestamp: new Date().toISOString(),
        completedSims: completedSims || [],
        zoom: currentZoom
    };
    
    localStorage.setItem('nep_workbench_project', JSON.stringify(projectData));
    showToast('✅ Project saved successfully!', 'success');
    closeMenus();
}

function saveProjectAs() {
    const projectName = prompt('Enter project name:');
    if (projectName) {
        saveProject();
        showToast(`✅ Saved as: ${projectName}`, 'success');
    }
    closeMenus();
}

function exportProject(format) {
    alert(`Export as ${format.toUpperCase()} feature coming soon!`);
    closeMenus();
}

// EDIT MENU
function undo() {
    if (undoStack.length > 0) {
        const action = undoStack.pop();
        redoStack.push(action);
        updateUndoRedoButtons();
        showToast('↶ Undo', 'info');
    }
    closeMenus();
}

function redo() {
    if (redoStack.length > 0) {
        const action = redoStack.pop();
        undoStack.push(action);
        updateUndoRedoButtons();
        showToast('↷ Redo', 'info');
    }
    closeMenus();
}

function copy() {
    showToast('📋 Copied', 'info');
    closeMenus();
}

function paste() {
    showToast('📋 Pasted', 'info');
    closeMenus();
}

function clearCanvas() {
    if (confirm('Clear entire canvas?')) {
        showToast('🗑️ Canvas cleared', 'info');
    }
    closeMenus();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoStack.length > 0) {
        undoBtn?.classList.remove('disabled');
    } else {
        undoBtn?.classList.add('disabled');
    }
    
    if (redoStack.length > 0) {
        redoBtn?.classList.remove('disabled');
    } else {
        redoBtn?.classList.add('disabled');
    }
}

// VIEW MENU
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        showToast('⛶ Fullscreen enabled', 'info');
    } else {
        document.exitFullscreen();
        showToast('⛶ Fullscreen disabled', 'info');
    }
    closeMenus();
}

function toggleSidebar() {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar.style.display === 'none') {
        toolbar.style.display = 'flex';
        showToast('◧ Sidebar shown', 'info');
    } else {
        toolbar.style.display = 'none';
        showToast('◧ Sidebar hidden', 'info');
    }
    closeMenus();
}

// ZOOM FUNCTIONS
function zoomIn() {
    if (currentZoom < 200) {
        currentZoom += 10;
        applyZoom();
    }
    closeMenus();
}

function zoomOut() {
    if (currentZoom > 50) {
        currentZoom -= 10;
        applyZoom();
    }
    closeMenus();
}

function resetZoom() {
    currentZoom = 100;
    applyZoom();
    closeMenus();
}

function applyZoom() {
    const canvas = document.querySelector('.canvas-container');
    if (canvas) {
        canvas.style.transform = `scale(${currentZoom / 100})`;
        canvas.style.transformOrigin = 'center center';
    }
    const zoomValue = document.getElementById('zoomValue');
    if (zoomValue) {
        zoomValue.textContent = currentZoom + '%';
    }
    showToast(`🔍 Zoom: ${currentZoom}%`, 'info');
}

// TOOLS MENU
function openTool(toolName) {
    const toolButton = document.querySelector(`[data-tool="${toolName}"]`);
    if (toolButton) {
        toolButton.click();
    }
    closeMenus();
}

function openAIChallenges() {
    alert('AI Challenges available in the challenge panel!');
    closeMenus();
}

// HELP MENU
function showGettingStarted() {
    alert('Getting Started:\n\n1. Click any tool button\n2. Double-click to open simulation\n3. Complete activities to earn points\n4. Use AI Challenges to test knowledge');
    closeMenus();
}

function showKeyboardShortcuts() {
    alert('Keyboard Shortcuts:\n\nCtrl+N - New Project\nCtrl+S - Save\nCtrl+Z - Undo\nCtrl+Y - Redo\nCtrl++ - Zoom In\nCtrl+- - Zoom Out\nCtrl+0 - Reset Zoom\nF11 - Fullscreen\n? - Show this help');
    closeMenus();
}

function showDocumentation() {
    window.open('/docs', '_blank');
    closeMenus();
}

function reportBug() {
    alert('Report a Bug:\n\nEmail: support@nepworkbench.edu');
    closeMenus();
}

function showAbout() {
    alert('NEP Workbench v2.0\n\nNEP 2020 Compliant Educational Platform\n\n© 2025');
    closeMenus();
}

// TOAST NOTIFICATION
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#007acc'};
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 100000;
        font-size: 0.9rem;
        animation: slideIn 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newProject();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveProject();
    }
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
    if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        zoomIn();
    }
    if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        zoomOut();
    }
    if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        resetZoom();
    }
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
    if (e.key === '?') {
        e.preventDefault();
        showKeyboardShortcuts();
    }
});

console.log('✅ Menu Bar System Loaded');
console.log('✅ Student Workbench System Fully Loaded');