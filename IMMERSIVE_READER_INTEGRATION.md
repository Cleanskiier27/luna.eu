# Immersive Reader Integration Guide
# NetworkBuster Accessibility & NLP Content Formatting System

## 🎯 Overview

The Immersive Reader transforms content into an accessible, engaging reading experience through:
- **AI-Powered Text Enhancement** - NLP formatting, syllable breaks, grammar support
- **Accessibility Features** - Text-to-speech, font customization, dyslexia-friendly options
- **Performance Optimization** - Real-time blob storage integration
- **Personalization** - User preference memory, reading history tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Content Source                              │
│  (Blog, Documents, Real-time Overlay Data)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Content Preprocessing Layer                        │
│  • HTML parsing & sanitization                              │
│  • Markdown conversion                                      │
│  • Link extraction & preservation                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Azure Immersive Reader Service                      │
│  • NLP analysis & enhancement                               │
│  • Grammar highlighting                                    │
│  • Translation & pronunciation                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Frontend Immersive Reader UI                     │
│  • Microsoft Immersive Reader Component                     │
│  • Custom themes & styling                                 │
│  • Reading preferences persistence                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│            Azure Storage & Analytics                        │
│  • Content blob storage (immersive-reader-content)         │
│  • Reading metrics & engagement tracking                   │
│  • User preference storage (tables)                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Integration

### 1. Install Dependencies
```bash
npm install @microsoft/immersive-reader-sdk
npm install axios dotenv
```

### 2. Get Your Credentials
```
Azure Portal → Create resource → Immersive Reader
- Subscription ID
- Resource Group
- Immersive Reader Instance Name
- API Key
- API Endpoint
```

### 3. Create Environment Variables
```env
REACT_APP_IMMERSIVE_READER_SUBSCRIPTION_KEY=your-key
REACT_APP_IMMERSIVE_READER_SUBDOMAIN=your-subdomain
REACT_APP_STORAGE_ACCOUNT_NAME=your-storage
REACT_APP_STORAGE_CONTAINER=immersive-reader-content
```

### 4. Basic Component Implementation
```jsx
import { ImmersiveReaderSDK } from '@microsoft/immersive-reader-sdk';
import { useState } from 'react';

const ImmersiveReaderButton = ({ content, title }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleImmersiveReader = async () => {
    setIsLoading(true);
    try {
      const token = await getImmersiveReaderToken();
      
      const data = {
        title: title,
        chunks: [{ content: content }]
      };

      await ImmersiveReaderSDK.launchAsync(
        token,
        process.env.REACT_APP_IMMERSIVE_READER_SUBDOMAIN,
        data
      );
    } catch (error) {
      console.error('Error launching Immersive Reader:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleImmersiveReader}
      disabled={isLoading}
    >
      📖 Read with Immersive Reader
    </button>
  );
};
```

---

## 🔧 Advanced Features

### Content Preprocessing

**Sanitize & Enhance Content:**
```jsx
const preprocessContent = (htmlContent) => {
  // Remove script tags & dangerous attributes
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title']
  });

  // Extract plain text for NLP processing
  const plainText = clean.replace(/<[^>]*>/g, '');
  
  return {
    html: clean,
    text: plainText
  };
};
```

### Grammar & Syntax Enhancement

**Use Azure Text Analytics for Grammar:**
```javascript
const enhanceWithGrammar = async (text) => {
  const response = await fetch(
    'https://language.cognitive.microsoftsearch.com/analyze',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kind: 'PiiEntityRecognition',
        analysisInput: {
          documents: [{
            id: '1',
            language: 'en',
            text: text
          }]
        }
      })
    }
  );

  return await response.json();
};
```

### Text-to-Speech Integration

**Enable Audio Reading:**
```javascript
const enableTextToSpeech = (content) => {
  const utterance = new SpeechSynthesisUtterance(content);
  
  utterance.rate = 0.9;           // Slower speech
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.lang = 'en-US';

  const synth = window.speechSynthesis;
  synth.speak(utterance);
};
```

### Reading Preferences Persistence

**Save User Settings to Azure Table Storage:**
```javascript
const saveReadingPreferences = async (userId, preferences) => {
  const entity = {
    PartitionKey: 'reading-prefs',
    RowKey: userId,
    fontSize: preferences.fontSize,
    fontFamily: preferences.fontFamily,
    lineSpacing: preferences.lineSpacing,
    textSpacing: preferences.textSpacing,
    syllablesEnabled: preferences.syllablesEnabled,
    grammarEnabled: preferences.grammarEnabled,
    translationEnabled: preferences.translationEnabled,
    columnWidth: preferences.columnWidth,
    theme: preferences.theme,
    timestamp: new Date().toISOString()
  };

  await tableClient.upsertEntity(entity);
};
```

### Reading Analytics Tracking

**Track Engagement Metrics:**
```javascript
const trackReadingMetrics = async (sessionData) => {
  const metrics = {
    userId: sessionData.userId,
    contentId: sessionData.contentId,
    readingDuration: sessionData.duration,
    wordCount: sessionData.wordCount,
    avgWordsPerMinute: (sessionData.wordCount / sessionData.duration) * 60,
    completionRate: sessionData.completionRate,
    textToSpeechUsed: sessionData.usedTTS,
    syllablesHighlightUsed: sessionData.usedSyllables,
    grammarHighlightUsed: sessionData.usedGrammar,
    translationUsed: sessionData.usedTranslation,
    theme: sessionData.theme,
    timestamp: new Date().toISOString()
  };

  // Send to Log Analytics
  await logClient.post('readingMetrics', metrics);
};
```

---

## 🎨 Customization Options

### Reader Options Configuration

```javascript
const readerOptions = {
  uiLang: 'en',
  // Appearance Options
  displayOptions: {
    theme: 'light',              // light | dark | sepia
    fontSize: 100,               // 75-150%
    fontFamily: 'ElegantGaramond', // Segoe UI | Calibri | Georgia | Times New Roman | Courier New | ElegantGaramond
    textSize: 100,               // 75-150%
    lineSpacing: 150,            // 100-200%
    letterSpacing: 100,          // 75-150%
    columnWidth: 400,            // 300-600px
    invert: false,               // High contrast mode
    increaseSpacing: false,
    increasePictureSpacing: false
  },
  // Content Options
  onContainerLoaded: (container) => {
    // Custom styling after reader loads
    container.style.borderRadius = '8px';
  },
  // Text Selection Options
  onDataFiltered: (reader) => {
    console.log('Data filtered', reader.data);
  }
};
```

### Theme Customization

```css
/* Custom Immersive Reader Styling */
.immersive-reader-container {
  --ir-color-primary: #0078d4;
  --ir-color-secondary: #50e6ff;
  --ir-background-light: #ffffff;
  --ir-background-dark: #1e1e1e;
  --ir-text-light: #000000;
  --ir-text-dark: #ffffff;
}

.immersive-reader-container.sepia {
  background-color: #f4ecd8;
  color: #5c4033;
}
```

---

## 📱 Mobile Optimization

### Responsive Design

```jsx
const ImmersiveReaderComponent = ({ content }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mobileOptions = {
    displayOptions: {
      fontSize: isMobile ? 120 : 100,
      columnWidth: isMobile ? 300 : 400,
      lineSpacing: isMobile ? 180 : 150
    }
  };

  return (
    <div className={isMobile ? 'mobile-reader' : 'desktop-reader'}>
      {/* Immersive Reader */}
    </div>
  );
};
```

---

## 🔗 Integration with Real-Time Overlay

### Stream Live Data to Immersive Reader

```javascript
// Real-time overlay → Immersive Reader
const streamLiveDataToReader = async (overlayData) => {
  // Format live metrics for reading
  const content = `
    <h2>Live System Metrics</h2>
    <p><strong>Timestamp:</strong> ${overlayData.timestamp}</p>
    <p><strong>Active Users:</strong> ${overlayData.activeUsers}</p>
    <p><strong>System Load:</strong> ${overlayData.systemLoad}%</p>
    <p><strong>Response Time:</strong> ${overlayData.avgResponseTime}ms</p>
    <p><strong>Sustainability Score:</strong> ${overlayData.sustainabilityScore}/100</p>
  `;

  // Launch Immersive Reader with live data
  await launchImmersiveReader('System Metrics', content);

  // Update every 5 seconds
  setInterval(() => {
    refreshReaderContent(overlayData);
  }, 5000);
};
```

---

## 🧠 AI-Enhanced Content Features

### Automatic Content Summarization

```javascript
const summarizeContent = async (text) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Provide a concise summary of this text:\n\n${text}`
      }]
    })
  });

  return await response.json();
};
```

### Key Phrase Extraction

```javascript
const extractKeyPhrases = async (text) => {
  const response = await fetch(
    'https://language.cognitive.microsoftsearch.com/analyze',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kind: 'KeyPhraseExtraction',
        analysisInput: {
          documents: [{
            id: '1',
            language: 'en',
            text: text
          }]
        }
      })
    }
  );

  return await response.json();
};
```

### Sentiment & Tone Analysis

```javascript
const analyzeSentiment = async (text) => {
  // Analyze emotional tone of content
  const response = await fetch(
    'https://language.cognitive.microsoftsearch.com/analyze',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        kind: 'SentimentAnalysis',
        analysisInput: {
          documents: [{
            id: '1',
            language: 'en',
            text: text
          }]
        }
      })
    }
  );

  return await response.json();
};
```

---

## 🌐 Multi-Language Support

### Content Translation

```javascript
const translateContent = async (text, targetLanguage) => {
  const response = await fetch(
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=${targetLanguage}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
        'Content-Type': 'application/xml'
      },
      body: `<string>${text}</string>`
    }
  );

  return await response.json();
};

// Supported languages: es, fr, de, it, ja, ko, zh-Hans, ar, ru, pt, etc.
```

### Pronunciation Support

```javascript
const getPronunciation = async (text, language = 'en-US') => {
  const response = await fetch(
    'https://tts.speech.microsoft.com/cognitiveservices/v1',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3'
      },
      body: `<speak version='1.0' xml:lang='${language}'>
        <voice name='${getVoiceName(language)}'>
          ${text}
        </voice>
      </speak>`
    }
  );

  return await response.blob();
};
```

---

## 📊 Analytics Dashboard for Immersive Reader

### KQL Queries for Reader Metrics

```kusto
// Reading Session Analytics
ReadingMetricsTable
| where TimeGenerated > ago(30d)
| summarize 
    TotalSessions = count(),
    AvgDuration = avg(ReadingDuration),
    AvgWordsPerMinute = avg(WordsPerMinute),
    UsersUsingTTS = countif(TextToSpeechUsed == true),
    UsersUsingSyllables = countif(SyllablesEnabled == true)
    by Theme, UserSegment
| sort by TotalSessions desc
```

```kusto
// Popular Features Usage
ReadingMetricsTable
| where TimeGenerated > ago(7d)
| summarize 
    TextToSpeechUsage = countif(TextToSpeechUsed) / count() * 100,
    SyllableUsage = countif(SyllablesEnabled) / count() * 100,
    GrammarUsage = countif(GrammarHighlightUsed) / count() * 100,
    TranslationUsage = countif(TranslationUsed) / count() * 100
```

---

## 🚀 Deployment Checklist

- [ ] Create Immersive Reader resource in Azure
- [ ] Install SDK: `npm install @microsoft/immersive-reader-sdk`
- [ ] Configure environment variables
- [ ] Implement content preprocessing
- [ ] Build Immersive Reader component
- [ ] Integrate with real-time overlay
- [ ] Set up analytics tracking
- [ ] Test on mobile devices
- [ ] Configure caching strategy
- [ ] Monitor performance & accuracy
- [ ] Gather user feedback
- [ ] Iterate on features

---

## 🔐 Security Best Practices

1. **Store API Keys Securely**
   - Use Azure Key Vault
   - Rotate keys regularly
   - Never commit keys to git

2. **Sanitize User Input**
   - Use DOMPurify library
   - Validate all content before processing
   - Escape HTML special characters

3. **CORS Configuration**
   - Whitelist only trusted domains
   - Use secure headers (CSP, X-Frame-Options)
   - Implement rate limiting

4. **Data Privacy**
   - Don't send PII to external services
   - Implement GDPR consent flows
   - Log access for compliance

---

## 📚 Resources & References

- **Microsoft Immersive Reader SDK:** https://docs.microsoft.com/immersive-reader/
- **Azure Cognitive Services:** https://docs.microsoft.com/azure/cognitive-services/
- **Text Analytics API:** https://docs.microsoft.com/azure/cognitive-services/text-analytics/
- **Speech Services:** https://docs.microsoft.com/azure/cognitive-services/speech-service/

---

## 🎯 Success Metrics

Track these KPIs after implementation:
- **Engagement:** Average reading session duration
- **Accessibility:** Usage of TTS and special features
- **Performance:** Page load time with reader
- **User Satisfaction:** Feature ratings and feedback
- **Retention:** Return visitor rate

---

**Status:** ✅ **INTEGRATION READY**
**Last Updated:** December 14, 2025
**Version:** 1.0
