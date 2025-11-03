import base64

from id_scanning import utils


def test_decode_base64_image_accepts_data_url():
    payload = base64.b64encode(b"image-bytes").decode()
    data_url = f"data:image/png;base64,{payload}"
    result = utils.decode_base64_image(data_url)
    assert result == b"image-bytes"
