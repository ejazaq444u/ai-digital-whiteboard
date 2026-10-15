# AI-Powered Digital Whiteboard with Automatic Handwriting Recognition & Correction

A production-ready, full-stack **AI Digital Whiteboard for Live Online Teaching** designed specifically for Mathematics educators teaching **Class 9, Class 10, Class 11, Class 12, Cambridge O Level, and A Level**.

---

## 🌟 Key Features

### 1. Dedicated AI Handwriting Correction Bar
* **Three Operational Modes:**
  * `OFF`: Writing remains strictly as drawn without AI processing.
  * `SUGGEST`: Automatically analyzes strokes and presents an interactive floating card with recognized formula/text, confidence meter, and alternatives.
  * `AUTO-FIX`: High-confidence recognitions (>78% or conservative 88%) are cleanly converted after a customizable delay (default 1.5s), while retaining the option to restore raw handwriting at any time.
* **Dual Recognition Pipelines:**
  * **English Handwriting Pipeline:** Recognizes sentences, notes, and headings. Supports grammar improvement, spelling correction (e.g. *importent* → *important*), capitalization, and punctuation while strictly preserving embedded math tokens.
  * **Mathematics Pipeline:** Converts equations, powers ($x^2$), subscripts ($a_n$), square roots ($\sqrt{x+2}$), fractions ($\frac{a+b}{c}$), Greek letters ($\alpha, \beta, \theta, \pi, \Delta$), trigonometric functions, limits ($\lim_{x \to 0}$), integrals ($\int_0^1 x^2 \, dx$), and multi-line algebraic steps into crisp vector KaTeX mathematical notation.
* **Non-Destructive Conversion & Full Stroke Preservation:**
  * Converted elements preserve raw pen strokes in their data structure.
  * Right-click or action button: **"Restore Original Handwriting"** instantly replaces converted notation back to the teacher's exact drawn strokes.
  * Side-by-side comparison mode on export.
* **Neat Classroom Handwriting Output:**
  * Converted English text renders in professional handwritten classroom fonts:
    * *Neat Student Handwriting* (`Patrick Hand` / `Kalam`)
    * *Clean Classroom Handwriting* (`Caveat`)
    * *Simple Cursive* (`Cedarville Cursive`)
    * *Neat Print Handwriting* (`Architects Daughter`)

### 2. Mathematics Tools & Teaching Whiteboard
* **Dedicated Manual LaTeX & Math Editor:**
  * Interactive LaTeX editor with live KaTeX preview.
  * Quick-palette buttons for fractions, square roots, integrals, quadratic formula, summations, matrices, limits, and Greek symbols.
* **Teaching Canvas & Tools:**
  * Pointer Events engine supporting mouse, touch, and stylus pen pressure.
  * Smooth quadratic Bezier spline interpolation.
  * Tools: Select & Move, Pen, Pencil, Highlighter, Eraser, Text, Shapes (Rect, Circle, Triangle, Star, Line, Arrow, Coordinate Axes), Sticky Notes, Laser Pointer with fading trails.
  * Backgrounds: Square Math Grid, Coordinate Plane (X-Y labeled axes), Ruled Lined Notebook, Dotted Grid, Blank Dark Board.
  * Multi-touch zoom (25% to 400%) and spacebar/middle-click pan.

### 3. Ultra-Fast 60 FPS Lesson Screen Recorder (New)
* **Zero-Lag Hardware Accelerated Recording:**
  * **Fastest Canvas + Voice Mode:** Uses `canvas.captureStream(60)` to record directly from GPU with 0 system latency. Starts instantly without browser screen selection prompts or operating system clutter.
  * **Full Screen / Window Mode:** Uses WebRTC `getDisplayMedia` to capture the entire monitor or specific application windows.
* **Microphone Voice Recording:** Captures teacher narration with noise suppression and echo cancellation merged directly into the recording.
* **Controls:** 🔴 Live recording timer pill, ⏸️ Pause/Resume, ⏹️ Finish, instant in-app video preview, and 1-click HD WebM download.

### 4. Board Themes & Paper Styles
* **1-Click ☀️/🌙 Theme Switcher:**
  * ☀️ **Classic Whiteboard:** Clean, crisp dry-erase white board with automatic dark markers.
  * 📜 **Warm Paper / Cream:** Soft ivory paper for comfortable, eye-friendly reading.
  * 🌲 **Green Chalkboard:** Traditional university chalkboard with chalk styling.
  * 🌙 **Dark Slate Board:** High-contrast modern dark mode.
* **5 Page Patterns:** Square Math Grid, Coordinate Plane (X-Y), Ruled Lined Notebook, Dotted Grid, and Blank.

### 5. Live Classroom Collaboration & Permissions
* Unique Room Join Code (e.g. `MATH-1001`) and 1-click shareable link.
* Socket.IO real-time synchronization for strokes, converted math blocks, page turns, and live laser pointer.
* Teacher permission controls: toggle student drawing permission (`Allow Students to Write` vs `View Only`).

### 6. Multi-Page Lessons & PDF/Worksheet Annotation
* Multi-page drawer: Add, duplicate, rename, reorder, and delete lesson pages.
* PDF & Image upload: Annotate over curriculum past papers and geometry worksheets.
* Export to multi-page PDF, PNG, JPG, or JSON lesson project file.

### 5. Resilient Architecture & Configurable AI Providers
* **Local Offline Engine:** Included high-precision mathematical syntax and English NLP parser works 100% out of the box without requiring external API keys.
* **Cloud OCR Providers:** Optional plug-and-play integrations for **Mathpix OCR API** and **Google Gemini 2.5 Flash Vision / OpenAI GPT-4o Vision**.
* **Zero Secrets in Frontend:** All recognition requests pass through backend endpoints with JWT authentication and environment variable security.
* **Resilient Database:** Mongoose integration with automated embedded persistent JSON backup fallback.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18+ or v20+)
* **NPM** (v9+)

### Installation

1. Clone or open the project directory:
   ```bash
   cd "d:\PROJECT 1"
   ```

2. Dependencies are already installed in `server` and `client`. To reinstall if needed:
   ```bash
   npm --prefix server install
   npm --prefix client install
   ```

3. Build the frontend and backend:
   ```bash
   npm run build
   ```

4. Start the full-stack application:
   ```bash
   npm start
   ```
   The application is now live at: **`http://localhost:5000`**

---

## 👩‍🏫 Demo Teacher Credentials

For instant testing, pre-seeded demo accounts are available:

* **Role:** Teacher
* **Email:** `teacher@mathboard.ai`
* **Password:** `password123`
* *(Or simply click the **"Sign in as Demo Teacher"** button on the login screen for 1-click access)*

### Pre-Seeded Sample Live Classroom
* **Room Code:** `MATH-1001`
* **Title:** Class 12 & A-Level: Calculus & Quadratic Equations
* Contains multi-page lessons with quadratic formula, calculation steps, and calculus integrals.

---

## 🔑 Configuring Cloud AI API Keys (Optional)

The application works completely offline using the built-in mathematical syntax and NLP parser. To enable cloud OCR services:

1. In the Whiteboard dashboard, click **"AI Recognition Keys"**, or edit `server/.env`:
   ```env
   # Mathpix API (for Math OCR)
   MATHPIX_APP_ID=your_app_id
   MATHPIX_APP_KEY=your_app_key

   # Google Gemini API (for multimodal vision recognition)
   GEMINI_API_KEY=your_gemini_api_key

   # OpenAI API (optional fallback)
   OPENAI_API_KEY=your_openai_api_key
   ```
2. Keys remain securely on the backend.

---

## 🧪 Verified Test Scenarios

| Test Scenario | Input Handwriting | Converted Neat Output | Result |
|---|---|---|---|
| **English Spelling & Grammar** | `"Mathematics is very importent subject"` | `"Mathematics is a very important subject."` | ✅ Corrected & styled |
| **Quadratic Equation** | `x2 + 5x + 6 = 0` | $x^2 + 5x + 6 = 0$ | ✅ Exponent recognized |
| **Square Root Expression** | `sqrt x plus 2` | $\sqrt{x} + 2$ | ✅ Clean radical |
| **Algebraic Fraction** | `(a+b)/c` | $\frac{a+b}{c}$ | ✅ Fraction bar formatted |
| **Calculus Integral** | `int_0^1 x^2 dx` | $\int_0^1 x^2 \, dx$ | ✅ Definite integral |
| **Multi-line Steps** | $2x+5=15 \to 2x=15-5 \to 2x=10 \to x=5$ | Step-by-step aligned calculation | ✅ Preserved calculation steps |
| **Quadratic Formula** | `-b +- sqrt(b^2-4ac) / 2a` | $\frac{-b \pm \sqrt{b^2-4ac}}{2a}$ | ✅ High precision LaTeX |
| **Handwriting Recovery** | Converted KaTeX / Text card | Click *"Restore Original Handwriting"* | ✅ Raw strokes restored |
