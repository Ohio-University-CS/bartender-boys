import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from id_scanning import utils


def test_parse_date_string_returns_datetime_for_iso():
    parsed = utils.parse_date_string("2023-11-01")
    assert isinstance(parsed, datetime)
    assert parsed == datetime(2023, 11, 1)
