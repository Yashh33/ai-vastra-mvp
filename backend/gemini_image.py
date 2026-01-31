import os
from typing import Tuple

from google import genai
from google.genai import types


def generate_gemini_image(
    prompt: str,
    hero_image: Tuple[bytes, str],
    fabric_image: Tuple[bytes, str],
    image_size: str = "2K",  # "1K" | "2K" | "4K"
) -> Tuple[bytes, str]:
    """
    Returns: (image_bytes, mime_type) exactly as Gemini returns.
    """

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image-preview")

    hero_bytes, hero_mime = hero_image
    fabric_bytes, fabric_mime = fabric_image

    instructions = (
        "You will receive two images.\n"
        "1) HERO IMAGE: this is the person/garment photo. Keep EVERYTHING the same: pose, face, body, lighting, background.\n"
        "2) FABRIC IMAGE:  this is the fabric reference. Recreate the HERO garment as if it is tailored/sewn from this fabric.\n"
        "Your task is to create an image of garment present in HERO IMAGE made from Fabric present in FABRIC IMAGE, worn by the male model\n\n"
        "Rules:\n"
        "- Do NOT change the model identity, face, hair, skin tone, body shape.\n"
        "- Do NOT change the background.\n"
        "- Keep lighting natural and same as in HERO IMAGE so that the output generated does not seems photoshoped/pasted look.\n"
        "- Only modify the garment material so it looks like the garment is made from the FABRIC cloth.\n"
        "- Preserve garment seams, stitching lines, folds, wrinkles, shadows (realistic).\n"
        f"User prompt:\n{prompt}"
    )

    contents = [
        "HERO IMAGE (keep everything unchanged: person, pose, face, lighting, background):",
        types.Part.from_bytes(data=hero_bytes, mime_type=hero_mime),
        "FABRIC IMAGE (FABRIC IMAGE (fabric reference): Using the exact cloth texture/pattern from this image, recreate the garment worn in the HERO IMAGE so it looks like the same garment was made from this fabric (real tailoring). Keep pose/face/background unchanged.):",
        types.Part.from_bytes(data=fabric_bytes, mime_type=fabric_mime),
        "INSTRUCTIONS:",
        instructions,
    ]

    resp = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(image_size=image_size),
        ),
    )

    # Extract image bytes + mime type
    for part in resp.parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            out_bytes = inline.data
            out_mime = getattr(inline, "mime_type", None) or "application/octet-stream"
            return out_bytes, out_mime

    raise RuntimeError("No IMAGE returned in response.parts")
































