from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import LoginResponse, UserLogin, UserPublic, UserRegister
from app.services import hash_password


router = APIRouter(prefix="/users", tags=["学生用户模块"])


@router.post("/register", response_model=UserPublic, summary="学生注册")
def register_user(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    existing_user = db.scalar(select(User).where(User.student_id == payload.student_id))
    if existing_user:
        raise HTTPException(status_code=400, detail="学号已注册。")

    existing_phone = db.scalar(select(User).where(User.phone == payload.phone))
    if existing_phone:
        raise HTTPException(status_code=400, detail="手机号已注册。")

    user = User(**payload.model_dump(exclude={"password"}), password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse, summary="学生登录")
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.student_id == payload.student_id))
    if user is None or user.password != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="学号或密码错误。")

    return LoginResponse(
        message="登录成功。",
        user_id=user.id,
        header_hint=f"后续请求请在 Header 中携带 X-User-Id: {user.id}",
    )


@router.get("/me", response_model=UserPublic, summary="查看当前学生信息")
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/{user_id}", response_model=UserPublic, summary="查看学生资料")
def get_user_detail(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="学生用户不存在。")
    return user
