# 404-Found-App Backend

This backend project provides a RESTful API for user authentication, safety feed management, and route handling, powered by FastAPI and SQLAlchemy. It is organized into modular components for scalability and maintainability.

## Features

- **User Authentication**: Signup, login, password reset, and OAuth support.
- **Token Management**: Secure JWT-based authentication and token refresh.
- **User Management**: CRUD operations for user accounts.
- **Safety Feed**: Endpoints to manage and retrieve safety-related data.
- **Route Management**: Endpoints for creating and managing routes.
- **Modular Structure**: Organized into API routers, models, schemas, and core utilities.

## Project Structure

- `APIService/` - Main FastAPI application and API logic
  - `api/routers/` - API route definitions (auth, OAuth, etc.)
  - `core/` - Security and utility functions
  - `crud/` - Database CRUD operations
  - `db/` - Database session and base setup
  - `models/` - SQLAlchemy models
  - `schemas/` - Pydantic schemas for request/response validation
- `Database/` - Database initialization scripts
- `AIModel/`, `DataIngestion/` - (Reserved for future features)

## Getting Started

### Prerequisites
- Python 3.8+
- [pip](https://pip.pypa.io/en/stable/)

### 1. Install Dependencies

From the Backend root:

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in `APIService/` and update values as needed (database URL, secret keys, etc.).

### 3. Initialize the Database

Run the database initialization script:

```bash
python Database/initialize_db.py
```

This will create the necessary tables in your configured database.

### 4. Start the API Server

From the `APIService/` directory, run:

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 5. Interact with the API

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Redoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

Use these interfaces to explore and test the available endpoints.

## Development Notes

- Code is organized for easy extension (add new routers, models, etc.).
- Update `requirements.txt` as you add dependencies.
- For production, configure environment variables securely and use a production-ready server.

## License

MIT License
