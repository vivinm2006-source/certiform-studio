import math
from typing import Tuple, List

def pt_to_px(pt: float, dpi: int = 300) -> int:
    """Convert points (72 pt per inch) to pixels at given DPI."""
    return int(round(pt * (dpi / 72.0)))

def px_to_pt(px: int, dpi: int = 300) -> float:
    """Convert pixels to points at given DPI."""
    return (px * 72.0) / dpi

class CoordinateTransformer:
    def __init__(self, width_pt: float, height_pt: float):
        self.width_pt = width_pt
        self.height_pt = height_pt
        
    def to_points(self, norm_x: float, norm_y: float, norm_w: float, norm_h: float) -> Tuple[float, float, float, float]:
        """Convert normalized (0.0 - 1.0) coordinates to points (top-left origin)."""
        x_pt = norm_x * self.width_pt
        y_pt = norm_y * self.height_pt
        w_pt = norm_w * self.width_pt
        h_pt = norm_h * self.height_pt
        return x_pt, y_pt, w_pt, h_pt
    
    def to_pixels(self, norm_x: float, norm_y: float, norm_w: float, norm_h: float, dpi: int = 300) -> Tuple[int, int, int, int]:
        """Convert normalized (0.0 - 1.0) coordinates to pixels at given DPI."""
        x_pt, y_pt, w_pt, h_pt = self.to_points(norm_x, norm_y, norm_w, norm_h)
        return (
            pt_to_px(x_pt, dpi),
            pt_to_px(y_pt, dpi),
            pt_to_px(w_pt, dpi),
            pt_to_px(h_pt, dpi)
        )
    
    def to_reportlab_coords(self, norm_x: float, norm_y: float, norm_w: float, norm_h: float) -> Tuple[float, float, float, float]:
        """
        ReportLab uses bottom-left origin (0, 0 is bottom-left).
        Our normalized model uses top-left origin (0, 0 is top-left).
        Convert to ReportLab x, y, width, height in points.
        """
        x_pt, y_pt_top, w_pt, h_pt = self.to_points(norm_x, norm_y, norm_w, norm_h)
        # In ReportLab, y is measured from the bottom to the bottom of the bounding box
        y_pt_bottom = self.height_pt - y_pt_top - h_pt
        return x_pt, y_pt_bottom, w_pt, h_pt

def wrap_text(text: str, max_chars_per_line: int) -> List[str]:
    """Simple text wrapping utility."""
    if not text:
        return []
    words = text.split()
    lines = []
    current_line = []
    current_len = 0
    
    for word in words:
        if current_len + len(word) + (1 if current_line else 0) <= max_chars_per_line:
            current_line.append(word)
            current_len += len(word) + (1 if len(current_line) > 1 else 0)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
            current_len = len(word)
            
    if current_line:
        lines.append(" ".join(current_line))
    return lines
