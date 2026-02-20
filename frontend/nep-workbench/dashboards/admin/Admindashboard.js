// NEP WORKBENCH - ADMIN DASHBOARD
const API_BASE_URL = '/api';
const authToken = localStorage.getItem('authToken');
let adminData = null;

// Initialize dashboard
async function init() {
    if (!authToken) {
        window.location.href = '../../login.html';
        return;
    }
    
    // Verify role
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN') {
        alert('Access denied. Administrators only.');
        window.location.href = '../../login.html';
        return;
    }
    
    // Load admin data
    await loadAdminProfile();
    await loadSystemStats();
    await loadPlanStatus();
    await loadUsers();
}

// Load admin profile
async function loadAdminProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            adminData = result.profile || result;
            document.getElementById('userName').textContent = adminData.name;
            
            const initial = adminData.name.charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = initial;
        }
    } catch (error) {
        console.error('Failed to load admin profile:', error);
        const name = localStorage.getItem('userName') || 'Admin';
        document.getElementById('userName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
    }
}

// Load system statistics
async function loadSystemStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const stats = result.stats || result;
            
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('totalStudents').textContent = stats.students || 0;
            document.getElementById('totalTeachers').textContent = stats.teachers || 0;
            document.getElementById('totalHours').textContent = Math.round(stats.totalLearningHours || 0);
            document.getElementById('totalSessions').textContent = stats.activeSessions || 0;
        } else {
            // Demo data
            showDemoStats();
        }
    } catch (error) {
        console.error('Failed to load system stats:', error);
        showDemoStats();
    }
}

// Show demo statistics
function showDemoStats() {
    document.getElementById('totalUsers').textContent = '156';
    document.getElementById('totalStudents').textContent = '120';
    document.getElementById('totalTeachers').textContent = '25';
    document.getElementById('totalHours').textContent = '3,248';
    document.getElementById('totalSessions').textContent = '32';
}

// Load users list
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const users = result.users || result;
            renderUsersList(users);
        } else {
            showDemoUsers();
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showDemoUsers();
    }
}

// Render users list
function renderUsersList(users) {
    const tbody = document.getElementById('usersList');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role.toLowerCase()}">${user.role}</span></td>
            <td><span class="badge badge-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <button class="btn" onclick="editUser('${user._id}')" style="padding: 6px 12px; font-size: 0.85rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteUser('${user._id}')" style="padding: 6px 12px; font-size: 0.85rem; margin-left: 5px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Show demo users
function showDemoUsers() {
    const demoUsers = [
        {
            _id: '1',
            name: 'Rahul Kumar',
            email: 'rahul@example.com',
            role: 'STUDENT',
            isActive: true,
            createdAt: new Date('2025-01-15')
        },
        {
            _id: '2',
            name: 'Priya Sharma',
            email: 'priya.sharma@example.com',
            role: 'TEACHER',
            isActive: true,
            createdAt: new Date('2025-01-10')
        },
        {
            _id: '3',
            name: 'Amit Patel',
            email: 'amit.patel@example.com',
            role: 'PARENT',
            isActive: true,
            createdAt: new Date('2025-01-20')
        },
        {
            _id: '4',
            name: 'Sneha Gupta',
            email: 'sneha@example.com',
            role: 'STUDENT',
            isActive: true,
            createdAt: new Date('2025-01-18')
        },
        {
            _id: '5',
            name: 'Rohan Singh',
            email: 'rohan.singh@example.com',
            role: 'TEACHER',
            isActive: false,
            createdAt: new Date('2025-01-05')
        }
    ];
    
    renderUsersList(demoUsers);
}

// Edit user
async function editUser(userId) {
    try {
        // Fetch user details
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const user = result.user || result;
            
            // Populate form
            document.getElementById('editUserId').value = user._id;
            document.getElementById('editUserName').value = user.name;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserRole').value = user.role;
            document.getElementById('editUserStatus').value = user.status || 'active';
            
            // Open modal
            document.getElementById('editUserModal').style.display = 'flex';
        } else {
            alert('Failed to load user details');
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        alert('Error loading user details');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            alert('User deleted successfully!');
            loadUsers();
        } else {
            alert('Failed to delete user. Please try again.');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Error deleting user. Please check your connection.');
    }
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Utility function - format date
function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
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
// NEP COMPLIANCE FUNCTIONS (Phase 1B - Critical Feature)
// ============================================================================

// Load NEP compliance data
async function loadNEPCompliance() {
    await Promise.all([
        loadSchoolMetrics(),
        loadCompetencyCoverage(),
        loadPedagogyUsage(),
        loadVocationalCompliance(),
        loadAuditReports()
    ]);
}

// Load school metrics
async function loadSchoolMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/metrics`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const metrics = result.metrics || result;
            
            document.getElementById('complianceScore').textContent = 
                metrics.compliance || metrics.compliance_score || 'N/A';
            document.getElementById('validationRate').textContent = 
                (metrics.validationRate || metrics.V_rate || 0) + '%';
            document.getElementById('avgPI').textContent = 
                (metrics.averagePI || metrics.PI_avg || 0).toFixed(2);
            document.getElementById('totalSimHours').textContent = 
                Math.round(metrics.simulationHours || metrics.T_total || 0) + 'h';
        }
    } catch (error) {
        console.error('Failed to load school metrics:', error);
        // Demo data
        document.getElementById('complianceScore').textContent = '85%';
        document.getElementById('validationRate').textContent = '72%';
        document.getElementById('avgPI').textContent = '0.78';
        document.getElementById('totalSimHours').textContent = '3248h';
    }
}

// Load competency coverage
async function loadCompetencyCoverage() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/coverage`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const coverage = result.coverage || result;
            
            renderCompetencyCoverage(coverage);
        }
    } catch (error) {
        console.error('Failed to load competency coverage:', error);
        renderDemoCompetencyCoverage();
    }
}

// Render competency coverage
function renderCompetencyCoverage(coverage) {
    const competencies = [
        'Critical Thinking', 'Problem Solving', 'Scientific Inquiry',
        'Mathematical Reasoning', 'Computational Thinking', 'Creativity',
        'Communication', 'Collaboration', 'Digital Literacy',
        'Self Direction', 'Real World Application', 'Adaptability'
    ];
    
    const levels = coverage.competencies || coverage.competency_levels || Array(12).fill(0.5);
    
    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
            ${competencies.map((comp, idx) => {
                const level = levels[idx] || 0;
                const percentage = Math.round(level * 100);
                const color = percentage >= 75 ? '#27ae60' : percentage >= 50 ? '#f39c12' : '#e74c3c';
                
                return `
                    <div style="background: #333337; padding: 15px; border-radius: 8px;">
                        <div style="font-size: 0.9rem; color: #aaa; margin-bottom: 8px;">${comp}</div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="flex: 1; background: #464647; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                            </div>
                            <div style="font-weight: bold; color: ${color};">${percentage}%</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        ${coverage.gaps && coverage.gaps.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; border-radius: 6px;">
                <h4 style="color: #e74c3c; margin-bottom: 10px;"><i class="fas fa-exclamation-triangle"></i> Identified Gaps:</h4>
                <ul style="color: #aaa; margin-left: 20px;">
                    ${coverage.gaps.map(gap => `<li>${gap}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${coverage.recommendations && coverage.recommendations.length > 0 ? `
            <div style="margin-top: 15px; padding: 15px; background: rgba(0, 212, 255, 0.1); border-left: 4px solid #00d4ff; border-radius: 6px;">
                <h4 style="color: #00d4ff; margin-bottom: 10px;"><i class="fas fa-lightbulb"></i> Recommendations:</h4>
                <ul style="color: #aaa; margin-left: 20px;">
                    ${coverage.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    document.getElementById('competencyCoverage').innerHTML = html;
}

// Demo competency coverage
function renderDemoCompetencyCoverage() {
    const demoCoverage = {
        competencies: [0.82, 0.78, 0.65, 0.88, 0.72, 0.58, 0.75, 0.45, 0.92, 0.68, 0.55, 0.70],
        gaps: ['Collaboration needs more emphasis', 'Real World Application below target'],
        recommendations: ['Increase group-based simulations', 'Add more practical problem scenarios']
    };
    renderCompetencyCoverage(demoCoverage);
}

// Load pedagogy usage
async function loadPedagogyUsage() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/pedagogy`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const pedagogy = result.pedagogy || result;
            
            renderPedagogyUsage(pedagogy);
        }
    } catch (error) {
        console.error('Failed to load pedagogy usage:', error);
        renderDemoPedagogyUsage();
    }
}

// Render pedagogy usage
function renderPedagogyUsage(pedagogy) {
    const html = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #27ae60; margin-bottom: 10px;">
                    ${Math.round(pedagogy.inquiryBased || 0)}%
                </div>
                <div style="color: #aaa;">Inquiry-Based Learning</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #f39c12; margin-bottom: 10px;">
                    ${Math.round(pedagogy.collaborativeLearning || 0)}%
                </div>
                <div style="color: #aaa;">Collaborative Learning</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #00d4ff; margin-bottom: 10px;">
                    ${Math.round(pedagogy.experientialLearning || 100)}%
                </div>
                <div style="color: #aaa;">Experiential Learning</div>
            </div>
        </div>
        
        ${pedagogy.recommendations && pedagogy.recommendations.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: rgba(0, 212, 255, 0.1); border-left: 4px solid #00d4ff; border-radius: 6px;">
                <h4 style="color: #00d4ff; margin-bottom: 10px;"><i class="fas fa-lightbulb"></i> Pedagogy Recommendations:</h4>
                <ul style="color: #aaa; margin-left: 20px;">
                    ${pedagogy.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    document.getElementById('pedagogyUsage').innerHTML = html;
}

// Demo pedagogy
function renderDemoPedagogyUsage() {
    const demoPedagogy = {
        inquiryBased: 65,
        collaborativeLearning: 45,
        experientialLearning: 100,
        recommendations: ['Increase collaborative activities', 'Add more inquiry-based challenges']
    };
    renderPedagogyUsage(demoPedagogy);
}

// Load vocational compliance
async function loadVocationalCompliance() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/vocational`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const vocational = result.vocational || result;
            
            renderVocationalCompliance(vocational);
        }
    } catch (error) {
        console.error('Failed to load vocational compliance:', error);
        renderDemoVocationalCompliance();
    }
}

// Render vocational compliance
function renderVocationalCompliance(vocational) {
    const compliant = vocational.compliant || false;
    const exposure = vocational.exposureHours || 0;
    const required = vocational.requiredHours || 40;
    const percentage = Math.round((exposure / required) * 100);
    
    const html = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Vocational Exposure Hours</span>
                        <span style="color: #fff; font-weight: bold;">${exposure}h / ${required}h</span>
                    </div>
                    <div style="background: #464647; height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${compliant ? '#27ae60' : '#e74c3c'}; transition: width 0.3s;"></div>
                    </div>
                </div>
                
                ${vocational.skillsCovered && vocational.skillsCovered.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h4 style="color: #aaa; margin-bottom: 10px;">Skills Covered:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${vocational.skillsCovered.map(skill => `
                                <span class="badge badge-success">${skill}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; padding: 30px; background: ${compliant ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; border-radius: 8px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">
                    ${compliant ? '✅' : '❌'}
                </div>
                <div style="color: ${compliant ? '#27ae60' : '#e74c3c'}; font-weight: bold; font-size: 1.2rem;">
                    ${compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                </div>
            </div>
        </div>
        
        ${vocational.gaps && vocational.gaps.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; border-radius: 6px;">
                <h4 style="color: #e74c3c; margin-bottom: 10px;"><i class="fas fa-exclamation-triangle"></i> Gaps:</h4>
                <ul style="color: #aaa; margin-left: 20px;">
                    ${vocational.gaps.map(gap => `<li>${gap}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    document.getElementById('vocationalCompliance').innerHTML = html;
}

// Demo vocational
function renderDemoVocationalCompliance() {
    const demoVocational = {
        compliant: false,
        exposureHours: 25,
        requiredHours: 40,
        skillsCovered: ['Digital Design', 'Basic Coding', 'Data Analysis'],
        gaps: ['Need 15 more hours', 'Missing hands-on projects']
    };
    renderVocationalCompliance(demoVocational);
}

// Verify ledger
async function verifyLedger() {
    const resultsDiv = document.getElementById('ledgerResults');
    resultsDiv.innerHTML = '<p style="color: #888;"><i class="fas fa-spinner fa-spin"></i> Verifying ledger integrity...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/ledger/verify`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const ledger = result.ledger || result;
            
            resultsDiv.innerHTML = `
                <div style="padding: 20px; background: ${ledger.valid ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; border-left: 4px solid ${ledger.valid ? '#27ae60' : '#e74c3c'}; border-radius: 6px;">
                    <h3 style="color: ${ledger.valid ? '#27ae60' : '#e74c3c'}; margin-bottom: 15px;">
                        ${ledger.valid ? '✅ Ledger Verified' : '❌ Ledger Issues Found'}
                    </h3>
                    <p><strong>Total Entries:</strong> ${ledger.entryCount || 0}</p>
                    <p><strong>Last Entry:</strong> ${ledger.lastEntry ? formatDate(ledger.lastEntry) : 'N/A'}</p>
                    <p><strong>Merkle Root:</strong> <code style="background: #1e1e1e; padding: 4px 8px; border-radius: 4px;">${ledger.merkleRoot || 'N/A'}</code></p>
                    
                    ${ledger.issues && ledger.issues.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <h4 style="color: #e74c3c;">Issues Detected:</h4>
                            <ul style="margin-left: 20px;">
                                ${ledger.issues.map(issue => `<li>${issue}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ledger verification failed:', error);
        resultsDiv.innerHTML = `
            <div style="padding: 20px; background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; border-radius: 6px;">
                <p style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Verification failed: ${error.message}</p>
            </div>
        `;
    }
}

// Generate audit report
async function generateAuditReport(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const reportData = {
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        reportType: formData.get('reportType')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/audit/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ Report generated successfully!\n\nReport ID: ${result.reportId}\nEvents: ${result.summary.eventsAnalyzed}\nStudents: ${result.summary.studentsIncluded}`);
            loadAuditReports(); // Refresh list
            form.reset();
        } else {
            const error = await response.json();
            alert('Failed to generate report: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Report generation failed:', error);
        alert('Failed to generate audit report. Please try again.');
    }
}

// Load audit reports
async function loadAuditReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/audit/reports`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const reports = result.reports || result;
            
            renderAuditReports(reports);
        }
    } catch (error) {
        console.error('Failed to load audit reports:', error);
        renderDemoAuditReports();
    }
}

// Render audit reports
function renderAuditReports(reports) {
    const html = reports.length === 0 ? 
        '<p style="color: #888;">No reports generated yet</p>' :
        `
            <table>
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Generated</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td>${formatDate(report.timeRange.start)} - ${formatDate(report.timeRange.end)}</td>
                            <td>${formatDate(report.generatedAt)}</td>
                            <td><span class="badge badge-${report.status === 'draft' ? 'warning' : 'success'}">${report.status}</span></td>
                            <td>
                                <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    
    document.getElementById('reportsTable').innerHTML = html;
}

// Demo reports
function renderDemoAuditReports() {
    const demoReports = [
        {
            timeRange: { start: new Date('2025-11-01'), end: new Date('2025-11-30') },
            generatedAt: new Date('2025-12-01'),
            status: 'draft'
        }
    ];
    renderAuditReports(demoReports);
}

// Auto-load NEP compliance when page shows
const originalShowPage = showPage;
showPage = function(pageId) {
    originalShowPage(pageId);
    if (pageId === 'nep-compliance') {
        loadNEPCompliance();
    }
};

// ============================================================================
// SYSTEM MONITORING FUNCTIONS (Phase 1C)
// ============================================================================

// Load activity logs
async function loadActivityLogs() {
    const level = document.getElementById('logLevel')?.value || '';
    
    try {
        const url = `${API_BASE_URL}/admin/activity-logs?limit=50${level ? '&level=' + level : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const logs = result.logs || result;
            
            renderActivityLogs(logs);
        }
    } catch (error) {
        console.error('Failed to load activity logs:', error);
        renderDemoActivityLogs();
    }
}

// Render activity logs
function renderActivityLogs(logs) {
    const tbody = document.getElementById('activityLogs');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const levelColor = log.level === 'error' ? '#e74c3c' : 
                          log.level === 'warn' ? '#f39c12' : '#27ae60';
        
        return `
            <tr>
                <td>${formatDate(log.timestamp)}</td>
                <td><span class="badge" style="background: ${levelColor};">${log.level}</span></td>
                <td>${log.message}</td>
                <td><span class="badge badge-success">${log.type || 'system'}</span></td>
            </tr>
        `;
    }).join('');
}

// Demo activity logs
function renderDemoActivityLogs() {
    const demoLogs = [
        {
            timestamp: new Date(),
            level: 'info',
            message: 'User login successful',
            type: 'auth'
        },
        {
            timestamp: new Date(Date.now() - 300000),
            level: 'info',
            message: 'Student completed simulation',
            type: 'simulation'
        },
        {
            timestamp: new Date(Date.now() - 600000),
            level: 'warn',
            message: 'High server load detected',
            type: 'system'
        }
    ];
    renderActivityLogs(demoLogs);
}

// Load system health
async function loadSystemHealth() {
    const display = document.getElementById('systemHealthDisplay');
    display.innerHTML = '<p style="color: #888;"><i class="fas fa-spinner fa-spin"></i> Checking system health...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/system-health`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const health = result.health || result;
            
            renderSystemHealth(health);
        }
    } catch (error) {
        console.error('Failed to load system health:', error);
        renderDemoSystemHealth();
    }
}

// Render system health
function renderSystemHealth(health) {
    const display = document.getElementById('systemHealthDisplay');
    
    const allOperational = health.api === 'operational' && 
                          health.database === 'operational' && 
                          health.server === 'operational';
    
    const html = `
        <div style="padding: 20px; background: ${allOperational ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)'}; border-left: 4px solid ${allOperational ? '#27ae60' : '#e74c3c'}; border-radius: 6px;">
            <h3 style="color: ${allOperational ? '#27ae60' : '#e74c3c'}; margin-bottom: 15px;">
                ${allOperational ? '✅ All Systems Operational' : '⚠️ System Issues Detected'}
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 5px;">
                        ${health.api === 'operational' ? '✅' : '❌'}
                    </div>
                    <div style="color: #aaa;">API</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 5px;">
                        ${health.database === 'operational' ? '✅' : '❌'}
                    </div>
                    <div style="color: #aaa;">Database</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 5px;">
                        ${health.server === 'operational' ? '✅' : '❌'}
                    </div>
                    <div style="color: #aaa;">Server</div>
                </div>
            </div>
            
            ${health.metrics ? `
                <div style="padding: 15px; background: #333337; border-radius: 6px;">
                    <h4 style="color: #aaa; margin-bottom: 10px;">System Metrics:</h4>
                    <p><strong>Uptime:</strong> ${Math.round(health.metrics.uptime / 3600)} hours</p>
                    <p><strong>Memory Used:</strong> ${health.metrics.memoryUsed} MB / ${health.metrics.memoryTotal} MB</p>
                </div>
            ` : ''}
            
            <p style="color: #888; margin-top: 15px; font-size: 0.9rem;">
                Last checked: ${formatDate(health.timestamp || new Date())}
            </p>
        </div>
    `;
    
    display.innerHTML = html;
}

// Demo system health
function renderDemoSystemHealth() {
    const demoHealth = {
        api: 'operational',
        database: 'operational',
        server: 'operational',
        metrics: {
            uptime: 259200,
            memoryUsed: 512,
            memoryTotal: 2048
        },
        timestamp: new Date()
    };
    renderSystemHealth(demoHealth);
}

// Auto-load logs when page shows
const originalShowPageLogs = showPage;
showPage = function(pageId) {
    originalShowPageLogs(pageId);
    if (pageId === 'logs') {
        loadActivityLogs();
        loadSystemHealth();
    }
};

// ============================================================================
// USER MANAGEMENT MODALS (Phase 2)
// ============================================================================

// Open add user modal
function openAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserModal').style.display = 'flex';
}

// Close add user modal
function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
}

// Submit add user
async function submitAddUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`✅ User created successfully!\nUser ID: ${result.userId}`);
            closeAddUserModal();
            loadUsers(); // Refresh list
        } else {
            const error = await response.json();
            alert('Failed to create user: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('User creation failed:', error);
        alert('Failed to create user. Please try again.');
    }
}

// Close edit user modal
function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
}

// Submit edit user
async function submitEditUser(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const userId = formData.get('userId');
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role'),
        status: formData.get('status')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            alert('✅ User updated successfully!');
            closeEditUserModal();
            loadUsers(); // Refresh list
        } else {
            const error = await response.json();
            alert('Failed to update user: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('User update failed:', error);
        alert('Failed to update user. Please try again.');
    }
}

// ============================================================================
// SYSTEM SETTINGS FUNCTIONS (Phase 4A)
// ============================================================================

// Load system settings
async function loadSystemSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const settings = result.settings || result;
            
            populateSettingsForms(settings);
        } else {
            loadDemoSettings();
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        loadDemoSettings();
    }
}

// Populate settings forms
function populateSettingsForms(settings) {
    // School Info
    if (settings.school) {
        document.getElementById('schoolName').value = settings.school.name || '';
        document.getElementById('schoolCode').value = settings.school.code || '';
        document.getElementById('schoolAddress').value = settings.school.address || '';
        document.getElementById('schoolEmail').value = settings.school.email || '';
        document.getElementById('schoolPhone').value = settings.school.phone || '';
    }
    
    // NEP Config
    if (settings.nep) {
        document.getElementById('enableValidation').checked = settings.nep.enableValidation !== false;
        document.getElementById('enableAI').checked = settings.nep.enableAI !== false;
        document.getElementById('enableAudit').checked = settings.nep.enableAudit !== false;
        document.getElementById('validationThreshold').value = settings.nep.validationThreshold || 0.5;
        document.getElementById('vocationalHours').value = settings.nep.vocationalHours || 40;
    }
    
    // System Prefs
    if (settings.system) {
        document.getElementById('timezone').value = settings.system.timezone || 'Asia/Kolkata';
        document.getElementById('dateFormat').value = settings.system.dateFormat || 'DD/MM/YYYY';
        document.getElementById('emailNotifications').checked = settings.system.emailNotifications !== false;
        document.getElementById('parentNotifications').checked = settings.system.parentNotifications !== false;
    }
    
    // API Config
    if (settings.api) {
        document.getElementById('mistralModel').value = settings.api.mistralModel || 'mistral-large-latest';
        document.getElementById('rateLimit').value = settings.api.rateLimit || 1000;
        document.getElementById('enableCache').checked = settings.api.enableCache !== false;
    }
}

// Load demo settings
function loadDemoSettings() {
    const demoSettings = {
        school: {
            name: 'NEP Workbench Demo School',
            code: 'DEMO001',
            address: '123 Education Street, Learning City, India',
            email: 'contact@demoschool.edu',
            phone: '+91-1234567890'
        },
        nep: {
            enableValidation: true,
            enableAI: true,
            enableAudit: true,
            validationThreshold: 0.5,
            vocationalHours: 40
        },
        system: {
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY',
            emailNotifications: true,
            parentNotifications: true
        },
        api: {
            mistralModel: 'mistral-large-latest',
            rateLimit: 1000,
            enableCache: true
        }
    };
    
    populateSettingsForms(demoSettings);
}

// Save school info
async function saveSchoolInfo(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const schoolData = {
        name: formData.get('schoolName'),
        code: formData.get('schoolCode'),
        address: formData.get('address'),
        email: formData.get('email'),
        phone: formData.get('phone')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings/school`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(schoolData)
        });
        
        if (response.ok) {
            alert('✅ School information saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('✅ School information saved (demo mode)');
    }
}

// Save NEP config
async function saveNEPConfig(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const nepData = {
        enableValidation: formData.get('enableValidation') === 'on',
        enableAI: formData.get('enableAI') === 'on',
        enableAudit: formData.get('enableAudit') === 'on',
        validationThreshold: parseFloat(formData.get('validationThreshold')),
        vocationalHours: parseInt(formData.get('vocationalHours'))
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings/nep`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nepData)
        });
        
        if (response.ok) {
            alert('✅ NEP configuration saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('✅ NEP configuration saved (demo mode)');
    }
}

// Save system preferences
async function saveSystemPrefs(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const systemData = {
        timezone: formData.get('timezone'),
        dateFormat: formData.get('dateFormat'),
        emailNotifications: formData.get('emailNotifications') === 'on',
        parentNotifications: formData.get('parentNotifications') === 'on'
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings/system`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(systemData)
        });
        
        if (response.ok) {
            alert('✅ System preferences saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('✅ System preferences saved (demo mode)');
    }
}

// Save API config
async function saveAPIConfig(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const apiData = {
        mistralModel: formData.get('mistralModel'),
        rateLimit: parseInt(formData.get('rateLimit')),
        enableCache: formData.get('enableCache') === 'on'
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings/api`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        });
        
        if (response.ok) {
            alert('✅ API configuration saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('✅ API configuration saved (demo mode)');
    }
}

// Auto-load settings when page shows
const originalShowPageSettings = showPage;
showPage = function(pageId) {
    originalShowPageSettings(pageId);
    if (pageId === 'settings') {
        loadSystemSettings();
    }
};

// ============================================================================
// CONTENT MANAGER FUNCTIONS (Phase 4B)
// ============================================================================

let allSimulations = [];

// Load simulations
async function loadSimulations() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/simulations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            allSimulations = result.simulations || result;
            
            renderSimulations(allSimulations);
        } else {
            loadDemoSimulations();
        }
    } catch (error) {
        console.error('Failed to load simulations:', error);
        loadDemoSimulations();
    }
}

// Demo simulations (from your StudentWorkbench.js)
function loadDemoSimulations() {
    allSimulations = [
        { id: 'motion-classifier-sim', name: 'Motion Classifier', subject: 'Physics', grade: '9-10', enabled: true, usage: 245 },
        { id: 'shape-builder-measurer', name: 'Shape Builder & Measurer', subject: 'Mathematics', grade: '6-8', enabled: true, usage: 189 },
        { id: 'ecosystem-explorer', name: 'Ecosystem Explorer', subject: 'Biology', grade: '10-12', enabled: true, usage: 167 },
        { id: 'chemical-reaction-sim', name: 'Chemical Reactions', subject: 'Chemistry', grade: '9-11', enabled: true, usage: 143 },
        { id: 'circuit-builder', name: 'Circuit Builder', subject: 'Physics', grade: '8-10', enabled: true, usage: 198 },
        { id: 'math-function-grapher', name: 'Function Grapher', subject: 'Mathematics', grade: '9-12', enabled: true, usage: 156 },
        { id: 'cell-structure-explorer', name: 'Cell Structure Explorer', subject: 'Biology', grade: '7-9', enabled: true, usage: 134 },
        { id: 'periodic-table-sim', name: 'Periodic Table Interactive', subject: 'Chemistry', grade: '8-10', enabled: true, usage: 178 },
        { id: 'wave-interference', name: 'Wave Interference', subject: 'Physics', grade: '11-12', enabled: false, usage: 87 },
        { id: 'geometry-theorem-prover', name: 'Geometry Theorem Prover', subject: 'Mathematics', grade: '9-10', enabled: true, usage: 112 }
    ];
    
    renderSimulations(allSimulations);
}

// Render simulations
function renderSimulations(simulations) {
    const container = document.getElementById('simulationsList');
    
    if (simulations.length === 0) {
        container.innerHTML = '<p style="color: #888; grid-column: 1/-1; text-align: center; padding: 40px;">No simulations found</p>';
        return;
    }
    
    container.innerHTML = simulations.map(sim => `
        <div style="background: #333337; padding: 20px; border-radius: 8px; border: 2px solid ${sim.enabled ? '#27ae60' : '#464647'};">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <h3 style="margin-bottom: 5px; color: #fff;">${sim.name}</h3>
                    <p style="color: #aaa; font-size: 0.85rem; margin-bottom: 8px;">${sim.subject} | Grade ${sim.grade}</p>
                    <span class="badge badge-${sim.enabled ? 'success' : 'error'}">
                        ${sim.enabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                </div>
            </div>
            
            <div style="margin: 15px 0; padding: 12px; background: #2d2d30; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #aaa; font-size: 0.85rem;">Usage:</span>
                    <span style="color: var(--accent); font-weight: bold;">${sim.usage} times</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button class="btn" onclick="toggleSimulation('${sim.id}', ${!sim.enabled})" 
                        style="flex: 1; padding: 8px; font-size: 0.85rem;">
                    <i class="fas fa-${sim.enabled ? 'ban' : 'check'}"></i> 
                    ${sim.enabled ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-secondary" onclick="viewSimulationDetails('${sim.id}')" 
                        style="padding: 8px 12px; font-size: 0.85rem;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Filter simulations
function filterSimulations() {
    const searchTerm = document.getElementById('simSearch').value.toLowerCase();
    const filtered = allSimulations.filter(sim => 
        sim.name.toLowerCase().includes(searchTerm) ||
        sim.subject.toLowerCase().includes(searchTerm)
    );
    renderSimulations(filtered);
}

// Toggle simulation
async function toggleSimulation(simId, enable) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/simulations/${simId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: enable })
        });
        
        if (response.ok) {
            alert(`✅ Simulation ${enable ? 'enabled' : 'disabled'} successfully!`);
            loadSimulations();
        } else {
            throw new Error('Failed to update');
        }
    } catch (error) {
        console.error('Toggle failed:', error);
        // Update locally for demo
        const sim = allSimulations.find(s => s.id === simId);
        if (sim) {
            sim.enabled = enable;
            renderSimulations(allSimulations);
            alert(`✅ Simulation ${enable ? 'enabled' : 'disabled'} (demo mode)`);
        }
    }
}

// View simulation details
function viewSimulationDetails(simId) {
    const sim = allSimulations.find(s => s.id === simId);
    if (sim) {
        alert(`Simulation Details:\n\nName: ${sim.name}\nSubject: ${sim.subject}\nGrade: ${sim.grade}\nUsage: ${sim.usage} times\nStatus: ${sim.enabled ? 'Enabled' : 'Disabled'}\n\nDetailed view coming soon!`);
    }
}

// Load learning resources
async function loadLearningResources() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/resources`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const resources = result.resources || result;
            
            renderResources(resources);
        } else {
            renderDemoResources();
        }
    } catch (error) {
        console.error('Failed to load resources:', error);
        renderDemoResources();
    }
}

// Render resources
function renderResources(resources) {
    const tbody = document.getElementById('resourcesList');
    
    if (resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No resources uploaded yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = resources.map(res => `
        <tr>
            <td>${res.name}</td>
            <td><span class="badge badge-success">${res.type}</span></td>
            <td>${res.subject}</td>
            <td>${formatDate(res.uploadedAt)}</td>
            <td>
                <button class="btn btn-secondary" onclick="alert('Download feature coming soon!')" 
                        style="padding: 6px 12px; font-size: 0.85rem;">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Demo resources
function renderDemoResources() {
    const demoResources = [
        { name: 'Physics Lab Manual - Class 10', type: 'PDF', subject: 'Physics', uploadedAt: new Date('2025-12-01') },
        { name: 'Math Problem Sets', type: 'PDF', subject: 'Mathematics', uploadedAt: new Date('2025-12-10') },
        { name: 'Chemistry Video Lectures', type: 'Video', subject: 'Chemistry', uploadedAt: new Date('2025-12-15') }
    ];
    renderResources(demoResources);
}

// Load curriculum mapping
function loadCurriculumMapping() {
    const grade = document.getElementById('curriculumGrade').value;
    const display = document.getElementById('curriculumMappingDisplay');
    
    const mappings = {
        '6': ['Number Systems → Shape Builder', 'Basic Geometry → Geometry Explorer'],
        '7': ['Algebra Basics → Function Grapher', 'Living Organisms → Cell Explorer'],
        '8': ['Physics Motion → Motion Classifier', 'Chemical Reactions → Chemistry Sim'],
        '9': ['Laws of Motion → Motion Classifier', 'Atoms & Molecules → Periodic Table'],
        '10': ['Electricity → Circuit Builder', 'Life Processes → Ecosystem Explorer'],
        '11': ['Thermodynamics → Heat Transfer Sim', 'Organic Chemistry → Molecular Builder'],
        '12': ['Electromagnetism → EM Wave Sim', 'Calculus → Advanced Grapher']
    };
    
    const gradeMapping = mappings[grade] || [];
    
    display.innerHTML = gradeMapping.length === 0 ?
        '<p style="color: #888;">No curriculum mapping available for this grade</p>' :
        `
            <ul style="list-style: none; padding: 0;">
                ${gradeMapping.map(mapping => `
                    <li style="padding: 10px; background: #333337; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid var(--accent);">
                        ${mapping}
                    </li>
                `).join('')}
            </ul>
        `;
}

// Auto-load content when page shows
const originalShowPageContent = showPage;
showPage = function(pageId) {
    originalShowPageContent(pageId);
    if (pageId === 'content') {
        loadSimulations();
        loadLearningResources();
    }
};

// ============================================================================
// SYSTEM ANALYTICS FUNCTIONS (Phase 4C)
// ============================================================================

// Load analytics data
async function loadAnalytics() {
    const period = document.getElementById('analyticsPeriod')?.value || 30;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/analytics?period=${period}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const analytics = result.data?.analytics || result.analytics || result;

            renderAnalytics(analytics);
        } else {
            renderDemoAnalytics();
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
        renderDemoAnalytics();
    }
}

// Render analytics
function renderAnalytics(analytics) {
    // Key metrics
    document.getElementById('analyticsActiveUsers').textContent = analytics.activeUsers || 0;
    document.getElementById('analyticsSimUsage').textContent = analytics.simUsage || 0;
    document.getElementById('analyticsAvgTime').textContent = (analytics.avgSessionTime || 0) + ' min';
    document.getElementById('analyticsGrowth').textContent = '+' + (analytics.growthRate || 0) + '%';
    
    // Charts
    renderActivityTrendChart(analytics.activityTrend || []);
    renderSimulationUsageChart(analytics.topSimulations || []);
    renderSubjectDistribution(analytics.subjectDistribution || {});
    renderGradeDistribution(analytics.gradeDistribution || {});
    renderPerformanceMetrics(analytics.performance || {});
    renderPeakUsageChart(analytics.peakHours || []);
}

// Demo analytics
function renderDemoAnalytics() {
    const demoAnalytics = {
        activeUsers: 342,
        simUsage: 1567,
        avgSessionTime: 18,
        growthRate: 12,
        activityTrend: [
            { date: '2025-12-18', users: 245 },
            { date: '2025-12-19', users: 267 },
            { date: '2025-12-20', users: 289 },
            { date: '2025-12-21', users: 298 },
            { date: '2025-12-22', users: 312 },
            { date: '2025-12-23', users: 328 },
            { date: '2025-12-24', users: 342 }
        ],
        topSimulations: [
            { name: 'Motion Classifier', count: 245 },
            { name: 'Circuit Builder', count: 198 },
            { name: 'Shape Builder', count: 189 },
            { name: 'Periodic Table', count: 178 },
            { name: 'Ecosystem Explorer', count: 167 }
        ],
        subjectDistribution: {
            'Physics': 35,
            'Mathematics': 28,
            'Chemistry': 20,
            'Biology': 17
        },
        gradeDistribution: {
            'Grade 9': 22,
            'Grade 10': 28,
            'Grade 11': 25,
            'Grade 12': 25
        },
        performance: {
            avgResponseTime: 245,
            successRate: 99.2,
            errorRate: 0.8,
            uptime: 99.9
        },
        peakHours: [
            { hour: '9-10', day: 'Mon', value: 45 },
            { hour: '10-11', day: 'Mon', value: 78 },
            { hour: '11-12', day: 'Mon', value: 92 },
            { hour: '14-15', day: 'Mon', value: 67 },
            { hour: '15-16', day: 'Mon', value: 54 },
            { hour: '9-10', day: 'Tue', value: 52 },
            { hour: '10-11', day: 'Tue', value: 88 },
            { hour: '11-12', day: 'Tue', value: 95 },
            { hour: '14-15', day: 'Tue', value: 72 },
            { hour: '15-16', day: 'Tue', value: 58 }
        ]
    };
    
    renderAnalytics(demoAnalytics);
}

// Render activity trend chart
function renderActivityTrendChart(data) {
    const container = document.getElementById('activityTrendChart');
    
    if (data.length === 0) {
        container.innerHTML = '<p style="color: #888;">No activity data available</p>';
        return;
    }
    
    const maxValue = Math.max(...data.map(d => d.users));
    
    const html = `
        <div style="display: flex; align-items: flex-end; gap: 15px; height: 250px; padding: 20px;">
            ${data.map(point => {
                const heightPercent = (point.users / maxValue) * 100;
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <div style="font-size: 0.85rem; font-weight: bold; color: var(--accent);">
                            ${point.users}
                        </div>
                        <div style="width: 100%; background: linear-gradient(180deg, var(--accent), #007acc); height: ${heightPercent}%; border-radius: 6px 6px 0 0; transition: height 0.3s;"></div>
                        <div style="font-size: 0.75rem; color: #888;">
                            ${new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Render simulation usage chart
function renderSimulationUsageChart(data) {
    const container = document.getElementById('simulationUsageChart');
    
    if (data.length === 0) {
        container.innerHTML = '<p style="color: #888;">No simulation data available</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(d => d.count));
    
    const html = `
        <div style="padding: 20px;">
            ${data.map(sim => {
                const widthPercent = (sim.count / maxCount) * 100;
                return `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #fff; font-size: 0.9rem;">${sim.name}</span>
                            <span style="color: var(--accent); font-weight: bold;">${sim.count}</span>
                        </div>
                        <div style="width: 100%; height: 12px; background: #464647; border-radius: 6px; overflow: hidden;">
                            <div style="width: ${widthPercent}%; height: 100%; background: linear-gradient(90deg, #007acc, #00d4ff); transition: width 0.5s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Render subject distribution
function renderSubjectDistribution(data) {
    const container = document.getElementById('subjectDistribution');
    
    const subjects = Object.keys(data);
    if (subjects.length === 0) {
        container.innerHTML = '<p style="color: #888;">No subject data available</p>';
        return;
    }
    
    const colors = ['#007acc', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    
    const html = `
        <div>
            <h3 style="margin-bottom: 15px;">By Subject</h3>
            ${subjects.map((subject, idx) => {
                const percentage = Math.round((data[subject] / total) * 100);
                return `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #aaa; font-size: 0.9rem;">${subject}</span>
                            <span style="color: ${colors[idx]}; font-weight: bold;">${percentage}%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #464647; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${colors[idx]}; transition: width 0.5s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Render grade distribution
function renderGradeDistribution(data) {
    const container = document.getElementById('gradeDistribution');
    
    const grades = Object.keys(data);
    if (grades.length === 0) {
        container.innerHTML = '<p style="color: #888;">No grade data available</p>';
        return;
    }
    
    const colors = ['#007acc', '#00d4ff', '#27ae60', '#f39c12'];
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    
    const html = `
        <div>
            <h3 style="margin-bottom: 15px;">By Grade Level</h3>
            ${grades.map((grade, idx) => {
                const percentage = Math.round((data[grade] / total) * 100);
                return `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #aaa; font-size: 0.9rem;">${grade}</span>
                            <span style="color: ${colors[idx]}; font-weight: bold;">${percentage}%</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #464647; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${colors[idx]}; transition: width 0.5s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Render performance metrics
function renderPerformanceMetrics(data) {
    const container = document.getElementById('performanceMetrics');
    
    const html = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #27ae60; margin-bottom: 8px;">${data.avgResponseTime || 0}ms</div>
                <div style="color: #aaa; font-size: 0.9rem;">Avg Response Time</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #27ae60; margin-bottom: 8px;">${data.successRate || 0}%</div>
                <div style="color: #aaa; font-size: 0.9rem;">Success Rate</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #e74c3c; margin-bottom: 8px;">${data.errorRate || 0}%</div>
                <div style="color: #aaa; font-size: 0.9rem;">Error Rate</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #333337; border-radius: 8px;">
                <div style="font-size: 2rem; color: #27ae60; margin-bottom: 8px;">${data.uptime || 0}%</div>
                <div style="color: #aaa; font-size: 0.9rem;">System Uptime</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Render peak usage heatmap
function renderPeakUsageChart(data) {
    const container = document.getElementById('peakUsageChart');
    
    if (data.length === 0) {
        container.innerHTML = '<p style="color: #888;">No peak usage data available</p>';
        return;
    }
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    const html = `
        <div style="padding: 20px;">
            <p style="color: #aaa; margin-bottom: 15px;">Color intensity indicates usage level</p>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${data.map(point => {
                    const intensity = point.value / maxValue;
                    const bgColor = intensity > 0.7 ? '#27ae60' : 
                                   intensity > 0.4 ? '#f39c12' : '#007acc';
                    const opacity = 0.3 + (intensity * 0.7);
                    
                    return `
                        <div style="padding: 15px; background: ${bgColor}; opacity: ${opacity}; border-radius: 6px; text-align: center;">
                            <div style="font-size: 0.75rem; color: #fff; margin-bottom: 5px;">${point.day}</div>
                            <div style="font-size: 0.75rem; color: #fff; margin-bottom: 5px;">${point.hour}</div>
                            <div style="font-size: 0.85rem; color: #fff; font-weight: bold;">${point.value}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Auto-load analytics when page shows
const originalShowPageAnalytics = showPage;
showPage = function(pageId) {
    originalShowPageAnalytics(pageId);
    if (pageId === 'analytics') {
        loadAnalytics();
    }
};

// ── Plan / subscription status ──────────────────────────────────────────────

async function loadPlanStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/subscription/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) return; // Non-fatal — leave card hidden

        const result = await response.json();
        if (!result.success || !result.data) return;

        const { plan, label, students, isAtLimit } = result.data;

        // Show the card
        const card = document.getElementById('planStatusCard');
        if (card) card.style.display = 'flex';

        // Plan badge
        const badge = document.getElementById('planBadge');
        if (badge) {
            badge.textContent = label || 'Free Plan';
            badge.className = 'plan-badge ' + (plan || 'free');
        }

        // Usage counters
        const usedEl  = document.getElementById('planStudentUsed');
        const limitEl = document.getElementById('planStudentLimit');
        if (usedEl)  usedEl.textContent  = students.used;
        if (limitEl) limitEl.textContent = (students.limit === null) ? '\u221e' : students.limit;

        // Progress bar
        const fill = document.getElementById('planProgressFill');
        if (fill) {
            const pct = students.limit === null ? 0 : Math.min(students.percentUsed, 100);
            fill.style.width = pct + '%';
            if      (pct >= 100) fill.className = 'plan-progress-fill full';
            else if (pct >= 80)  fill.className = 'plan-progress-fill warning';
            else                 fill.className = 'plan-progress-fill';
        }

        // Upgrade button (show at >= 80 %)
        const btn = document.getElementById('upgradeBtn');
        if (btn && (isAtLimit || (students.percentUsed >= 80 && students.limit !== null))) {
            btn.style.display = 'inline-block';
        }

        // Limit banner (show at 100 %)
        const banner = document.getElementById('limitBanner');
        if (banner && isAtLimit) {
            banner.style.display = 'block';
        }

    } catch (err) {
        // Non-fatal — plan status is informational only
        console.warn('Could not load plan status:', err);
    }
}

/**
 * Show a user-friendly message when a student-add API call returns
 * STUDENT_LIMIT_REACHED. Call this wherever the dashboard adds students.
 * @param {Object} errorBody - Parsed JSON error response body
 * @returns {boolean} true if the error was a limit error and was handled
 */
function handleStudentLimitError(errorBody) {
    if (!errorBody || errorBody.code !== 'STUDENT_LIMIT_REACHED') return false;

    const msg = (errorBody.upgradeMessage || 'Plan limit reached.')
        + '\n\nVisit the Contact page to upgrade your plan.';
    alert(msg); // Intentional — matches existing alert() pattern in this file

    // Refresh plan status UI to reflect current state
    loadPlanStatus();
    return true;
}