setup-env:
	python -m venv venv && ./venv/Scripts/activate 

install:
	pip install -r requirements.txt

run-local:
	uvicorn main:app --reload

run-external:
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload