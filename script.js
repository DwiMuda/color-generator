// DOM Elements
const fileInput = document.getElementById('fileInput');
const colorList = document.getElementById('colorList');
const previewFrame = document.getElementById('previewFrame');
const uploadArea = document.getElementById('uploadArea');
const searchBox = document.getElementById('searchBox');

// Global State
let currentDoc = null;
let originalHTML = null;
let colorData = [];
let history = [];
let currentTheme = 'dark';
let projectFiles = {};
let currentDeviceView = 'desktop';

// Enhanced Color Palettes
const palettes = {
    sunset: ['#FF6B6B', '#FF8E53', '#FFA94D', '#FFD93D', '#6BCB77'],
    ocean: ['#0A2463', '#3E92CC', '#1876D2', '#1565C0', '#0D47A1'],
    forest: ['#06402B', '#0F7173', '#59981A', '#81B622', '#ECF87F'],
    candy: ['#FF6B9D', '#C44569', '#F8B500', '#FFE5B4', '#FFB6C1'],
    neon: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF1493', '#00FF00'],
    pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF'],
    vintage: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460'],
    midnight: ['#191970', '#000080', '#00008B', '#0000CD', '#4169E1']
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    generatePalettes();
    updateGradientPreview();
    setupTabNavigation();
    showNotification('Welcome to Ultimate Color Studio Pro! 🎨', 'success');
}

// Event Listeners Setup
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileInputChange);
    
    // Drag and drop
    setupDragAndDrop();
    
    // Color sync
    setupColorSync('globalBg', 'globalBgHex');
    setupColorSync('globalText', 'globalTextHex');
    setupColorSync('globalBorder', 'globalBorderHex');
    setupColorSync('gradStart', 'gradStartHex');
    setupColorSync('gradEnd', 'gradEndHex');
    
    // Gradient controls
    document.getElementById('gradStart').addEventListener('input', updateGradientPreview);
    document.getElementById('gradEnd').addEventListener('input', updateGradientPreview);
    document.getElementById('gradAngle').addEventListener('input', updateGradientAngle);
    
    // Search functionality
    searchBox.addEventListener('input', handleSearch);
    
    // Harmony generator
    document.getElementById('harmonyBase').addEventListener('input', generateHarmony);
    document.getElementById('harmonyType').addEventListener('change', generateHarmony);
}

// Tab Navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Special tab initialization
    if (tabName === 'palette') {
        generateHarmony();
    }
}

// File/Folder Selection
function selectFile() {
    fileInput.removeAttribute('webkitdirectory');
    fileInput.removeAttribute('directory');
    fileInput.removeAttribute('multiple');
    fileInput.setAttribute('accept', '.html');
    fileInput.click();
}

function selectFolder() {
    fileInput.setAttribute('webkitdirectory', '');
    fileInput.setAttribute('directory', '');
    fileInput.setAttribute('multiple', '');
    fileInput.removeAttribute('accept');
    fileInput.click();
}

function handleFileInputChange(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    showLoading('Processing files...');
    
    if (files.length > 1) {
        handleFolder(files);
    } else {
        const file = files[0];
        if (file) handleFile(file);
    }
}

// Drag & Drop Setup
function setupDragAndDrop() {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const items = e.dataTransfer.items;
        
        showLoading('Processing dropped files...');
        
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item) {
                    if (item.isDirectory) {
                        await readDirectory(item);
                        return;
                    } else if (item.isFile && item.name.endsWith('.html')) {
                        const file = items[i].getAsFile();
                        if (file) handleFile(file);
                        return;
                    }
                }
            }
        }
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.html')) {
            handleFile(file);
        }
    });
}

// File Handling
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        originalHTML = event.target.result;
        processHTML(originalHTML);
        hideLoading();
        showNotification(`File "${file.name}" loaded successfully!`, 'success');
    };
    reader.onerror = () => {
        hideLoading();
        showNotification('Error reading file!', 'error');
    };
    reader.readAsText(file);
}

async function handleFolder(files) {
    projectFiles = {};
    let htmlFile = null;
    
    const filePromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            const path = file.webkitRelativePath || file.name;
            
            reader.onload = (e) => {
                projectFiles[path] = e.target.result;
                
                if (file.name === 'index.html') {
                    htmlFile = { name: file.name, path: path, content: e.target.result };
                } else if (file.name.endsWith('.html') && !htmlFile) {
                    htmlFile = { name: file.name, path: path, content: e.target.result };
                }
                
                resolve();
            };
            
            reader.onerror = () => resolve();
            reader.readAsText(file);
        });
    });
    
    await Promise.all(filePromises);
    
    if (htmlFile) {
        await processHTMLWithExternalFiles(htmlFile.content, htmlFile.path);
        showNotification(`Folder loaded with ${files.length} files!`, 'success');
    } else {
        hideLoading();
        showNotification('No HTML file found in folder!', 'error');
    }
}

// HTML Processing
async function processHTMLWithExternalFiles(htmlContent, htmlPath) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    const baseDir = htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1);
    
    // Inline CSS files
    const linkTags = doc.querySelectorAll('link[rel="stylesheet"]');
    for (let link of linkTags) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
            const cssPath = resolvePath(baseDir, href);
            const cssContent = projectFiles[cssPath];
            
            if (cssContent) {
                const styleTag = doc.createElement('style');
                styleTag.textContent = cssContent;
                link.parentNode.replaceChild(styleTag, link);
            }
        }
    }
    
    // Inline JS files
    const scriptTags = doc.querySelectorAll('script[src]');
    for (let script of scriptTags) {
        const src = script.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            const jsPath = resolvePath(baseDir, src);
            const jsContent = projectFiles[jsPath];
            
            if (jsContent) {
                const newScript = doc.createElement('script');
                newScript.textContent = jsContent;
                script.parentNode.replaceChild(newScript, script);
            }
        }
    }
    
    originalHTML = doc.documentElement.outerHTML;
    processHTML(originalHTML);
    hideLoading();
}

function processHTML(htmlContent) {
    const parser = new DOMParser();
    currentDoc = parser.parseFromString(htmlContent, "text/html");
    
    analyzeColors();
    updatePreview();
    
    // Show control panels
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('controlsPanel').style.display = 'block';
    document.getElementById('actionsPanel').style.display = 'block';
    
    generatePalettes();
    saveToHistory('File Loaded');
    
    // Update file count
    document.getElementById('fileCount').textContent = Object.keys(projectFiles).length || 1;
}

// Color Analysis
function analyzeColors() {
    colorList.innerHTML = "";
    colorData = [];
    
    const elements = currentDoc.querySelectorAll("*");
    let colorSet = new Set();
    
    elements.forEach((el, idx) => {
        const computedStyle = window.getComputedStyle(el);
        const bg = el.style.backgroundColor || computedStyle.backgroundColor;
        const color = el.style.color || computedStyle.color;
        const borderColor = el.style.borderColor || computedStyle.borderColor;

        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const hex = rgbToHex(bg);
            colorSet.add(hex);
            createColorItem(el, 'background', hex, idx);
        }

        if (color && color !== 'rgba(0, 0, 0, 0)') {
            const hex = rgbToHex(color);
            colorSet.add(hex);
            createColorItem(el, 'text', hex, idx);
        }

        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
            const hex = rgbToHex(borderColor);
            colorSet.add(hex);
            createColorItem(el, 'border', hex, idx);
        }
    });

    document.getElementById('elementCount').textContent = elements.length;
    document.getElementById('colorCount').textContent = colorSet.size;
}

function createColorItem(el, type, hexColor, idx) {
    const div = document.createElement('div');
    div.className = 'color-item fade-in';
    div.dataset.element = el.tagName;
    div.dataset.type = type;
    
    const typeEmoji = type === 'background' ? '🎨' : type === 'text' ? '📝' : '🔲';
    
    div.innerHTML = `
        <div class="color-header">
            <span class="element-name">${el.tagName.toLowerCase()}</span>
            <span class="element-type">${typeEmoji} ${type}</span>
        </div>
        <div class="color-input-wrapper">
            <input type="color" value="${hexColor}">
            <input type="text" value="${hexColor}">
        </div>
    `;
    
    const colorInput = div.querySelector('input[type="color"]');
    const textInput = div.querySelector('input[type="text"]');
    
    colorInput.addEventListener('input', () => {
        const newColor = colorInput.value;
        textInput.value = newColor;
        applyColor(el, type, newColor);
        saveToHistory(`Changed ${type} of ${el.tagName}`);
    });
    
    textInput.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
            colorInput.value = textInput.value;
            applyColor(el, type, textInput.value);
            saveToHistory(`Changed ${type} of ${el.tagName}`);
        }
    });
    
    colorList.appendChild(div);
    colorData.push({ el, type, color: hexColor });
}

function applyColor(el, type, color) {
    if (type === 'background') el.style.backgroundColor = color;
    else if (type === 'text') el.style.color = color;
    else if (type === 'border') el.style.borderColor = color;
    updatePreview();
}

// Global Color Controls
function setupColorSync(colorId, hexId) {
    const colorInput = document.getElementById(colorId);
    const hexInput = document.getElementById(hexId);
    
    colorInput.addEventListener('input', () => {
        hexInput.value = colorInput.value;
    });
    
    hexInput.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
            colorInput.value = hexInput.value;
        }
    });
}

function applyGlobalColors() {
    if (!currentDoc) return;
    
    const bg = document.getElementById('globalBg').value;
    const text = document.getElementById('globalText').value;
    const border = document.getElementById('globalBorder').value;
    
    currentDoc.querySelectorAll("*").forEach(el => {
        if (bg) el.style.backgroundColor = bg;
        if (text) el.style.color = text;
        if (border) el.style.borderColor = border;
    });
    
    analyzeColors();
    updatePreview();
    saveToHistory('Applied Global Colors');
    showNotification('Global colors applied successfully!', 'success');
}

// Gradient Functions
function updateGradientPreview() {
    const start = document.getElementById('gradStart').value;
    const end = document.getElementById('gradEnd').value;
    const angle = document.getElementById('gradAngle').value;
    
    const preview = document.getElementById('gradientPreview');
    preview.style.background = `linear-gradient(${angle}deg, ${start}, ${end})`;
}

function updateGradientAngle() {
    const angle = document.getElementById('gradAngle').value;
    document.getElementById('gradAngleValue').textContent = `${angle}°`;
    updateGradientPreview();
}

function applyGradient() {
    if (!currentDoc) return;
    
    const start = document.getElementById('gradStart').value;
    const end = document.getElementById('gradEnd').value;
    const angle = document.getElementById('gradAngle').value;
    
    const gradient = `linear-gradient(${angle}deg, ${start}, ${end})`;
    currentDoc.body.style.background = gradient;
    
    updatePreview();
    saveToHistory('Applied Gradient');
    showNotification('Gradient applied successfully!', 'success');
}

function generateRandomGradient() {
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    document.getElementById('gradStart').value = randomColor();
    document.getElementById('gradEnd').value = randomColor();
    document.getElementById('gradStartHex').value = document.getElementById('gradStart').value;
    document.getElementById('gradEndHex').value = document.getElementById('gradEnd').value;
    updateGradientPreview();
}

function reverseGradient() {
    const start = document.getElementById('gradStart').value;
    const end = document.getElementById('gradEnd').value;
    
    document.getElementById('gradStart').value = end;
    document.getElementById('gradEnd').value = start;
    document.getElementById('gradStartHex').value = end;
    document.getElementById('gradEndHex').value = start;
    updateGradientPreview();
}

// Quick Actions
function randomColors() {
    if (!currentDoc) return;
    
    currentDoc.querySelectorAll("*").forEach(el => {
        const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        el.style.backgroundColor = randomColor();
        el.style.color = randomColor();
    });
    
    analyzeColors();
    updatePreview();
    saveToHistory('Randomized Colors');
    showNotification('Colors randomized!', 'success');
}

function invertColors() {
    if (!currentDoc) return;
    
    currentDoc.querySelectorAll("*").forEach(el => {
        const invert = (hex) => {
            const rgb = hex.match(/\w\w/g).map(x => 255 - parseInt(x, 16));
            return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
        };
        
        const bg = window.getComputedStyle(el).backgroundColor;
        const color = window.getComputedStyle(el).color;
        
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            el.style.backgroundColor = invert(rgbToHex(bg));
        }
        if (color && color !== 'rgba(0, 0, 0, 0)') {
            el.style.color = invert(rgbToHex(color));
        }
    });
    
    analyzeColors();
    updatePreview();
    saveToHistory('Inverted Colors');
    showNotification('Colors inverted!', 'success');
}

function grayscale() {
    if (!currentDoc) return;
    
    currentDoc.querySelectorAll("*").forEach(el => {
        const toGray = (hex) => {
            const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16));
            const gray = Math.round(rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114);
            return '#' + gray.toString(16).padStart(2, '0').repeat(3);
        };
        
        const bg = window.getComputedStyle(el).backgroundColor;
        const color = window.getComputedStyle(el).color;
        
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            el.style.backgroundColor = toGray(rgbToHex(bg));
        }
        if (color && color !== 'rgba(0, 0, 0, 0)') {
            el.style.color = toGray(rgbToHex(color));
        }
    });
    
    analyzeColors();
    updatePreview();
    saveToHistory('Applied Grayscale');
    showNotification('Grayscale applied!', 'success');
}

// Color Harmony
function generateHarmony() {
    const base = document.getElementById('harmonyBase').value;
    const type = document.getElementById('harmonyType').value;
    
    const hslToHex = (h, s, l) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    const hexToHsl = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return [h * 360, s * 100, l * 100];
    };
    
    const [h, s, l] = hexToHsl(base);
    let colors = [];
    
    switch(type) {
        case 'complementary':
            colors = [base, hslToHex((h + 180) % 360, s, l)];
            break;
        case 'analogous':
            colors = [hslToHex((h - 30) % 360, s, l), base, hslToHex((h + 30) % 360, s, l)];
            break;
        case 'triadic':
            colors = [base, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)];
            break;
        case 'tetradic':
            colors = [base, hslToHex((h + 90) % 360, s, l), hslToHex((h + 180) % 360, s, l), hslToHex((h + 270) % 360, s, l)];
            break;
    }
    
    const container = document.getElementById('harmonyColors');
    container.innerHTML = '';
    colors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'harmony-color';
        div.style.backgroundColor = color;
        div.title = color;
        div.onclick = () => {
            document.getElementById('globalBg').value = color;
            document.getElementById('globalBgHex').value = color;
            showNotification(`Color ${color} selected!`, 'success');
        };
        container.appendChild(div);
    });
}

// Palettes
function generatePalettes() {
    const container = document.getElementById('paletteSuggestions');
    container.innerHTML = '';
    
    Object.entries(palettes).forEach(([name, colors]) => {
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'palette-color';
            div.style.backgroundColor = color;
            div.setAttribute('data-color', color);
            div.onclick = () => {
                document.getElementById('globalBg').value = color;
                document.getElementById('globalBgHex').value = color;
                showNotification(`Color ${color} selected!`, 'success');
            };
            container.appendChild(div);
        });
    });
}

// Search & Filter
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const items = colorList.querySelectorAll('.color-item');
    
    items.forEach(item => {
        const elementName = item.dataset.element.toLowerCase();
        item.style.display = elementName.includes(searchTerm) ? 'block' : 'none';
    });
}

function filterElements() {
    const filterType = document.getElementById('filterType').value;
    const items = colorList.querySelectorAll('.color-item');
    
    items.forEach(item => {
        if (filterType === 'all') {
            item.style.display = 'block';
        } else {
            item.style.display = item.dataset.type === filterType ? 'block' : 'none';
        }
    });
}

// History Management
function saveToHistory(action) {
    if (!currentDoc) return;
    
    const snapshot = {
        html: currentDoc.documentElement.outerHTML,
        action: action,
        timestamp: new Date().toLocaleTimeString()
    };
    
    history.push(snapshot);
    if (history.length > 10) history.shift();
    
    updateHistoryList();
}

function updateHistoryList() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    
    history.slice().reverse().forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-action">${item.action}</div>
            <div class="history-time">${item.timestamp}</div>
        `;
        div.onclick = () => restoreFromHistory(history.length - 1 - index);
        list.appendChild(div);
    });
}

function restoreFromHistory(index) {
    if (history[index]) {
        const parser = new DOMParser();
        currentDoc = parser.parseFromString(history[index].html, "text/html");
        analyzeColors();
        updatePreview();
        showNotification('History state restored!', 'success');
    }
}

function undoChange() {
    if (history.length > 1) {
        history.pop();
        restoreFromHistory(history.length - 1);
    } else {
        showNotification('No more history to undo!', 'error');
    }
}

// Preview Controls
function updatePreview() {
    if (!currentDoc) return;
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(currentDoc.documentElement.outerHTML);
    iframeDoc.close();
}

function refreshPreview() {
    updatePreview();
    showNotification('Preview refreshed!', 'success');
}

function fullscreenPreview() {
    if (previewFrame.requestFullscreen) {
        previewFrame.requestFullscreen();
    } else if (previewFrame.webkitRequestFullscreen) {
        previewFrame.webkitRequestFullscreen();
    }
}

function toggleResponsive() {
    const frame = document.getElementById('previewFrame');
    if (currentDeviceView === 'desktop') {
        frame.style.width = '375px';
        frame.style.margin = '0 auto';
        currentDeviceView = 'mobile';
        document.querySelector('[onclick="toggleResponsive()"]').textContent = '💻 Desktop';
        showNotification('Switched to mobile view', 'success');
    } else {
        frame.style.width = '100%';
        frame.style.margin = '0';
        currentDeviceView = 'desktop';
        document.querySelector('[onclick="toggleResponsive()"]').textContent = '📱 Responsive';
        showNotification('Switched to desktop view', 'success');
    }
}

function toggleDeviceView() {
    toggleResponsive();
}

// Export Functions
function downloadHTML() {
    if (!currentDoc) return;
    const htmlContent = currentDoc.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "color-studio-" + Date.now() + ".html";
    a.click();
    URL.revokeObjectURL(url);
    showNotification('HTML file downloaded!', 'success');
}

function exportCSS() {
    if (!colorData.length) return;
    
    let css = '/* Generated CSS Colors - Ultimate Color Studio Pro */\n\n';
    const uniqueColors = [...new Set(colorData.map(c => c.color))];
    
    uniqueColors.forEach((color, i) => {
        css += `.color-${i + 1} { color: ${color}; }\n`;
        css += `.bg-color-${i + 1} { background-color: ${color}; }\n`;
        css += `.border-color-${i + 1} { border-color: ${color}; }\n\n`;
    });
    
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-styles.css';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('CSS file exported!', 'success');
}

function exportJSON() {
    if (!colorData.length) return;
    
    const data = {
        metadata: {
            generatedBy: "Ultimate Color Studio Pro",
            timestamp: new Date().toISOString(),
            version: "2.0"
        },
        colors: [...new Set(colorData.map(c => c.color))],
        elements: colorData.map(c => ({
            tag: c.el.tagName,
            type: c.type,
            color: c.color,
            className: `${c.type}-color-${c.color.replace('#', '')}`
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('JSON file exported!', 'success');
}

function copyColors() {
    const colors = [...new Set(colorData.map(c => c.color))];
    navigator.clipboard.writeText(colors.join('\n')).then(() => {
        showNotification(`${colors.length} colors copied to clipboard!`, 'success');
    }).catch(() => {
        showNotification('Failed to copy colors!', 'error');
    });
}

function resetColors() {
    if (!originalHTML) return;
    const parser = new DOMParser();
    currentDoc = parser.parseFromString(originalHTML, "text/html");
    analyzeColors();
    updatePreview();
    saveToHistory('Reset to Original');
    showNotification('Colors reset to original!', 'success');
}

// Theme Toggle
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (currentTheme === 'light') {
        document.documentElement.style.setProperty('--primary-bg', '#f8fafc');
        document.documentElement.style.setProperty('--secondary-bg', '#e2e8f0');
        document.documentElement.style.setProperty('--text-primary', '#1e293b');
        document.documentElement.style.setProperty('--text-secondary', '#475569');
        document.documentElement.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
        showNotification('Light theme activated!', 'success');
    } else {
        document.documentElement.style.setProperty('--primary-bg', '#0f172a');
        document.documentElement.style.setProperty('--secondary-bg', '#1e293b');
        document.documentElement.style.setProperty('--text-primary', '#f1f5f9');
        document.documentElement.style.setProperty('--text-secondary', '#cbd5e1');
        document.documentElement.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
        showNotification('Dark theme activated!', 'success');
    }
}

// Utility Functions
function rgbToHex(rgb) {
    const nums = rgb.match(/\d+/g);
    if (!nums) return '#ffffff';
    return "#" + nums.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

function resolvePath(basePath, relativePath) {
    relativePath = relativePath.replace(/^\.\//, '');
    let base = basePath.split('/').filter(p => p);
    let relative = relativePath.split('/');
    
    for (let part of relative) {
        if (part === '..') {
            base.pop();
        } else if (part !== '.') {
            base.push(part);
        }
    }
    
    return base.join('/');
}

// Directory Reading (for drag & drop)
async function readDirectory(directoryEntry) {
    projectFiles = {};
    const allEntries = [];
    
    async function readAllEntries(entry, path = '') {
        if (entry.isFile) {
            allEntries.push({ entry, path: path + entry.name });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await new Promise((resolve) => {
                dirReader.readEntries(resolve);
            });
            
            for (let subEntry of entries) {
                await readAllEntries(subEntry, path + entry.name + '/');
            }
        }
    }
    
    await readAllEntries(directoryEntry);
    
    const filePromises = allEntries.map(({ entry, path }) => {
        return new Promise((resolve) => {
            entry.file(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    projectFiles[path] = e.target.result;
                    resolve({ path, name: entry.name });
                };
                reader.onerror = () => resolve();
                reader.readAsText(file);
            });
        });
    });
    
    const files = await Promise.all(filePromises);
    let htmlFile = files.find(f => f.name === 'index.html');
    if (!htmlFile) {
        htmlFile = files.find(f => f.name.endsWith('.html'));
    }
    
    if (htmlFile) {
        await processHTMLWithExternalFiles(projectFiles[htmlFile.path], htmlFile.path);
    } else {
        hideLoading();
        showNotification('No HTML file found in folder!', 'error');
    }
}

// UI Helpers
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideInRight 0.3s ease;
            }
            .notification.success { background: var(--success-color); }
            .notification.error { background: var(--error-color); }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

function showLoading(message = 'Loading...') {
    // Create loading overlay
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#loading-styles')) {
        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            #loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .loading-content {
                text-align: center;
                color: white;
            }
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-left: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            .loading-message {
                font-size: 16px;
                font-weight: 500;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.remove();
    }
}