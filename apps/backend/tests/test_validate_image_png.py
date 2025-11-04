import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_validate_image_format_recognizes_png_signature():
    png_bytes = b"\x89PNG\r\n\x1a\nrest"
    assert utils.validate_image_format(png_bytes) is True
