"""
Reviews Router - Service Reviews CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import Review, ReviewCreate

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    """Create a review for a completed booking"""
    booking = await db.bookings.find_one({
        "id": review_data.booking_id, 
        "owner_id": current_user["id"]
    }, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    existing_review = await db.reviews.find_one({"booking_id": review_data.booking_id}, {"_id": 0})
    if existing_review:
        raise HTTPException(status_code=400, detail="Ya calificaste este servicio")
    
    review = Review(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        **review_data.model_dump()
    )
    await db.reviews.insert_one(review.model_dump())
    
    # Update provider rating
    collection = "walkers" if review_data.service_type == "walker" else "daycares" if review_data.service_type == "daycare" else "vets"
    reviews = await db.reviews.find({"service_id": review_data.service_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db[collection].update_one(
        {"id": review_data.service_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return review


@router.get("/{service_type}/{service_id}", response_model=List[Review])
async def get_reviews(service_type: str, service_id: str):
    """Get all reviews for a service"""
    reviews = await db.reviews.find({
        "service_type": service_type, 
        "service_id": service_id
    }, {"_id": 0}).to_list(100)
    return reviews
