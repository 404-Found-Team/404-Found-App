import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from APIService.api.deps import get_db


url = "https://parking.gsu.edu/"

def parse_dynamic_content(url: str) -> BeautifulSoup:
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver.get(url)
    iframes = driver.find_elements("tag name", "iframe")
    if len(iframes) >= 2:
        target_iframe = iframes[1]  # Second iframe
        print(f"Switching to second iframe: {target_iframe}")
        driver.switch_to.frame(target_iframe)
        # Wait for at least one card to appear
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "card"))
        )
        html = driver.page_source
        data = BeautifulSoup(html, 'html.parser')
        driver.quit()
        return data
    else:
        driver.quit()
        raise Exception("Frame not found.")
        
def initialize_df():
    df = pd.DataFrame(columns=["lot_name", "lot_street_address", "available_spaces", "percent_open", "timestamp"])
    return df

def scrape_data(data: BeautifulSoup, df: pd.DataFrame):
    cards = data.find_all("div", class_="card")
    for card in cards:
        name = card.select_one("div.location-name")
        spaces = card.select_one("div.spaces-info div.spaces-container div.spaces-value")
        percentage = card.select_one("div.spaces-info > div.status")
        address = card.select_one("div.address")
        if name and spaces and percentage and address:
            data_dict = {
                    "lot_name": name.get_text(strip=True),
                    "lot_street_address": address.get_text(strip=True),
                    "available_spaces": spaces.get_text(strip=True),
                    "percent_open": percentage.get_text(strip=True),
                    "timestamp": datetime.now()
                    }
            df1 = pd.DataFrame(data_dict, index=[0])
            df = pd.concat([df, df1], ignore_index=True)
    df['available_spaces'].astype(int)
    df["percent_open"] = df["percent_open"].str.replace("%", "")
    df['percent_open'].astype(float)
    return df       
            
def scraper(url, db):
    soup = parse_dynamic_content(url)
    df = initialize_df()
    new_df = scrape_data(soup, df)
    # Use the SQLAlchemy connection from the session
    new_df.to_sql(
        name="parking_status",  
        con=db.get_bind(),
        if_exists="append",
        index=False
    )
    json = new_df.to_json()
    return json

if __name__ == "__main__":
    scraper(url, next(get_db()))