from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User


def get_current_user(
    x_user_id: Annotated[int | None, Header(alias="X-User-Id")] = None,
    db: Session = Depends(get_db),
) -> User:
    if x_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请在请求头中传入 X-User-Id。",
        )

    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="学生用户不存在。")
    return user
