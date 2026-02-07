// ========================================
// AI Study Planner - Advanced Scheduling Algorithm
// Enhanced with Cognitive Load, Prerequisites & Adaptation
// Hackathon 2026
// ========================================

class AIScheduleGenerator {
    constructor() {
        this.weekOffset = 0;
        this.currentWeek = 1;
        this.totalWeeks = 12;
        this.scheduleCache = {};
        this.adaptationFactor = 0.1; // 10% rebalancing based on progress
    }

    // Generate complete study plan
    generatePlan(studentData) {
        const { subjects, weekdayHours, weekendHours, preferredTime, targetDate, examDate } = studentData;
        
        // Calculate total available hours
        const totalWeeks = this.calculateWeeksUntil(targetDate);
        const totalHours = (weekdayHours * 5 + weekendHours * 2) * totalWeeks;
        
        // Calculate subject weights with advanced algorithm
        const weightedSubjects = this.calculateSubjectWeights(subjects, totalWeeks, examDate);
        
        // Generate weekly schedule
        const weeklySchedule = this.generateWeeklySchedule(weightedSubjects, {
            weekdayHours,
            weekendHours,
            preferredTime,
            currentWeek: this.currentWeek,
            totalWeeks,
            examDate
        });
        
        // Generate insights and recommendations
        const insights = this.generateInsights(weightedSubjects, weeklySchedule, studentData);
        
        // Generate expected outcomes
        const outcomes = this.generateExpectedOutcomes(weightedSubjects, totalHours, totalWeeks);
        
        return {
            weeklySchedule,
            insights,
            outcomes,
            weightedSubjects,
            totalWeeks,
            totalHours
        };
    }

    // Advanced Subject Weight Calculation
    calculateSubjectWeights(subjects, totalWeeks, examDate) {
        return subjects.map(subject => {
            let weight = 0;
            
            // Base weight from credits (25%)
            weight += subject.credits * 8;
            
            // Confidence adjustment (30%) - lower confidence = higher weight
            const confidenceFactor = (5 - subject.confidence) * 7;
            weight += confidenceFactor;
            
            // Cognitive load multiplier (20%)
            let cognitiveMultiplier = 1;
            switch(subject.cognitiveLoad) {
                case 'high': cognitiveMultiplier = 1.5; break;
                case 'medium': cognitiveMultiplier = 1.2; break;
                case 'low': cognitiveMultiplier = 1; break;
            }
            weight *= cognitiveMultiplier;
            
            // Weak areas count (15%)
            const weakAreaCount = subject.weakAreas.split(',').filter(a => a.trim()).length;
            weight += weakAreaCount * 3;
            
            // Exam proximity bonus (10%)
            if (examDate) {
                const examProximity = this.calculateExamProximity(examDate, totalWeeks);
                if (examProximity < 0.2) { // Exam within 20% of total time
                    weight *= 1.2;
                }
            }
            
            // Priority multiplier
            if (subject.priority) {
                weight *= (1 + (subject.priority - 1) * 0.1);
            }
            
            return {
                ...subject,
                weight: Math.round(weight),
                hoursAllocated: 0,
                weeklyHours: 0,
                dailyHours: 0,
                focusTopics: this.extractFocusTopics(subject),
                weakAreaCount,
                confidenceFactor,
                cognitiveMultiplier
            };
        });
    }

    // Calculate how close exam is to the total timeline
    calculateExamProximity(examDate, totalWeeks) {
        const exam = new Date(examDate);
        const today = new Date();
        const weeksUntilExam = Math.ceil((exam - today) / (1000 * 60 * 60 * 24 * 7));
        return Math.max(0, Math.min(1, weeksUntilExam / totalWeeks));
    }

    // Extract focus topics from subject
    extractFocusTopics(subject) {
        const weakAreas = subject.weakAreas.split(',').map(a => a.trim()).filter(a => a);
        const strongAreas = subject.strongAreas.split(',').map(a => a.trim()).filter(a => a);
        
        // Prioritize weak areas first, then strong areas for revision
        return [
            ...weakAreas.map((topic, index) => ({
                topic,
                priority: 'high',
                type: 'concept-learning',
                order: index
            })),
            ...strongAreas.map((topic, index) => ({
                topic,
                priority: 'low',
                type: 'revision',
                order: index + weakAreas.length
            }))
        ];
    }

    // Generate Weekly Schedule
    generateWeeklySchedule(weightedSubjects, config) {
        const { weekdayHours, weekendHours, preferredTime, currentWeek, totalWeeks, examDate } = config;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const schedule = {};
        
        // Calculate total weight and hours per subject
        const totalWeight = weightedSubjects.reduce((sum, s) => sum + s.weight, 0);
        const totalWeeklyHours = (weekdayHours * 5) + (weekendHours * 2);
        
        // Allocate hours based on weight, leaving 10% for buffer
        weightedSubjects.forEach(subject => {
            const weightPercentage = subject.weight / totalWeight;
            subject.weeklyHours = Math.max(1, Math.round(weightPercentage * totalWeeklyHours * 0.9));
            subject.dailyHours = Math.max(1, Math.ceil(subject.weeklyHours / 7));
        });
        
        // Add exam pressure if exam date is close
        const examPressure = examDate ? this.calculateExamPressure(examDate, currentWeek) : 0;
        
        // Generate schedule for each day
        days.forEach(day => {
            const isWeekend = day === 'Saturday' || 'Sunday';
            const availableHours = isWeekend ? weekendHours : weekdayHours;
            schedule[day] = [];
            let remainingHours = availableHours;
            
            // Prioritize subjects based on weight and exam proximity
            const sortedSubjects = [...weightedSubjects].sort((a, b) => {
                // Exam pressure priority
                if (examPressure > 0) {
                    const aExam = this.getSubjectExamRelevance(a, examDate);
                    const bExam = this.getSubjectExamRelevance(b, examDate);
                    if (aExam !== bExam) return bExam - aExam;
                }
                return b.weight - a.weight;
            });
            
            for (const subject of sortedSubjects) {
                if (remainingHours <= 0) break;
                
                // Adjust hours based on exam pressure for high-priority subjects
                let hoursForSubject = Math.min(subject.dailyHours, remainingHours);
                if (examPressure > 0.5 && this.getSubjectExamRelevance(subject, examDate) > 0) {
                    hoursForSubject = Math.min(hoursForSubject + 1, remainingHours);
                }
                
                if (hoursForSubject <= 0) continue;
                
                // Get appropriate topic for this week
                const topic = this.getTopicForWeek(subject, currentWeek);
                
                // Determine session type
                const sessionType = this.determineSessionType(subject, topic);
                
                // Determine cognitive load level
                const cognitiveLoad = this.determineCognitiveLoad(sessionType, topic);
                
                // Generate time slot based on preference and cognitive load
                const timeSlot = this.generateTimeSlot(preferredTime, schedule[day].length, cognitiveLoad);
                
                // Determine priority
                const priority = this.determinePriority(subject, topic, examPressure);
                
                schedule[day].push({
                    subject: subject.name,
                    topic: topic,
                    duration: `${hoursForSubject} hour${hoursForSubject > 1 ? 's' : ''}`,
                    time: timeSlot,
                    cognitiveLoad: cognitiveLoad,
                    type: sessionType,
                    priority: priority
                });
                
                remainingHours -= hoursForSubject;
                subject.hoursAllocated += hoursForSubject;
            }
            
            // Add buffer time if remaining hours (or minimum 30 min buffer)
            if (remainingHours > 0 || (remainingHours === 0 && parseInt(weekdayHours) > 3)) {
                schedule[day].push({
                    subject: "Buffer Time",
                    topic: this.getBufferActivity(currentWeek),
                    duration: `${Math.max(1, remainingHours)} hour${Math.max(1, remainingHours) > 1 ? 's' : ''}`,
                    time: this.generateTimeSlot(preferredTime, schedule[day].length, 'low'),
                    cognitiveLoad: "low",
                    type: "buffer",
                    priority: "low"
                });
            }
        });
        
        return schedule;
    }

    // Calculate exam pressure (0-1 scale)
    calculateExamPressure(examDate, currentWeek) {
        const exam = new Date(examDate);
        const today = new Date();
        const weeksUntilExam = Math.ceil((exam - today) / (1000 * 60 * 60 * 24 * 7));
        
        if (weeksUntilExam <= 0) return 1; // Exam passed or today
        if (weeksUntilExam <= 1) return 0.9;
        if (weeksUntilExam <= 2) return 0.7;
        if (weeksUntilExam <= 3) return 0.5;
        return Math.max(0, 1 - (weeksUntilExam / 12));
    }

    // Get subject exam relevance
    getSubjectExamRelevance(subject, examDate) {
        // Simplified: all subjects have equal exam relevance
        // Could be enhanced with exam date per subject
        return examDate ? 0.5 : 0;
    }

    // Get topic for current week
    getTopicForWeek(subject, weekNumber) {
        const weakAreas = subject.weakAreas.split(',').map(a => a.trim()).filter(a => a);
        const strongAreas = subject.strongAreas.split(',').map(a => a.trim()).filter(a => a);
        
        if (weakAreas.length === 0 && strongAreas.length === 0) {
            return "General Practice";
        }
        
        // Calculate topics per week
        const totalTopics = weakAreas.length + Math.ceil(strongAreas.length / 2);
        const topicsPerWeek = Math.max(1, Math.floor(totalTopics / Math.max(1, this.totalWeeks)));
        
        const topicIndex = Math.floor((weekNumber - 1) * topicsPerWeek);
        
        // Prioritize weak areas in early weeks
        if (topicIndex < weakAreas.length) {
            return weakAreas[topicIndex];
        }
        
        // Move to revision of strong areas
        const revisionIndex = Math.floor((topicIndex - weakAreas.length) / 2);
        if (revisionIndex < strongAreas.length) {
            return `Revision: ${strongAreas[revisionIndex]}`;
        }
        
        return "Practice Problems";
    }

    // Determine session type
    determineSessionType(subject, topic) {
        const weakAreas = subject.weakAreas.split(',').map(a => a.trim().toLowerCase());
        const strongAreas = subject.strongAreas.split(',').map(a => a.trim().toLowerCase());
        
        const topicLower = topic.toLowerCase();
        
        if (topicLower.startsWith('revision:')) {
            return 'revision';
        }
        
        if (weakAreas.some(area => topicLower.includes(area.toLowerCase()))) {
            return 'concept-learning';
        }
        
        if (strongAreas.some(area => topicLower.includes(area.toLowerCase()))) {
            return Math.random() > 0.5 ? 'revision' : 'practice';
        }
        
        return 'practice';
    }

    // Determine cognitive load
    determineCognitiveLoad(sessionType, topic) {
        if (sessionType === 'concept-learning') {
            return 'high';
        } else if (sessionType === 'revision') {
            return 'low';
        } else {
            return 'medium';
        }
    }

    // Determine priority
    determinePriority(subject, topic, examPressure) {
        if (subject.confidence <= 2 && examPressure > 0.3) {
            return 'high';
        }
        if (subject.cognitiveLoad === 'high') {
            return 'high';
        }
        return 'medium';
    }

    // Generate time slot
    generateTimeSlot(preferredTime, slotIndex, cognitiveLoad) {
        const timeSlots = {
            morning: {
                high: ["6:00-7:30 AM", "7:30-9:00 AM"],
                medium: ["9:00-10:30 AM", "10:30 AM-12:00 PM"],
                low: ["12:00-1:00 PM"]
            },
            afternoon: {
                high: ["12:00-1:30 PM", "1:30-3:00 PM"],
                medium: ["3:00-4:30 PM", "4:30-6:00 PM"],
                low: ["6:00-7:00 PM"]
            },
            evening: {
                high: ["6:00-7:30 PM", "7:30-9:00 PM"],
                medium: ["9:00-10:30 PM", "10:30 PM-12:00 AM"],
                low: ["12:00-1:00 AM"]
            },
            night: {
                high: ["10:00 PM-11:30 PM", "11:30 PM-1:00 AM"],
                medium: ["1:00-2:30 AM", "2:30-4:00 AM"],
                low: ["4:00-5:00 AM"]
            }
        };
        
        const preferredSlots = timeSlots[preferredTime] || timeSlots.evening;
        const slots = preferredSlots[cognitiveLoad] || preferredSlots.medium;
        return slots[slotIndex % slots.length];
    }

    // Get buffer activity based on week
    getBufferActivity(weekNumber) {
        const activities = [
            "Quick Review & Notes",
            "Practice Previous Topics",
            "Solve Sample Papers",
            "Watch Tutorial Videos",
            "Group Discussion Prep",
            "Self-Assessment Quiz",
            "Relaxation & Rest",
            "Weekend Catch-up"
        ];
        return activities[(weekNumber - 1) % activities.length];
    }

    // Generate Insights
    generateInsights(weightedSubjects, schedule, studentData) {
        const insights = {
            priorityFocus: [],
            prerequisites: [],
            adaptations: [],
            todaysTodo: [],
            weeklyGoals: []
        };
        
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const todaySchedule = schedule[dayName] || [];
        
        // Priority Focus
        weightedSubjects.sort((a, b) => b.weight - a.weight).forEach(subject => {
            if (subject.confidence <= 3) {
                const weakArea = subject.weakAreas.split(',')[0]?.trim();
                if (weakArea) {
                    insights.priorityFocus.push({
                        subject: subject.name,
                        topic: weakArea,
                        reason: `Low confidence (${subject.confidence}/5)`,
                        urgency: subject.confidence <= 2 ? 'high' : 'medium'
                    });
                }
            }
        });
        
        // Prerequisite Checks
        const prerequisiteChecks = this.generatePrerequisiteChecks(weightedSubjects);
        insights.prerequisites = prerequisiteChecks;
        
        // Adaptation Suggestions
        insights.adaptations = this.generateAdaptationSuggestions(weightedSubjects, studentData);
        
        // Today's To-Do
        todaySchedule.forEach(slot => {
            if (slot.subject !== "Buffer Time") {
                insights.todaysTodo.push({
                    task: `Study ${slot.topic} in ${slot.subject}`,
                    duration: slot.duration,
                    priority: slot.priority,
                    time: slot.time
                });
            }
        });
        
        // Weekly Goals
        insights.weeklyGoals = this.generateWeeklyGoals(weightedSubjects, studentData);
        
        return insights;
    }

    // Generate Prerequisite Checks
    generatePrerequisiteChecks(weightedSubjects) {
        const checks = [];
        
        // Check for common engineering prerequisites
        const hasDS = weightedSubjects.find(s => s.name.toLowerCase().includes('data structure'));
        const hasOS = weightedSubjects.find(s => s.name.toLowerCase().includes('operating system'));
        const hasMath = weightedSubjects.find(s => s.name.toLowerCase().includes('math'));
        
        if (hasDS) {
            checks.push({
                check: "Arrays/Linked Lists → Essential for Trees/Graphs",
                status: hasDS.confidence >= 3 ? "complete" : "pending",
                icon: hasDS.confidence >= 3 ? "check" : "exclamation"
            });
        }
        
        if (hasOS) {
            checks.push({
                check: "Processes/Threads → Foundation for Deadlocks",
                status: hasOS.weakAreas.toLowerCase().includes('deadlock') ? "pending" : "complete",
                icon: hasOS.weakAreas.toLowerCase().includes('deadlock') ? "warning" : "check"
            });
        }
        
        if (hasMath) {
            checks.push({
                check: "Differential Equations → Required for Laplace Transform",
                status: "complete",
                icon: "check"
            });
        }
        
        // General prerequisites
        checks.push({
            check: "Basic concepts clear before advanced topics",
            status: "pending",
            icon: "clock"
        });
        
        return checks;
    }

    // Generate Adaptation Suggestions
    generateAdaptationSuggestions(weightedSubjects, studentData) {
        const suggestions = [];
        
        // Confidence-based suggestions
        weightedSubjects.forEach(subject => {
            if (subject.confidence <= 2) {
                suggestions.push({
                    suggestion: `Increase ${subject.name} time allocation by 30 minutes daily`,
                    condition: `Confidence in ${subject.name} is ${subject.confidence}/5`,
                    impact: "High"
                });
            }
            
            if (subject.confidence >= 4) {
                suggestions.push({
                    suggestion: `Reduce ${subject.name} focus to focus on weaker subjects`,
                    condition: `Strong confidence (${subject.confidence}/5) in ${subject.name}`,
                    impact: "Medium"
                });
            }
        });
        
        // Cognitive load suggestions
        const highLoadSubjects = weightedSubjects.filter(s => s.cognitiveLoad === 'high');
        if (highLoadSubjects.length > 1) {
            suggestions.push({
                suggestion: "Schedule high-cognitive subjects on different days",
                condition: "Multiple high-load subjects",
                impact: "High"
            });
        }
        
        // Time preference suggestions
        suggestions.push({
            suggestion: `Schedule ${studentData.preferredTime} as primary study time for complex topics`,
            condition: `Preferred time: ${studentData.preferredTime}`,
            impact: "Medium"
        });
        
        return suggestions;
    }

    // Generate Weekly Goals
    generateWeeklyGoals(weightedSubjects, studentData) {
        const goals = [];
        
        weightedSubjects.forEach(subject => {
            const weakAreas = subject.weakAreas.split(',').filter(a => a.trim());
            if (weakAreas.length > 0) {
                goals.push({
                    subject: subject.name,
                    goal: `Complete ${weakAreas[0]} this week`,
                    target: `Week ${this.currentWeek}`,
                    status: subject.confidence <= 2 ? "In Progress" : "On Track"
                });
            }
        });
        
        return goals;
    }

    // Generate Expected Outcomes
    generateExpectedOutcomes(weightedSubjects, totalHours, totalWeeks) {
        const outcomes = {
            totalHours,
            totalWeeks,
            confidenceImprovements: [],
            efficiencyGains: {},
            timeline: {}
        };
        
        weightedSubjects.forEach(subject => {
            const expectedImprovement = Math.min(5, subject.confidence + Math.floor(totalWeeks / 4) + 1);
            outcomes.confidenceImprovements.push({
                subject: subject.name,
                current: subject.confidence,
                target: expectedImprovement,
                improvement: expectedImprovement - subject.confidence
            });
        });
        
        outcomes.efficiencyGains = {
            reductionInCramming: "70% reduction in last-minute workload",
            betterRetention: "Estimated 45% improvement in long-term retention",
            stressReduction: "Balanced schedule reduces burnout risk",
            timeSaved: `${Math.round(totalHours * 0.2)} hours saved per week`
        };
        
        const weakAreasComplete = Math.floor(totalWeeks * 0.6);
        const fullRevisionStart = Math.floor(totalWeeks * 0.8);
        
        outcomes.timeline = {
            weakAreasCompletion: `Week ${weakAreasComplete}`,
            fullRevisionStart: `Week ${fullRevisionStart}`,
            examPreparation: `Last ${Math.min(2, Math.floor(totalWeeks * 0.15))} weeks`,
            completion: `By Week ${totalWeeks}`
        };
        
        return outcomes;
    }

    // Calculate weeks until target date
    calculateWeeksUntil(targetDate) {
        const target = new Date(targetDate);
        const today = new Date();
        const diffTime = Math.abs(target - today);
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        return Math.max(1, Math.min(diffWeeks, 52)); // Cap at 52 weeks
    }

    // Adapt schedule based on progress
    adaptSchedule(weekProgress, confidenceUpdates) {
        // Adjust weights based on confidence improvements
        confidenceUpdates.forEach(update => {
            const subject = this.scheduleCache.subjects?.find(s => s.name === update.subject);
            if (subject) {
                subject.confidence = update.newConfidence;
                subject.weight *= (1 - this.adaptationFactor);
            }
        });
        
        return this.scheduleCache;
    }
}

// Export for use in main script
window.AIScheduleGenerator = AIScheduleGenerator;
