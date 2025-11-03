from datetime import date

from id_scanning import utils


def test_clean_extracted_data_filters_and_formats():
    raw = {
        "name": "  Jane Doe  ",
        "state": "  OH  ",
        "date_of_birth": "1990-03-15",
        "sex": "F",
        "eye_color": " blue ",
        "drivers_license_number": " vh12345 ",
        "is_valid": "YES",
        "extra": "should drop",
    }
    cleaned = utils.clean_extracted_data(raw)
    assert cleaned["name"] == "Jane Doe"
    assert cleaned["state"] == "OH"
    assert cleaned["date_of_birth"] == date(1990, 3, 15)
    assert cleaned["sex"] == "f"
    assert cleaned["eye_color"] == "blue"
    assert cleaned["drivers_license_number"] == "VH12345"
    assert cleaned["is_valid"] is True
    assert "extra" not in cleaned
