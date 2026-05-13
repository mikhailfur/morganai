from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_premium: bool = False


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    premium_expires_at: Optional[datetime] = None
    selected_character_id: Optional[int] = None
    selected_mode_id: Optional[int] = None
    last_activity_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CharacterBase(BaseModel):
    name: str
    system_prompt: str
    avatar_url: Optional[str] = None
    is_default: bool = False
    is_nsfw: bool = False


class CharacterCreate(CharacterBase):
    pass


class CharacterResponse(CharacterBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BehaviorModeBase(BaseModel):
    name: str
    prompt_addition: str
    is_premium: bool = False
    is_nsfw: bool = False


class BehaviorModeCreate(BehaviorModeBase):
    pass


class BehaviorModeResponse(BehaviorModeBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    user_id: int
    character_id: Optional[int] = None
    mode_id: Optional[int] = None
    messages: List[dict] = Field(default_factory=list)


class ConversationResponse(ConversationBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubscriptionBase(BaseModel):
    user_id: int
    plan_type: str
    payment_gateway: Optional[str] = None
    payment_id: Optional[str] = None
    expires_at: datetime


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminSettingBase(BaseModel):
    key: str
    value: Optional[str] = None


class AdminSettingResponse(AdminSettingBase):
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
