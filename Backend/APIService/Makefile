init-env-windows:
	cd ../ && type nul > .env && copy .env.example .env

init-env-mac:
	cd ../ && touch .env && copy .env.example .env

setup-venv:
	python -m venv venv && ./venv/Scripts/activate 

install:
	pip install -r requirements.txt

run-local:
	uvicorn main:app --reload

run-external:
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload