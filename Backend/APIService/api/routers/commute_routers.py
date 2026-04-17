from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys
import os
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from DataIngestion.traffic_ingestion import get_formatted_routes, get_planned_routes, get_planned_departure_routes, get_transit_routes, get_transit_departure_routes
from schemas.commute_schema import RouteRequest, PlannedRouteRequest, DepartureRouteRequest, RouteResponse

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/", response_model=RouteResponse)
def generate_routes(request: RouteRequest):
    records = get_formatted_routes(request.origin, request.destination, "any")
    return RouteResponse.model_validate({"routes": records})

@router.post("/car", response_model=RouteResponse)
def generate_car_routes(request: RouteRequest):
    records = get_formatted_routes(request.origin, request.destination, "car")
    return RouteResponse.model_validate({"routes": records})

@router.post("/walk", response_model=RouteResponse)
def generate_pedestrian_routes(request: RouteRequest):
    records = get_formatted_routes(request.origin, request.destination, "pedestrian")
    return RouteResponse.model_validate({"routes": records})

@router.post("/scooter", response_model=RouteResponse)
def generate_scooter_routes(request: RouteRequest):
    records = get_formatted_routes(request.origin, request.destination, "scooter")
    return RouteResponse.model_validate({"routes": records})

@router.post("/bike", response_model=RouteResponse)
def generate_bike_routes(request: RouteRequest):
    records = get_formatted_routes(request.origin, request.destination, "bicycle")
    return RouteResponse.model_validate({"routes": records})

@router.post("/transit", response_model=RouteResponse)
def generate_transit_routes(request: RouteRequest):
    records = get_transit_routes(request.origin, request.destination)
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan", response_model=RouteResponse)
def plan_route(request: PlannedRouteRequest):
    records = get_planned_routes(request.origin, request.destination, request.arrival_time, "any")
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan/car", response_model=RouteResponse)
def plan_car_route(request: PlannedRouteRequest):
    records = get_planned_routes(request.origin, request.destination, request.arrival_time, "car")
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan/walk", response_model=RouteResponse)
def plan_pedestrian_route(request: PlannedRouteRequest):
    records = get_planned_routes(request.origin, request.destination, request.arrival_time, "pedestrian")
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan/scooter", response_model=RouteResponse)
def plan_scooter_route(request: PlannedRouteRequest):
    records = get_planned_routes(request.origin, request.destination, request.arrival_time, "scooter")
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan/bike", response_model=RouteResponse)
def plan_bike_route(request: PlannedRouteRequest):
    records = get_planned_routes(request.origin, request.destination, request.arrival_time, "bicycle")
    return RouteResponse.model_validate({"routes": records})

@router.post("/plan/transit", response_model=RouteResponse)
def plan_transit_route(request: PlannedRouteRequest):
    records = get_transit_routes(request.origin, request.destination, request.arrival_time)
    return RouteResponse.model_validate({"routes": records})

@router.post("/depart/car", response_model=RouteResponse)
def depart_car_route(request: DepartureRouteRequest):
    records = get_planned_departure_routes(request.origin, request.destination, request.departure_time, "car")
    return RouteResponse.model_validate({"routes": records})

@router.post("/depart/walk", response_model=RouteResponse)
def depart_pedestrian_route(request: DepartureRouteRequest):
    records = get_planned_departure_routes(request.origin, request.destination, request.departure_time, "pedestrian")
    return RouteResponse.model_validate({"routes": records})

@router.post("/depart/bike", response_model=RouteResponse)
def depart_bike_route(request: DepartureRouteRequest):
    records = get_planned_departure_routes(request.origin, request.destination, request.departure_time, "bicycle")
    return RouteResponse.model_validate({"routes": records})

@router.post("/depart/transit", response_model=RouteResponse)
def depart_transit_route(request: DepartureRouteRequest):
    records = get_transit_departure_routes(request.origin, request.destination, request.departure_time)
    return RouteResponse.model_validate({"routes": records})
