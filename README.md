# BigQuery Release Notes Viewer

A modern, responsive, developer-oriented web dashboard to track and share updates from Google Cloud BigQuery. The application fetches the official BigQuery Release Notes feed, splits complex multi-update daily releases into separate filterable cards, and provides a customizable Twitter/X composer with automatic character limits.

---

## ✨ Features

- **Direct Feed Integration**: Real-time server-side fetching from the official [GCP BigQuery Release Notes Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
- **Intelligent Category Splitting**: Automatically splits single daily feed updates by category headings (`<h3>`), separating features, announcements, issues, and deprecations into individual cards.
- **Dynamic CSS Badges**: Cards are highlighted and badged based on update type:
  - 🟢 **Feature**
  - 🟡 **Announcement**
  - 🔴 **Issue**
  - 🟠 **Deprecation**
- **Instant Search & Filtering**: Instant, client-side keyword search matching text across titles, descriptions, and dates, combined with filter pills for category selection.
- **Twitter/X Web Composer**: Integrated tweet dialog that pre-composes updates, displays character counts, and enforces limits (handling 23-character URL wraps) before launching Twitter's sharing intent.
- **Modern Shimmer Skeletons**: Interactive loading spinner and shimmering layout placeholders to indicate backend sync processes.

---

## 📂 Project Structure

```text
bq_release_notes/
│
├── static/
│   ├── css/
│   │   └── styles.css      # Custom dark-theme rules, grids, and skeleton loaders
│   └── js/
│       └── app.js          # Core frontend state, rendering, search filters, and modal handling
│
├── templates/
│   └── index.html          # Main HTML structure and Twitter Composer modal markup
│
├── .gitignore              # Standard ignore paths for Python, Flask, and IDE files
├── app.py                  # Flask backend server containing fetch, parse, and API routing
├── README.md               # Project documentation (this file)
└── requirements.txt        # Backend dependencies list (Flask)
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher installed on your system.

### 1. Clone or Copy the Files
Ensure your project files are situated inside a directory (e.g., `bq_release_notes`).

### 2. Set Up a Virtual Environment (Recommended)
Navigate to the project directory and create a virtual environment:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
Install Flask using the provided requirements file:
```bash
pip install -r requirements.txt
```

### 4. Run the Application
Start the Flask development server:
```bash
python app.py
```

By default, the server will start in debug mode on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**. Open this link in your browser to view the application.

---

## 🛠️ Technical Breakdown

### Backend (Server-side)
The file `app.py` acts as a proxy server. It requests the XML data directly from Google Cloud, parses the XML tree utilizing Python's built-in `xml.etree.ElementTree` parser, and divides combined daily release contents using regular expressions. This data is mapped into JSON and output at `/api/release-notes`.

### Frontend (Client-side)
- `index.html` loads the visual components.
- `styles.css` handles design aesthetics, dynamic transitions, responsiveness, and dark-theme variables.
- `app.js` is the state manager. It fetches the JSON data, calculates relative time (e.g. "3 days ago" or "Yesterday") against the current date, filters updates on-the-fly, and triggers the Twitter Web Intent popup.
