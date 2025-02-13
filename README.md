# AI Document Summarizer

A powerful web-based document summarization tool that uses Azure AI Language Service to generate concise summaries from various document formats. Built with modern web technologies and a focus on user experience.

![AI Document Summarizer](./Docssum.png)

## Table of Contents
- [Features](#features)
- [Interface Screenshots](#interface-screenshots)
- [Technologies Used](#technologies-used)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Technical Architecture](#technical-architecture)
- [Usage Guide](#usage-guide)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Features

- **Multiple Document Format Support**
  - PDF files
  - Word documents (DOC, DOCX)
  - Text files (TXT)
  - Rich Text Format (RTF)
  - OpenDocument Text (ODT)

- **Smart Summarization**
  - Three summary length options (short, medium, long)
  - Extractive summarization using Azure AI
  - Real-time processing
  - Maintains context and key points

- **Modern User Interface**
  - Responsive design for all devices
  - Dark mode support
  - Progress indicators
  - Drag and drop file upload
  - Clean and intuitive layout

## Interface Screenshots

### Main Interface
![Main Interface](screenshots/main-interface.png)
- Clean, modern design
- Intuitive document upload area
- Real-time progress indicators

### Dark Mode
![Dark Mode](screenshots/dark-mode.png)
- Automatic system preference detection
- Enhanced readability in low-light conditions
- Consistent styling across all components

### Mobile View
![Mobile Interface](screenshots/mobile-view.png)
- Optimized for touch interactions
- Responsive layout adjustments
- Full functionality on mobile devices

## Technologies Used

### Frontend
- HTML5
- CSS3 (with modern features like CSS Variables, Flexbox, Grid)
- JavaScript (ES6+)
- Font Awesome 6.0.0 for icons

### Document Processing
- PDF.js (v3.4.120) for PDF file processing
- Mammoth.js (v1.4.0) for Word document processing

### AI/Backend Service
- Azure AI Language Service
  - Text Analytics API
  - Extractive Summarization

### Features & Capabilities
- Responsive Design
- Dark Mode Support
- File Upload Progress Tracking
- Error Handling
- Local Storage for Credentials
- Cross-browser Compatibility

## Detailed Setup Guide

### 1. Azure AI Service Setup

1. **Create Azure Account**
   ```bash
   # Visit Azure Portal
   https://portal.azure.com
   ```

2. **Create Language Service Resource**
   - Navigate to "Create a resource"
   - Search for "Language Service"
   - Select "Create" and choose:
     ```
     Pricing tier: Standard S0
     Region: Your nearest location
     Resource name: Your choice (e.g., docsummarizer)
     ```

3. **Get Credentials**
   - Go to resource after deployment
   - Navigate to "Keys and Endpoint"
   - Copy:
     - KEY 1 or KEY 2
     - Endpoint URL

### 2. Local Development Setup

1. **Environment Setup**
   ```bash
   # Install Node.js local development server
   npm install -g http-server

   # OR Python server
   python -m pip install --upgrade pip
   ```

2. **Project Setup**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/document-summarizer.git
   cd document-summarizer

   # Using Node.js server
   npx http-server -p 8080

   # OR Using Python
   python -m http.server 8080
   ```

3. **SSL Setup (Optional but recommended)**
   ```bash
   # Generate self-signed certificate
   openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

   # Start with HTTPS
   http-server -S -C cert.pem -K key.pem
   ```

## Technical Architecture

### 1. File Processing System

```javascript
class DocumentProcessor {
    async processFile(file) {
        switch(file.type) {
            case 'application/pdf':
                return await this.processPDF(file);
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return await this.processWord(file);
            // ... other formats
        }
    }

    async processPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let text = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
        }
        
        return text;
    }
}
```

### 2. Azure AI Integration Details

```javascript
class AzureAIService {
    constructor(endpoint, apiKey) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.baseUrl = `${endpoint}/language/analyze-text/jobs`;
    }

    async summarize(text, sentenceCount) {
        // Initial request
        const response = await this.startAnalysis(text, sentenceCount);
        const operationLocation = response.headers.get('operation-location');
        
        // Poll for results
        return await this.pollForCompletion(operationLocation);
    }

    async startAnalysis(text, sentenceCount) {
        return await fetch(`${this.baseUrl}?api-version=2023-04-01`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: this.getRequestBody(text, sentenceCount)
        });
    }

    async pollForCompletion(operationLocation, maxRetries = 10) {
        for (let i = 0; i < maxRetries; i++) {
            const response = await fetch(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }
            });
            const result = await response.json();
            
            if (result.status === 'succeeded') {
                return result;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Operation timed out');
    }
}
```

### 3. Progress Tracking System

```javascript
class ProgressTracker {
    constructor(progressBar, statusText) {
        this.progressBar = progressBar;
        this.statusText = statusText;
    }

    updateProgress(percent, stage) {
        this.progressBar.style.width = `${percent}%`;
        this.statusText.textContent = `${stage}: ${percent}%`;
    }

    async trackFileRead(reader, file) {
        return new Promise((resolve, reject) => {
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = (event.loaded / event.total) * 100;
                    this.updateProgress(percent, 'Reading file');
                }
            };
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
        });
    }
}
```

## Advanced Features

### 1. Dark Mode Implementation
```javascript
class ThemeManager {
    constructor() {
        this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.darkModeMediaQuery.addListener(e => this.handleThemeChange(e));
    }

    handleThemeChange(e) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
}
```

### 2. File Drop Zone
```javascript
class DropZone {
    constructor(element) {
        this.element = element;
        this.setupListeners();
    }

    setupListeners() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.element.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        this.element.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **File Upload Issues**
   ```javascript
   // Check file size
   if (file.size > 10 * 1024 * 1024) {
       throw new Error('File too large (max 10MB)');
   }

   // Verify file type
   if (!supportedTypes.includes(file.type)) {
       throw new Error('Unsupported file type');
   }
   ```

2. **Azure API Connection**
   - Check network connectivity
   - Verify API key format
   - Ensure endpoint URL is complete
   - Check for CORS issues

3. **Performance Optimization**
   ```javascript
   // Implement debouncing for API calls
   const debounce = (func, wait) => {
       let timeout;
       return (...args) => {
           clearTimeout(timeout);
           timeout = setTimeout(() => func.apply(this, args), wait);
       };
   };
   ```

## How It Works

1. **Document Upload**
   - User can upload a document or paste text directly
   - Supported file types are validated
   - File size limit: 10MB
   - Progress bar shows upload status

2. **Text Extraction**
   - PDFs: Processed using PDF.js
   - Word Documents: Processed using Mammoth.js
   - Text files: Direct text extraction
   - Real-time progress updates

3. **Azure AI Processing**
   - Text is sent to Azure AI Language Service
   - Uses extractive summarization
   - Configurable summary length (3, 5, or 8 sentences)
   - Asynchronous processing with status updates

4. **Result Display**
   - Summary displayed in clean format
   - Error handling with user-friendly messages
   - Loading indicators during processing

## Setup Instructions

1. **Prerequisites**
   ```bash
   # Clone the repository
   git clone [repository-url]
   cd document-summarizer
   ```

2. **Azure Setup**
   - Create an Azure account
   - Set up Azure Language Service
   - Get your API Key and Endpoint URL

3. **Configuration**
   - Enter your Azure credentials in the web interface
   - Credentials are securely stored in localStorage

4. **Running the Application**
   - Open index.html in a modern web browser
   - Or serve using a local server:
     ```bash
     python -m http.server 8000
     # or
     php -S localhost:8000
     ```

## Usage

1. **Enter Azure Credentials**
   - Input your Azure endpoint URL
   - Input your API key
   - Click "Save Credentials"

2. **Upload Document**
   - Drag and drop file or click to upload
   - Or paste text directly into the text area

3. **Choose Summary Length**
   - Short (3 sentences)
   - Medium (5 sentences)
   - Long (8 sentences)

4. **Get Summary**
   - Click "Summarize Now"
   - Wait for processing
   - View the generated summary

## Technical Details

### File Processing
```javascript
// PDF Processing
pdfjsLib.getDocument(typedarray).promise.then(pdf => {
    // Extract text from each page
});

// Word Document Processing
mammoth.extractRawText({ arrayBuffer }).then(result => {
    // Process extracted text
});
```

### Azure AI Integration
```javascript
// API Call Structure
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey
    },
    body: JSON.stringify({
        analysisInput: {
            documents: [{
                id: "1",
                language: "en",
                text: text
            }]
        },
        tasks: [{
            kind: "ExtractiveSummarization",
            parameters: {
                sentenceCount: sentenceCount
            }
        }]
    })
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)

## Responsive Design

- Mobile-first approach
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## Security Features

- Secure credential storage using localStorage
- Password field for API key
- No server-side storage of credentials
- Client-side file processing
- Secure HTTPS communication with Azure

## Error Handling

- File type validation
- File size validation
- Network error detection
- API error handling
- User-friendly error messages

## Future Improvements

- Add support for more file formats
- Implement abstractive summarization
- Add multiple language support
- Enable batch processing
- Add summary export options
- Implement user accounts

## Credits

Created by Lucky Yaduvanshi using Azure AI services.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For more information or support, please contact the developer. 