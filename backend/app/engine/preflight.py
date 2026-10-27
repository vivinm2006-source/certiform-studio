from typing import List, Dict, Any, Optional
from reportlab.pdfgen import canvas
import io
from app.engine.coordinates import CoordinateTransformer
from app.engine.pdf_renderer import get_reportlab_font_name

class PreflightChecker:
    @staticmethod
    def inspect(
        template_dict: Dict[str, Any],
        elements: List[Dict[str, Any]],
        recipients: List[Dict[str, Any]],
        required_binding_keys: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Run comprehensive preflight validation across all elements and recipients.
        Returns a dict with passed (bool), issues (list), total_recipients, and ready_recipients.
        """
        issues = []
        width_pt = template_dict.get("width_pt", 841.89)
        height_pt = template_dict.get("height_pt", 595.28)
        transformer = CoordinateTransformer(width_pt, height_pt)
        
        # Buffer canvas for measuring string width accurately
        dummy_buf = io.BytesIO()
        c = canvas.Canvas(dummy_buf, pagesize=(width_pt, height_pt))
        
        # Margin thresholds: elements should not cross within 2% of the edges unless background
        safe_margin = 0.02
        
        # 1. Element-level static checks
        has_qr = False
        has_recipient_name = False
        
        for el in elements:
            el_type = el.get("element_type")
            nx = el.get("x", 0.0)
            ny = el.get("y", 0.0)
            nw = el.get("width", 0.0)
            nh = el.get("height", 0.0)
            b_key = el.get("binding_key")
            
            # Check unsafe margins (for text and QR)
            if el_type in ("dynamic_text", "static_text", "qr_code", "signature"):
                if nx < safe_margin or (nx + nw) > (1.0 - safe_margin) or ny < safe_margin or (ny + nh) > (1.0 - safe_margin):
                    issues.append({
                        "type": "warning",
                        "code": "unsafe_margin",
                        "message": f"Element '{el.get('content') or b_key or el_type}' is placed too close to the edge ({nx:.2f}, {ny:.2f}).",
                        "element_id": el.get("id")
                    })
                    
            if el_type == "qr_code":
                has_qr = True
                # Check if QR code is physically too small (e.g. less than 40 points ≈ 14mm)
                rx, ry, rw, rh = transformer.to_points(nx, ny, nw, nh)
                side_pt = min(rw, rh)
                if side_pt < 40.0:
                    issues.append({
                        "type": "warning",
                        "code": "small_qr",
                        "message": f"QR Code dimensions ({side_pt:.1f} pt) may be too small for reliable smartphone camera scanning.",
                        "element_id": el.get("id")
                    })
                    
            if el_type == "dynamic_text" and (b_key == "recipient_name" or "name" in (b_key or "")):
                has_recipient_name = True
                
            if el_type == "signature":
                if not el.get("asset_url"):
                    issues.append({
                        "type": "error",
                        "code": "missing_signature",
                        "message": "A signature block is placed on the canvas but no signature image has been configured.",
                        "element_id": el.get("id")
                    })

        if not has_recipient_name:
            issues.append({
                "type": "warning",
                "code": "missing_recipient_name_field",
                "message": "Template does not have a dynamic text field bound to 'recipient_name'."
            })
            
        # 2. Recipient-level dynamic checks
        invalid_recipients_count = 0
        
        for idx, rec in enumerate(recipients):
            rec_data = rec.get("data", {})
            rec_id = rec.get("id", str(idx + 1))
            rec_has_error = False
            
            # Check required fields
            if required_binding_keys:
                for req_key in required_binding_keys:
                    val = rec_data.get(req_key)
                    if val is None or str(val).strip() == "":
                        issues.append({
                            "type": "error",
                            "code": "missing_field",
                            "message": f"Recipient '{rec_data.get('recipient_name', f'#{idx+1}')}' is missing required value for '{req_key}'.",
                            "recipient_id": rec_id
                        })
                        rec_has_error = True
                        
            # Check text overflow for each dynamic text element
            for el in elements:
                if el.get("element_type") != "dynamic_text":
                    continue
                    
                b_key = el.get("binding_key")
                if not b_key:
                    continue
                    
                val_str = str(rec_data.get(b_key, ""))
                if not val_str:
                    continue
                    
                font_family = el.get("font_family", "Helvetica")
                font_size_pt = el.get("font_size", 24.0)
                font_weight = el.get("font_weight", "normal")
                font_style = el.get("font_style", "normal")
                font_name = get_reportlab_font_name(font_family, font_weight, font_style)
                
                # Element width in points
                _, _, rw, _ = transformer.to_points(el.get("x", 0.0), el.get("y", 0.0), el.get("width", 0.2), el.get("height", 0.1))
                
                text_width = c.stringWidth(val_str, font_name, font_size_pt)
                auto_fit = el.get("auto_fit_text", True)
                
                if text_width > rw and not auto_fit:
                    issues.append({
                        "type": "error",
                        "code": "text_overflow",
                        "message": f"Text '{val_str}' exceeds bounding box width ({text_width:.1f} pt > {rw:.1f} pt) and auto-fit is disabled.",
                        "recipient_id": rec_id,
                        "element_id": el.get("id")
                    })
                    rec_has_error = True
                    
            if rec_has_error:
                invalid_recipients_count += 1

        total_rec = len(recipients)
        ready_rec = total_rec - invalid_recipients_count
        has_critical_errors = any(i["type"] == "error" for i in issues)
        
        return {
            "passed": not has_critical_errors,
            "issues": issues,
            "total_recipients": total_rec,
            "ready_recipients": ready_rec
        }
