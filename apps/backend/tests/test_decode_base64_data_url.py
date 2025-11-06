import base64

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_decode_base64_image_accepts_data_url():
    payload = base64.b64encode(b"image-bytes").decode()
    data_url = f"data:image/png;base64,{payload}"
    result = utils.decode_base64_image(data_url)
    assert result == b"image-bytes"
