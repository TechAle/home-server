from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

# Generate private key
private_key = ec.generate_private_key(ec.SECP256R1())

# Get raw private key bytes
priv_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')

# Get public key bytes in uncompressed form
pub_bytes = private_key.public_key().public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# URL-safe base64 encoding (no padding)
def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

# Print VAPID keys
print("Public Key: ", b64url(pub_bytes))
print("Private Key:", b64url(priv_bytes))
