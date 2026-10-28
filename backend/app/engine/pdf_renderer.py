import io
import os
import re
import base64
import unicodedata
from typing import Dict, Any, List, Optional
from reportlab.lib.colors import HexColor, white, black, transparent
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from app.config import settings
from app.engine.coordinates import CoordinateTransformer
from app.engine.qr_generator import generate_qr_bytes

def sanitize_text_for_pdf(text: str) -> str:
    """
    Sanitize and transliterate non-Latin-1 characters so ReportLab Type 1 vector
    fonts render cleanly without missing glyph boxes or font errors across all operating systems.
    """
    if not text:
        return ""
    try:
        text.encode("latin-1")
        return text
    except UnicodeEncodeError:
        result = []
        for ch in text:
            try:
                ch.encode("latin-1")
                result.append(ch)
            except UnicodeEncodeError:
                if ch == 'ł': result.append('l')
                elif ch == 'Ł': result.append('L')
                elif ch == 'đ': result.append('d')
                elif ch == 'Đ': result.append('D')
                elif ch in ('ø', 'Ø'): result.append('o' if ch == 'ø' else 'O')
                else:
                    decomposed = unicodedata.normalize('NFKD', ch)
                    base = ''.join(c for c in decomposed if not unicodedata.combining(c))
                    result.append(base if base else '')
        return ''.join(result)

def decode_asset_to_reader(asset_url: Optional[str]) -> Optional[ImageReader]:
    """Decode base64 data URL or load from storage path as ReportLab ImageReader."""
    if not asset_url:
        return None
    try:
        if asset_url.startswith("data:image"):
            header, encoded = asset_url.split(",", 1)
            data = base64.b64decode(encoded)
            return ImageReader(io.BytesIO(data))
        elif os.path.isfile(asset_url):
            return ImageReader(asset_url)
        elif asset_url.startswith("/storage/"):
            relative = asset_url.replace("/storage/", "")
            local_path = settings.STORAGE_DIR / relative
            if local_path.exists():
                return ImageReader(str(local_path))
    except Exception as e:
        print(f"Failed to load image for PDF: {e}")
    return None

def resolve_text_variables(template_str: str, recipient_data: Dict[str, Any], credential_id: Optional[str] = None) -> str:
    """Resolve dynamic placeholder tags like {{recipient_name}}."""
    if not template_str:
        return ""
    
    merged = dict(recipient_data)
    if credential_id:
        merged["certificate_id"] = credential_id
        merged["credential_id"] = credential_id
    
    def replacer(match):
        key = match.group(1).strip()
        val = merged.get(key)
        if val is None:
            key_norm = key.lower().replace(" ", "_")
            val = merged.get(key_norm)
        if val is None and "name" in key.lower():
            for cand in ("recipient_name", "full_name", "name", "student_name", "participant_name"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
        return str(val) if val is not None else match.group(0)
    
    return re.sub(r"\{\{([^}]+)\}\}", replacer, template_str)

def extract_element_text(el: Dict[str, Any], recipient_data: Dict[str, Any], credential_id: Optional[str] = None) -> str:
    """
    Intelligently resolves dynamic text element value with smart fuzzy fallbacks.
    Prioritizes real recipient data over static template placeholder content.
    """
    el_type = el.get("element_type")
    b_key = el.get("binding_key")
    content = el.get("content", "")
    
    if el_type == "dynamic_text":
        # 1. Exact binding key match
        if b_key and b_key in recipient_data and recipient_data[b_key] is not None and str(recipient_data[b_key]).strip():
            return str(recipient_data[b_key]).strip()
            
        # 2. Normalized binding key match
        if b_key:
            norm_b = b_key.lower().replace(" ", "_")
            if norm_b in recipient_data and recipient_data[norm_b] is not None and str(recipient_data[norm_b]).strip():
                return str(recipient_data[norm_b]).strip()
                
        # 3. Smart Name Aliases for name bindings
        if b_key in ("recipient_name", "name", "full_name", "student_name", "participant_name") or not b_key:
            for candidate_key in ("recipient_name", "full_name", "name", "student_name", "participant_name", "candidate_name", "Full Name", "Name", "Student Name"):
                if candidate_key in recipient_data and recipient_data[candidate_key] is not None and str(recipient_data[candidate_key]).strip():
                    return str(recipient_data[candidate_key]).strip()
            # Fuzzy match any key with 'name'
            for k, v in recipient_data.items():
                if "name" in k.lower() and v is not None and str(v).strip():
                    return str(v).strip()
                    
        # 4. Check if content has template variables {{...}}
        if "{{" in content:
            return resolve_text_variables(content, recipient_data, credential_id)
            
        # 5. If binding key matched nothing, check if content has fallback
        if content:
            return str(content)
            
        return ""
    else:
        # static_text: check for template tags
        return resolve_text_variables(content, recipient_data, credential_id)

def get_reportlab_font_name(font_family: str, font_weight: str = "normal", font_style: str = "normal") -> str:
    """Map typography settings to standard ReportLab Type 1 vector font names."""
    is_bold = "bold" in font_weight.lower() or font_weight in ("700", "800", "900")
    is_italic = "italic" in font_style.lower()
    
    name_clean = font_family.lower().replace(" ", "")
    if "greatvibes" in name_clean or "brush" in name_clean or "cursive" in name_clean or "caveat" in name_clean:
        return "Times-Italic"
    elif "cinzel" in name_clean or "playfair" in name_clean or "merriweather" in name_clean:
        if is_bold and is_italic: return "Times-BoldItalic"
        elif is_bold: return "Times-Bold"
        elif is_italic: return "Times-Italic"
        else: return "Times-Roman"
    elif "times" in name_clean or "serif" in name_clean or "georgia" in name_clean:
        if is_bold and is_italic: return "Times-BoldItalic"
        elif is_bold: return "Times-Bold"
        elif is_italic: return "Times-Italic"
        else: return "Times-Roman"
    elif "courier" in name_clean or "mono" in name_clean:
        if is_bold and is_italic: return "Courier-BoldOblique"
        elif is_bold: return "Courier-Bold"
        elif is_italic: return "Courier-Oblique"
        else: return "Courier"
    else:  # Arial / Helvetica / Montserrat / Sans default
        if is_bold and is_italic: return "Helvetica-BoldOblique"
        elif is_bold: return "Helvetica-Bold"
        elif is_italic: return "Helvetica-Oblique"
        else: return "Helvetica"

def render_page_to_canvas(
    c: canvas.Canvas,
    template_dict: Dict[str, Any],
    elements: List[Dict[str, Any]],
    recipient_data: Dict[str, Any],
    credential_id: Optional[str] = None,
    public_base_url: str = "http://localhost:5173"
):
    """Render a single certificate page onto an existing ReportLab canvas."""
    width_pt = template_dict.get("width_pt", 841.89)
    height_pt = template_dict.get("height_pt", 595.28)
    
    transformer = CoordinateTransformer(width_pt, height_pt)
    
    # 1. Background fill
    bg_color_hex = template_dict.get("background_color", "#FFFFFF")
    try:
        c.setFillColor(HexColor(bg_color_hex))
    except Exception:
        c.setFillColor(white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)
    
    # 2. Background image asset if any
    bg_asset_url = template_dict.get("background_asset_url")
    if bg_asset_url:
        bg_reader = decode_asset_to_reader(bg_asset_url)
        if bg_reader:
            c.drawImage(bg_reader, 0, 0, width=width_pt, height=height_pt, preserveAspectRatio=False)
            
    # 3. Sort elements by layer_order
    sorted_elements = sorted(elements, key=lambda e: e.get("layer_order", 0))
    
    for el in sorted_elements:
        if not el.get("is_visible", True):
            continue
            
        el_type = el.get("element_type")
        norm_x = el.get("x", 0.0)
        norm_y = el.get("y", 0.0)
        norm_w = el.get("width", 0.2)
        norm_h = el.get("height", 0.1)
        
        # ReportLab coordinates: (x, y_bottom, w, h) in points
        rx, ry, rw, rh = transformer.to_reportlab_coords(norm_x, norm_y, norm_w, norm_h)
        
        if el_type in ("dynamic_text", "static_text"):
            text_val = extract_element_text(el, recipient_data, credential_id)
            text_val = sanitize_text_for_pdf(text_val)
                
            if el.get("uppercase", False):
                text_val = text_val.upper()
                
            font_size_pt = el.get("font_size", 24.0)
            font_family = el.get("font_family", "Helvetica")
            font_weight = el.get("font_weight", "normal")
            font_style = el.get("font_style", "normal")
            
            font_name = get_reportlab_font_name(font_family, font_weight, font_style)
            
            lines = text_val.split("\n")
            line_height_pt = font_size_pt * el.get("line_height", 1.3)
            total_text_h = len(lines) * line_height_pt
            
            # Auto-fit text if enabled: reduce font size if string is wider than box
            if el.get("auto_fit_text", True) and text_val:
                curr_size = font_size_pt
                while curr_size > 8:
                    c.setFont(font_name, curr_size)
                    max_w = max(c.stringWidth(l, font_name, curr_size) for l in lines)
                    if max_w <= rw:
                        break
                    curr_size -= 1.0
                font_size_pt = curr_size
                line_height_pt = font_size_pt * el.get("line_height", 1.3)
                total_text_h = len(lines) * line_height_pt
            else:
                c.setFont(font_name, font_size_pt)
                
            # Text Color
            color_hex = el.get("color", "#1A202C")
            try:
                c.setFillColor(HexColor(color_hex))
            except Exception:
                c.setFillColor(black)
                
            # Calculate alignment and draw each line
            text_align = el.get("text_align", "center")
            v_align = el.get("vertical_align", "middle")
            
            if v_align == "middle":
                start_y = ry + (rh + total_text_h) / 2.0 - font_size_pt * 0.85
            elif v_align == "bottom":
                start_y = ry + total_text_h - font_size_pt * 0.85
            else:  # top
                start_y = ry + rh - font_size_pt * 0.85
                
            for l_idx, line_str in enumerate(lines):
                line_w = c.stringWidth(line_str, font_name, font_size_pt)
                if text_align == "center":
                    dest_x = rx + (rw - line_w) / 2.0
                elif text_align == "right":
                    dest_x = rx + rw - line_w
                else:  # left
                    dest_x = rx
                c.drawString(dest_x, start_y - l_idx * line_height_pt, line_str)
            
        elif el_type == "qr_code":
            cid = credential_id or "SAMPLE-000000"
            verify_url = f"{public_base_url}/verify/{cid}"
            qr_bytes = generate_qr_bytes(verify_url, scale=10, border=1)
            qr_reader = ImageReader(io.BytesIO(qr_bytes))
            
            # Maintain square aspect ratio
            side = min(rw, rh)
            paste_x = rx + (rw - side) / 2.0
            paste_y = ry + (rh - side) / 2.0
            c.drawImage(qr_reader, paste_x, paste_y, width=side, height=side, mask='auto')
            
        elif el_type in ("image", "signature"):
            asset_url = el.get("asset_url")
            img_reader = decode_asset_to_reader(asset_url)
            if img_reader:
                # Maintain aspect ratio within element box
                img_w, img_h = img_reader.getSize()
                ratio = min(rw / img_w, rh / img_h)
                dest_w = img_w * ratio
                dest_h = img_h * ratio
                paste_x = rx + (rw - dest_w) / 2.0
                paste_y = ry + (rh - dest_h) / 2.0
                c.drawImage(img_reader, paste_x, paste_y, width=dest_w, height=dest_h, mask='auto')
                
        elif el_type == "shape":
            shape_type = el.get("shape_type", "rectangle")
            border_w = el.get("border_width", 1.0)
            border_color_hex = el.get("border_color", "#D1D5DB")
            fill_color_hex = el.get("fill_color")
            
            has_stroke = border_w > 0
            has_fill = fill_color_hex is not None
            
            if has_stroke:
                try: c.setStrokeColor(HexColor(border_color_hex))
                except Exception: c.setStrokeColor(black)
                c.setLineWidth(border_w)
                
            if has_fill:
                try: c.setFillColor(HexColor(fill_color_hex))
                except Exception: c.setFillColor(transparent)
                
            if shape_type in ("rectangle", "border"):
                c.rect(rx, ry, rw, rh, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)
            elif shape_type == "line":
                c.line(rx, ry + rh / 2.0, rx + rw, ry + rh / 2.0)
            elif shape_type == "circle":
                c.ellipse(rx, ry, rx + rw, ry + rh, fill=1 if has_fill else 0, stroke=1 if has_stroke else 0)

def render_certificate_pdf(
    template_dict: Dict[str, Any],
    elements: List[Dict[str, Any]],
    recipient_data: Dict[str, Any],
    credential_id: Optional[str] = None,
    public_base_url: str = "http://localhost:5173"
) -> bytes:
    """Render a single vector certificate to PDF bytes."""
    width_pt = template_dict.get("width_pt", 841.89)
    height_pt = template_dict.get("height_pt", 595.28)
    
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width_pt, height_pt))
    c.setTitle(f"Certificate - {credential_id or 'Preview'}")
    c.setAuthor("CertiForm Studio")
    
    render_page_to_canvas(c, template_dict, elements, recipient_data, credential_id, public_base_url)
    
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.getvalue()

def render_consolidated_pdf(
    template_dict: Dict[str, Any],
    elements: List[Dict[str, Any]],
    recipients_with_credentials: List[Dict[str, Any]], # list of {"data": {...}, "credential_id": "..."}
    public_base_url: str = "http://localhost:5173"
) -> bytes:
    """Render multiple certificates into a single consolidated multi-page PDF."""
    width_pt = template_dict.get("width_pt", 841.89)
    height_pt = template_dict.get("height_pt", 595.28)
    
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width_pt, height_pt))
    c.setTitle("Certificates Collection - CertiForm Studio")
    c.setAuthor("CertiForm Studio")
    
    for item in recipients_with_credentials:
        rec_data = item.get("data", {})
        cid = item.get("credential_id")
        render_page_to_canvas(c, template_dict, elements, rec_data, cid, public_base_url)
        c.showPage()
        
    c.save()
    buf.seek(0)
    return buf.getvalue()
