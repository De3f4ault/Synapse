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

from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional, List
import structlog
import asyncio
import base64
from sqlalchemy import select
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
    - Gemini Live API connection bound to an existing chat session
    - Bidirectional audio forwarding
    - Per-turn message persistence to the chat session
    - Tool execution (search grounding)
    - Graceful disconnection
    """

    def __init__(self, user_id: int, websocket: WebSocket, session_id: int):
        self.user_id = user_id
        self.websocket = websocket
        self.session_id = session_id
        self.logger = logger.bind(user_id=user_id, session_id=session_id)
        self.gemini_session = None
        self.running = False
        self._receive_task: Optional[asyncio.Task] = None
        # Per-turn transcript accumulation (cleared after each turn_complete)
        self._input_transcripts: list[str] = []
        self._output_transcripts: list[str] = []

    async def _load_history(self) -> str:
        """
        Load existing conversation history from the database and format it
        as context for Gemini's system instruction.
        """
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ChatMessage)
                    .where(
                        ChatMessage.session_id == self.session_id,
                        ChatMessage.thread_id.is_(None),
                        ChatMessage.is_active.is_(True),
                    )
                    .order_by(ChatMessage.created_at)
                    .limit(50)  # Limit to last 50 messages for context window
                )
                messages = result.scalars().all()

                if not messages:
                    return ""

                # Format as conversation history
                history_lines = ["\n\n--- Previous Conversation History ---"]
                for msg in messages:
                    role = "User" if msg.role == MessageRole.USER else "Assistant"
                    # Truncate very long messages
                    content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
                    history_lines.append(f"{role}: {content}")
                history_lines.append("--- End of History ---\n")

                return "\n".join(history_lines)

        except Exception as e:
            self.logger.error("load_history_error", error=str(e))
            return ""

    async def _save_turn(self, user_text: str, ai_text: str):
        """
        Save a single conversational turn (user message + AI response) to the database.
        Called on each turn_complete.
        """
        try:
            async with AsyncSessionLocal() as db:
                saved_ids = []

                if user_text:
                    user_msg = ChatMessage(
                        session_id=self.session_id,
                        role=MessageRole.USER,
                        content=user_text,
                        model_used="voice-input",
                    )
                    db.add(user_msg)
                    await db.flush()
                    saved_ids.append(user_msg.id)

                if ai_text:
                    ai_msg = ChatMessage(
                        session_id=self.session_id,
                        role=MessageRole.ASSISTANT,
                        content=ai_text,
                        model_used=LIVE_MODEL,
                    )
                    db.add(ai_msg)
                    await db.flush()
                    saved_ids.append(ai_msg.id)

                # Update session updated_at timestamp
                session = await db.get(ChatSession, self.session_id)
                if session:
                    from datetime import datetime, timezone
                    session.updated_at = datetime.now(timezone.utc)

                await db.commit()

                self.logger.info(
                    "voice_turn_saved",
                    message_ids=saved_ids,
                    user_len=len(user_text),
                    ai_len=len(ai_text),
                )

                # Notify client so it can refresh its message cache
                await self._send_to_client({
                    "type": "messages_saved",
                    "message_ids": saved_ids,
                })

        except Exception as e:
            self.logger.error("save_turn_error", error=str(e))

    async def start(self, system_instruction: Optional[str] = None, enable_search: bool = True):
        """
        Start the live voice session.

        Loads conversation history, connects to Gemini Live API,
        and begins bidirectional streaming.
        """
        try:
            # Load conversation history for context continuity
            history_context = await self._load_history()

            # Initialize Gemini client
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            # Build system instruction with history
            full_instruction = system_instruction or ""
            if history_context:
                full_instruction += history_context
                self.logger.info("history_loaded", chars=len(history_context))

            # Get session config with the enriched instruction
            config = get_live_config(full_instruction or None, enable_search)

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

                            # Turn complete — save the turn to the database
                            if sc.turn_complete:
                                self.logger.info("gemini_turn_complete")

                                # Commit accumulated transcripts as messages
                                user_text = "".join(self._input_transcripts).strip()
                                ai_text = "".join(self._output_transcripts).strip()
                                if user_text or ai_text:
                                    await self._save_turn(user_text, ai_text)
                                self._input_transcripts.clear()
                                self._output_transcripts.clear()

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

    async def stop(self):
        """Stop the session gracefully. Per-turn saves already committed."""
        self.running = False
        # Save any remaining uncommitted transcripts
        user_text = "".join(self._input_transcripts).strip()
        ai_text = "".join(self._output_transcripts).strip()
        if user_text or ai_text:
            await self._save_turn(user_text, ai_text)
            self._input_transcripts.clear()
            self._output_transcripts.clear()
        self.logger.info("voice_session_stopped")


async def live_voice_websocket_endpoint(
    websocket: WebSocket,
    token: str,
    session_id: int,
):
    """
    Live Voice WebSocket — bidirectional audio streaming with Gemini Live API.
    Bound to an existing chat session for seamless conversation continuity.

    Protocol:
        audio/text/interrupt/end_session → audio/transcript/grounding/turn_complete/messages_saved
    """
    from app.api.websockets.core.auth import get_user_from_token

    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    user_id = user.id

    # Verify session ownership
    try:
        async with AsyncSessionLocal() as db:
            chat_session = await db.get(ChatSession, session_id)
            if not chat_session or chat_session.user_id != user_id:
                await websocket.close(code=1008, reason="Session not found or unauthorized")
                return
    except Exception as e:
        logger.error("session_verification_error", error=str(e))
        await websocket.close(code=1011, reason="Internal error")
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

    logger.info("live_voice_session_starting", user_id=user_id, session_id=session_id)

    # Create session bound to the existing chat session
    session = LiveVoiceSession(user_id, websocket, session_id)

    try:
        # Wait for initial configuration from client (optional)
        try:
            init_data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            system_instruction = init_data.get("system_instruction")
            enable_search = init_data.get("enable_search", True)
        except asyncio.TimeoutError:
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
        logger.info("live_voice_session_ended", user_id=user_id, session_id=session_id)
