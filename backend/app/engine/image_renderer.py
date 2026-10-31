import io
import os
import re
import base64
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont, ImageColor
from app.config import settings
from app.engine.coordinates import CoordinateTransformer, pt_to_px
from app.engine.qr_generator import generate_qr_image
from app.services.recipient_service import clean_corrupted_s

def decode_asset(asset_url: Optional[str]) -> Optional[Image.Image]:
    """Decode base64 data URL, SVG vector, or load from storage path."""
    if not asset_url:
        return None
    try:
        # Check if vector SVG
        if "image/svg+xml" in asset_url or asset_url.endswith(".svg") or (isinstance(asset_url, str) and "<svg" in asset_url[:120]):
            try:
                from svglib.svglib import svg2rlg
                from reportlab.graphics import renderPM
                drawing = None
                if asset_url.startswith("data:image/svg+xml"):
                    if ";base64," in asset_url:
                        header, encoded = asset_url.split(";base64,", 1)
                        svg_bytes = base64.b64decode(encoded)
                        drawing = svg2rlg(io.BytesIO(svg_bytes))
                    else:
                        header, raw_svg = asset_url.split(",", 1)
                        import urllib.parse
                        drawing = svg2rlg(io.StringIO(urllib.parse.unquote(raw_svg)))
                elif asset_url.strip().startswith("<svg"):
                    drawing = svg2rlg(io.StringIO(asset_url.strip()))
                elif os.path.isfile(asset_url):
                    drawing = svg2rlg(asset_url)
                elif asset_url.startswith("/storage/"):
                    relative = asset_url.replace("/storage/", "")
                    local_path = settings.STORAGE_DIR / relative
                    if local_path.exists():
                        drawing = svg2rlg(str(local_path))
                if drawing:
                    pil_img = renderPM.drawToPIL(drawing)
                    return pil_img.convert("RGBA")
            except Exception as e_svg:
                print(f"SVG to PIL rendering fallback: {e_svg}")

        if asset_url.startswith("data:image"):
            # Format: data:image/png;base64,...
            header, encoded = asset_url.split(",", 1)
            data = base64.b64decode(encoded)
            return Image.open(io.BytesIO(data)).convert("RGBA")
        elif os.path.isfile(asset_url):
            return Image.open(asset_url).convert("RGBA")
        elif asset_url.startswith("/storage/"):
            # Relative to STORAGE_DIR
            relative = asset_url.replace("/storage/", "")
            local_path = settings.STORAGE_DIR / relative
            if local_path.exists():
                return Image.open(str(local_path)).convert("RGBA")
    except Exception as e:
        print(f"Failed to decode asset: {e}")
    return None

def resolve_text_variables(template_str: str, recipient_data: Dict[str, Any], credential_id: Optional[str] = None) -> str:
    """Resolve dynamic placeholder tags like {{recipient_name}}, {{department}}, {{event_name}}, {{event_date}}."""
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
            key_norm = key.lower().replace(" ", "_").replace("-", "_")
            val = merged.get(key_norm)
            
        if val is None and ("name" in key.lower() or "student" in key.lower() or key.lower() in ("s_name", "sname", "s.name", "s")):
            for cand in ("recipient_name", "student_name", "s_name", "sname", "s.name", "student", "full_name", "name", "participant_name", "candidate_name", "Student Name", "Full Name", "Name"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
                    
        if val is None and ("department" in key.lower() or "dept" in key.lower()):
            for cand in ("department", "dept", "Department", "branch", "Department Name"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break

        if val is None and ("dob" in key.lower() or "birth" in key.lower()):
            for cand in ("dob", "date_of_birth", "birth_date", "birthdate", "DOB", "Date of Birth", "Birth Date"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
                    
        if val is None and ("event" in key.lower() or "topic" in key.lower() or "session" in key.lower()):
            for cand in ("event_name", "session_topic", "Session Topic", "topic", "Topic", "event", "Event"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
                    
        if val is None and ("date" in key.lower()):
            for cand in ("event_date", "date", "Date", "event date"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
                    
        if val is None and ("venue" in key.lower() or "college" in key.lower() or "institution" in key.lower()):
            for cand in ("venue", "institution", "college", "university", "Institute"):
                if cand in merged and merged[cand] is not None and str(merged[cand]).strip():
                    val = merged[cand]
                    break
                    
        return str(val) if val is not None else ""
    
    resolved = re.sub(r"\{\{([^}]+)\}\}", replacer, template_str)
    # Collapse multiple consecutive spaces so text has no empty gaps
    resolved = re.sub(r'[ \t]{2,}', ' ', resolved)
    # Clean dangling space before punctuation (e.g. " ," -> ",")
    resolved = re.sub(r'\s+([,.:;])', r'\1', resolved)
    return resolved.strip()

def extract_element_text(el: Dict[str, Any], recipient_data: Dict[str, Any], credential_id: Optional[str] = None) -> str:
    """
    Intelligently resolves dynamic text element value with smart fuzzy fallbacks.
    Prioritizes real recipient data over static template placeholder content.
    """
    el_type = el.get("element_type")
    b_key = el.get("binding_key")
    content = el.get("content", "")
    
    if el_type == "dynamic_text":
        # 1. If content contains {{...}} tags, always resolve template tags first
        if "{{" in content:
            return resolve_text_variables(content, recipient_data, credential_id)

        # 2. Exact binding key match
        if b_key and b_key in recipient_data and recipient_data[b_key] is not None and str(recipient_data[b_key]).strip():
            return str(recipient_data[b_key]).strip()
            
        # 3. Normalized binding key match
        if b_key:
            norm_b = b_key.lower().replace(" ", "_")
            if norm_b in recipient_data and recipient_data[norm_b] is not None and str(recipient_data[norm_b]).strip():
                return str(recipient_data[norm_b]).strip()
                
        # 4. Smart Name Aliases for name bindings
        is_name_field = (
            (b_key and b_key.lower() in ("recipient_name", "name", "full_name", "student_name", "participant_name", "candidate_name", "s_name", "sname", "s.name", "student", "s_word")) or
            (not b_key and content and content.strip().lower() in ("student name", "recipient name", "participant name", "candidate name", "full name", "name", "ananya kumar", "john doe", "s name", "s.name", "s word"))
        )
        if is_name_field:
            for candidate_key in (
                "recipient_name", "student_name", "s_name", "sname", "s.name", "student",
                "full_name", "name", "participant_name", "candidate_name",
                "Student Name", "Full Name", "Name", "Student", "S.Name", "S Name", "SName"
            ):
                if candidate_key in recipient_data and recipient_data[candidate_key] is not None and str(recipient_data[candidate_key]).strip():
                    return str(recipient_data[candidate_key]).strip()
            # Fuzzy match person terms first
            for k, v in recipient_data.items():
                k_low = k.lower()
                if any(term in k_low for term in ["student", "candidate", "participant", "recipient", "person", "member"]) and v and str(v).strip():
                    return str(v).strip()
            # Fuzzy match any other key with 'name', but NEVER event/topic/college/dept/dob/date
            for k, v in recipient_data.items():
                k_low = k.lower()
                if any(skip in k_low for skip in ["event", "topic", "session", "workshop", "college", "institute", "dept", "department", "school", "faculty", "venue", "dob", "birth", "date"]):
                    continue
                if "name" in k_low and v is not None and str(v).strip():
                    return str(v).strip()

        # 4b. Date of Birth (DOB) Aliases
        is_dob_field = (
            (b_key and b_key.lower() in ("dob", "date_of_birth", "birth_date", "birthdate")) or
            (not b_key and content and content.strip().lower() in ("dob", "date of birth", "birth date", "birthday"))
        )
        if is_dob_field:
            for cand in ("dob", "date_of_birth", "birth_date", "birthdate", "DOB", "Date of Birth", "Birth Date"):
                if cand in recipient_data and recipient_data[cand] is not None and str(recipient_data[cand]).strip():
                    return str(recipient_data[cand]).strip()
            for k, v in recipient_data.items():
                k_low = k.lower()
                if any(term in k_low for term in ["dob", "birth", "d.o.b", "d_o_b"]) and v and str(v).strip():
                    return str(v).strip()

        # 5. Department Aliases
        if b_key and b_key.lower() in ("department", "dept"):
            for cand in ("department", "dept", "Department", "branch", "Department Name"):
                if cand in recipient_data and recipient_data[cand] is not None and str(recipient_data[cand]).strip():
                    return str(recipient_data[cand]).strip()

        # 6. Event Name / Topic Aliases
        if b_key and b_key.lower() in ("event_name", "topic", "session"):
            for cand in ("event_name", "session_topic", "Session Topic", "topic", "Topic", "event", "Event"):
                if cand in recipient_data and recipient_data[cand] is not None and str(recipient_data[cand]).strip():
                    return str(recipient_data[cand]).strip()

        # 7. Date Aliases
        if b_key and b_key.lower() in ("event_date", "date"):
            for cand in ("event_date", "date", "Date"):
                if cand in recipient_data and recipient_data[cand] is not None and str(recipient_data[cand]).strip():
                    return str(recipient_data[cand]).strip()
                    
        # 8. If binding key matched nothing, check if content has fallback
        if content:
            return str(content)
            
        return ""
    else:
        # static_text: check for template tags
        return resolve_text_variables(content, recipient_data, credential_id)

def get_pil_font(font_family: str, size_px: int, font_weight: str = "normal", font_style: str = "normal") -> ImageFont.ImageFont:
    """Attempt to load matching system or standard TrueType font, fallback to default."""
    # List of candidate font filenames on Windows/Linux
    candidates = []
    is_bold = "bold" in font_weight.lower() or font_weight in ("700", "800", "900")
    is_italic = "italic" in font_style.lower()
    
    name_clean = font_family.lower().replace(" ", "")
    if "greatvibes" in name_clean or "brush" in name_clean or "cursive" in name_clean or "caveat" in name_clean:
        candidates = ["segoesc.ttf", "kunstler.ttf", "timesi.ttf"]
    elif "cinzel" in name_clean or "playfair" in name_clean or "merriweather" in name_clean:
        if is_bold and is_italic: candidates = ["georgiaz.ttf", "timesbi.ttf"]
        elif is_bold: candidates = ["georgiab.ttf", "timesbd.ttf"]
        else: candidates = ["georgia.ttf", "times.ttf"]
    elif "times" in name_clean:
        if is_bold and is_italic: candidates = ["timesbi.ttf", "Times-BoldItalic.ttf"]
        elif is_bold: candidates = ["timesbd.ttf", "Times-Bold.ttf"]
        elif is_italic: candidates = ["timesi.ttf", "Times-Italic.ttf"]
        else: candidates = ["times.ttf", "Times.ttf"]
    elif "serif" in name_clean or "georgia" in name_clean:
        if is_bold and is_italic: candidates = ["georgiaz.ttf"]
        elif is_bold: candidates = ["georgiab.ttf"]
        elif is_italic: candidates = ["georgiai.ttf"]
        else: candidates = ["georgia.ttf"]
    elif "courier" in name_clean or "mono" in name_clean:
        if is_bold: candidates = ["courbd.ttf"]
        else: candidates = ["cour.ttf"]
    else:  # Arial / Helvetica / Montserrat / Sans-serif default
        if is_bold and is_italic: candidates = ["segoeuiz.ttf", "arialbi.ttf", "DejaVuSans-BoldOblique.ttf"]
        elif is_bold: candidates = ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]
        elif is_italic: candidates = ["segoeuii.ttf", "ariali.ttf", "DejaVuSans-Oblique.ttf"]
        else: candidates = ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"]

    # Search standard Windows Fonts directory
    win_fonts = os.environ.get("WINDIR", "C:\\Windows") + "\\Fonts"
    for candidate in candidates:
        font_path = os.path.join(win_fonts, candidate)
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size=size_px)
            except Exception:
                pass
        # Try local load
        try:
            return ImageFont.truetype(candidate, size=size_px)
        except Exception:
            pass
            
    # Fallback
    try:
        return ImageFont.truetype("arial.ttf", size=size_px)
    except Exception:
        return ImageFont.load_default()

def render_certificate_image(
    template_dict: Dict[str, Any],
    elements: List[Dict[str, Any]],
    recipient_data: Dict[str, Any],
    credential_id: Optional[str] = None,
    dpi: int = 300,
    public_base_url: str = "http://localhost:5173"
) -> Image.Image:
    """
    Render high-resolution raster certificate using Pillow.
    Uses normalized coordinates (0.0 to 1.0) and converts to target DPI pixels.
    """
    width_pt = template_dict.get("width_pt", 841.89)
    height_pt = template_dict.get("height_pt", 595.28)
    
    total_w_px = pt_to_px(width_pt, dpi)
    total_h_px = pt_to_px(height_pt, dpi)
    
    transformer = CoordinateTransformer(width_pt, height_pt)
    
    # Create base image
    bg_color = template_dict.get("background_color", "#FFFFFF")
    canvas = Image.new("RGBA", (total_w_px, total_h_px), bg_color)
    
    # Render background image if available
    bg_asset_url = template_dict.get("background_asset_url")
    if bg_asset_url:
        bg_img = decode_asset(bg_asset_url)
        if bg_img:
            bg_resized = bg_img.resize((total_w_px, total_h_px), Image.Resampling.LANCZOS)
            canvas.alpha_composite(bg_resized)
            
    draw = ImageDraw.Draw(canvas)
    
    # Sort elements by layer_order
    sorted_elements = sorted(elements, key=lambda e: e.get("layer_order", 0))
    
    for el in sorted_elements:
        if not el.get("is_visible", True):
            continue
            
        el_type = el.get("element_type")
        x_px, y_px, w_px, h_px = transformer.to_pixels(
            el.get("x", 0.0), el.get("y", 0.0), el.get("width", 0.2), el.get("height", 0.1), dpi=dpi
        )
        
        if el_type in ("dynamic_text", "static_text"):
            text_val = extract_element_text(el, recipient_data, credential_id)
            text_val = clean_corrupted_s(text_val)
                
            if el.get("uppercase", False):
                text_val = text_val.upper()
                
            font_size_pt = el.get("font_size", 24.0)
            font_size_px = pt_to_px(font_size_pt, dpi)
            font_family = el.get("font_family", "Helvetica")
            font_weight = el.get("font_weight", "normal")
            font_style = el.get("font_style", "normal")
            
            font = get_pil_font(font_family, font_size_px, font_weight, font_style)
            
            is_name_field = (
                el_type == "dynamic_text"
                and (
                    el.get("binding_key") in ("recipient_name", "name", "student_name", "full_name", "participant_name", "candidate_name")
                    or "name" in (el.get("binding_key") or "").lower()
                )
            ) or el.get("uniform_font_size", False)

            # Auto-wrap words for multiline text to prevent clipping while maintaining uniform font size
            wrap_w_px = max(w_px, int(total_w_px * 0.82)) if (is_name_field and el.get("text_align", "center") == "center") else w_px
            if " " in text_val and "\n" not in text_val:
                raw_words = text_val.split(" ")
                wrapped_lines = []
                curr_line = ""
                for w in raw_words:
                    test_l = f"{curr_line} {w}".strip() if curr_line else w
                    t_bbox = draw.textbbox((0, 0), test_l, font=font)
                    if (t_bbox[2] - t_bbox[0]) <= wrap_w_px or not curr_line:
                        curr_line = test_l
                    else:
                        wrapped_lines.append(curr_line)
                        curr_line = w
                if curr_line:
                    wrapped_lines.append(curr_line)
                text_val = "\n".join(wrapped_lines)

            # Auto-fit text if enabled and not a name field (name field font family & size are locked uniform across all recipients)
            if not is_name_field and el.get("auto_fit_text", True) and text_val:
                curr_size_px = font_size_px
                bbox = draw.multiline_textbbox((0, 0), text_val, font=font)
                text_w = bbox[2] - bbox[0]
                while text_w > w_px and curr_size_px > 10:
                    curr_size_px = int(curr_size_px * 0.9)
                    font = get_pil_font(font_family, curr_size_px, font_weight, font_style)
                    bbox = draw.multiline_textbbox((0, 0), text_val, font=font)
                    text_w = bbox[2] - bbox[0]
                    
            text_color = el.get("color", "#1A202C")
            text_align = el.get("text_align", "center")
            v_align = el.get("vertical_align", "middle")
            
            # Calculate alignment offset within bounding box using multiline bbox
            bbox = draw.multiline_textbbox((0, 0), text_val, font=font, align=text_align)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            
            if text_align == "center":
                dest_x = x_px + (w_px - text_w) / 2
            elif text_align == "right":
                dest_x = x_px + w_px - text_w
            else: # left
                dest_x = x_px
                
            if v_align == "middle":
                dest_y = y_px + (h_px - text_h) / 2
            elif v_align == "bottom":
                dest_y = y_px + h_px - text_h
            else: # top
                dest_y = y_px
                
            draw.multiline_text((dest_x, dest_y), text_val, fill=text_color, font=font, align=text_align)
            
        elif el_type == "qr_code":
            # Canonical verification URL
            cid = credential_id or "SAMPLE-000000"
            verify_url = f"{public_base_url}/verify/{cid}"
            qr_img = generate_qr_image(verify_url, scale=8, border=1)
            # Resize to fit element box (preserve square aspect ratio)
            side = min(w_px, h_px)
            qr_resized = qr_img.resize((side, side), Image.Resampling.LANCZOS)
            # Center in box
            paste_x = x_px + (w_px - side) // 2
            paste_y = y_px + (h_px - side) // 2
            canvas.alpha_composite(qr_resized.convert("RGBA"), (paste_x, paste_y))
            
        elif el_type in ("image", "signature"):
            asset_url = el.get("asset_url")
            img_asset = decode_asset(asset_url)
            if img_asset:
                # Maintain aspect ratio within box
                img_w, img_h = img_asset.size
                ratio = min(w_px / img_w, h_px / img_h)
                new_w = max(1, int(img_w * ratio))
                new_h = max(1, int(img_h * ratio))
                resized = img_asset.resize((new_w, new_h), Image.Resampling.LANCZOS)
                paste_x = x_px + (w_px - new_w) // 2
                paste_y = y_px + (h_px - new_h) // 2
                canvas.alpha_composite(resized, (paste_x, paste_y))
                
        elif el_type == "shape":
            shape_type = el.get("shape_type", "rectangle")
            border_w = pt_to_px(el.get("border_width", 1.0), dpi)
            border_color = el.get("border_color", "#D1D5DB")
            fill_color = el.get("fill_color")
            
            if shape_type == "rectangle" or shape_type == "border":
                draw.rectangle(
                    [x_px, y_px, x_px + w_px, y_px + h_px],
                    fill=fill_color,
                    outline=border_color if border_w > 0 else None,
                    width=max(1, border_w) if border_w > 0 else 0
                )
            elif shape_type == "line":
                draw.line(
                    [x_px, y_px + h_px // 2, x_px + w_px, y_px + h_px // 2],
                    fill=border_color,
                    width=max(1, border_w)
                )
            elif shape_type == "circle":
                draw.ellipse(
                    [x_px, y_px, x_px + w_px, y_px + h_px],
                    fill=fill_color,
                    outline=border_color if border_w > 0 else None,
                    width=max(1, border_w) if border_w > 0 else 0
                )

    return canvas
