นี่คือไฟล์ README.md ที่เขียนแบบ Bilingual (ไทย-อังกฤษ) ในไฟล์เดียวครับ

สไตล์การเขียน:

ทางการ & กระชับ (Professional & Concise): ไม่อารัมภบทเยอะ ตรงเข้าประเด็นเทคนิค

Human-Written Feel: ใช้คำศัพท์ที่ Dev คุยกันจริงๆ (เช่น "Client-side", "CORS", "Payload") ตัดคำฟุ่มเฟือยแบบ AI ทิ้งไป

คุณสามารถ Copy โค้ดด้านล่างไปสร้างไฟล์ README.md ได้เลยครับ

Markdown

# Thailand District Selector / ระบบเลือกพื้นที่รายอำเภอ

**[English]**
A lightweight, client-side web application for selecting Thai administrative districts (Amphoe) via an interactive map. Optimized for performance using Leaflet's Canvas renderer and TopoJSON.

**[ภาษาไทย]**
เว็บแอปพลิเคชันสำหรับเลือกพื้นที่การปกครองระดับอำเภอผ่านแผนที่ Interactive พัฒนาโดยเน้นประสิทธิภาพ (Performance) และการจัดการ Memory รองรับการทำงานบน Browser ทั่วไปโดยไม่ต้องติดตั้ง Backend

---

## ✨ Key Features (ฟีเจอร์หลัก)

* **Interactive Vector Map:** Renders all districts using TopoJSON for minimal data payload.
    * *แสดงผลแผนที่ Vector ความละเอียดสูง โหลดข้อมูลรวดเร็ว*
* **Smart Selection:** Click to select districts, or use **Shift + Click** to select an entire province instantly.
    * *คลิกเพื่อเลือกรายอำเภอ หรือกด **Shift + คลิก** เพื่อเลือกเหมาทั้งจังหวัด*
* **Performance Optimized:** Uses Canvas rendering instead of SVG to handle thousands of polygon elements smoothly.
    * *ใช้เทคนิค Canvas Rendering ลดการหน่วงเมื่อแสดงผล Polygon จำนวนมาก*
* **Customization:** Real-time controls for map label font size and color.
    * *ปรับขนาดและสีของตัวอักษรบนแผนที่ได้ทันที*
* **Data Export:** Automatically generates a formatted summary text for clipboard copying.
    * *สร้างสรุปรายการพื้นที่ที่เลือกให้อัตโนมัติ พร้อมปุ่ม Copy*

---

## 📂 Project Structure

```text
.
├── index.html                     # Main application entry point
├── style.css                      # Custom styling
├── script.js                      # Core logic & map rendering
├── thailand_province_amphoe.json  # District geometry data (TopoJSON)
└── province_simplify.json         # Province geometry data
🚀 Setup & Installation
⚠️ Important Note: This project fetches local JSON files. Due to browser CORS (Cross-Origin Resource Sharing) policies, you cannot open index.html directly by double-clicking it (file:// protocol will fail). You must serve it via a local HTTP server.

⚠️ ข้อควรระวัง: โปรเจกต์นี้มีการเรียกไฟล์ JSON ภายใน คุณ ไม่สามารถ ดับเบิลคลิกไฟล์ index.html เพื่อเปิดตรงๆ ได้ (จะติด permission เรื่อง CORS) ต้องรันผ่าน Local Server เท่านั้น

Quick Start
Option 1: VS Code (Recommended)

Install "Live Server" extension.

Right-click index.html > Select "Open with Live Server".

Option 2: Python Run the command in the project directory:

Bash

# Python 3
python -m http.server 8000
Then open http://localhost:8000 in your browser.

🛠 Tech Stack
Core: HTML5, CSS3, JavaScript (ES6+)

Map Engine: Leaflet.js

Data Format: TopoJSON

Styling: Tailwind CSS (via CDN)

📝 Developer Notes
Tailwind Console Warning: You might see a console warning about using Tailwind CDN in production. This is expected for this client-side setup and can be ignored.

Label Rendering: To save memory, district labels are only rendered when the zoom level is high enough (>8) and the element is within the viewport.

License
Distributed under the MIT License.