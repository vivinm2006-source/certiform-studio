"""
Synthetic test data generator for CertiForm Studio QA & Load Testing.
Generates realistic XLSX and CSV rosters with varied participant profiles,
edge cases (long names, unicode, missing optional fields), and malformed files.
"""
import io
import csv
import base64
from typing import List, Dict, Any, Tuple
from pathlib import Path
from openpyxl import Workbook
from PIL import Image, ImageDraw
from qa.config import FIXTURES_DIR

# First names and last names for realistic synthetic generation
FIRST_NAMES = [
    "Aarav", "Ananya", "Aditya", "Bhavna", "Chirag", "Deepika", "Eshwar", "Farhan",
    "Gaurav", "Harini", "Irfan", "Jacqueline", "Karthik", "Lakshmi", "Manish",
    "Naveen", "Oviya", "Praveen", "Quentin", "Rohan", "Sneha", "Tanvi", "Umesh",
    "Vivin", "Waseem", "Xavier", "Yamini", "Zeeshan", "Alexander", "Bartholomew"
]

LAST_NAMES = [
    "Kumar", "Reddy", "Sharma", "Verma", "Patel", "Iyer", "Nair", "Khan",
    "Chatterjee", "Banerjee", "Sengupta", "Pillai", "Deshmukh", "Kulkarni",
    "Mehta", "Bhatt", "Chauhan", "Joshi", "Gowda", "Naidu", "Menon",
    "Montgomery-Cunningham IV", "Vandenberghe-Smyth", "Wellington-Harcourt III"
]

DEPARTMENTS = [
    "Artificial Intelligence and Machine Learning (AI & ML)",
    "Computer Science and Engineering (CSE)",
    "Data Science & Analytics",
    "Electronics and Communication Engineering (ECE)",
    "Information Technology (IT)",
    "Mechanical Engineering",
    "Civil Engineering",
    "Robotics and Automation",
    "Biomedical Engineering"
]

EVENTS = [
    "STARTUP & ENTREPRENEURSHIP SUMMIT 2026",
    "NATIONAL HACKATHON & INNOVATION CONCLAVE",
    "ANNUAL QUANTUM COMPUTING WORKSHOP",
    "GLOBAL CYBERSECURITY SYMPOSIUM"
]

INSTITUTIONS = [
    "Nehru Institute of Technology",
    "National Institute of Advanced Sciences",
    "Vanexa Tech Hub Academy",
    "Indian Institute of Technology",
    "International Institute of Information Technology"
]

def generate_participant_record(idx: int) -> Dict[str, str]:
    f_name = FIRST_NAMES[idx % len(FIRST_NAMES)]
    l_name = LAST_NAMES[idx % len(LAST_NAMES)]
    full_name = f"{f_name} {l_name}"
    dept = DEPARTMENTS[idx % len(DEPARTMENTS)]
    event = EVENTS[idx % len(EVENTS)]
    inst = INSTITUTIONS[idx % len(INSTITUTIONS)]
    
    # Generate varied DOBs
    year = 2000 + (idx % 6)
    month = (idx % 12) + 1
    day = (idx % 28) + 1
    dob = f"{year}-{month:02d}-{day:02d}"
    
    return {
        "Student Name": full_name,
        "Department": dept,
        "Date of Birth": dob,
        "Event Name": event,
        "Institution": inst,
        "Registration ID": f"CERT-2026-{(idx + 1):04d}",
        "Email": f"{f_name.lower()}.{idx+1}@example.com"
    }

def create_synthetic_xlsx(count: int, filename: str = "synthetic_roster.xlsx") -> Path:
    """Create an openpyxl XLSX spreadsheet with exact realistic participant rows."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Participants"
    
    headers = ["Student Name", "Department", "Date of Birth", "Event Name", "Institution", "Registration ID", "Email"]
    ws.append(headers)
    
    for i in range(count):
        row = generate_participant_record(i)
        ws.append([row[h] for h in headers])
        
    out_path = FIXTURES_DIR / filename
    wb.save(out_path)
    return out_path

def create_synthetic_csv(count: int, filename: str = "synthetic_roster.csv") -> Path:
    """Create a CSV roster file."""
    headers = ["Student Name", "Department", "Date of Birth", "Event Name", "Institution", "Registration ID", "Email"]
    out_path = FIXTURES_DIR / filename
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for i in range(count):
            row = generate_participant_record(i)
            writer.writerow([row[h] for h in headers])
    return out_path

def create_malformed_test_files() -> Tuple[Path, Path]:
    """Generate empty and corrupt files for error handling validation."""
    empty_path = FIXTURES_DIR / "empty_spreadsheet.xlsx"
    wb = Workbook()
    wb.save(empty_path)
    
    corrupt_path = FIXTURES_DIR / "corrupt_file.xlsx"
    with open(corrupt_path, "wb") as f:
        f.write(b"NOT_A_VALID_ZIP_OR_SPREADSHEET_BINARY_CONTENT")
        
    return empty_path, corrupt_path

def create_sample_artwork_data_url(width: int = 842, height: int = 595) -> str:
    """Generate a clean synthetic certificate background artwork image as base64 data URL."""
    img = Image.new("RGB", (width, height), color=(251, 249, 245))
    draw = ImageDraw.Draw(img)
    
    # Outer navy and inner gold borders
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(15, 40, 65), width=4)
    draw.rectangle([(32, 32), (width - 32, height - 32)], outline=(200, 157, 66), width=2)
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def ensure_test_fixtures():
    """Ensure standard test fixtures are pre-generated in fixtures directory."""
    create_synthetic_xlsx(10, "roster_10_small.xlsx")
    create_synthetic_xlsx(100, "roster_100_medium.xlsx")
    create_synthetic_xlsx(500, "roster_500_large.xlsx")
    create_synthetic_csv(50, "roster_50.csv")
    create_malformed_test_files()
