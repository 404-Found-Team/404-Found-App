import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from APIService.api.deps import get_db
from config import Config
import requests
import json
import pandas as pd

MARTA_API_KEY = Config.MARTA_API_KEY
BASE_URL = 'https://developerservices.itsmarta.com:18096/itsmarta'
TRAIN_PATH = '/railrealtimearrivals/developerservices/traindata'
BUS_PATH = '/RealtimeBus/RestServiceNextBus/GetRealtimeBus'
BUS_ROUTE_PATH = '/BRDRestService/RestBusRealTimeService/GetBusByRoute/'

url = f'{BASE_URL}{TRAIN_PATH}'

params = {
    "apiKey": MARTA_API_KEY
}

def generate_dataframe(db):
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        try:
            data = response.json()
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {response.text}")
            return

        if not isinstance(data, list):
            print(f"Unexpected data format: {type(data)}")
            print(f"Data: {data}")
            return

        df = pd.DataFrame(columns=['line', 'direction', 'station', 'destination', 'next_arrival', 'waiting_seconds', 'timestamp'])
        for item in data:
            try:
                data_dict = {
                    'line': item['LINE'],
                    'direction': item['DIRECTION'],
                    'station': item['STATION'],
                    'destination': item['DESTINATION'],
                    'next_arrival': item['NEXT_ARR'],
                    'waiting_seconds': item['WAITING_SECONDS'],
                    'timestamp': item['EVENT_TIME']
                }
            except Exception as e:
                print(f"Error extracting fields from item: {e}")
                print(f"Item: {item}")
                continue
            df1 = pd.DataFrame(data_dict, index=[0])
            df = pd.concat([df, df1], ignore_index=True)
        try:
            df.to_sql(
                name="marta_status",
                con=db.get_bind(),
                if_exists='replace',
                index=False
            )
        except Exception as e:
            print(f"Error writing to database: {e}")
        print(df)
        records = df.to_dict(orient="records")
        print(records)
    except requests.RequestException as e:
        print(f"Request error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    
generate_dataframe(next(get_db()))