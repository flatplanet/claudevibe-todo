/* TaskFlow - Main JavaScript File */

// Global variables and utilities
const TaskFlow = {
    // Configuration
    config: {
        saveTimeout: 1000, // 1 second delay for auto-save
        fadeTimeout: 2000  // 2 seconds for fade out messages
    },
    
    // Utility functions
    utils: {
        // Get CSRF token from cookie or meta tag
        getCsrfToken: function() {
            // Try to get from form first
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfToken) {
                return csrfToken.value;
            }
            
            // Try to get from cookie
            const cookieValue = this.getCookie('csrftoken');
            if (cookieValue) {
                return cookieValue;
            }
            
            // Try to get from meta tag
            const metaTag = document.querySelector('meta[name=csrf-token]');
            if (metaTag) {
                return metaTag.getAttribute('content');
            }
            
            return '';
        },
        
        // Get cookie value by name
        getCookie: function(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        },
        
        // Show loading state
        showLoading: function(element) {
            element.classList.add('loading');
        },
        
        // Hide loading state
        hideLoading: function(element) {
            element.classList.remove('loading');
        },
        
        // Show success message
        showSuccess: function(message, container) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-success alert-dismissible fade show';
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.prepend(alert);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        },
        
        // Show error message
        showError: function(message, container) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger alert-dismissible fade show';
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.prepend(alert);
        }
    }
};

// Task Management System
TaskFlow.tasks = {
    saveTimeout: null,
    
    // Initialize task management
    init: function() {
        console.log('TaskFlow.tasks initializing...');
        this.bindTaskInputs();
        this.bindFormValidation();
    },
    
    // Bind task input events
    bindTaskInputs: function() {
        const taskInputs = document.querySelectorAll('.task-input');
        console.log(`Found ${taskInputs.length} task inputs`);
        
        taskInputs.forEach((input, index) => {
            console.log(`Binding task input ${index + 1}: ID=${input.dataset.taskId}, Hour=${input.dataset.hour}`);
            // Auto-save on input (with debounce)
            input.addEventListener('input', (e) => {
                this.handleTaskInput(e.target);
            });
            
            // Save on blur (immediate)
            input.addEventListener('blur', (e) => {
                this.saveTaskImmediate(e.target);
            });
            
            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // This will trigger save
                }
            });
        });
    },
    
    // Handle task input with debounce
    handleTaskInput: function(inputElement) {
        clearTimeout(this.saveTimeout);
        
        // Visual feedback - show typing
        inputElement.classList.remove('saved');
        const statusDiv = inputElement.nextElementSibling;
        if (statusDiv && statusDiv.classList.contains('save-status')) {
            statusDiv.style.opacity = '0';
        }
        
        // Debounce saving
        this.saveTimeout = setTimeout(() => {
            this.saveTask(inputElement);
        }, TaskFlow.config.saveTimeout);
    },
    
    // Save task immediately (no debounce)
    saveTaskImmediate: function(inputElement) {
        clearTimeout(this.saveTimeout);
        this.saveTask(inputElement);
    },
    
    // Save task to server
    saveTask: function(inputElement) {
        const taskId = inputElement.dataset.taskId;
        const taskText = inputElement.value;
        const statusDiv = inputElement.nextElementSibling;
        
        // Validate required data
        if (!taskId) {
            console.error('No task ID found');
            this.showTaskError(inputElement, 'Invalid task. Please refresh the page.');
            return;
        }
        
        const csrfToken = TaskFlow.utils.getCsrfToken();
        if (!csrfToken) {
            console.error('CSRF token not found');
            this.showTaskError(inputElement, 'Security token missing. Please refresh the page.');
            return;
        }
        
        // Show loading state
        TaskFlow.utils.showLoading(inputElement);
        
        // Send AJAX request using URLSearchParams for better compatibility
        fetch('/save-task/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({
                'task_id': taskId,
                'task_text': taskText,
                'csrfmiddlewaretoken': csrfToken
            })
        })
        .then(response => {
            TaskFlow.utils.hideLoading(inputElement);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                // Show success state
                inputElement.classList.add('saved');
                if (statusDiv && statusDiv.classList.contains('save-status')) {
                    statusDiv.style.opacity = '1';
                    setTimeout(() => {
                        statusDiv.style.opacity = '0';
                    }, TaskFlow.config.fadeTimeout);
                }
            } else {
                // Show error from server
                console.error('Server error saving task:', data.message);
                this.showTaskError(inputElement, data.message || 'Server error occurred');
            }
        })
        .catch(error => {
            TaskFlow.utils.hideLoading(inputElement);
            console.error('Network error saving task:', error);
            this.showTaskError(inputElement, 'Connection failed. Check your internet connection.');
        });
    },
    
    // Show task-specific error
    showTaskError: function(inputElement, message) {
        inputElement.classList.add('is-invalid');
        
        // Remove error styling after 5 seconds
        setTimeout(() => {
            inputElement.classList.remove('is-invalid');
        }, 5000);
        
        // Show toast or alert if available
        const container = document.querySelector('.schedule-container');
        if (container) {
            TaskFlow.utils.showError(`Failed to save task: ${message}`, container);
        }
    },
    
    // Form validation for profile and other forms
    bindFormValidation: function() {
        const forms = document.querySelectorAll('form[data-validate="true"]');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    },
    
    // Validate form
    validateForm: function(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        // Password confirmation validation
        const password1 = form.querySelector('[name="new_password1"], [name="password1"]');
        const password2 = form.querySelector('[name="new_password2"], [name="password2"]');
        
        if (password1 && password2) {
            if (password1.value !== password2.value) {
                password2.classList.add('is-invalid');
                password2.setCustomValidity('Passwords do not match');
                isValid = false;
            } else {
                password2.classList.remove('is-invalid');
                password2.setCustomValidity('');
            }
        }
        
        return isValid;
    }
};

// Calendar functionality
TaskFlow.calendar = {
    // Initialize calendar
    init: function() {
        this.bindCalendarEvents();
        this.highlightToday();
    },
    
    // Bind calendar-specific events
    bindCalendarEvents: function() {
        // Add keyboard navigation for calendar
        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.calendar-table')) {
                this.handleKeyboardNavigation(e);
            }
        });
        
        // Add touch/click enhancement for mobile
        const calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            day.addEventListener('click', (e) => {
                this.animateCalendarDay(e.target);
            });
        });
    },
    
    // Handle keyboard navigation
    handleKeyboardNavigation: function(e) {
        // Arrow key navigation could be implemented here
        // For now, just handle escape to go back
        if (e.key === 'Escape') {
            const backButton = document.querySelector('a[href*="home"]');
            if (backButton) {
                backButton.click();
            }
        }
    },
    
    // Animate calendar day on click
    animateCalendarDay: function(dayElement) {
        dayElement.style.transform = 'scale(0.95)';
        dayElement.style.transition = 'transform 0.1s';
        
        setTimeout(() => {
            dayElement.style.transform = 'scale(1)';
        }, 100);
    },
    
    // Highlight today's date
    highlightToday: function() {
        const today = new Date();
        const todayElements = document.querySelectorAll('.calendar-day.today');
        
        todayElements.forEach(element => {
            element.setAttribute('title', 'Today - ' + today.toLocaleDateString());
        });
    }
};

// Profile management
TaskFlow.profile = {
    // Initialize profile functionality
    init: function() {
        this.bindProfileEvents();
        this.bindPasswordToggle();
    },
    
    // Bind profile-specific events
    bindProfileEvents: function() {
        // Username availability check (could be implemented)
        const usernameField = document.querySelector('#username');
        if (usernameField) {
            usernameField.addEventListener('blur', () => {
                // Could add real-time username validation here
            });
        }
        
        // Profile picture upload (if implemented in future)
        const profilePicInput = document.querySelector('#profile-picture');
        if (profilePicInput) {
            profilePicInput.addEventListener('change', (e) => {
                this.previewProfilePicture(e);
            });
        }
    },
    
    // Toggle password visibility
    bindPasswordToggle: function() {
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const input = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    },
    
    // Preview profile picture (for future implementation)
    previewProfilePicture: function(e) {
        const file = e.target.files[0];
        const preview = document.querySelector('#profile-picture-preview');
        
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    TaskFlow.tasks.init();
    TaskFlow.calendar.init();
    TaskFlow.profile.init();
    
    // Add fade-in animation to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
    
    // Auto-hide alerts after 10 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert.parentNode && !alert.querySelector('.btn-close:focus')) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 10000);
    });
    
    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Initialize Bootstrap tooltips if any
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    console.log('TaskFlow initialized successfully');
});