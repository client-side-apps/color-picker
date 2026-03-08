/**
 * Color logic handling
 */

// DOM Elements
const colorInput = document.getElementById('color-input');
const hexInput = document.getElementById('hex-value');
const rgbInput = document.getElementById('rgb-value');
const hslInput = document.getElementById('hsl-value');
const copyButtons = document.querySelectorAll('.copy-btn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const themeToggleBtn = document.getElementById('theme-toggle');
const colorHistoryContainer = document.getElementById('color-history');
const clearHistoryBtn = document.getElementById('clear-history');
const historyTemplate = document.getElementById('history-item-template');

// State
let toastTimeout;
const HISTORY_KEY = 'color_picker_history';
const MAX_HISTORY = 12;
let colorHistory = [];

/**
 * Initializes the application
 */
function init() {
    // Load preferences and history
    initTheme();
    loadHistory();

    // Event Listeners
    colorInput.addEventListener('input', handleColorEvent);
    colorInput.addEventListener('change', handleColorChange); // For saving to history when they stop dragging
    
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                copyToClipboard(targetInput.value);
            }
        });
    });

    themeToggleBtn.addEventListener('click', toggleTheme);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Listen to system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });

    // Initial values
    updateValues(colorInput.value);
}

/**
 * Handle real-time color updates
 * @param {Event} e 
 */
function handleColorEvent(e) {
    updateValues(e.target.value);
}

/**
 * Handle end of color selection (saves to history)
 * @param {Event} e 
 */
function handleColorChange(e) {
    addToHistory(e.target.value);
}

/**
 * Updates all input values based on the hex string
 * @param {string} hex 
 */
function updateValues(hex) {
    hexInput.value = hex.toUpperCase();
    
    const rgb = hexToRgb(hex);
    if (rgb) {
        rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hslInput.value = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
    }
}

/**
 * Converts a hex color string to RGB object
 * @param {string} hex - e.g. #ff0000
 * @returns {{r: number, g: number, b: number} | null}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Converts RGB to HSL
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {{h: number, s: number, l: number}}
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Copies text to clipboard and shows a toast
 * @param {string} text 
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied ${text}`);
    } catch (err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`Copied ${text}`);
        } catch (err) {
            showToast('Failed to copy', true);
        }
        document.body.removeChild(textArea);
    }
}

/**
 * Displays a toast notification using the native <dialog> element
 * @param {string} message 
 * @param {boolean} isError 
 */
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    if (isError) {
        toast.style.backgroundColor = '#ef4444'; // Red
    } else {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        toast.style.backgroundColor = isDark ? '#f8fafc' : '#1e293b';
    }
    
    toast.show();
    
    // Simulate opacity animation
    setTimeout(() => {
        toast.setAttribute('open', '');
    }, 10);

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.removeAttribute('open');
        setTimeout(() => toast.close(), 300); // Wait for transition
    }, 2500);
}

/**
 * Initializes the theme based on localStorage or system preference
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

/**
 * Toggles the current theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

/**
 * History Management 
 */

/**
 * Loads history from localStorage and renders it
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            colorHistory = JSON.parse(stored);
            renderHistory();
        }
    } catch (e) {
        console.error('Failed to load history', e);
    }
}

/**
 * Adds a new color to the history
 * @param {string} hex 
 */
function addToHistory(hex) {
    // Avoid consecutive duplicates
    if (colorHistory.length > 0 && colorHistory[0] === hex) {
        return;
    }
    
    // Add to beginning
    colorHistory.unshift(hex);
    
    // Limit array size
    if (colorHistory.length > MAX_HISTORY) {
        colorHistory.pop();
    }
    
    saveHistory();
    renderHistory();
}

/**
 * Saves history to localStorage
 */
function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(colorHistory));
}

/**
 * Clears the history
 */
function clearHistory() {
    colorHistory = [];
    saveHistory();
    renderHistory();
}

/**
 * Renders the color history UI
 */
function renderHistory() {
    colorHistoryContainer.innerHTML = '';
    
    if (colorHistory.length === 0) {
        colorHistoryContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No recent colors.</p>';
        clearHistoryBtn.hidden = true;
        return;
    }

    clearHistoryBtn.hidden = false;

    // Use a DocumentFragment for performant DOM updates
    const fragment = document.createDocumentFragment();

    colorHistory.forEach(hex => {
        const clone = historyTemplate.content.cloneNode(true);
        const btn = clone.querySelector('.history-item');
        const swatch = clone.querySelector('.history-color-swatch');
        const valueStr = clone.querySelector('.history-color-value');
        
        swatch.style.backgroundColor = hex;
        valueStr.textContent = hex;
        
        btn.addEventListener('click', () => {
            colorInput.value = hex;
            updateValues(hex);
            // Move block to front
            const index = colorHistory.indexOf(hex);
            if (index > -1) {
                colorHistory.splice(index, 1);
                addToHistory(hex);
            }
        });
        
        fragment.appendChild(clone);
    });

    colorHistoryContainer.appendChild(fragment);
}

// Start app
document.addEventListener('DOMContentLoaded', init);
