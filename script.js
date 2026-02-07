// ========================================
// AI Study Planner - Main Script
// Enhanced with Dark/Light Mode & More Features
// Hackathon 2026
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    updateTimestamp();
    initializeTheme();
});

// Global variables
let currentSchedule = null;
let scheduleGenerator = new AIScheduleGenerator();
let subjects = [];
let currentView = 'weekly';

// Initialize Application
function initializeApp() {
    // Set min date for target date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('targetDate').min = tomorrow.toISOString().split('T')[0];
    
    // Set exam date min
    document.getElementById('examDate').min = today.toISOString().split('T')[0];
    
    // Update time slider values
    updateSliderValues();
    
    // Initialize time preferences
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateProgressStep(2);
        });
    });
    
    // Initialize cognitive load buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('cog-btn')) {
            const parent = e.target.closest('.cognitive-select');
            if (parent) {
                parent.querySelectorAll('.cog-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                const subjectIndex = parseInt(e.target.closest('.subject-card').dataset.index);
                if (subjects[subjectIndex]) {
                    subjects[subjectIndex].cognitiveLoad = e.target.dataset.load;
                }
            }
        }
    });
    
    // Update progress on input changes
    document.querySelectorAll('#studentName, #college, #branch, #graduationYear').forEach(input => {
        input.addEventListener('input', () => updateProgressStep(1));
    });
}

// Theme Management
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    // Check for saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
    
    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' && e.ctrlKey) {
            e.preventDefault();
            themeToggle.click();
        }
    });
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Time sliders
    document.getElementById('weekdaySlider').addEventListener('input', updateSliderValues);
    document.getElementById('weekendSlider').addEventListener('input', updateSliderValues);
    
    // Confidence sliders
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('confidence-input')) {
            const index = parseInt(e.target.dataset.index);
            const value = parseInt(e.target.value);
            if (subjects[index]) {
                subjects[index].confidence = value;
                const valueElement = document.getElementById(`confidenceValue-${index}`);
                if (valueElement) {
                    valueElement.textContent = `${value}/5`;
                }
            }
        }
    });
    
    // Subject inputs
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('subject-input')) {
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            if (subjects[index]) {
                subjects[index][field] = e.target.value;
            }
        }
    });
    
    // Close modal on outside click
    document.getElementById('apiModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeApiModal();
        }
    });
}

// Update Slider Values Display
function updateSliderValues() {
    const weekdaySlider = document.getElementById('weekdaySlider');
    const weekendSlider = document.getElementById('weekendSlider');
    
    document.getElementById('weekdayValue').textContent = `${weekdaySlider.value} hours/day`;
    document.getElementById('weekendValue').textContent = `${weekendSlider.value} hours/day`;
}

// Progress Step Tracker
function updateProgressStep(step) {
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    // Update panel badges
    const badges = document.querySelectorAll('.panel-badge');
    if (badges[0]) {
        badges[0].textContent = `Step ${step} of 4`;
    }
}

// Load Sample Data
function loadSampleData() {
    subjects = [
        {
            name: "Data Structures",
            credits: 4,
            confidence: 3,
            strongAreas: "Arrays, Linked Lists",
            weakAreas: "Trees, Graphs",
            cognitiveLoad: "high",
            priority: 1
        },
        {
            name: "Operating Systems",
            credits: 3,
            confidence: 2,
            strongAreas: "Processes, Threads",
            weakAreas: "Deadlocks, Memory Management",
            cognitiveLoad: "medium",
            priority: 2
        },
        {
            name: "Engineering Mathematics",
            credits: 4,
            confidence: 3,
            strongAreas: "Differential Equations",
            weakAreas: "Laplace Transform",
            cognitiveLoad: "high",
            priority: 3
        }
    ];
    
    renderSubjects();
    updateProgressStep(2);
}

// Render Subjects
function renderSubjects() {
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    
    subjects.forEach((subject, index) => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.dataset.index = index;
        
        // Generate confidence stars
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="fas fa-star ${i <= subject.confidence ? 'fas' : 'far'}"></i>`;
        }
        
        card.innerHTML = `
            <div class="subject-header">
                <div class="subject-title">
                    <h4>${subject.name}</h4>
                    <span class="credits-badge">${subject.credits} Credits</span>
                </div>
                <button class="btn-icon" onclick="removeSubject(${index})" ${subjects.length <= 1 ? 'disabled' : ''} title="Remove Subject">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-signal"></i> Confidence Level: <span id="confidenceValue-${index}">${subject.confidence}/5</span></label>
                <input type="range" min="1" max="5" value="${subject.confidence}" 
                       class="confidence-input slider" 
                       data-index="${index}">
                <div class="confidence-labels">
                    <span>Very Low</span>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                    <span>Very High</span>
                </div>
                <div class="level" style="display: flex; justify-content: center; margin-top: 0.5rem;">
                    ${starsHtml}
                </div>
            </div>
            
            <div class="areas-input">
                <div class="input-group">
                    <label><i class="fas fa-check-circle"></i> Strong Areas</label>
                    <input type="text" class="subject-input" data-index="${index}" data-field="strongAreas" 
                           value="${subject.strongAreas}" placeholder="Topics you're comfortable with">
                </div>
                <div class="input-group">
                    <label><i class="fas fa-exclamation-triangle"></i> Weak Areas</label>
                    <input type="text" class="subject-input" data-index="${index}" data-field="weakAreas" 
                           value="${subject.weakAreas}" placeholder="Topics you need to focus on">
                </div>
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-brain"></i> Cognitive Load</label>
                <div class="cognitive-select">
                    <button class="cog-btn cog-low ${subject.cognitiveLoad === 'low' ? 'active' : ''}" data-load="low">
                        <i class="fas fa-battery-quarter"></i> Low
                    </button>
                    <button class="cog-btn cog-med ${subject.cognitiveLoad === 'medium' ? 'active' : ''}" data-load="medium">
                        <i class="fas fa-battery-half"></i> Medium
                    </button>
                    <button class="cog-btn cog-high ${subject.cognitiveLoad === 'high' ? 'active' : ''}" data-load="high">
                        <i class="fas fa-battery-full"></i> High
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Add Subject
function addSubject() {
    subjects.push({
        name: `Subject ${subjects.length + 1}`,
        credits: 3,
        confidence: 3,
        strongAreas: "",
        weakAreas: "",
        cognitiveLoad: "medium",
        priority: subjects.length + 1
    });
    renderSubjects();
    updateProgressStep(2);
}

// Remove Subject
function removeSubject(index) {
    if (subjects.length > 1) {
        subjects.splice(index, 1);
        renderSubjects();
    }
}

// Update Confidence
function updateConfidence(index, value) {
    subjects[index].confidence = parseInt(value);
    document.getElementById(`confidenceValue-${index}`).textContent = `${value}/5`;
    
    // Update stars
    const card = document.querySelector(`.subject-card[data-index="${index}"]`);
    if (card) {
        const levelDiv = card.querySelector('.level');
        if (levelDiv) {
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<i class="fas fa-star ${i <= value ? 'fas' : 'far'}"></i>`;
            }
            levelDiv.innerHTML = starsHtml;
        }
    }
}

// Generate Schedule
async function generateSchedule() {
    // Validate inputs
    const studentName = document.getElementById('studentName').value.trim();
    if (!studentName) {
        alert('Please enter your name');
        return;
    }
    
    if (subjects.length === 0) {
        alert('Please add at least one subject');
        return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    const loadingDots = document.getElementById('loadingDots');
    const originalContent = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Generating...</span>`;
    
    // Hide placeholder, show output
    document.getElementById('outputPlaceholder').classList.add('hidden');
    document.getElementById('outputContent').classList.remove('hidden');
    
    // Collect student data
    const studentData = {
        name: studentName,
        college: document.getElementById('college').value,
        branch: document.getElementById('branch').value,
        graduationYear: parseInt(document.getElementById('graduationYear').value),
        email: document.getElementById('email').value,
        weekdayHours: parseInt(document.getElementById('weekdaySlider').value),
        weekendHours: parseInt(document.getElementById('weekendSlider').value),
        preferredTime: document.querySelector('.time-btn.active').dataset.time,
        targetDate: document.getElementById('targetDate').value,
        examDate: document.getElementById('examDate').value,
        subjects: subjects
    };
    
    try {
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate schedule
        currentSchedule = scheduleGenerator.generatePlan(studentData);
        
        // Display results
        displaySchedule(currentSchedule);
        displayBreakdown(currentSchedule.weightedSubjects);
        displayCognitiveChart(currentSchedule);
        displayInsights(currentSchedule.insights, studentData);
        displayNext7Days(currentSchedule);
        displayConfidenceCheck(currentSchedule);
        displayOutcomes(currentSchedule);
        
        // Update progress
        updateProgressStep(4);
        
        // Save to localStorage
        localStorage.setItem('subjects', JSON.stringify(subjects));
        localStorage.setItem('current_schedule', JSON.stringify(currentSchedule));
        
    } catch (error) {
        console.error('Error generating schedule:', error);
        alert('Error generating schedule. Please try again.');
    } finally {
        // Restore button state
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalContent;
    }
}

// Display Schedule
function displaySchedule(scheduleData) {
    const scheduleGrid = document.getElementById('weeklySchedule');
    const weekTitle = document.getElementById('weekTitle');
    const totalWeeksSpan = document.getElementById('totalWeeks');
    const weekProgressFill = document.getElementById('weekProgressFill');
    
    // Update week title
    const currentWeek = scheduleGenerator.currentWeek;
    const totalWeeks = scheduleData.totalWeeks;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (currentWeek - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    weekTitle.textContent = `Week ${currentWeek} (${formatDateShort(startDate)} - ${formatDateShort(endDate)})`;
    totalWeeksSpan.textContent = totalWeeks;
    
    // Update progress bar
    const progress = (currentWeek / totalWeeks) * 100;
    weekProgressFill.style.width = `${progress}%`;
    
    // Clear previous schedule
    scheduleGrid.innerHTML = '';
    
    // Generate day columns
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const daySchedule = scheduleData.weeklySchedule[day] || [];
        
        dayColumn.innerHTML = `
            <div class="day-header">${day}</div>
            ${daySchedule.map(slot => `
                <div class="study-slot slot-${slot.cognitiveLoad}" onclick="askAIAboutTopic('${slot.topic}', '${slot.subject}')" title="Click to learn more">
                    <div class="slot-time">
                        <i class="far fa-clock"></i> ${slot.time} • ${slot.duration}
                    </div>
                    <div class="slot-topic">${slot.topic}</div>
                    <div style="font-weight: 500; color: var(--primary); font-size: 0.85rem;">${slot.subject}</div>
                    <div class="slot-type type-${slot.type}">
                        ${getSlotTypeLabel(slot.type)}
                    </div>
                </div>
            `).join('')}
        `;
        
        scheduleGrid.appendChild(dayColumn);
    });
}

// Get Slot Type Label
function getSlotTypeLabel(type) {
    const labels = {
        'concept-learning': 'Concept Learning',
        'revision': 'Revision',
        'practice': 'Practice',
        'buffer': 'Buffer Time'
    };
    return labels[type] || type;
}

// Display Breakdown
function displayBreakdown(weightedSubjects) {
    const container = document.getElementById('subjectBreakdown');
    const totalWeight = weightedSubjects.reduce((sum, s) => sum + s.weight, 0);
    
    let html = '<div class="breakdown-chart">';
    
    weightedSubjects.forEach(subject => {
        const percentage = Math.round((subject.weight / totalWeight) * 100);
        const hoursPerWeek = subject.weeklyHours;
        
        // Generate justification
        let justification = [];
        if (percentage > 30) {
            justification.push('High focus due to ');
            if (subject.confidence <= 2) {
                justification.push('low confidence');
            }
            if (subject.cognitiveLoad === 'high') {
                if (justification.length > 1) justification.push(' and ');
                justification.push('high cognitive load');
            }
            if (subject.credits >= 4) {
                if (justification.length > 1) justification.push(' and ');
                justification.push('high credits');
            }
        } else {
            justification.push('Moderate focus for ');
            if (subject.confidence >= 4) {
                justification.push('high confidence');
            } else {
                justification.push('balanced study time');
            }
        }
        
        html += `
            <div class="breakdown-item fade-in">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 600;">${subject.name}</span>
                    <span style="color: var(--primary); font-weight: 700;">${percentage}% • ${hoursPerWeek}h/week</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background: var(--gradient-primary);"></div>
                </div>
                <div class="justification">
                    <i class="fas fa-info-circle"></i>
                    <span>${justification.join('')}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Display Cognitive Chart
function displayCognitiveChart(scheduleData) {
    const container = document.getElementById('cognitiveChart');
    
    // Calculate cognitive load distribution
    const cognitiveDistribution = {
        high: 0,
        medium: 0,
        low: 0
    };
    
    Object.values(scheduleData.weeklySchedule).forEach(daySchedule => {
        daySchedule.forEach(slot => {
            if (slot.subject !== 'Buffer Time') {
                cognitiveDistribution[slot.cognitiveLoad] += parseInt(slot.duration);
            }
        });
    });
    
    const totalHours = cognitiveDistribution.high + cognitiveDistribution.medium + cognitiveDistribution.low;
    
    container.innerHTML = `
        <div class="cognitive-item high fade-in">
            <div class="hours">${cognitiveDistribution.high}h</div>
            <div class="label">High Focus</div>
            <div class="bar">
                <div class="bar-fill" style="width: ${totalHours ? (cognitiveDistribution.high / totalHours * 100) : 0}%"></div>
            </div>
        </div>
        <div class="cognitive-item medium fade-in">
            <div class="hours">${cognitiveDistribution.medium}h</div>
            <div class="label">Medium Focus</div>
            <div class="bar">
                <div class="bar-fill" style="width: ${totalHours ? (cognitiveDistribution.medium / totalHours * 100) : 0}%"></div>
            </div>
        </div>
        <div class="cognitive-item low fade-in">
            <div class="hours">${cognitiveDistribution.low}h</div>
            <div class="label">Low Focus</div>
            <div class="bar">
                <div class="bar-fill" style="width: ${totalHours ? (cognitiveDistribution.low / totalHours * 100) : 0}%"></div>
            </div>
        </div>
    `;
}

// Display Insights
function displayInsights(insights, studentData) {
    // Priority Focus
    const priorityContainer = document.getElementById('priorityFocus');
    if (insights.priorityFocus.length > 0) {
        priorityContainer.innerHTML = insights.priorityFocus.map(item => `
            <div class="action-item fade-in">
                <div class="action-icon ${item.urgency === 'high' ? 'icon-danger' : 'icon-warning'}">
                    <i class="fas fa-bullseye"></i>
                </div>
                <div>
                    <strong>${item.subject}: ${item.topic}</strong>
                    <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">
                        ${item.reason} • ${item.urgency === 'high' ? 'High Priority' : 'Medium Priority'}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        priorityContainer.innerHTML = `
            <div class="action-item">
                <div class="action-icon icon-success">
                    <i class="fas fa-check"></i>
                </div>
                <div>
                    <strong>All subjects on track!</strong>
                    <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">
                        Great confidence levels across all subjects
                    </div>
                </div>
            </div>
        `;
    }
    
    // Prerequisite Checks
    const prereqContainer = document.getElementById('prerequisiteChecks');
    prereqContainer.innerHTML = insights.prerequisites.map(item => `
        <div class="action-item fade-in">
            <div class="action-icon ${item.icon === 'check' ? 'icon-success' : 'icon-warning'}">
                <i class="fas fa-${item.icon}"></i>
            </div>
            <div>
                <strong>${item.status === 'complete' ? '✓ Ready:' : '⚠ Review:'}</strong> ${item.check}
            </div>
        </div>
    `).join('');
    
    // Adaptation Suggestions
    const adaptContainer = document.getElementById('adaptationSuggestions');
    adaptContainer.innerHTML = insights.adaptations.map(item => `
        <div class="action-item fade-in">
            <div class="action-icon icon-success">
                <i class="fas fa-sync-alt"></i>
            </            <div>
                ${item.suggestion}
                <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">
                    ${item.condition} • ${item.impact} Impact
                </div>
            </div>
        </div>
    `).join('');
    
    // Today's To-Do
    const todoContainer = document.getElementById('todaysTodo');
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySchedule = currentSchedule?.weeklySchedule[today] || [];
    
    if (todaySchedule.length > 0) {
        todoContainer.innerHTML = todaySchedule.map(slot => `
            <div class="action-item fade-in">
                <div class="action-icon ${slot.priority === 'high' ? 'icon-danger' : 'icon-success'}">
                    <i class="fas fa-tasks"></i>
                </div>
                <div>
                    <strong>${slot.time}: ${slot.topic}</strong>
                    <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">
                        ${slot.subject} • ${slot.duration} • ${slot.priority === 'high' ? 'High Priority' : 'Regular'}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        todoContainer.innerHTML = `
            <div class="action-item">
                <div class="action-icon icon-success">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div>
                    <strong>No scheduled study sessions today</strong>
                    <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 4px;">
                        Use this time for revision or relaxation
                    </div>
                </div>
            </div>
        `;
    }
}

// Display Next 7 Days
function displayNext7Days(scheduleData) {
    const container = document.getElementById('next7DaysFocus');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date().getDay();
    const adjustedDays = [];
    
    // Reorder days starting from today
    for (let i = 0; i < 7; i++) {
        const dayIndex = (today + i) % 7;
        adjustedDays.push(days[dayIndex]);
    }
    
    let html = '<div class="next-steps-list">';
    
    adjustedDays.forEach((day, index) => {
        const daySchedule = scheduleData.weeklySchedule[day] || [];
        const mainTopic = daySchedule.find(s => s.subject !== 'Buffer Time');
        
        if (mainTopic) {
            html += `
                <div class="next-step-item fade-in">
                    <span class="step-day">Day ${index + 1}</span>
                    <div class="step-content">
                        <div class="step-topic">${mainTopic.topic} (${mainTopic.subject})</div>
                        <div class="step-reason">${getSlotTypeLabel(mainTopic.type)} • ${mainTopic.duration} • ${mainTopic.cognitiveLoad} focus</div>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Display Confidence Check
function displayConfidenceCheck(scheduleData) {
    const container = document.getElementById('confidenceCheck');
    
    let html = '<div class="confidence-check">';
    
    scheduleData.weightedSubjects.forEach(subject => {
        const improvement = Math.min(5, subject.confidence + 2);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="fas fa-star ${i <= subject.confidence ? 'fas' : 'far'}"></i>`;
        }
        
        html += `
            <div class="confidence-item fade-in">
                <div class="subject">${subject.name}</div>
                <div class="level">${starsHtml}</div>
                <div class="improvement">↑ Expected: ${improvement}/5</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Display Outcomes
function displayOutcomes(outcomes) {
    const container = document.getElementById('expectedOutcomes');
    
    let html = `
        <div class="outcome-grid">
            <div class="outcome-card fade-in">
                <i class="fas fa-clock"></i>
                <div class="outcome-value">${outcomes.totalHours}h</div>
                <p>Total Study Hours</p>
            </div>
            
            <div class="outcome-card fade-in">
                <i class="fas fa-calendar-alt"></i>
                <div class="outcome-value">${outcomes.totalWeeks}</div>
                <p>Weeks Until Target</p>
            </div>
            
            <div class="outcome-card fade-in">
                <i class="fas fa-brain"></i>
                <div class="outcome-value">70%</div>
                <p>Less Cramming</p>
            </div>
            
            <div class="outcome-card fade-in">
                <i class="fas fa-chart-line"></i>
                <div class="outcome-value">45%</div>
                <p>Better Retention</p>
            </div>
        </div>
        
        <div class="confidence-improvements">
            <h4><i class="fas fa-arrow-up"></i> Expected Confidence Improvements:</h4>
            <div class="improvement-grid">
    `;
    
    outcomes.confidenceImprovements.forEach(improvement => {
        html += `
            <div class="improvement-item fade-in">
                <div class="subject">${improvement.subject}</div>
                <div class="levels">
                    <span class="current">${improvement.current}/5 →</span>
                    <span class="target">${improvement.target}/5</span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <div class="key-benefits fade-in">
            <h4><i class="fas fa-trophy"></i> Key Benefits</h4>
            <div class="benefits-grid">
                <div class="benefit-item">
                    <i class="fas fa-brain"></i>
                    <strong>Balanced Cognitive Load</strong>
                    <p>Prevents burnout by distributing difficult topics</p>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-check-double"></i>
                    <strong>Prerequisite Mastery</strong>
                    <p>Ensures foundation before advanced topics</p>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-sync"></i>
                    <strong>Continuous Adaptation</strong>
                    <p>Schedule evolves with your progress</p>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-clock"></i>
                    <strong>Time Optimization</strong>
                    <p>Maximum output with minimum stress</p>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Change Week
function changeWeek(delta) {
    scheduleGenerator.currentWeek = Math.max(1, Math.min(scheduleGenerator.totalWeeks, scheduleGenerator.currentWeek + delta));
    
    if (currentSchedule) {
        const studentData = {
            subjects: subjects,
            weekdayHours: parseInt(document.getElementById('weekdaySlider').value),
            weekendHours: parseInt(document.getElementById('weekendSlider').value),
            preferredTime: document.querySelector('.time-btn.active').dataset.time,
            targetDate: document.getElementById('targetDate').value
        };
        
        const newSchedule = scheduleGenerator.generatePlan(studentData);
        displaySchedule(newSchedule);
        displayInsights(newSchedule.insights, studentData);
    }
}

// Navigate Week
function navigateWeek(direction) {
    changeWeek(direction === 'next' ? 1 : -1);
}

// Show Schedule View
function showScheduleView(view) {
    currentView = view;
    
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update views
    document.querySelectorAll('.schedule-view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(`${view}View`).classList.add('active');
}

// Format Date Short
function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format Date Full
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Update Timestamp
function updateTimestamp() {
    const now = new Date();
    document.getElementById('currentTimestamp').textContent = now.toLocaleString();
}

// Export Functions
function exportToPDF() {
    window.print();
}

function exportToCalendar() {
    alert('Calendar export feature coming soon! For now, use Export PDF.');
}

function shareSchedule() {
    if (navigator.share) {
        navigator.share({
            title: 'AI Study Planner Schedule',
            text: 'Check out my personalized study schedule!',
            url: window.location.href
        });
    } else {
        // Copy to clipboard
        const scheduleText = currentSchedule ? JSON.stringify(currentSchedule, null, 2) : '';
        navigator.clipboard.writeText(scheduleText).then(() => {
            alert('Schedule copied to clipboard!');
        });
    }
}

function downloadSchedule() {
    if (!currentSchedule) {
        alert('Please generate a schedule first.');
        return;
    }
    
    const dataStr = JSON.stringify(currentSchedule, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'study-schedule.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Reset Data
function resetData() {
    if (confirm('Are you sure you want to reset all data?')) {
        localStorage.removeItem('subjects');
        localStorage.removeItem('current_schedule');
        localStorage.removeItem('theme');
        location.reload();
    }
}

// Show API Config Modal
function showApiConfig() {
    document.getElementById('apiModal').classList.add('active');
}

// Close API Config Modal
function closeApiModal() {
    document.getElementById('apiModal').classList.remove('active');
}

// Save API Key
function saveApiKey() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        if (typeof geminiAssistant !== 'undefined' && geminiAssistant) {
            geminiAssistant.apiKey = apiKey;
        }
        alert('API key saved successfully!');
        closeApiModal();
    } else {
        alert('Please enter a valid API key');
    }
}

// Ask AI About Topic
function askAIAboutTopic(topic, subject) {
    if (typeof geminiAssistant !== 'undefined' && geminiAssistant && geminiAssistant.apiKey) {
        const chatbox = document.getElementById('aiChatbox');
        if (!chatbox.classList.contains('active')) {
            document.getElementById('aiToggle').click();
        }
        
        const inputField = document.getElementById('aiInput');
        inputField.value = `Can you explain ${topic} in ${subject} for engineering students? Include key concepts, examples, and study tips.`;
        inputField.focus();
        
        setTimeout(() => {
            geminiAssistant.sendMessage();
        }, 500);
    } else {
        showApiConfig();
    }
}
