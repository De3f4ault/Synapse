"""
Think Tag Parser — Extract <think> blocks from streaming content.

Handles the thinking transparency protocol used by DeepSeek-R1, Qwen3, etc.
"""

import re
from typing import Tuple
from dataclasses import dataclass


@dataclass
class ParsedChunk:
    """Result of parsing a content chunk for thinking tags."""

    thinking: str
    content: str
    has_thinking: bool


def parse_thinking(content: str) -> Tuple[str, str]:
    """
    Extract <think> blocks from content.

    Args:
        content: Raw content that may contain <think>...</think> tags

    Returns:
        Tuple of (thinking_text, clean_content)
        - thinking_text: All content from <think> blocks, joined by newlines
        - clean_content: Original content with <think> blocks removed

    Example:
        >>> parse_thinking("Let me explain. <think>First, consider X</think> The answer is Y.")
        ('First, consider X', 'Let me explain.  The answer is Y.')
    """
    # Regex pattern: captures everything between <think> and </think>
    # Uses non-greedy (.*?) to handle multiple blocks correctly
    # DOTALL flag lets . match newlines
    think_pattern = r"<think>(.*?)</think>"

    # Find all thinking blocks
    think_blocks = re.findall(think_pattern, content, re.DOTALL)

    # Remove thinking tags from content
    clean_content = re.sub(think_pattern, "", content, flags=re.DOTALL)

    # Clean up extra whitespace left behind
    clean_content = re.sub(r"\s+", " ", clean_content).strip()

    # Join all thinking blocks
    thinking = "\n".join(block.strip() for block in think_blocks) if think_blocks else ""

    return thinking, clean_content


def parse_chunk(chunk: str) -> ParsedChunk:
    """
    Parse a streaming chunk for thinking content.

    Args:
        chunk: A piece of streamed content

    Returns:
        ParsedChunk with separated thinking and content
    """
    thinking, content = parse_thinking(chunk)
    return ParsedChunk(
        thinking=thinking,
        content=content,
        has_thinking=bool(thinking),
    )


class StreamingThinkParser:
    """
    Stateful parser for handling <think> tags across streaming chunks.

    Handles the case where tags are split across chunks, e.g.:
    - Chunk 1: "Hello <thi"
    - Chunk 2: "nk>some reasoning"
    - Chunk 3: "</think> done"
    """

    def __init__(self):
        self._buffer: str = ""
        self._in_thinking: bool = False

    def feed(self, chunk: str) -> ParsedChunk:
        """
        Feed a chunk and get any complete thinking/content.

        Args:
            chunk: New content from stream

        Returns:
            ParsedChunk with any complete thinking and content
        """
        self._buffer += chunk

        thinking_parts = []
        content_parts = []

        while True:
            if self._in_thinking:
                # Look for closing tag
                end_idx = self._buffer.find("</think>")
                if end_idx == -1:
                    # Still in thinking — yield content incrementally for real-time streaming
                    # But check for partial closing tag at end to avoid splitting </think>
                    partial_tag = "</think>"
                    for i in range(1, min(len(partial_tag), len(self._buffer) + 1)):
                        if self._buffer.endswith(partial_tag[:i]):
                            # Potential partial closing tag — yield everything before it
                            emit = self._buffer[:-i]
                            if emit:
                                thinking_parts.append(emit)
                            self._buffer = self._buffer[-i:]
                            break
                    else:
                        # No partial tag — yield all buffered thinking content
                        if self._buffer:
                            thinking_parts.append(self._buffer)
                        self._buffer = ""
                    break
                else:
                    # Found end tag
                    before_tag = self._buffer[:end_idx]
                    if before_tag:
                        thinking_parts.append(before_tag)
                    self._buffer = self._buffer[end_idx + 8 :]  # len('</think>')
                    self._in_thinking = False
            else:
                # Look for opening tag
                start_idx = self._buffer.find("<think>")
                if start_idx == -1:
                    # No tag found, this is content
                    # But check for partial tag at end
                    for i in range(1, min(7, len(self._buffer) + 1)):
                        if self._buffer.endswith("<think>"[:i]):
                            content_parts.append(self._buffer[:-i])
                            self._buffer = self._buffer[-i:]
                            break
                    else:
                        content_parts.append(self._buffer)
                        self._buffer = ""
                    break
                else:
                    # Found start tag
                    content_parts.append(self._buffer[:start_idx])
                    self._buffer = self._buffer[start_idx + 7 :]  # len('<think>')
                    self._in_thinking = True

        return ParsedChunk(
            thinking="".join(thinking_parts),
            content="".join(content_parts),
            has_thinking=bool(thinking_parts),
        )

    def flush(self) -> ParsedChunk:
        """
        Flush any remaining content in buffers.
        Call at end of stream.
        """
        # If still inside a <think> block, remaining buffer is thinking content
        if self._in_thinking:
            result = ParsedChunk(
                thinking=self._buffer,
                content="",
                has_thinking=bool(self._buffer.strip()),
            )
        else:
            result = ParsedChunk(
                thinking="",
                content=self._buffer,
                has_thinking=False,
            )
        self._buffer = ""
        self._in_thinking = False
        return result

    def reset(self):
        """Reset parser state for a new stream."""
        self._buffer = ""
        self._in_thinking = False
