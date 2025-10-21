"""
Pydantic models for OpenAI Realtime API messages and responses.

This module defines all the data structures used in the OpenAI Realtime API
for type safety, validation, and documentation.
"""

from typing import List, Optional, Union, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# Base message types
class BaseMessage(BaseModel):
    """Base class for all OpenAI Realtime API messages"""
    type: str


# Content types
class InputTextContent(BaseModel):
    """Text content for input messages"""
    type: Literal["input_text"] = "input_text"
    text: str


class InputAudioContent(BaseModel):
    """Audio content for input messages"""
    type: Literal["input_audio"] = "input_audio"
    data: str  # Base64 encoded audio data


class OutputTextContent(BaseModel):
    """Text content for output messages"""
    type: Literal["text"] = "text"
    text: str


class OutputAudioContent(BaseModel):
    """Audio content for output messages"""
    type: Literal["audio"] = "audio"
    data: str  # Base64 encoded audio data


# Content unions
InputContent = Union[InputTextContent, InputAudioContent]
OutputContent = Union[OutputTextContent, OutputAudioContent]


# Conversation items
class ConversationItem(BaseModel):
    """A conversation item (message) - used in responses"""
    id: Optional[str] = None
    object: Literal["realtime.item"] = "realtime.item"
    type: Literal["message"] = "message"
    status: Optional[str] = None
    role: Literal["user", "assistant"] = "user"
    content: List[InputContent] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class ConversationItemCreateData(BaseModel):
    """Data for creating a conversation item - no object field"""
    type: Literal["message"] = "message"
    role: Literal["user", "assistant"] = "user"
    content: Union[InputContent, List[InputContent]] = Field(default_factory=list)


class ConversationItemCreate(BaseMessage):
    """Create a new conversation item"""
    type: Literal["conversation.item.create"] = "conversation.item.create"
    item: ConversationItemCreateData


class ConversationItemCreated(BaseMessage):
    """Response when a conversation item is created"""
    type: Literal["conversation.item.created"] = "conversation.item.created"
    event_id: str
    previous_item_id: Optional[str] = None
    item: ConversationItem


# Audio buffer management
class AudioBuffer(BaseModel):
    """Audio buffer configuration"""
    format: Literal["pcm16", "pcm24", "pcm32", "opus"] = "pcm16"
    sample_rate: int = 24000
    channels: int = 1
    data: Optional[str] = None  # Base64 encoded audio data


class InputAudioBufferItem(BaseModel):
    """Input audio buffer item"""
    id: Optional[str] = None
    object: Literal["realtime.item"] = "realtime.item"
    type: Literal["input_audio_buffer"] = "input_audio_buffer"
    status: Optional[str] = None
    audio_buffer: AudioBuffer


class InputAudioBufferCreate(BaseMessage):
    """Create an input audio buffer"""
    type: Literal["conversation.item.create"] = "conversation.item.create"
    item: InputAudioBufferItem


class InputAudioBufferAppend(BaseMessage):
    """Append data to an audio buffer"""
    type: Literal["conversation.item.input_audio_buffer.append"] = "conversation.item.input_audio_buffer.append"
    item_id: str
    audio_buffer: AudioBuffer


class InputAudioBufferCommit(BaseMessage):
    """Commit an audio buffer"""
    type: Literal["conversation.item.input_audio_buffer.commit"] = "conversation.item.input_audio_buffer.commit"
    item_id: str


# Response management
class ResponseItem(BaseModel):
    """A response item"""
    id: str
    object: Literal["realtime.item"] = "realtime.item"
    type: Literal["message"] = "message"
    status: str
    role: Literal["assistant"] = "assistant"
    content: List[OutputContent] = Field(default_factory=list)


class Response(BaseModel):
    """A response from the AI"""
    id: str
    object: Literal["realtime.response"] = "realtime.response"
    status: str
    status_details: Optional[str] = None
    output: List[ResponseItem] = Field(default_factory=list)
    conversation_id: str
    modalities: List[str] = Field(default_factory=list)
    voice: str = "alloy"
    output_audio_format: str = "pcm16"
    temperature: float = 0.8
    max_output_tokens: Union[int, str] = "inf"
    usage: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ResponseCreate(BaseMessage):
    """Request a response from the AI"""
    type: Literal["response.create"] = "response.create"


class ResponseCreated(BaseMessage):
    """Response when a response is created"""
    type: Literal["response.created"] = "response.created"
    event_id: str
    response: Response


class ResponseOutputItemAdded(BaseMessage):
    """Response when an output item is added"""
    type: Literal["response.output_item.added"] = "response.output_item.added"
    event_id: str
    response_id: str
    output_index: int
    item: ResponseItem


class ResponseContentPartAdded(BaseMessage):
    """Response when a content part is added"""
    type: Literal["response.content_part.added"] = "response.content_part.added"
    event_id: str
    response_id: str
    item_id: str
    output_index: int
    content_index: int
    part: Union[OutputTextContent, OutputAudioContent]


# Response deltas (streaming)
class ResponseTextDelta(BaseMessage):
    """Text response delta"""
    type: Literal["response.text.delta"] = "response.text.delta"
    event_id: str
    response_id: str
    item_id: str
    output_index: int
    content_index: int
    delta: str


class ResponseAudioDelta(BaseMessage):
    """Audio response delta"""
    type: Literal["response.audio.delta"] = "response.audio.delta"
    event_id: str
    response_id: str
    item_id: str
    output_index: int
    content_index: int
    delta: str


class ResponseAudioTranscriptDelta(BaseMessage):
    """Audio transcript delta"""
    type: Literal["response.audio_transcript.delta"] = "response.audio_transcript.delta"
    event_id: str
    response_id: str
    item_id: str
    output_index: int
    content_index: int
    delta: str
    obfuscation: Optional[str] = None


class ResponseDone(BaseMessage):
    """Response completion"""
    type: Literal["response.done"] = "response.done"
    event_id: str
    response_id: str
    response: Response


# Session management
class TurnDetection(BaseModel):
    """Turn detection configuration"""
    type: Literal["server_vad"] = "server_vad"
    threshold: float = 0.5
    prefix_padding_ms: int = 300
    silence_duration_ms: int = 200
    idle_timeout_ms: Optional[int] = None
    create_response: bool = True
    interrupt_response: bool = True


class Session(BaseModel):
    """OpenAI Realtime session"""
    id: str
    object: Literal["realtime.session"] = "realtime.session"
    model: str
    modalities: List[str] = Field(default_factory=list)
    instructions: str
    voice: str = "alloy"
    output_audio_format: str = "pcm16"
    tools: List[Dict[str, Any]] = Field(default_factory=list)
    tool_choice: str = "auto"
    temperature: float = 0.8
    max_response_output_tokens: Union[int, str] = "inf"
    turn_detection: TurnDetection
    speed: float = 1.0
    tracing: Optional[Dict[str, Any]] = None
    truncation: str = "auto"
    prompt: Optional[str] = None
    expires_at: int
    input_audio_noise_reduction: Optional[Dict[str, Any]] = None
    input_audio_format: str = "pcm16"
    input_audio_transcription: Optional[Dict[str, Any]] = None
    client_secret: Optional[str] = None
    include: Optional[List[str]] = None


class SessionCreated(BaseMessage):
    """Response when a session is created"""
    type: Literal["session.created"] = "session.created"
    event_id: str
    session: Session


# Error handling
class ErrorDetail(BaseModel):
    """Error detail"""
    type: str
    code: str
    message: str
    param: Optional[str] = None
    event_id: Optional[str] = None


class ErrorMessage(BaseMessage):
    """Error message"""
    type: Literal["error"] = "error"
    event_id: str
    error: ErrorDetail


# WebRTC signaling
class WebRTCSignal(BaseModel):
    """WebRTC signaling data"""
    type: Literal["offer", "answer", "ice-candidate"] = "offer"
    sdp: Optional[str] = None
    candidate: Optional[str] = None
    sdp_mid: Optional[str] = None
    sdp_mline_index: Optional[int] = None


class WebRTCSignalMessage(BaseMessage):
    """WebRTC signaling message"""
    type: Literal["webrtc_signal"] = "webrtc_signal"
    signal: WebRTCSignal


# Function calls
class FunctionCall(BaseModel):
    """Function call"""
    name: str
    arguments: Dict[str, Any]


class FunctionCallMessage(BaseMessage):
    """Function call message"""
    type: Literal["function_call"] = "function_call"
    function_name: str
    arguments: Dict[str, Any]


class FunctionCallResult(BaseMessage):
    """Function call result"""
    type: Literal["function_call_result"] = "function_call_result"
    function_name: str
    result: Any


# Token management
class TokenResponse(BaseMessage):
    """Token response"""
    type: Literal["token_response"] = "token_response"
    session_id: str
    expires_in: int
    model: str
    voice: str


class GetTokenMessage(BaseMessage):
    """Get token request"""
    type: Literal["get_token"] = "get_token"


# Connection management
class ConnectionEstablished(BaseMessage):
    """Connection established message"""
    type: Literal["connection_established"] = "connection_established"
    client_id: str
    message: str
    openai_connected: bool


class SessionCreatedNotification(BaseMessage):
    """Session created notification"""
    type: Literal["session_created"] = "session_created"
    session_id: str
    model: str
    voice: str


# Union type for all possible messages
OpenAIMessage = Union[
    # Conversation
    ConversationItemCreate,
    ConversationItemCreated,
    
    # Audio buffer
    InputAudioBufferCreate,
    InputAudioBufferAppend,
    InputAudioBufferCommit,
    
    # Response
    ResponseCreate,
    ResponseCreated,
    ResponseOutputItemAdded,
    ResponseContentPartAdded,
    ResponseTextDelta,
    ResponseAudioDelta,
    ResponseAudioTranscriptDelta,
    ResponseDone,
    
    # Session
    SessionCreated,
    
    # Error
    ErrorMessage,
    
    # WebRTC
    WebRTCSignalMessage,
    
    # Function calls
    FunctionCallMessage,
    FunctionCallResult,
    
    # Token management
    GetTokenMessage,
    TokenResponse,
    
    # Connection
    ConnectionEstablished,
    SessionCreatedNotification,
]


# Helper functions
def create_text_message(text: str, role: str = "user") -> ConversationItemCreate:
    """Create a text message"""
    return ConversationItemCreate(
        item=ConversationItem(
            role=role,
            content=[InputTextContent(text=text)]
        )
    )


def create_response_request() -> ResponseCreate:
    """Create a response request"""
    return ResponseCreate()


def create_audio_buffer(format: str = "pcm16", sample_rate: int = 24000, channels: int = 1) -> InputAudioBufferCreate:
    """Create an audio buffer"""
    return InputAudioBufferCreate(
        item=InputAudioBufferItem(
            audio_buffer=AudioBuffer(
                format=format,
                sample_rate=sample_rate,
                channels=channels
            )
        )
    )


def create_function_call(name: str, arguments: Dict[str, Any]) -> FunctionCallMessage:
    """Create a function call"""
    return FunctionCallMessage(
        function_name=name,
        arguments=arguments
    )
