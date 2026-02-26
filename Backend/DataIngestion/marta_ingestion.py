import sys
print(sys.path)

from Backend.config import Config
import requests

MARTA_API_KEY = Config.MARTA_API_KEY
BASE_URL = 'http://developer.itsmarta.com'
TRAIN_PATH = '/RealtimeTrain/RestServiceNextTrain/GetRealtimeArrivals'
BUS_PATH = '/RealtimeBus/RestServiceNextBus/GetRealtimeBus'
BUS_ROUTE_PATH = '/BRDRestService/RestBusRealTimeService/GetBusByRoute/'

url = f'{BASE_URL}{BUS_PATH}'

params = {
    "apikey": MARTA_API_KEY
}

response = requests.get(url, params=params)
print(response.text)