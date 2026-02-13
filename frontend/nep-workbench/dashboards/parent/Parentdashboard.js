// NEP WORKBENCH - PARENT DASHBOARD
const API_BASE_URL = '/api';
const authToken = localStorage.getItem('authToken');
let parentData = null;
let children = [];
let selectedChild = null;

// Initialize dashboard
async function init() {
    if (!authToken) {
        window.location.href = '../../login.html';
        return;
    }
    
    // Verify role
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'PARENT') {
        alert('Access denied. Parents only.');
        window.location.href = '../../login.html';
        return;
    }
    
    // Load parent data
    await loadParentProfile();
    await loadChildren();
}

// Load parent profile
async function loadParentProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/parent/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            parentData = result.profile || result;
            document.getElementById('userName').textContent = parentData.name;
            document.getElementById('parentName').textContent = parentData.name;
            
            const initial = parentData.name.charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = initial;
        }
    } catch (error) {
        console.error('Failed to load parent profile:', error);
        // Use stored name
        const name = localStorage.getItem('userName') || 'Parent';
        document.getElementById('userName').textContent = name;
        document.getElementById('parentName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
    }
}

// Load children
async function loadChildren() {
    try {
        const response = await fetch(`${API_BASE_URL}/parent/children`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            children = result.children || result;
        } else {
            // Demo data
            children = [
                { _id: '1', name: 'Aarav Kumar', gradeLevel: 10, progress: 78 },
                { _id: '2', name: 'Ananya Kumar', gradeLevel: 8, progress: 85 }
            ];
        }
        
        renderChildrenSelectors();
        
        if (children.length > 0) {
            selectChild(children[0]);
        }
    } catch (error) {
        console.error('Failed to load children:', error);
        // Demo data
        children = [
            { _id: '1', name: 'Aarav Kumar', gradeLevel: 10, progress: 78 },
            { _id: '2', name: 'Ananya Kumar', gradeLevel: 8, progress: 85 }
        ];
        renderChildrenSelectors();
        if (children.length > 0) {
            selectChild(children[0]);
        }
    }
}

// Render children selectors
function renderChildrenSelectors() {
    const containers = [
        'childrenList',
        'childrenListProgress',
        'childrenListCompetencies',
        'childrenListActivity',
        'childrenListAchievements'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = children.map(child => `
            <div class="child-card" onclick="selectChild(${JSON.stringify(child).replace(/"/g, '&quot;')})">
                <div class="child-avatar">${child.name.charAt(0)}</div>
                <div>
                    <div style="font-weight: 600;">${child.name}</div>
                    <div style="font-size: 0.85rem; color: #888;">Grade ${child.gradeLevel}</div>
                </div>
            </div>
        `).join('');
    });
}

// Select child
function selectChild(child) {
    selectedChild = child;
    
    // Update active state
    document.querySelectorAll('.child-card').forEach(card => {
        card.classList.remove('active');
        if (card.textContent.includes(child.name)) {
            card.classList.add('active');
        }
    });
    
    // Load child data
    loadChildOverview();
    loadChildProgress();
    loadChildCompetencies();
    loadChildActivity();
    loadChildAchievements();
}

// Load child overview
async function loadChildOverview() {
    const container = document.getElementById('childOverview');
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent/child/${selectedChild._id}/overview`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        let overview;
        if (response.ok) {
            const result = await response.json();
            overview = result.overview || result;
        } else {
            // Demo data
            overview = {
                learningHours: 48,
                simulationsCompleted: 12,
                averageScore: 78,
                currentStreak: 5,
                challengesAttempted: 25,
                challengesCorrect: 18
            };
        }
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${overview.learningHours || 0}h</div>
                    <div class="stat-label">Learning Time</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-flask"></i></div>
                    <div class="stat-value">${overview.simulationsCompleted || 0}</div>
                    <div class="stat-label">Simulations Completed</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-value">${overview.averageScore || 0}%</div>
                    <div class="stat-label">Average Score</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-fire"></i></div>
                    <div class="stat-value">${overview.currentStreak || 0}</div>
                    <div class="stat-label">Day Streak</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-brain"></i></div>
                    <div class="stat-value">${overview.challengesCorrect || 0}/${overview.challengesAttempted || 0}</div>
                    <div class="stat-label">Challenges</div>
                </div>
            </div>
            
            <div class="panel">
                <h2><i class="fas fa-history"></i> Recent Activity</h2>
                <div id="recentActivityOverview"></div>
            </div>
        `;
        
        loadRecentActivity('recentActivityOverview');
        
    } catch (error) {
        console.error('Failed to load child overview:', error);
    }
}

// Load child progress
async function loadChildProgress() {
    const container = document.getElementById('progressContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="panel">
            <h2><i class="fas fa-chart-line"></i> Overall Progress</h2>
            <div class="progress-bar" style="height: 20px; margin: 20px 0;">
                <div class="progress-fill" style="width: ${selectedChild.progress || 0}%;"></div>
            </div>
            <p style="text-align: center; color: #888;">Overall: ${selectedChild.progress || 0}% Complete</p>
        </div>
        
        <div class="panel">
            <h2><i class="fas fa-book"></i> Subject Progress</h2>
            <div id="subjectProgress"></div>
        </div>
    `;
    
    // Demo subject data
    const subjects = [
        { name: 'Physics', progress: 82, icon: 'atom' },
        { name: 'Mathematics', progress: 75, icon: 'calculator' },
        { name: 'Chemistry', progress: 68, icon: 'flask' }
    ];
    
    document.getElementById('subjectProgress').innerHTML = subjects.map(subject => `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span><i class="fas fa-${subject.icon}"></i> ${subject.name}</span>
                <strong>${subject.progress}%</strong>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${subject.progress}%;"></div>
            </div>
        </div>
    `).join('');
}

// Load child competencies
async function loadChildCompetencies() {
    const container = document.getElementById('competenciesContent');
    if (!container) return;
    
    const competencies = [
        { name: 'Critical Thinking', level: 4, max: 5 },
        { name: 'Problem Solving', level: 3, max: 5 },
        { name: 'Scientific Inquiry', level: 4, max: 5 },
        { name: 'Mathematical Reasoning', level: 3, max: 5 },
        { name: 'Computational Skills', level: 4, max: 5 },
        { name: 'Communication', level: 3, max: 5 }
    ];
    
    container.innerHTML = `
        <div class="panel">
            <h2><i class="fas fa-certificate"></i> NEP 2020 Competencies</h2>
            ${competencies.map(comp => {
                const progress = (comp.level / comp.max) * 100;
                return `
                    <div class="competency-item">
                        <div class="competency-header">
                            <strong>${comp.name}</strong>
                            <span>Level ${comp.level}/${comp.max}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Load child activity
async function loadChildActivity() {
    const container = document.getElementById('activityContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="panel">
            <h2><i class="fas fa-history"></i> Activity Log</h2>
            <div id="activityLog"></div>
        </div>
    `;
    
    loadRecentActivity('activityLog');
}

// Load recent activity
function loadRecentActivity(containerId) {
    const activities = [
        { 
            icon: 'flask',
            title: 'Completed Electrolysis Simulator',
            time: '2 hours ago',
            badge: 'success',
            score: '92%'
        },
        {
            icon: 'calculator',
            title: 'Working on Equation Solver',
            time: '5 hours ago',
            badge: 'info',
            score: 'In Progress'
        },
        {
            icon: 'atom',
            title: 'Completed Newton\'s Laws Demo',
            time: '1 day ago',
            badge: 'success',
            score: '85%'
        }
    ];
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${activity.title}</div>
                <div style="font-size: 0.85rem; color: #888;">${activity.time}</div>
            </div>
            <span class="badge badge-${activity.badge}">${activity.score}</span>
        </div>
    `).join('');
}

// Load child achievements
async function loadChildAchievements() {
    const container = document.getElementById('achievementsContent');
    if (!container) return;
    
    const achievements = [
        { icon: 'trophy', name: 'First Steps', description: 'Completed first simulation', color: '#f39c12' },
        { icon: 'fire', name: '5-Day Streak', description: 'Logged in 5 days in a row', color: '#e74c3c' },
        { icon: 'star', name: 'Perfect Score', description: 'Got 100% on a simulation', color: '#f1c40f' },
        { icon: 'certificate', name: 'Physics Master', description: 'Completed 10 physics labs', color: '#3498db' }
    ];
    
    container.innerHTML = `
        <div class="panel">
            <h2><i class="fas fa-trophy"></i> Badges & Achievements</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                ${achievements.map(achievement => `
                    <div style="background: #333337; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="width: 60px; height: 60px; background: ${achievement.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; font-size: 1.8rem;">
                            <i class="fas fa-${achievement.icon}"></i>
                        </div>
                        <div style="font-weight: 600; margin-bottom: 8px;">${achievement.name}</div>
                        <div style="font-size: 0.85rem; color: #888;">${achievement.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        window.location.href = '../../login.html';
    }
}

// Initialize on load
window.addEventListener('load', init);

// ============================================================================
// PARENT TAB DATA LOADING (Phase 3)
// ============================================================================

// Load child progress (for Progress tab)
async function loadChildProgress() {
    const container = document.getElementById('progressContent');
    if (!container || !selectedChild) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent/child/${selectedChild._id}/progress`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const progress = result.progress || result;
            
            renderProgressChart(progress);
        } else {
            renderDemoProgressChart();
        }
    } catch (error) {
        console.error('Failed to load progress:', error);
        renderDemoProgressChart();
    }
}

// Render progress chart
function renderProgressChart(progressData) {
    const container = document.getElementById('progressContent');
    
    const html = `
        <div style="background: #333337; padding: 20px; border-radius: 8px;">
            <h3 style="margin-bottom: 20px;">Learning Progress Over Time</h3>
            <div style="margin: 20px 0;">
                ${progressData.map((point, idx) => {
                    const date = formatDate(point.date);
                    const score = point.score;
                    
                    return `
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <div style="width: 100px; color: #aaa; font-size: 0.85rem;">${date}</div>
                            <div style="flex: 1; background: #464647; height: 12px; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${score}%; height: 100%; background: linear-gradient(135deg, #007acc, #00d4ff); transition: width 0.3s;"></div>
                            </div>
                            <div style="width: 50px; text-align: right; font-weight: bold; color: var(--accent);">${score}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Demo progress chart
function renderDemoProgressChart() {
    const demoData = [
        { date: new Date('2025-12-01'), score: 65 },
        { date: new Date('2025-12-08'), score: 70 },
        { date: new Date('2025-12-15'), score: 75 },
        { date: new Date('2025-12-22'), score: 78 }
    ];
    renderProgressChart(demoData);
}

// Load child competencies (for Competencies tab)
async function loadChildCompetencies() {
    const container = document.getElementById('competenciesContent');
    if (!container || !selectedChild) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent/child/${selectedChild._id}/competencies`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const competencies = result.competencies || result;
            
            renderCompetencies(competencies);
        } else {
            renderDemoCompetencies();
        }
    } catch (error) {
        console.error('Failed to load competencies:', error);
        renderDemoCompetencies();
    }
}

// Render competencies
function renderCompetencies(competencies) {
    const container = document.getElementById('competenciesContent');
    
    const competencyNames = [
        'Critical Thinking', 'Problem Solving', 'Scientific Inquiry',
        'Mathematical Reasoning', 'Computational Thinking', 'Creativity',
        'Communication', 'Collaboration', 'Digital Literacy',
        'Self Direction', 'Real World Application', 'Adaptability'
    ];
    
    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            ${competencyNames.map((name, idx) => {
                const value = competencies[idx] || 0;
                const percentage = Math.round(value * 100);
                const color = percentage >= 75 ? '#27ae60' : percentage >= 50 ? '#f39c12' : '#e74c3c';
                
                return `
                    <div style="background: #333337; padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px; color: #fff;">${name}</h4>
                        <div style="position: relative; width: 120px; height: 120px; margin: 0 auto;">
                            <svg viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none" stroke="#464647" stroke-width="3"/>
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                      fill="none" stroke="${color}" stroke-width="3"
                                      stroke-dasharray="${percentage}, 100"/>
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.5rem; font-weight: bold; color: ${color};">
                                ${percentage}%
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Demo competencies
function renderDemoCompetencies() {
    const demoCompetencies = [0.82, 0.75, 0.68, 0.88, 0.72, 0.65, 0.78, 0.55, 0.92, 0.70, 0.58, 0.73];
    renderCompetencies(demoCompetencies);
}

// Load child activity (for Activity tab)
async function loadChildActivity() {
    const container = document.getElementById('activityContent');
    if (!container || !selectedChild) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent/child/${selectedChild._id}/activity`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const activities = result.activities || result;
            
            renderActivity(activities);
        } else {
            renderDemoActivity();
        }
    } catch (error) {
        console.error('Failed to load activity:', error);
        renderDemoActivity();
    }
}

// Render activity
function renderActivity(activities) {
    const container = document.getElementById('activityContent');
    
    const html = `
        <div class="panel">
            <div style="max-height: 600px; overflow-y: auto;">
                ${activities.map(activity => `
                    <div style="padding: 15px; border-bottom: 1px solid #464647; display: flex; gap: 15px; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-flask" style="color: white;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin-bottom: 5px;">${activity.title}</h4>
                            <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 5px;">${activity.description}</p>
                            <p style="color: #888; font-size: 0.8rem;">${formatDate(activity.timestamp)}</p>
                        </div>
                        <div style="color: #27ae60; font-size: 0.9rem;">
                            ${activity.score}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Demo activity
function renderDemoActivity() {
    const demoActivities = [
        {
            title: 'Completed Motion Classifier Sim',
            description: '45 actions in 12 minutes',
            timestamp: new Date(),
            score: 'Validated by teacher'
        },
        {
            title: 'Completed Shape Builder',
            description: '38 actions in 15 minutes',
            timestamp: new Date(Date.now() - 86400000),
            score: 'Pending validation'
        }
    ];
    renderActivity(demoActivities);
}

// Load child achievements (for Achievements tab)
async function loadChildAchievements() {
    const container = document.getElementById('achievementsContent');
    if (!container || !selectedChild) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/parent/child/${selectedChild._id}/achievements`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const achievements = result.achievements || result;
            
            renderAchievements(achievements);
        } else {
            renderDemoAchievements();
        }
    } catch (error) {
        console.error('Failed to load achievements:', error);
        renderDemoAchievements();
    }
}

// Render achievements
function renderAchievements(achievements) {
    const container = document.getElementById('achievementsContent');
    
    const html = achievements.length === 0 ?
        '<p style="color: #888; text-align: center; padding: 40px;">No achievements unlocked yet. Keep learning!</p>' :
        `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                ${achievements.map(achievement => `
                    <div style="background: linear-gradient(135deg, #333337, #2d2d30); padding: 25px; border-radius: 12px; text-align: center; border: 2px solid #464647;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">${achievement.icon}</div>
                        <h3 style="margin-bottom: 8px; color: #fff;">${achievement.title}</h3>
                        <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 10px;">${achievement.description}</p>
                        <p style="color: #888; font-size: 0.8rem;">Unlocked: ${formatDate(achievement.unlockedAt)}</p>
                    </div>
                `).join('')}
            </div>
        `;
    
    container.innerHTML = html;
}

// Demo achievements
function renderDemoAchievements() {
    const demoAchievements = [
        {
            icon: '🎯',
            title: 'Simulation Explorer',
            description: 'Completed 10 simulations',
            unlockedAt: new Date('2025-12-15')
        },
        {
            icon: '🧠',
            title: 'Challenge Master',
            description: 'Attempted 50 AI challenges',
            unlockedAt: new Date('2025-12-20')
        },
        {
            icon: '⭐',
            title: 'Perfect Streak',
            description: 'Got 5 challenges correct in a row',
            unlockedAt: new Date('2025-12-22')
        }
    ];
    renderAchievements(demoAchievements);
}

// Update showPage function to load data when tabs are clicked
const originalParentShowPage = showPage;
showPage = function(pageId) {
    originalParentShowPage(pageId);
    
    if (!selectedChild) return;
    
    switch(pageId) {
        case 'progress':
            loadChildProgress();
            break;
        case 'competencies':
            loadChildCompetencies();
            break;
        case 'activity':
            loadChildActivity();
            break;
        case 'achievements':
            loadChildAchievements();
            break;
    }
};