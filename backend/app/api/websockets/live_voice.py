"""
Live Voice WebSocket - Gemini Live API Proxy

Real-time bidirectional audio streaming with Gemini Live API.
Implements the WebSocket proxy architecture for voice mode.

Features:
- Low-latency audio streaming (16kHz PCM in, 24kHz PCM out)
- Interruptible responses
- Search Grounding integration
- Tool calling support
- Transcription streaming

Protocol (Client <-> Backend):
- Client sends: {"type": "audio", "data": "<base64 PCM>"}
- Client sends: {"type": "text", "content": "Hello"}
- Client sends: {"type": "interrupt"}
- Server sends: {"type": "audio", "data": "<base64 PCM>"}
- Server sends: {"type": "transcript", "text": "...", "is_final": bool}
- Server sends: {"type": "grounding", "metadata": {...}}
- Server sends: {"type": "turn_complete"}
- Server sends: {"type": "interrupted"}
"""

from fastapi import WebSocket, WebSocketDisconnect, Query
from typing import Optional
import structlog
import asyncio
import base64
from app.core.config import settings
from app.db.session import AsyncSessionLocal

# Chat models from module interface (temporary migration)
from app.modules.chat.interface import ChatSession, ChatMessage, MessageRole

logger = structlog.get_logger(__name__)

# Check if google-genai SDK is available (required for Live API)
# The Live API requires the newer google-genai package, not google-generativeai
LIVE_API_AVAILABLE = False
genai = None
try:
    from google import genai as genai_module

    genai = genai_module
    LIVE_API_AVAILABLE = True
    logger.info("google_genai_available", version=getattr(genai, "__version__", "unknown"))
except ImportError:
    logger.warning(
        "google_genai_not_available",
        message="The google-genai package is not installed. Live Voice API will not be available. "
        "Install with: pip install google-genai",
    )

# Audio format constants (from official docs)
SEND_SAMPLE_RATE = 16000  # Client -> Gemini
RECEIVE_SAMPLE_RATE = 24000  # Gemini -> Client

# Gemini Live model - from official docs: https://ai.google.dev/api/multimodal-live
# This model supports bidiGenerateContent for real-time audio streaming
LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


# Session configuration
def get_live_config(system_instruction: Optional[str] = None, enable_search: bool = True):
    """
    Build Gemini Live session configuration.

    Args:
        system_instruction: Custom system prompt
        enable_search: Enable Google Search grounding

    Returns:
        Configuration dict for live.connect()
    """
    config = {
        "response_modalities": ["AUDIO"],
        # Enable live transcription of user speech (input) and AI speech (output)
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": "Puck"  # Natural conversational voice
                }
            }
        },
    }

    if system_instruction:
        config["system_instruction"] = system_instruction
    else:
        config["system_instruction"] = (
            "You are SYNAPSE, an intelligent AI learning assistant. "
            "You help users study, answer questions, and manage their knowledge. "
            "Be concise, helpful, and conversational in your responses."
        )

    # Add Google Search tool for grounding
    if enable_search:
        config["tools"] = [{"google_search": {}}]

    return config


class LiveVoiceSession:
    """
    Manages a single live voice session between client and Gemini.

    Handles:
    - Gemini Live API connection
    - Bidirectional audio forwarding
    - Tool execution (search grounding)
    - Graceful disconnection
    """

    def __init__(self, user_id: int, websocket: WebSocket):
        self.user_id = user_id
        self.websocket = websocket
        self.logger = logger.bind(user_id=user_id)
        self.gemini_session = None
        self.running = False
        self._receive_task: Optional[asyncio.Task] = None
        # Transcript accumulation for saving conversations
        self._input_transcripts: list[str] = []
        self._output_transcripts: list[str] = []

    async def start(self, system_instruction: Optional[str] = None, enable_search: bool = True):
        """
        Start the live voice session.

        Connects to Gemini Live API and begins bidirectional streaming.
        """
        try:
            # Initialize Gemini client
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            # Get session config
            config = get_live_config(system_instruction, enable_search)

            self.logger.info("gemini_live_connecting", model=LIVE_MODEL)

            # Connect to Gemini Live API
            async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                self.gemini_session = session
                self.running = True

                self.logger.info("gemini_live_connected")

                # Notify client
                await self._send_to_client(
                    {
                        "type": "connected",
                        "data": {
                            "model": LIVE_MODEL,
                            "sample_rate_in": SEND_SAMPLE_RATE,
                            "sample_rate_out": RECEIVE_SAMPLE_RATE,
                        },
                    }
                )

                # Run send and receive loops concurrently
                await asyncio.gather(self._receive_from_gemini(), self._receive_from_client())

        except Exception as e:
            self.logger.error("gemini_live_error", error=str(e))
            await self._send_to_client({"type": "error", "code": "gemini_error", "message": str(e)})
        finally:
            self.running = False
            self.gemini_session = None

    async def _receive_from_client(self):
        """
        Receive messages from client WebSocket and forward to Gemini.
        """
        try:
            while self.running:
                try:
                    data = await asyncio.wait_for(
                        self.websocket.receive_json(),
                        timeout=0.1,  # Short timeout for responsive checking
                    )
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    self.logger.info("client_disconnected")
                    self.running = False
                    break

                msg_type = data.get("type")

                if msg_type == "audio":
                    # Forward audio to Gemini
                    audio_b64 = data.get("data")
                    if audio_b64 and self.gemini_session:
                        audio_bytes = base64.b64decode(audio_b64)
                        await self.gemini_session.send_realtime_input(
                            audio={"data": audio_bytes, "mime_type": "audio/pcm"}
                        )

                elif msg_type == "text":
                    # Send text input
                    content = data.get("content")
                    if content and self.gemini_session:
                        await self.gemini_session.send_client_content(
                            turns=[{"role": "user", "parts": [{"text": content}]}],
                            turn_complete=True,
                        )

                elif msg_type == "interrupt":
                    # User is interrupting - Gemini handles this automatically
                    # when new audio arrives, but we can acknowledge it
                    self.logger.info("user_interrupt")
                    await self._send_to_client({"type": "interrupt_ack"})

                elif msg_type == "end_session":
                    self.logger.info("session_end_requested")
                    self.running = False
                    break

        except Exception as e:
            self.logger.error("client_receive_error", error=str(e))
            self.running = False

    async def _receive_from_gemini(self):
        """
        Receive responses from Gemini and forward to client.
        """
        try:
            while self.running and self.gemini_session:
                try:
                    turn = self.gemini_session.receive()

                    async for response in turn:
                        if not self.running:
                            break

                        # Handle server content
                        if response.server_content:
                            sc = response.server_content

                            # Check for interruption
                            if sc.interrupted:
                                self.logger.info("gemini_interrupted")
                                await self._send_to_client({"type": "interrupted"})

                            # Process model turn (audio/text)
                            if sc.model_turn:
                                for part in sc.model_turn.parts:
                                    # Audio output
                                    if part.inline_data and isinstance(
                                        part.inline_data.data, bytes
                                    ):
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode()
                                        await self._send_to_client(
                                            {"type": "audio", "data": audio_b64}
                                        )

                                    # Text output (if response_modalities includes TEXT)
                                    if part.text:
                                        await self._send_to_client(
                                            {"type": "text", "content": part.text}
                                        )

                            # Grounding metadata
                            if sc.grounding_metadata:
                                await self._send_to_client(
                                    {
                                        "type": "grounding",
                                        "metadata": self._serialize_grounding(
                                            sc.grounding_metadata
                                        ),
                                    }
                                )

                            # Input transcription
                            if sc.input_transcription:
                                # Accumulate for saving
                                self._input_transcripts.append(sc.input_transcription.text)
                                await self._send_to_client(
                                    {
                                        "type": "input_transcript",
                                        "text": sc.input_transcription.text,
                                    }
                                )

                            # Output transcription
                            if sc.output_transcription:
                                # Accumulate for saving
                                self._output_transcripts.append(sc.output_transcription.text)
                                await self._send_to_client(
                                    {
                                        "type": "output_transcript",
                                        "text": sc.output_transcription.text,
                                    }
                                )

                            # Turn complete
                            if sc.turn_complete:
                                self.logger.info("gemini_turn_complete")
                                await self._send_to_client({"type": "turn_complete"})

                        # Handle tool calls
                        if response.tool_call:
                            await self._handle_tool_call(response.tool_call)

                except Exception as e:
                    if self.running:
                        self.logger.error("gemini_receive_error", error=str(e))
                    break

        except Exception as e:
            self.logger.error("gemini_receive_loop_error", error=str(e))
        finally:
            self.running = False

    async def _handle_tool_call(self, tool_call):
        """
        Handle tool calls from Gemini (e.g., search grounding).

        For google_search, Gemini handles it internally.
        For custom function calls, we would execute them here.
        """
        try:
            for fc in tool_call.function_calls:
                self.logger.info("tool_call_received", function=fc.name, args=fc.args)

                # Notify client about tool usage
                await self._send_to_client(
                    {"type": "tool_call", "name": fc.name, "args": dict(fc.args) if fc.args else {}}
                )

                # For now, google_search is handled internally by Gemini
                # If we add custom tools, we'd execute them here and send response:
                # await self.gemini_session.send_tool_response(
                #     function_responses=[{"id": fc.id, "response": {...}}]
                # )

        except Exception as e:
            self.logger.error("tool_call_error", error=str(e))

    def _serialize_grounding(self, metadata) -> dict:
        """Serialize grounding metadata for JSON transmission."""
        try:
            result = {}

            if hasattr(metadata, "search_entry_point"):
                result["search_entry_point"] = {
                    "rendered_content": getattr(
                        metadata.search_entry_point, "rendered_content", None
                    )
                }

            if hasattr(metadata, "grounding_chunks"):
                result["chunks"] = []
                for chunk in metadata.grounding_chunks:
                    chunk_data = {}
                    if hasattr(chunk, "web"):
                        chunk_data["uri"] = getattr(chunk.web, "uri", None)
                        chunk_data["title"] = getattr(chunk.web, "title", None)
                    result["chunks"].append(chunk_data)

            if hasattr(metadata, "web_search_queries"):
                result["queries"] = list(metadata.web_search_queries)

            return result

        except Exception as e:
            self.logger.error("grounding_serialize_error", error=str(e))
            return {}

    async def _send_to_client(self, message: dict):
        """Send message to client WebSocket."""
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            self.logger.error("client_send_error", error=str(e))
            self.running = False

    async def save_conversation(self):
        """Save accumulated transcripts to database as a chat session."""
        # Combine transcripts
        user_text = " ".join(self._input_transcripts).strip()
        ai_text = " ".join(self._output_transcripts).strip()

        # Only save if there was actual conversation
        if not user_text and not ai_text:
            self.logger.info("no_transcripts_to_save")
            return

        try:
            async with AsyncSessionLocal() as db:
                # Create chat session
                title = (
                    (user_text[:50] + "...")
                    if len(user_text) > 50
                    else (user_text or "Voice conversation")
                )
                session = ChatSession(
                    user_id=self.user_id,
                    title=title,
                )
                db.add(session)
                await db.flush()  # Get session ID

                # Add user message if any
                if user_text:
                    user_msg = ChatMessage(
                        session_id=session.id,
                        role=MessageRole.USER,
                        content=user_text,
                        model_used="voice-input",
                    )
                    db.add(user_msg)

                # Add AI response if any
                if ai_text:
                    ai_msg = ChatMessage(
                        session_id=session.id,
                        role=MessageRole.ASSISTANT,
                        content=ai_text,
                        model_used="gemini-live",
                    )
                    db.add(ai_msg)

                await db.commit()
                self.logger.info("voice_conversation_saved", session_id=session.id)

        except Exception as e:
            self.logger.error("save_conversation_error", error=str(e))

    async def stop(self):
        """Stop the session gracefully and save conversation."""
        self.running = False
        # Save conversation to database
        await self.save_conversation()


async def validate_token(token: str) -> dict:
    """Validate JWT token and return user info."""
    from jose import jwt, JWTError
    from app.core.config import settings

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise Exception("Invalid token")
        return {"id": int(user_id)}
    except JWTError:
        raise Exception("Invalid token")


async def live_voice_websocket_endpoint(
    websocket: WebSocket, token: str = Query(..., description="JWT authentication token")
):
    """
    Live Voice WebSocket endpoint.

    Provides real-time bidirectional audio streaming with Gemini Live API.

    Authentication via query parameter: ws://host/ws/live?token=xxx

    Protocol:
    - Client sends: {"type": "audio", "data": "<base64 PCM 16kHz>"}
    - Client sends: {"type": "text", "content": "Hello"}
    - Client sends: {"type": "interrupt"}
    - Client sends: {"type": "end_session"}
    - Server sends: {"type": "audio", "data": "<base64 PCM 24kHz>"}
    - Server sends: {"type": "input_transcript", "text": "..."}
    - Server sends: {"type": "output_transcript", "text": "..."}
    - Server sends: {"type": "grounding", "metadata": {...}}
    - Server sends: {"type": "turn_complete"}
    - Server sends: {"type": "interrupted"}
    """
    # Validate token
    try:
        user_info = await validate_token(token)
        user_id = user_info["id"]
    except Exception as e:
        await websocket.close(code=1008, reason="Unauthorized")
        logger.error("live_voice_auth_failed", error=str(e))
        return

    # Check if Live API is available
    if not LIVE_API_AVAILABLE:
        await websocket.accept()
        await websocket.send_json(
            {
                "type": "error",
                "code": "api_unavailable",
                "message": "Live Voice API is not available. The google-genai package must be installed.",
            }
        )
        await websocket.close(code=1011, reason="API Unavailable")
        logger.error("live_voice_api_unavailable")
        return

    # Accept WebSocket connection
    await websocket.accept()

    logger.info("live_voice_session_starting", user_id=user_id)

    # Create and run session
    session = LiveVoiceSession(user_id, websocket)

    try:
        # Wait for initial configuration from client (optional)
        try:
            init_data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            system_instruction = init_data.get("system_instruction")
            enable_search = init_data.get("enable_search", True)
        except asyncio.TimeoutError:
            # Use defaults if no init message
            system_instruction = None
            enable_search = True
        except Exception:
            system_instruction = None
            enable_search = True

        # Start the session
        await session.start(system_instruction=system_instruction, enable_search=enable_search)

    except WebSocketDisconnect:
        logger.info("live_voice_client_disconnected", user_id=user_id)
    except Exception as e:
        logger.error("live_voice_error", user_id=user_id, error=str(e))
        try:
            await websocket.send_json({"type": "error", "code": "session_error", "message": str(e)})
        except:
            pass
    finally:
        await session.stop()
        try:
            await websocket.close()
        except:
            pass
        logger.info("live_voice_session_ended", user_id=user_id)
