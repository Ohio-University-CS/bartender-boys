from id_scanning import utils


def test_validate_image_format_recognizes_jpeg_signature():
    jpeg_bytes = b"\xff\xd8\xffrest_of_file"
    assert utils.validate_image_format(jpeg_bytes) is True
