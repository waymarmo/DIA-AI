from fastapi import APIRouter
from app.api.v1.endpoints import auth, meals, glucose, ai, recipes, reports, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(meals.router)
api_router.include_router(glucose.router)
api_router.include_router(ai.router)
api_router.include_router(recipes.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)
