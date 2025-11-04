import pytest

import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_decode_base64_image_raises_value_error_on_invalid():
    with pytest.raises(ValueError):
        utils.decode_base64_image("not base64!!!!")
