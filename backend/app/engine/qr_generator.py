import io
import segno
from PIL import Image

def generate_qr_image(data_text: str, scale: int = 10, border: int = 2) -> Image.Image:
    """Generate a high-resolution QR code as a PIL Image."""
    qr = segno.make(data_text, error='h')  # high error correction
    buf = io.BytesIO()
    qr.save(buf, kind='png', scale=scale, border=border, dark="#1A202C", light="#FFFFFF")
    buf.seek(0)
    return Image.open(buf)

def generate_qr_bytes(data_text: str, scale: int = 10, border: int = 2) -> bytes:
    """Generate QR code PNG bytes."""
    qr = segno.make(data_text, error='h')
    buf = io.BytesIO()
    qr.save(buf, kind='png', scale=scale, border=border, dark="#1A202C", light="#FFFFFF")
    return buf.getvalue()
