import base64
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_decode_base64_image_valid_bytes():
    payload = base64.b64encode(b"test-bytes").decode()
    result = utils.decode_base64_image(payload)
    assert result == b"test-bytes"
