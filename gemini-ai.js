// Gemini AI Integration for Study Assistant
class GeminiAIAssistant {
    constructor() {
        // Force set the API key (always override)
        const newApiKey = 'AIzaSyAbl9SHPIQhXb37iioECkQ0uLSsSRlsQOk';
        localStorage.setItem('gemini_api_key', newApiKey);
        this.apiKey = newApiKey;
        this.chatHistory = [];
        this.isLoading = false;
        this.initializeEventListeners();
        console.log('✅ Gemini API Key loaded:', this.apiKey);
    }

    initializeEventListeners() {
        const toggleBtn = document.getElementById('aiToggle');
        const closeBtn = document.getElementById('aiClose');
        const sendBtn = document.getElementById('aiSend');
        const inputField = document.getElementById('aiInput');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleChat());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeChat());
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        
        if (inputField) {
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        const savedHistory = localStorage.getItem('ai_chat_history');
        if (savedHistory) {
            this.chatHistory = JSON.parse(savedHistory);
            this.renderChatHistory();
        }
    }

    toggleChat() {
        const chatbox = document.getElementById('aiChatbox');
        if (chatbox) {
            chatbox.classList.toggle('active');
            if (chatbox.classList.contains('active')) {
                document.getElementById('aiInput').focus();
            }
        }
    }

    closeChat() {
        const chatbox = document.getElementById('aiChatbox');
        if (chatbox) chatbox.classList.remove('active');
    }

    async sendMessage() {
        const inputField = document.getElementById('aiInput');
        if (!inputField) return;
        const message = inputField.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        inputField.value = '';
        
        if (!this.apiKey) {
            this.showApiKeyWarning();
            return;
        }

        this.showTypingIndicator();
        
        try {
            const response = await this.callGeminiAPI(message);
            this.addMessage(response, 'bot');
        } catch (error) {
            console.error('Gemini API Error:', error);
            let errorMessage = 'I encountered an error. ';
            
            if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage += 'Your API key may be invalid or expired. Please check your Gemini API key.';
            } else if (error.message.includes('429')) {
                errorMessage += 'Too many requests. Please wait a moment and try again.';
            } else if (error.message.includes('fetch') || error.message.includes('Network')) {
                errorMessage += 'Network error. Please check your internet connection.';
            } else {
                errorMessage += 'Please check your API key and try again.';
            }
            
            this.addMessage(errorMessage, 'bot');
        } finally {
            this.hideTypingIndicator();
        }
    }

    async callGeminiAPI(message) {
        if (!this.apiKey) throw new Error('API key not configured');

        const conversationHistory = this.chatHistory.slice(-5).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        conversationHistory.push({ role: 'user', parts: [{ text: message }] });

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: conversationHistory,
                    generationConfig: { temperature: 0.7, topK: 1, topP: 0.95, maxOutputTokens: 1024 }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error:', errorData);
                throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let aiResponse = data.candidates[0].content.parts[0].text;
                aiResponse = this.formatResponse(aiResponse);
                
                this.chatHistory.push({ role: 'user', content: message });
                this.chatHistory.push({ role: 'bot', content: aiResponse });
                
                if (this.chatHistory.length > 20) {
                    this.chatHistory = this.chatHistory.slice(-20);
                }
                
                localStorage.setItem('ai_chat_history', JSON.stringify(this.chatHistory));
                return aiResponse;
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
        } catch (error) {
            console.error('Gemini API call failed:', error);
            throw error;
        }
    }

    formatResponse(text) {
        const lines = text.split('\n');
        let formatted = '';
        for (let line of lines) {
            if (line.trim().match(/^[•\-*]\s/)) {
                line = `• ${line.trim().substring(1).trim()}`;
            }
            if (line.trim().match(/^#+\s/)) {
                const level = line.match(/^#+/)[0].length;
                line = `<strong>${line.replace(/^#+\s/, '')}</strong>`;
            }
            formatted += line + '<br>';
        }
        return formatted;
    }

    addMessage(content, sender) {
        const messagesDiv = document.getElementById('aiMessages');
        if (!messagesDiv) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="avatar"><i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i></div>
            <div class="message-content"><p>${content}</p><small style="color: #666;">${timestamp}</small></div>
        `;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    showTypingIndicator() {
        const messagesDiv = document.getElementById('aiMessages');
        if (!messagesDiv) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-bot';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content"><div class="typing"><span></span><span></span><span></span></div></div>
        `;
        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    hideTypingIndicator() {
        const typingDiv = document.getElementById('typingIndicator');
        if (typingDiv) typingDiv.remove();
    }

    showApiKeyWarning() {
        this.addMessage('Please configure your Gemini API key first. Click the link in the footer to set it up.', 'bot');
        setTimeout(() => { if (typeof showApiConfig === 'function') showApiConfig(); }, 1000);
    }

    renderChatHistory() {
        const messagesDiv = document.getElementById('aiMessages');
        if (!messagesDiv) return;
        messagesDiv.innerHTML = '';
        const initialMessage = document.querySelector('.ai-message.ai-bot');
        if (initialMessage) messagesDiv.appendChild(initialMessage.cloneNode(true));
        this.chatHistory.forEach(msg => { this.addMessage(msg.content, msg.role); });
    }

    getStudyContext() {
        try {
            const subjects = JSON.parse(localStorage.getItem('subjects')) || [];
            const schedule = JSON.parse(localStorage.getItem('current_schedule')) || {};
            
            let context = "The student is studying: ";
            subjects.forEach((subject, index) => {
                context += `${subject.name} (Confidence: ${subject.confidence}/5, Weak Areas: ${subject.weakAreas})`;
                if (index < subjects.length - 1) context += ", ";
            });
            
            if (Object.keys(schedule).length > 0) {
                context += " Current focus topics: ";
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                if (schedule[today]) {
                    schedule[today].forEach(slot => {
                        context += `${slot.topic} in ${slot.subject}, `;
                    });
                }
            }
            return context;
        } catch (error) {
            console.error('Error getting study context:', error);
            return "Student is using an AI study planner for engineering subjects.";
        }
    }
}

let geminiAssistant;

document.addEventListener('DOMContentLoaded', () => {
    geminiAssistant = new GeminiAIAssistant();
});

function showApiConfig() {
    document.getElementById('apiModal').classList.add('active');
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && document.getElementById('geminiApiKey')) {
        document.getElementById('geminiApiKey').value = savedKey;
    }
}

function closeApiModal() {
    document.getElementById('apiModal').classList.remove('active');
}

function saveApiKey() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        if (geminiAssistant) geminiAssistant.apiKey = apiKey;
        alert('API key saved successfully!');
        closeApiModal();
    } else {
        alert('Please enter a valid API key');
    }
}

function askAIAboutTopic(topic, subject) {
    if (!geminiAssistant || !geminiAssistant.apiKey) {
        showApiConfig();
        return;
    }
    
    const chatbox = document.getElementById('aiChatbox');
    if (chatbox && !chatbox.classList.contains('active')) {
        document.getElementById('aiToggle').click();
    }
    
    const inputField = document.getElementById('aiInput');
    inputField.value = `Can you explain ${topic} in ${subject} for engineering students? Include key concepts and study tips.`;
    inputField.focus();
    
    setTimeout(() => { if (geminiAssistant) geminiAssistant.sendMessage(); }, 1000);
}
