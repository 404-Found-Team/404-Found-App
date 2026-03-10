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

### 1. Setup Virtual Environment

From the APIService root:

```bash
make setup-venv
```

### 2. Install Dependencies

From the APIService root:

```bash
make install
```

### 2. Configure Environment Variables

**Mac OS**
```bash
make init-env-mac
```

**Windows OS**
```bash
make init-env-windows
```

### 3. Initialize the Database

Run the database initialization script:

```bash
python Database/initialize_db.py
```

This will create the necessary tables in your configured database.

### 4. Start the API Server

From the `APIService/` directory, run:

**Localhost Server**
```bash
make run-local
```

or

**Default Gateway Server** - To interact with server on external devices
```bash
make run-external
```

The API will be available at `http://127.0.0.1:8000` for run-local.
The API will be available at `http://0.0.0.0:8000` for run-external.

### 5. Interact with the API

**Localhost**
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Redoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

**External**
- **Swagger UI**: [http://0.0.0.0:8000/docs](http://0.0.0.0:8000/docs)
- **Redoc**: [http://0.0.0.0:8000/redoc](http://0.0.0.0:8000/redoc)

Use these interfaces to explore and test the available endpoints.

## API Endpoints Overview


### 1. Signup
- **POST** `/users/signup`  
  Creates a user and stores the data in the database.
  
  **Request Body**
    - First Name
    - Last Name
    - Email
    - Password
    - Confirm Password
  
  **Response Body**
    - User ID
    - First Name
    - Last Name
    - Email
    - Is Active
    - Created At

### 2. Login
- **POST** `/users/login`  
  Authenticates user and creates access and refresh tokens.
  
  **Request Body**
    - Email
    - Password
  
  **Response Body**
    - Access Token
    - Token Type
    - User ID

### 3. Logout
- **POST** `/users/logout`  
  Revokes refresh token in database and flags user as inactive.
  
  **Response Body**
    - Message

### 4. Refresh Token
- **POST** `/users/refresh`  
  Issues a new access token using a valid refresh token.
  
  **Request Body**
    - Refresh Token
  
  **Response Body**
    - Access Token
    - Token Type

### 5. Password Reset Request
- **POST** `/users/reset`  
  Request a password reset (implementation placeholder).
  
  **Request Body**
    - Email

### 6. OAuth2 Login
- **GET** `/oauth/login`  
  Redirects user to third-party OAuth2 provider (e.g., Google) for authentication.

### 7. OAuth2 Callback
- **GET** `/oauth/callback`  
  Handles OAuth2 provider callback, creates or activates user, issues tokens, and redirects to frontend.

### 8. Get Parking Data
- **GET** `/parking/`  
  Returns current parking lot data (scraped from MARTA or other sources).
  
  **Response Body**
    - lots: List of parking lot data

### 9. Post Safety Alert
- **POST** `/safety/`  
  Submit a new safety alert.
  
  **Request Body**
    - Alert details (see SafetyCreate schema)
  
  **Response Body**
    - Created alert data

### 10. Get Safety Alerts
- **GET** `/safety/`  
  Retrieve all active safety alerts.
  
  **Response Body**
    - List of active safety alerts

### 11. Upvote Safety Alert
- **POST** `/safety/upvote`  
  Upvote a safety alert.
  
  **Request Body**
    - alert_id: int
  
  **Response Body**
    - Updated alert data

### 12. Downvote Safety Alert
- **POST** `/safety/downvote`  
  Downvote a safety alert.
  
  **Request Body**
    - alert_id: int
  
  **Response Body**
    - Updated alert data

## Development Notes

- Code is organized for easy extension (add new routers, models, etc.).
- Update `requirements.txt` as you add dependencies.
- For production, configure environment variables securely and use a production-ready server.

## License

MIT License
