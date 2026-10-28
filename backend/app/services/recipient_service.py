import csv
import io
from typing import List, Dict, Any, Tuple
import openpyxl
from sqlalchemy.orm import Session
from app.models import Recipient, FormField, Project

SYNONYM_MAP = {
    # Recipient name synonyms
    "name": "recipient_name",
    "full_name": "recipient_name",
    "fullname": "recipient_name",
    "participant_name": "recipient_name",
    "participant": "recipient_name",
    "student_name": "recipient_name",
    "student": "recipient_name",
    "attendee_name": "recipient_name",
    "attendee": "recipient_name",
    "candidate_name": "recipient_name",
    "candidate": "recipient_name",
    "recipient": "recipient_name",
    "recipient_name": "recipient_name",
    "person_name": "recipient_name",
    "person": "recipient_name",
    "member_name": "recipient_name",
    "member": "recipient_name",
    "first_name": "recipient_name",
    "firstname": "recipient_name",
    "last_name": "recipient_name",
    "username": "recipient_name",
    
    # Email synonyms
    "mail": "email",
    "email_address": "email",
    "e_mail": "email",
    "emailaddress": "email",
    
    # Phone synonyms
    "phone": "phone_number",
    "mobile": "phone_number",
    "contact": "phone_number",
    
    # Registration & Credential ID
    "registration_no": "registration_id",
    "reg_no": "registration_id",
    "reg_id": "registration_id",
    "roll_no": "registration_id",
    "id": "registration_id",
    "certificate_id": "certificate_id",
    
    # Department / Academic Branch
    "department": "department",
    "dept": "department",
    "branch": "department",
    "stream": "department",
    "discipline": "department",
    "major": "department",

    # Organization / College / Institution
    "organization": "institution",
    "org": "institution",
    "company": "institution",
    "college": "institution",
    "university": "institution",
    "school": "institution",
    "institute": "institution",
    "institution": "institution",
    "venue": "venue",
    "location": "venue",
    
    # Award / Course / Event / Session Topic
    "award": "award_category",
    "category": "award_category",
    "course": "course_name",
    "course_name": "course_name",
    "date": "event_date",
    "event_date": "event_date",
    "event": "event_name",
    "event_name": "event_name",
    "session": "event_name",
    "session_topic": "event_name",
    "topic": "event_name",
    "theme": "event_name",
    "workshop": "event_name",
    "conference": "event_name",
}

def suggest_column_mapping(headers: List[str], available_keys: List[str]) -> Dict[str, str]:
    """
    Intelligently map spreadsheet headers to form field binding keys.
    Uses exact, lowercase, normalized, and synonym matching.
    """
    mapping = {}
    normalized_keys = {k.lower().replace(" ", "_").replace("-", "_"): k for k in available_keys}
    
    for h in headers:
        if not h:
            continue
        h_clean = h.strip()
        h_norm = h_clean.lower().replace(" ", "_").replace("-", "_")
        
        # 1. Exact match with available keys
        if h_clean in available_keys:
            mapping[h_clean] = h_clean
        # 2. Normalized match
        elif h_norm in normalized_keys:
            mapping[h_clean] = normalized_keys[h_norm]
        # 3. Synonym dictionary lookup
        elif h_norm in SYNONYM_MAP and SYNONYM_MAP[h_norm] in available_keys:
            mapping[h_clean] = SYNONYM_MAP[h_norm]
        else:
            # 4. Partial substring match
            matched = False
            for norm_k, orig_k in normalized_keys.items():
                if norm_k in h_norm or h_norm in norm_k:
                    mapping[h_clean] = orig_k
                    matched = True
                    break
            if not matched:
                mapping[h_clean] = ""  # Let user choose or ignore
                
    return mapping

def parse_csv_content(content_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parse CSV bytes and return headers and raw row dictionaries."""
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")
        
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return [], []
        
    raw_headers = rows[0]
    last_col = -1
    for i, h in enumerate(raw_headers):
        if h and h.strip():
            last_col = i
    if last_col == -1:
        return [], []
        
    headers = [raw_headers[i].strip() if i < len(raw_headers) and raw_headers[i].strip() else f"Column_{i+1}" for i in range(last_col + 1)]
    data_rows = []
    
    for row_vals in rows[1:]:
        if not any(v.strip() for v in row_vals):
            continue  # skip empty lines
        row_dict = {}
        for idx, h in enumerate(headers):
            val = row_vals[idx].strip() if idx < len(row_vals) else ""
            row_dict[h] = val
        data_rows.append(row_dict)
        
    return headers, data_rows

def parse_xlsx_content(content_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Parse XLSX bytes and return headers and raw row dictionaries."""
    wb = openpyxl.load_workbook(filename=io.BytesIO(content_bytes), data_only=True)
    sheet = wb.active
    
    headers = []
    data_rows = []
    
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
        if row_idx == 0:
            last_col = -1
            for i, cell in enumerate(row):
                if cell is not None and str(cell).strip():
                    last_col = i
            if last_col == -1:
                return [], []
            headers = [str(row[i]).strip() if i < len(row) and row[i] is not None and str(row[i]).strip() else f"Column_{i+1}" for i in range(last_col + 1)]
        else:
            if not any(cell is not None and str(cell).strip() != "" for cell in row):
                continue
            row_dict = {}
            for col_idx, h in enumerate(headers):
                cell_val = row[col_idx] if col_idx < len(row) else ""
                row_dict[h] = str(cell_val).strip() if cell_val is not None else ""
            data_rows.append(row_dict)
            
    return headers, data_rows

def generate_empty_excel_template(form_fields: List[FormField]) -> bytes:
    """Generate empty Excel template matching the project's active form fields."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Recipients"
    
    headers = [field.label for field in form_fields]
    if not headers:
        headers = ["Recipient Name", "Email", "Institution", "Award Category"]
        
    ws.append(headers)
    
    # Add example row
    sample_row = []
    for f in form_fields:
        if "name" in f.binding_key:
            sample_row.append("Ananya Kumar")
        elif "email" in f.binding_key:
            sample_row.append("ananya@example.com")
        elif "date" in f.binding_key:
            sample_row.append("2026-10-27")
        elif "id" in f.binding_key:
            sample_row.append("REG-2026-001")
        else:
            sample_row.append(f.default_value or "Sample Value")
    if sample_row:
        ws.append(sample_row)
        
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
