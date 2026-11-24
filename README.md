# 🤖 DIA AI — Intelligent Chronic Disease Management Ecosystem

[![Platform](https://img.shields.io/badge/Platform-React%20Native%20%7C%20Expo%20SDK%2054-00E676?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Voice](https://img.shields.io/badge/Voice%20Engine-ElevenLabs%20Conversational%20AI-FF5722?style=flat-square)](https://elevenlabs.io)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)]()
[![Security](https://img.shields.io/badge/Security-Environment%20Guarded%20%26%20Isolated-blueviolet?style=flat-square)]()

> **DIA AI** is an advanced, multimodal AI-powered personal chronic disease management ecosystem. Built for patients battling **Diabetes**, **Hypertension**, **Cardiac Arrhythmia**, **Metabolic Syndrome & Obesity**, and **Asthma**, DIA AI turns daily medical complexity into effortless, proactive health confidence.

---

## 🌟 Core Modules & Capabilities

### 1. 🧭 Intelligent Disease Navigator
- **Dynamic Profile Adaptation:** Customizes user interfaces, clinical thresholds, and safety limits for:
  - **Diabetes:** Glycemic levels, insulin units, carbohydrate counting, and Bread Units (XE).
  - **Hypertension:** Systolic/diastolic blood pressure, pulse rate, and sodium tracking.
  - **Cardiac Arrhythmia:** Rhythm stability, safe heart-rate zones, and cardio telemetry.
  - **Metabolic & Obesity:** Caloric deficit tracking and healthy weight management.
  - **Asthma:** Respiratory exercise compliance and spirometry tracking.
- **Safe Profile Switching:** When changing condition, past biometric and medication records are automatically archived into historical reports without data loss.

### 2. 🧪 Multimodal AI Laboratory Report Scanner (PDF & Camera)
- **Instant Clinical OCR:** Directly analyzes hospital blood sheets (PDF or camera snapshot) via Google Gemini 2.5 Multimodal vision.
- **Precision Extraction:** Accurately extracts parameters like **Hemoglobin (e.g., 94 g/L)**, detects clinical reference norms (120–140 g/L), flags statuses like **Low (Anemia)**, and checks blood glucose if present.
- **Audio Clinical Debriefing:** Synthesizes an immediate clinical voice briefing using ElevenLabs TTS, providing dietary recommendations (iron-rich foods) and customized daily routines.

### 3. 🍽️ Clinical Nutrition & 1-Tap Meal Diary
- **Disease-Specific Recipe Library:** Over 40+ curated recipes with exact breakdowns of calories, sugar, carbs, proteins, and fats.
- **"Eat Now" Instant Sync:** Logging a meal automatically calculates sugar and caloric load, synchronizing in real time with the dashboard and report graphs.
- **Meal Reminders:** Timed notifications for future meal scheduling.

### 4. 🏃 Cardiac-Safe Workouts & Smartwatch Integration (Mibro Fit / Strava)
- **Clinical Safety Rules:** Filtered workout regimens designed to prevent hypoglycemia or hypertensive spikes.
- **Wearable Telemetry:** Live synchronization with smartwatches and Strava, pulling distance, duration, pace, and burned calories directly into the daily health balance.

### 5. 💊 Pharma & Smart Medication Cabinet
- **Precision Medication Tracking:** Categorizes medicines by exact dosage, schedule, and relationship to meals (e.g., 15 minutes before breakfast or right after dinner).
- **Daily Intake Checklist:** Interactive checklist prevents missed doses and accidental double-dosing.

### 6. 🎙️ 24/7 AI Medical Assistant & Voice Engine
- **Trilingual Fluency:** Full native support for **English**, **Uzbek**, and **Russian**.
- **Voice & Chat Interface:** Empathetic, medically sound answers powered by Gemini 2.5 with natural voice synthesis.

### 7. 🔔 Intelligent Push Notification Engine
- **Context-Aware Alerts:** Lockscreen notifications for scheduled pills, post-prandial glucose tests, fasting measurements, and hydration.
- **Offline Reliability:** Schedules local device alarms that trigger reliably even without internet connection.

### 8. 📊 Executive Analytics & 1-Click Clinical PDF Dossier
- **Interactive SVG Charts:** Smooth trend graphs for blood sugar, blood pressure, burned calories, and nutrition.
- **Certified Doctor Dossier:** Generates an official, timestamped PDF report containing patient demographics, complete lab findings, and medication history ready for clinical consultations.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Mobile Frontend** | React Native (0.81.5), Expo SDK 54, React Navigation (v6) |
| **Design & UI** | Custom Glassmorphism, React Native SVG, Linear Gradient, Dark Mode |
| **Artificial Intelligence** | Google Gemini 2.5 Flash Multimodal API |
| **Voice Synthesis** | ElevenLabs Conversational AI & Text-to-Speech |
| **Backend & Services** | FastAPI (Python), Cloud Firestore, Node.js microservices |
| **Wearable & Fitness** | Strava API, Mibro Fit smartwatch telemetry sync |
| **Document Processing** | Expo Print, Expo FileSystem, Expo Sharing, Base64 FileProvider |

---

## 🚀 Recent Updates, Bug Fixes & Improvements

### 🎨 UI & Performance Optimizations
- **Disease Navigator Overhaul:** Removed bulky image banners that broke layout responsiveness on Android devices. Replaced with a modern, high-contrast dark medical gradient for an instant, responsive experience.
- **Liquid SVG Charts:** Optimized rendering pipeline for smooth, lag-free glucose and calorie charts on low-end devices.

### 🔬 Clinical & Lab Analysis Improvements
- **Accurate Hemoglobin Extraction:** Fixed parsing logic to capture exact hemoglobin values (e.g., 94 g/L), evaluate norms (120–140 g/L), and flag anemia conditions with doctor consultation advisories.
- **Eliminated Artificial Values:** Prevented dummy glucose values from appearing when glucose is absent from CBC lab tests.

### ⚡ Functional Bug Fixes
- **Recipe Meal Diary Sync:** Fixed `ReferenceError: setData does not exist` in `RecipesScreen.js`, enabling instant meal consumption logging to the dashboard and reports.
- **Android PDF Export Resolution:** Resolved `Call to function copyAsync has been rejected` on Android SDK 33+ by transitioning PDF generation to direct Base64 encoding.
- **Exercise Caloric Synchronization:** Unified `@exercise_history` storage keys so that burned workout calories are properly reflected on the reports screen.
- **Full Trilingual Localization:** Eliminated remaining hardcoded strings in chat, exercise advice, and reports across English, Uzbek, and Russian.

### 🔐 Security & Privacy Hardening
- **Credential & API Key Isolation:** Strict environment separation (`.env` guarded, `.gitignore` reinforced). Zero API keys or private tokens are tracked in git.
- **Biometric Data Safeguards:** Patient medical records and laboratory documents are protected with local encryption and isolated caching.
- **Safe Profile Archiving:** Transitioning between health conditions automatically archives previous records into historical storage, preventing cross-contamination of diagnosis data.
- **Offline Resilience:** All vital tracking, medication logs, and alarms function continuously without requiring live server connectivity.

---

## 💻 Getting Started for Developers

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your physical device (iOS or Android)

### Installation
```bash
# 1. Clone the repository
git clone git@github.com:waymarmo/DIA-AI.git
cd DIA-AI/DiaAI

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and add your Google Gemini and Firebase credentials

# 4. Start the development server
npx expo start
```

Scan the QR code displayed in the terminal with the Expo Go app (Android) or Camera app (iOS) to run the application.

---

## 📄 License & Attribution
Developed with ❤️ by the **DIA AI Team**. All rights reserved.
