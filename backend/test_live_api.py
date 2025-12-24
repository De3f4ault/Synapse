"""Quick test of Gemini Live API connectivity."""

import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, "/home/de3f4ault/Desktop/Projects/synapse/backend")


async def test_live_api():
    """Test basic Live API connection."""
    try:
        from google import genai
        from app.core.config import settings

        print("✓ google-genai module imported successfully")
        print(f"  Version: {getattr(genai, '__version__', 'unknown')}")

        # Check API key
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            print("✗ GEMINI_API_KEY not set in environment")
            return False
        print(f"✓ GEMINI_API_KEY found ({len(api_key)} chars)")

        # Create client
        client = genai.Client(api_key=api_key)
        print("✓ genai.Client created")

        # Test basic text generation first
        print("\n--- Testing Text Generation ---")
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents="Say 'Hello, Live API test successful!' in exactly those words.",
        )
        print(f"✓ Response: {response.text[:100]}...")

        # Test Live API connection
        print("\n--- Testing Live API Connection ---")
        LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

        config = {
            "response_modalities": ["AUDIO"],
            "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": "Puck"}}},
            "system_instruction": "You are a test assistant. Respond briefly.",
        }

        print(f"  Connecting to {LIVE_MODEL}...")
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
            print("✓ Live API session connected!")

            # Send a simple text turn
            await session.send_client_content(
                turns=[{"role": "user", "parts": [{"text": "Hello!"}]}], turn_complete=True
            )
            print("✓ Sent text message to Live API")

            # Receive response
            turn = session.receive()
            async for response in turn:
                if response.server_content:
                    sc = response.server_content
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if hasattr(part, "inline_data") and part.inline_data:
                                print(f"✓ Received audio data: {len(part.inline_data.data)} bytes")
                            if hasattr(part, "text") and part.text:
                                print(f"  Text: {part.text[:100]}...")
                    if sc.turn_complete:
                        print("✓ Turn complete signal received")
                        break

        print("\n" + "=" * 50)
        print("✓ ALL LIVE API TESTS PASSED!")
        print("=" * 50)
        return True

    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    result = asyncio.run(test_live_api())
    sys.exit(0 if result else 1)
