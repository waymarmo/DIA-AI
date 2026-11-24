import json
import os
from app.core.database import SessionLocal, Base, engine
from app.models.recipe import Recipe

# Ensure tables exist
Base.metadata.create_all(bind=engine)

def seed_recipes():
    db = SessionLocal()
    json_path = os.path.join(os.path.dirname(__file__), "../src/data/recipes.json")
    
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        recipes_data = json.load(f)
        
    count = 0
    for r in recipes_data:
        existing = db.query(Recipe).filter(Recipe.title == r.get("title")).first()
        if not existing:
            recipe = Recipe(
                title=r.get("title", ""),
                title_ru=r.get("titleRu"),
                title_en=r.get("titleEn"),
                category=r.get("category", "all"),
                calories=float(r.get("calories", 0)),
                sugar=float(r.get("sugar", 0)),
                carbs=float(r.get("carbs", 0)),
                protein=float(r.get("protein", 0)),
                fat=float(r.get("fat", 0)),
                glycemic_index=int(r.get("glycemicIndex", 0)),
                prep_time=int(r.get("time", 20)),
                ingredients=r.get("ingredients", []),
                instructions=r.get("instructions", ""),
                source=r.get("source", "ADA - American Diabetes Association"),
                is_custom=False
            )
            db.add(recipe)
            count += 1
            
    db.commit()
    db.close()
    print(f"✅ {count} ta retsept bazaga muvaffaqiyatli yuklandi!")

if __name__ == "__main__":
    seed_recipes()
