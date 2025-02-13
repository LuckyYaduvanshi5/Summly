class DocumentSummarizer {
    constructor() {
        this.endpoint = localStorage.getItem('azure_endpoint') || '';
        this.apiKey = localStorage.getItem('azure_api_key') || '';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedTypes = {
            'application/pdf': 'PDF',
            'text/plain': 'Text',
            'application/msword': 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/vnd.oasis.opendocument.text': 'ODT',
            'text/rtf': 'RTF'
        };
        this.initializeElements();
        this.addEventListeners();
        this.updateCredentialFields();
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.endpointInput = document.getElementById('endpoint');
        this.saveKeyBtn = document.getElementById('saveKey');
        this.documentInput = document.getElementById('documentInput');
        this.summaryLength = document.getElementById('summaryLength');
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.summaryOutput = document.getElementById('summaryOutput');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.fileUpload = document.getElementById('fileUpload');
        this.progressBar = document.getElementById('progressBar');
        this.progressContainer = document.getElementById('progressContainer');
        this.errorDisplay = document.getElementById('errorDisplay');
        this.fileInfo = document.getElementById('fileInfo');
        
        // Set saved credentials if they exist
        this.apiKeyInput.value = this.apiKey;
        this.endpointInput.value = this.endpoint;
        
        // Show credential inputs since we're using localStorage
        document.querySelector('.api-key-section').style.display = 'block';
    }

    updateCredentialFields() {
        if (this.apiKeyInput && this.endpointInput) {
            this.apiKeyInput.value = this.apiKey;
            this.endpointInput.value = this.endpoint;
        }
    }

    addEventListeners() {
        this.saveKeyBtn.addEventListener('click', () => this.saveCredentials());
        this.summarizeBtn.addEventListener('click', () => this.summarizeText());
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.documentInput.addEventListener('input', () => {
            this.showError('');
        });
    }

    saveCredentials() {
        const key = this.apiKeyInput.value.trim();
        const endpoint = this.endpointInput.value.trim();
        if (key && endpoint) {
            this.apiKey = key;
            this.endpoint = endpoint;
            localStorage.setItem('azure_api_key', key);
            localStorage.setItem('azure_endpoint', endpoint);
            alert('Azure credentials saved successfully!');
        } else {
            alert('Please enter both Azure endpoint and key');
        }
    }

    async summarizeText() {
        if (!this.apiKey || !this.endpoint) {
            alert('Please enter your Azure credentials first');
            return;
        }

        const text = this.documentInput.value.trim();
        if (!text) {
            alert('Please enter some text to summarize');
            return;
        }

        this.showLoading(true);
        this.summaryOutput.textContent = '';

        try {
            const summary = await this.callAzure(text);
            this.summaryOutput.textContent = summary;
        } catch (error) {
            console.error('Detailed error:', error);
            this.summaryOutput.textContent = `Error: ${error.message}`;
            if (error.message.includes('401')) {
                alert('Invalid credentials. Please check your Azure API key and endpoint.');
            } else if (error.message.includes('429')) {
                alert('Rate limit exceeded. Please try again later.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async callAzure(text) {
        const lengthChoice = this.summaryLength.value;
        let sentenceCount;
        switch (lengthChoice) {
            case 'short':
                sentenceCount = 3;
                break;
            case 'medium':
                sentenceCount = 5;
                break;
            case 'long':
                sentenceCount = 8;
                break;
        }

        try {
            const url = `${this.endpoint}/language/analyze-text/jobs?api-version=2023-04-01`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.apiKey
                },
                body: JSON.stringify({
                    analysisInput: {
                        documents: [
                            {
                                id: "1",
                                language: "en",
                                text: text
                            }
                        ]
                    },
                    tasks: [
                        {
                            kind: "ExtractiveSummarization",
                            parameters: {
                                sentenceCount: sentenceCount
                            }
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `API request failed with status ${response.status}: ${
                        errorData.error?.message || 'Unknown error'
                    }`
                );
            }

            const operationLocation = response.headers.get('operation-location');
            if (!operationLocation) {
                throw new Error('No operation location received from Azure');
            }

            // Poll for results
            const result = await this.pollForResults(operationLocation);
            
            // Fix the summary extraction
            const summaryResult = result.tasks.items[0]?.results?.documents[0];
            if (!summaryResult || !summaryResult.sentences) {
                throw new Error('Invalid response format from Azure');
            }
            
            // Extract just the text from each sentence
            const summary = summaryResult.sentences.map(sentence => sentence.text).join(' ');
            
            if (!summary) {
                throw new Error('Failed to get summary from Azure');
            }
            
            return summary;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            }
            throw error;
        }
    }

    async pollForResults(operationLocation) {
        const maxRetries = 10;
        const delayMs = 1000;

        for (let i = 0; i < maxRetries; i++) {
            const response = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Polling failed with status ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'succeeded') {
                return result;
            } else if (result.status === 'failed') {
                throw new Error('Analysis failed');
            }

            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('Polling timed out');
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size
        if (file.size > this.maxFileSize) {
            this.showError(`File size exceeds 10MB limit. Please choose a smaller file.`);
            return;
        }

        // Validate file type
        if (!this.supportedTypes[file.type]) {
            this.showError(`Unsupported file type. Supported formats: ${Object.values(this.supportedTypes).join(', ')}`);
            return;
        }

        // Show file info
        this.showFileInfo(file);
        
        this.showLoading(true);
        this.showProgress(0);
        
        try {
            const text = await this.extractTextFromFile(file);
            this.documentInput.value = text;
            
            // Automatically trigger summarization
            await this.summarizeText();
        } catch (error) {
            console.error('File processing error:', error);
            this.showError(`Error processing file: ${error.message}. Please try again or use a different file.`);
        } finally {
            this.showLoading(false);
            this.showProgress(100);
        }
    }

    showError(message, type = 'error') {
        if (!this.errorDisplay) return;
        this.errorDisplay.textContent = message;
        this.errorDisplay.style.display = message ? 'block' : 'none';
        
        // Update style based on message type
        if (type === 'success') {
            this.errorDisplay.style.backgroundColor = '#e8f5e9';
            this.errorDisplay.style.color = '#2e7d32';
            this.errorDisplay.style.borderLeftColor = '#2e7d32';
        } else {
            this.errorDisplay.style.backgroundColor = '#ffebee';
            this.errorDisplay.style.color = '#d32f2f';
            this.errorDisplay.style.borderLeftColor = '#d32f2f';
        }
    }

    showFileInfo(file) {
        if (!this.fileInfo) return;
        const size = (file.size / 1024 / 1024).toFixed(2);
        this.fileInfo.innerHTML = `
            <strong>File:</strong> ${file.name}<br>
            <strong>Type:</strong> ${this.supportedTypes[file.type]}<br>
            <strong>Size:</strong> ${size}MB
        `;
        this.fileInfo.style.display = 'block';
    }

    showProgress(percent) {
        if (!this.progressBar || !this.progressContainer) return;
        this.progressBar.style.width = `${percent}%`;
        this.progressContainer.style.display = percent < 100 ? 'block' : 'none';
    }

    async extractTextFromFile(file) {
        return new Promise((resolve, reject) => {
            // Update progress for file reading
            const updateProgress = (percent) => {
                this.showProgress(Math.round(percent));
            };

            if (file.type === 'application/pdf') {
                const fileReader = new FileReader();
                fileReader.onload = async (event) => {
                    const typedarray = new Uint8Array(event.target.result);
                    try {
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let text = '';
                        const totalPages = pdf.numPages;
                        
                        for (let i = 1; i <= totalPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += content.items.map(item => item.str).join(' ') + '\n';
                            updateProgress((i / totalPages) * 50); // First 50% for PDF processing
                        }
                        resolve(text);
                    } catch (error) {
                        reject(new Error('Failed to process PDF: ' + error.message));
                    }
                };
                fileReader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        updateProgress((event.loaded / event.total) * 25);
                    }
                };
                fileReader.readAsArrayBuffer(file);
            } else if (file.type === 'text/plain' || file.type === 'text/rtf') {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Failed to read text file: ' + e.target.error));
                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        updateProgress((event.loaded / event.total) * 100);
                    }
                };
                reader.readAsText(file);
            } else if (file.type.includes('word') || file.type.includes('openxmlformats-officedocument') || file.type.includes('opendocument')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        updateProgress(75);
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        resolve(result.value);
                    } catch (error) {
                        reject(new Error('Failed to process document: ' + error.message));
                    }
                };
                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        updateProgress((event.loaded / event.total) * 50);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error('Unsupported file type'));
            }
        });
    }

    showLoading(show) {
        this.loadingSpinner.classList.toggle('hidden', !show);
        this.summarizeBtn.disabled = show;
        if (show) {
            this.summarizeBtn.textContent = 'Processing...';
        } else {
            this.summarizeBtn.textContent = 'Summarize';
        }
    }
}

// Initialize pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new DocumentSummarizer();
});
