import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_validate_image_format_rejects_random_bytes():
    assert utils.validate_image_format(b"random") is False
