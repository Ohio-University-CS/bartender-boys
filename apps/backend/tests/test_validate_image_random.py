from id_scanning import utils


def test_validate_image_format_rejects_random_bytes():
    assert utils.validate_image_format(b"random") is False
