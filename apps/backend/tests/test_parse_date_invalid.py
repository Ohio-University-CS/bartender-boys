from id_scanning import utils


def test_parse_date_string_returns_none_for_invalid_string():
    assert utils.parse_date_string("no-date-here") is None
