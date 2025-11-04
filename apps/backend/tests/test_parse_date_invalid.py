import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_parse_date_string_returns_none_for_invalid_string():
    assert utils.parse_date_string("no-date-here") is None
