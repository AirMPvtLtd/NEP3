// NEP WORKBENCH - TEACHER DASHBOARD
const API_BASE_URL = '/api';
const authToken = localStorage.getItem('authToken');
let teacherData = null;

// Initialize dashboard
async function init() {
    if (!authToken) {
        window.location.href = '../../login.html';
        return;
    }
    
    // Verify role
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'TEACHER') {
        alert('Access denied. Teachers only.');
        window.location.href = '../../login.html';
        return;
    }
    
    // Load teacher data
    await loadTeacherProfile();
    await loadDashboardData();
}

// Load teacher profile
async function loadTeacherProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            teacherData = result.profile || result;
            document.getElementById('userName').textContent = teacherData.name;
            document.getElementById('teacherName').textContent = teacherData.name;
            
            // Set avatar initial
            const initial = teacherData.name.charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = initial;
        }
    } catch (error) {
        console.error('Failed to load teacher profile:', error);
    }
}

// Load dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadStudents(),
        loadRecentActivity()
    ]);
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const stats = result.stats || result;
            
            document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
            document.getElementById('avgProgress').textContent = (stats.eventsPending || 0);
            document.getElementById('activeAssignments').textContent = stats.eventsValidated || 0;
            document.getElementById('totalHours').textContent = stats.recentActivity || 0;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        // Show demo data
        document.getElementById('totalStudents').textContent = '32';
        document.getElementById('avgProgress').textContent = '67%';
        document.getElementById('activeAssignments').textContent = '5';
        document.getElementById('totalHours').textContent = '248';
    }
}

// Load students list
async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const students = result.students || result;
            renderStudentsList(students);
        } else {
            // Show demo data
            showDemoStudents();
        }
    } catch (error) {
        console.error('Failed to load students:', error);
        showDemoStudents();
    }
}

// Render students list
function renderStudentsList(students) {
    const tbody = document.getElementById('studentsList');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.gradeLevel || 'N/A'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background: #464647; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${student.progress || 0}%; height: 100%; background: linear-gradient(135deg, #007acc, #00d4ff);"></div>
                    </div>
                    <span>${student.progress || 0}%</span>
                </div>
            </td>
            <td>${formatDate(student.lastActive)}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewStudentDetails('${student._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

// Show demo students
function showDemoStudents() {
    const demoStudents = [
        { _id: '1', name: 'Rahul Kumar', gradeLevel: 10, progress: 78, lastActive: new Date() },
        { _id: '2', name: 'Priya Sharma', gradeLevel: 10, progress: 85, lastActive: new Date(Date.now() - 86400000) },
        { _id: '3', name: 'Amit Patel', gradeLevel: 9, progress: 62, lastActive: new Date(Date.now() - 172800000) },
        { _id: '4', name: 'Sneha Gupta', gradeLevel: 11, progress: 91, lastActive: new Date() },
        { _id: '5', name: 'Rohan Singh', gradeLevel: 10, progress: 74, lastActive: new Date(Date.now() - 259200000) }
    ];
    
    renderStudentsList(demoStudents);
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/activity`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const activity = result.activities || result;
            renderActivity(activity);
        } else {
            showDemoActivity();
        }
    } catch (error) {
        console.error('Failed to load activity:', error);
        showDemoActivity();
    }
}

// Render activity
function renderActivity(activity) {
    const tbody = document.getElementById('recentActivity');
    
    if (activity.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No recent activity</td></tr>';
        return;
    }
    
    tbody.innerHTML = activity.slice(0, 10).map(item => `
        <tr>
            <td>${item.studentName}</td>
            <td>${item.activity}</td>
            <td>${formatTime(item.timestamp)}</td>
            <td><span class="badge ${getProgressBadge(item.score)}">${item.score}%</span></td>
        </tr>
    `).join('');
}

// Show demo activity
function showDemoActivity() {
    const demoActivity = [
        { studentName: 'Priya Sharma', activity: 'Completed Projectile Motion Sim', timestamp: new Date(), score: 92 },
        { studentName: 'Rahul Kumar', activity: 'Started Equation Balancer', timestamp: new Date(Date.now() - 3600000), score: 78 },
        { studentName: 'Sneha Gupta', activity: 'Completed Unit Circle Simulator', timestamp: new Date(Date.now() - 7200000), score: 95 },
        { studentName: 'Amit Patel', activity: 'Working on Force Visualizer', timestamp: new Date(Date.now() - 10800000), score: 65 },
        { studentName: 'Rohan Singh', activity: 'Completed Newton\'s Laws Demo', timestamp: new Date(Date.now() - 14400000), score: 82 }
    ];
    
    renderActivity(demoActivity);
}

// View student details
function viewStudentDetails(studentId) {
    alert(`Viewing details for student ID: ${studentId}\n\nDetailed analytics coming soon!`);
}

// Navigation
function showPage(pageId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Utility functions
function formatDate(date) {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
    
    return d.toLocaleDateString();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getProgressBadge(score) {
    if (score >= 80) return 'badge-success';
    if (score >= 60) return 'badge-warning';
    return 'badge-error';
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
// VALIDATION QUEUE FUNCTIONS (Phase 1 - Critical NEP Feature)
// ============================================================================

let selectedEvents = new Set();
let currentValidationEvent = null;

// Load unvalidated events
async function loadUnvalidatedEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/unvalidated?limit=50`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const events = result.events || result;
            
            renderValidationQueue(events);
            
            // Update badge count
            const badge = document.getElementById('pendingCount');
            if (events.length > 0) {
                badge.textContent = events.length;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        } else {
            showDemoValidationQueue();
        }
    } catch (error) {
        console.error('Failed to load unvalidated events:', error);
        showDemoValidationQueue();
    }
}

// Render validation queue table
function renderValidationQueue(events) {
    const tbody = document.getElementById('validationQueue');
    
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888;">No pending validations! 🎉</td></tr>';
        return;
    }
    
    tbody.innerHTML = events.map(event => `
        <tr>
            <td>
                <input type="checkbox" class="event-checkbox" 
                       data-event-id="${event._id}" 
                       onchange="updateSelectedCount()">
            </td>
            <td>${event.studentName || 'Unknown Student'}</td>
            <td><span class="badge badge-success">${event.toolId}</span></td>
            <td>${formatDate(event.createdAt)}</td>
            <td>${Math.round((event.interactionData?.time_seconds || 0) / 60)} min</td>
            <td>
                <button class="btn" onclick="openValidationModal('${event._id}')" 
                        style="padding: 6px 12px; font-size: 0.85rem;">
                    <i class="fas fa-check"></i> Validate
                </button>
            </td>
            <td>
                ${event.hasSuggestions ? 
                    '<span class="badge badge-success"><i class="fas fa-robot"></i> AI Ready</span>' : 
                    '<span class="badge badge-warning">Manual</span>'}
            </td>
            <td>
                <span class="badge badge-warning">Pending</span>
            </td>
        </tr>
    `).join('');
}

// Show demo validation queue
function showDemoValidationQueue() {
    const demoEvents = [
        {
            _id: '1',
            studentName: 'Rahul Kumar',
            toolId: 'motion-classifier-sim',
            createdAt: new Date('2025-12-23T10:30:00'),
            interactionData: { time_seconds: 720 },
            hasSuggestions: true
        },
        {
            _id: '2',
            studentName: 'Priya Sharma',
            toolId: 'shape-builder-measurer',
            createdAt: new Date('2025-12-23T11:00:00'),
            interactionData: { time_seconds: 540 },
            hasSuggestions: true
        }
    ];
    
    renderValidationQueue(demoEvents);
    document.getElementById('pendingCount').textContent = '2';
    document.getElementById('pendingCount').style.display = 'inline';
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.event-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        if (selectAll.checked) {
            selectedEvents.add(cb.dataset.eventId);
        } else {
            selectedEvents.delete(cb.dataset.eventId);
        }
    });
    
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.event-checkbox:checked');
    selectedEvents.clear();
    
    checkboxes.forEach(cb => {
        selectedEvents.add(cb.dataset.eventId);
    });
    
    document.getElementById('selectedCount').textContent = selectedEvents.size;
    document.getElementById('batchValidateBtn').disabled = selectedEvents.size === 0;
}

// Open validation modal
async function openValidationModal(eventId) {
    currentValidationEvent = eventId;
    
    try {
        // Get AI suggestions
        const response = await fetch(`${API_BASE_URL}/teacher/suggestions/${eventId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        let suggestions = null;
        if (response.ok) {
            const result = await response.json();
            suggestions = result.suggestions || null;
        }
        
        renderValidationModal(eventId, suggestions);
        document.getElementById('validationModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to get suggestions:', error);
        renderValidationModal(eventId, null);
        document.getElementById('validationModal').style.display = 'flex';
    }
}

// Render validation modal
function renderValidationModal(eventId, suggestions) {
    const competencies = [
        'Critical Thinking',
        'Problem Solving',
        'Scientific Inquiry',
        'Mathematical Reasoning',
        'Computational Thinking',
        'Creativity',
        'Communication',
        'Collaboration',
        'Digital Literacy',
        'Self Direction',
        'Real World Application',
        'Adaptability'
    ];
    
    const suggestedValues = suggestions?.competencies || Array(12).fill(0.5);
    const intensity = suggestions?.intensity || 'developing';
    
    const modalBody = document.getElementById('validationModalBody');
    modalBody.innerHTML = `
        ${suggestions ? `
            <div class="panel" style="background: rgba(0, 212, 255, 0.1); border: 1px solid var(--accent); margin-bottom: 20px;">
                <h3><i class="fas fa-robot"></i> AI Suggestions</h3>
                <p style="color: #aaa; margin-bottom: 10px;">${suggestions.rationale || 'AI has analyzed this event.'}</p>
                <p><strong>Confidence:</strong> ${Math.round((suggestions.confidence || 0) * 100)}%</p>
                <p><strong>Suggested Intensity:</strong> <span class="badge badge-success">${intensity}</span></p>
            </div>
        ` : ''}
        
        <form id="validationForm" onsubmit="submitValidation(event)">
            <h3 style="margin-bottom: 20px;">NEP 2020 Competency Assessment</h3>
            
            <div id="competencySliders">
                ${competencies.map((comp, idx) => `
                    <div class="competency-slider">
                        <label>
                            ${comp} 
                            <span class="value-display" id="comp-value-${idx}">${suggestedValues[idx].toFixed(2)}</span>
                        </label>
                        <input type="range" 
                               name="competency-${idx}" 
                               min="0" 
                               max="1" 
                               step="0.01" 
                               value="${suggestedValues[idx]}"
                               oninput="document.getElementById('comp-value-${idx}').textContent = this.value">
                    </div>
                `).join('')}
            </div>
            
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 8px; color: #aaa;">Intensity Level:</label>
                <select name="intensity" style="width: 100%; padding: 10px; background: #1e1e1e; color: #fff; border: 1px solid #464647; border-radius: 6px;">
                    <option value="emerging" ${intensity === 'emerging' ? 'selected' : ''}>Emerging</option>
                    <option value="developing" ${intensity === 'developing' ? 'selected' : ''}>Developing</option>
                    <option value="proficient" ${intensity === 'proficient' ? 'selected' : ''}>Proficient</option>
                </select>
            </div>
            
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 8px; color: #aaa;">Feedback (Optional):</label>
                <textarea name="feedback" 
                          style="width: 100%; min-height: 80px; padding: 10px; background: #1e1e1e; color: #fff; border: 1px solid #464647; border-radius: 6px;"
                          placeholder="Add any feedback for the student..."></textarea>
            </div>
            
            ${suggestions ? `
                <div style="margin: 20px 0;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #aaa; cursor: pointer;">
                        <input type="checkbox" name="teacherOverride">
                        Override AI suggestions (I'm manually adjusting values)
                    </label>
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                <button type="button" class="btn btn-secondary" onclick="closeValidationModal()">
                    Cancel
                </button>
                <button type="submit" class="btn">
                    <i class="fas fa-check"></i> Validate Event
                </button>
            </div>
        </form>
    `;
}

// Close validation modal
function closeValidationModal() {
    document.getElementById('validationModal').style.display = 'none';
    currentValidationEvent = null;
}

// Submit validation
async function submitValidation(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Collect competencies
    const competencies = [];
    for (let i = 0; i < 12; i++) {
        competencies.push(parseFloat(formData.get(`competency-${i}`)));
    }
    
    const validationData = {
        eventId: currentValidationEvent,
        competencies,
        intensity: formData.get('intensity'),
        feedback: formData.get('feedback'),
        teacherOverride: formData.get('teacherOverride') === 'on'
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(validationData)
        });
        
        if (response.ok) {
            alert('Event validated successfully! ✅');
            closeValidationModal();
            loadUnvalidatedEvents(); // Refresh queue
        } else {
            const error = await response.json();
            alert('Validation failed: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Validation submission failed:', error);
        alert('Failed to submit validation. Please try again.');
    }
}

// Validate selected events (batch)
async function validateSelected() {
    if (selectedEvents.size === 0) {
        alert('Please select events to validate');
        return;
    }
    
    if (!confirm(`Validate ${selectedEvents.size} events with default values?`)) {
        return;
    }
    
    const validations = Array.from(selectedEvents).map(eventId => ({
        eventId,
        competencies: Array(12).fill(0.5), // Default values
        intensity: 'developing',
        feedback: 'Batch validated'
    }));
    
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/validate/batch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ validations })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ ${result.results.successful.length} events validated successfully!`);
            selectedEvents.clear();
            loadUnvalidatedEvents();
        } else {
            alert('Batch validation failed');
        }
    } catch (error) {
        console.error('Batch validation failed:', error);
        alert('Failed to validate events');
    }
}

// Auto-load validation queue when page loads
const originalInit = init;
init = async function() {
    await originalInit();
    loadUnvalidatedEvents();
};

// ============================================================================
// STUDENT DETAILS MODAL (Phase 2B)
// ============================================================================

// View student details
async function viewStudentDetails(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const student = result.student || result;
            
            renderStudentDetails(student);
            document.getElementById('studentDetailsModal').style.display = 'flex';
        } else {
            alert('Failed to load student details');
        }
    } catch (error) {
        console.error('Failed to load student details:', error);
        renderDemoStudentDetails();
        document.getElementById('studentDetailsModal').style.display = 'flex';
    }
}

// Render student details
function renderStudentDetails(student) {
    const competencies = [
        'Critical Thinking', 'Problem Solving', 'Scientific Inquiry',
        'Mathematical Reasoning', 'Computational Thinking', 'Creativity',
        'Communication', 'Collaboration', 'Digital Literacy',
        'Self Direction', 'Real World Application', 'Adaptability'
    ];
    
    const competencyValues = student.competencies || Array(12).fill(0);
    
    const html = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <h3>${student.name}</h3>
                <p style="color: #aaa;">
                    Grade ${student.gradeLevel} ${student.section ? '- Section ' + student.section : ''}
                    ${student.rollNumber ? '(Roll: ' + student.rollNumber + ')' : ''}
                </p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 2rem; color: var(--accent); font-weight: bold;">
                    ${student.progress || 0}%
                </div>
                <div style="color: #aaa;">Overall Progress</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #333337; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; color: #27ae60; font-weight: bold;">
                    ${student.eventCount || 0}
                </div>
                <div style="color: #aaa; font-size: 0.9rem;">Total Events</div>
            </div>
            <div style="background: #333337; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; color: #f39c12; font-weight: bold;">
                    ${student.pendingValidations || 0}
                </div>
                <div style="color: #aaa; font-size: 0.9rem;">Pending Validations</div>
            </div>
            <div style="background: #333337; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; color: #00d4ff; font-weight: bold;">
                    ${student.lastAssessment ? formatDate(student.lastAssessment) : 'N/A'}
                </div>
                <div style="color: #aaa; font-size: 0.9rem;">Last Assessment</div>
            </div>
        </div>
        
        <h4 style="margin: 20px 0 15px;">NEP 2020 Competency Profile</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            ${competencies.map((comp, idx) => {
                const value = competencyValues[idx] || 0;
                const percentage = Math.round(value * 100);
                const color = percentage >= 75 ? '#27ae60' : percentage >= 50 ? '#f39c12' : '#e74c3c';
                
                return `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; font-size: 0.85rem; color: #aaa;">${comp}</div>
                        <div style="width: 60%; background: #464647; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${color};"></div>
                        </div>
                        <div style="width: 40px; text-align: right; font-size: 0.85rem; color: ${color}; font-weight: bold;">
                            ${percentage}%
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div style="margin-top: 30px; display: flex; gap: 10px;">
            <button class="btn" onclick="viewStudentEvents('${student._id}')">
                <i class="fas fa-history"></i> View All Events
            </button>
            <button class="btn btn-secondary" onclick="closeStudentDetailsModal()">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('studentDetailsBody').innerHTML = html;
}

// Demo student details
function renderDemoStudentDetails() {
    const demoStudent = {
        _id: '1',
        name: 'Rahul Kumar',
        gradeLevel: 10,
        section: 'A',
        rollNumber: 15,
        progress: 78,
        eventCount: 24,
        pendingValidations: 3,
        lastAssessment: new Date(),
        competencies: [0.82, 0.75, 0.68, 0.88, 0.72, 0.65, 0.78, 0.55, 0.92, 0.70, 0.58, 0.73]
    };
    renderStudentDetails(demoStudent);
}

// Close student details modal
function closeStudentDetailsModal() {
    document.getElementById('studentDetailsModal').style.display = 'none';
}

// View student events
async function viewStudentEvents(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/student/${studentId}/events?limit=20`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const events = result.events || result;
            
            alert(`Student has ${events.length} events. Event viewer coming soon!`);
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        alert('Failed to load student events');
    }
}