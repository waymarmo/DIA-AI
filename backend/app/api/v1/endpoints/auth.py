from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash, decode_access_token
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserLogin, UserUpdate, UserResponse, Token,
    SendOtpRequest, VerifyOtpRequest
)
from app.services.health_calculator import calculate_daily_targets
from app.services.sms_service import sms_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

@router.post("/send-otp")
async def send_otp(req: SendOtpRequest):
    clean_phone = req.phone_number.strip().replace(" ", "").replace("-", "")
    if len(clean_phone) < 7:
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri kiritildi")
    
    code = sms_service.generate_otp(clean_phone)
    await sms_service.send_otp_sms(clean_phone, code)
    return {
        "success": True,
        "message": "Tasdiqlash kodi telefon raqamingizga yuborildi",
        "phone_number": clean_phone
    }

@router.post("/verify-otp", response_model=Token)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    clean_phone = req.phone_number.strip().replace(" ", "").replace("-", "")
    is_valid = sms_service.verify_otp(clean_phone, req.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi noto'g'ri yoki muddati o'tgan")
    
    user = db.query(User).filter(User.phone_number == clean_phone).first()
    if not user:
        # Create new user automatically
        targets = calculate_daily_targets(
            gender=req.gender or "male",
            age=req.age or 30,
            height=req.height or 170.0,
            weight=req.weight or 70.0,
            activity_level=req.activity_level or "moderate"
        )
        user = User(
            username=f"user_{clean_phone[-4:]}_{clean_phone[-2:]}",
            phone_number=clean_phone,
            hashed_password=get_password_hash("otp_default_pass_123"),
            first_name=req.first_name or "Bemor",
            gender=req.gender or "male",
            age=req.age or 30,
            height=req.height or 170.0,
            weight=req.weight or 70.0,
            activity_level=req.activity_level or "moderate",
            diabetes_type=req.diabetes_type or "type2",
            daily_calorie_target=targets["daily_calories"],
            daily_carb_target=targets["daily_carbs"],
            target_sugar_low=targets["target_sugar_low"],
            target_sugar_high=targets["target_sugar_high"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(user))

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu nomdagi foydalanuvchi allaqachon mavjud")
        
    targets = calculate_daily_targets(
        gender=user_in.gender or "male",
        age=user_in.age or 30,
        height=user_in.height or 170.0,
        weight=user_in.weight or 70.0,
        activity_level=user_in.activity_level or "moderate"
    )
    user = User(
        username=user_in.username,
        phone_number=user_in.phone_number,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        gender=user_in.gender,
        age=user_in.age,
        height=user_in.height,
        weight=user_in.weight,
        activity_level=user_in.activity_level,
        diabetes_type=user_in.diabetes_type,
        language=user_in.language,
        daily_calorie_target=targets["daily_calories"],
        daily_carb_target=targets["daily_carbs"],
        target_sugar_low=targets["target_sugar_low"],
        target_sugar_high=targets["target_sugar_high"]
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(user))

@router.post("/login", response_model=Token)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Noto'g'ri login yoki parol")
        
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(user))

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(update_data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_dict = update_data.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(current_user, field, val)
    db.commit()
    db.refresh(current_user)
    return current_user
