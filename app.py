import urllib.request
import xml.etree.ElementTree as ET
import re
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Fetch the XML feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        # Parse the XML
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = root.findall('atom:entry', ns)
        all_updates = []
        
        for idx, entry in enumerate(entries):
            # Extract basic entry fields
            date_str = entry.find('atom:title', ns).text or ""
            updated_str = entry.find('atom:updated', ns).text or ""
            
            link_el = entry.find('atom:link', ns)
            link_url = ""
            if link_el is not None:
                link_url = link_el.attrib.get('href', "")
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Split the content html by <h3> tags
            # The structure is usually: <h3>Type</h3> <p>text</p> ...
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            if len(parts) > 1:
                # Iterate in steps of 2 starting at index 1
                # parts[0] is everything before the first <h3> (usually empty or whitespace)
                # parts[1] is the first type (e.g. 'Feature')
                # parts[2] is the content after the first <h3> and before the second <h3>
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_body = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Generate a unique ID for each split update
                    unique_id = f"{updated_str}-{i}"
                    
                    all_updates.append({
                        "id": unique_id,
                        "date": date_str,
                        "updated": updated_str,
                        "type": update_type,
                        "content": update_body,
                        "link": link_url
                    })
            else:
                # Fallback if no <h3> headings exist in content
                unique_id = f"{updated_str}-0"
                all_updates.append({
                    "id": unique_id,
                    "date": date_str,
                    "updated": updated_str,
                    "type": "General",
                    "content": content_html.strip(),
                    "link": link_url
                })
                
        return all_updates, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    updates, error = fetch_and_parse_feed()
    if error:
        return jsonify({"success": False, "error": error}), 500
    return jsonify({"success": True, "data": updates})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
