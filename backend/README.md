# Database Seed & API Instructions

## Setup

1.  Navigate to `backend` folder:
    ```bash
    cd backend
    ```
2.  Create virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    .\venv\Scripts\Activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Ensure MongoDB is running locally on port 27017.

## Running

1.  Start the server:
    ```bash
    uvicorn app.main:app --reload
    ```
2.  Seed the database (in another terminal):
    ```bash
    python seed.py
    ```

## API Docs

-   Swagger UI: http://localhost:8000/docs
-   ReDoc: http://localhost:8000/redoc
