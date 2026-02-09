import sqlite3
import random
from datetime import datetime, timedelta
from math import floor
from pathlib import Path

script_dir = Path(__file__).parent.absolute()
database_file = script_dir / "gsu_commute.db"

"""
Data Dictionary for unclear attributes:
    USER:
        updated_at - timestamp for updated user details
    TRAFFIC_STATUS:
        length - length of road segment for which the traffic applies
        free_flow - speed of traffic with no congestion
        jam_factor - extent of traffic jam (0-10)
        jam_tendency - represents the trend of traffic jam (decreasing(-1), no change(0), increasing(1))
        traversibility - provides info on whether the segment in blocked, restricted, or open
    ROUTE:
        route_path - jsonb datatype storing the road segments traversed in the route
"""
def get_connection():
    """
    Create connection to in-memory database
    """
    conn  = sqlite3.connect(database_file)
    return conn

def create_tables(conn):
    """
    Create table structures for database schema with proper contraints
    
    :param conn: Connection to SQLite DB
    """
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS user")
    cur.execute("CREATE TABLE user \
                 (user_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 fname VARCHAR(75) NOT NULL, \
                 lname VARCHAR(75) NOT NULL, \
                 email VARCHAR(255) NOT NULL, \
                 password_hash VARCHAR(255) NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 updated_at DATETIME, \
                 is_active INTEGER CHECK(is_active IN (0, 1)) NOT NULL) \
                ")

    cur.execute("DROP TABLE IF EXISTS auth_token")
    cur.execute("CREATE TABLE auth_token \
                 (token_hash VARCHAR(255), \
                 user_id INT NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 expires_at DATETIME NOT NULL, \
                 revoked INTEGER CHECK(revoked IN (0, 1)) NOT NULL, \
                 PRIMARY KEY(token_hash, user_id), \
                 FOREIGN KEY(user_id) REFERENCES user(user_id)) \
                ")


    cur.execute("DROP TABLE IF EXISTS parking_status")
    cur.execute("CREATE TABLE parking_status \
                 (parking_status_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 lot_name VARCHAR(50) NOT NULL, \
                 lot_street_address VARCHAR(255) NOT NULL, \
                 available_spaces INT NOT NULL, \
                 percent_open DECIMAL NOT NULL, \
                 status VARCHAR(10) CHECK(status IN ('Red', 'Yellow', 'Green')) NOT NULL, \
                 timestamp DATETIME NOT NULL) \
                ")

    cur.execute("DROP TABLE IF EXISTS traffic_status")
    cur.execute("CREATE TABLE traffic_status \
                 (traffic_status_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 start_latitude DECIMAL NOT NULL, \
                 start_longitude DECIMAL NOT NULL, \
                 end_latitude DECIMAL NOT NULL, \
                 end_longitude DECIMAL NOT NULL, \
                 length DECIMAL NOT NULL, \
                 speed DECIMAL NOT NULL, \
                 free_flow DECIMAL NOT NULL, \
                 jam_factor DECIMAL NOT NULL, \
                 jam_tendency TINYINT NOT NULL, \
                 traversibility VARCHAR(10) NOT NULL CHECK(traversibility IN ('open', 'closed', 'restricted'))) \
                ")

    cur.execute("DROP TABLE IF EXISTS safety_feed")
    cur.execute("CREATE TABLE safety_feed \
                 (alert_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 user_id INT, \
                 type VARCHAR(75) NOT NULL, \
                 description TEXT NOT NULL, \
                 latitude REAL CHECK(latitude >= -90 AND latitude <= 90), \
                 longitude REAL CHECK(longitude >= -180 AND longitude <= 180), \
                 upvotes INT NOT NULL, \
                 downvotes INT NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 FOREIGN KEY(user_id) REFERENCES user(user_id)) \
                ")

    cur.execute("DROP TABLE IF EXISTS marta_status")
    cur.execute("CREATE TABLE marta_status \
                 (status_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 line VARCHAR(15) NOT NULL, \
                 latitude DECIMAL NOT NULL, \
                 longitude DECIMAL NOT NULL, \
                 direction VARCHAR(2) NOT NULL, \
                 station VARCHAR(50) NOT NULL, \
                 destination VARCHAR(255) NOT NULL, \
                 next_arrival DATETIME NOT NULL, \
                 timestamp DATETIME NOT NULL) \
                ")

    cur.execute("DROP TABLE IF EXISTS route")
    cur.execute("CREATE TABLE route \
                 (route_id INTEGER PRIMARY KEY AUTOINCREMENT, \
                 user_id INT NOT NULL, \
                 start_location VARCHAR(255) NOT NULL, \
                 end_location VARCHAR(255) NOT NULL, \
                 mode_transport VARCHAR(255) NOT NULL, \
                 departure DATETIME NOT NULL, \
                 predicted_arrival DATETIME NOT NULL, \
                 arrival DATETIME NOT NULL, \
                 route_path BLOB NOT NULL, \
                 marta_status_id INT, \
                 parking_status_id INT, \
                 traffic_status_id VARCHAR(255) NOT NULL, \
                 weather_status VARCHAR(75) NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 FOREIGN KEY(user_id) REFERENCES user(user_id), \
                 FOREIGN KEY(parking_status_id) REFERENCES parking_status(parking_status_id), \
                 FOREIGN KEY(traffic_status_id) REFERENCES traffic_status(traffic_status_id), \
                 FOREIGN KEY(marta_status_id) REFERENCES marta_status(marta_status_id)) \
                ")
    conn.commit()

def populate_user_table(conn):
    """
    Populate user table with 50 random users
    
    :param conn: Connection to SQLite DB
    """
    first_names = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey",
    "Riley", "Avery", "Cameron", "Drew", "Parker",
    "Quinn", "Reese", "Logan", "Hayden", "Blake",
    "Sydney", "Emerson", "Rowan", "Sawyer", "Finley"
    ]

    last_names = [
        "Anderson", "Mitchell", "Carter", "Thompson", "Reynolds",
        "Parker", "Sullivan", "Bennett", "Hughes", "Coleman",
        "Foster", "Graham", "Morrison", "Wallace", "Pierce",
        "Daniels", "Lawson", "Whitaker", "Kennedy", "Bradley"
    ]

    # Example hashes in bcrypt style
    password_hashes = [
        "$2b$12$KIXQeK1Lk0z3Yq5C6tU0cO2Q9g3H8ZP7xZp0sF1aX9Qp3LrN9D4u",
        "$2b$12$uHj4z2ZJkQmX7C9F8E6pYeR0H7x2TtQyS0Fq8CwP3Bz1rN9K",
        "$2b$12$Q9wX6C3FZ1LkS2H8P5YyT4Rr0JmE7BzNq0pUuD9KcA",
        "$2b$12$7sX4qH0T9mY8K6wP2B5JrFZQnCz1E3SULRkD",
        "$2b$12$Z0QmF8T7yJ9P1s5K2E3z4UqLk6CwHNRB",
        "$2b$12$K3Y7B1U2HnZQ9D4xE6C8P0wLrF5JmT",
        "$2b$12$8w3T2CkYF7nH0xQ5S4RZJ6D9m1PBLU",
        "$2b$12$6F3nP9Q8ZC2x7B0D4KJH1L5mEwTRYS",
        "$2b$12$Z8D4K7C3nE9Qm1P5F2JH0L6xTBSRwy",
        "$2b$12$3LZC2B0KxQn4T9R6P5JY7mF1H8EDSw",
        "$2b$12$7n8H5Y9m4D2ZKJ0QF3LPC1R6BTSxEw",
        "$2b$12$RZC5P4K0x2n1mFJ7QY9D8H3E6BTSwL",
        "$2b$12$KZ6C5Yx2T0D9R8nH4QFJ1m7S3BPwEL",
        "$2b$12$4xHnQ8Z2P6Y5R1T7C9K0EJDBFLSmw",
        "$2b$12$P3R4H5C9n8x2mFZ1QK6J0TS7YEDBLw",
        "$2b$12$Q9ZK5n1x8F6Y0C2R3mB4DHT7EJPSwL",
        "$2b$12$Y3Z9F7m5n8H1x0K2Q4D6JCPRBTESwL",
        "$2b$12$K9Y2Q7FZ0x8R6nH1T5P4m3CDEJBSw",
        "$2b$12$5R3Q9xK0F8n7Y1mZJ6T2H4CDEBSwL",
        "$2b$12$8KxF9Y5n3Q0Z4H7R1m2T6CDEJBSwL"
    ]

    cur = conn.cursor()
    for i in range(50):
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        email = f'{fname.lower()}.{lname.lower()}@gmail.com'
        pword_hash = random.choice(password_hashes)
        is_active = random.randint(0, 1)

        cur.execute(f"INSERT INTO user (fname, lname, email, password_hash, created_at, is_active) \
                    VALUES (?, ?, ?, ?, ?, ?)",
                    (fname, lname, email, pword_hash, datetime.now(), is_active))
    
    conn.commit()

def populate_token_table(conn):
    """
    Create test data for the auth_token table
    
    :param conn: Connection with SQLite DB
    """

    cur = conn.cursor()
    for i in range(200):
        token_hash = ''.join(random.choices('0123456789abcdef', k=64)) # Create random 64-char hash strings
        user_id = random.randint(1,50) # Random user ids
        created_at = datetime.now()
        expires_at = datetime.now() + timedelta(days=7)
        revoked = random.randint(0,1)

        cur.execute("INSERT INTO auth_token (token_hash, user_id, created_at, expires_at, revoked) \
                    VALUES (?, ?, ?, ?, ?)", (token_hash, user_id, created_at, expires_at, revoked))
    
    conn.commit()

def populate_parking_table(conn):
    """
    Create test data for the parking_status table
    
    :param conn: Connection with SQLite DB
    """
    lots = [
        "CC Deck", "K Deck", "M Deck", 
        "N Deck", "S Deck", "T Deck"
    ]

    addresses = [
        "7 Fulton St SW", "153 Jesse Hill Jr Dr SE",
        "33 Auditorium Pl SE", "118 Gilmer St SE",
        "118 Gilmer St SE", "43 Auburn Ave NE"
    ]
    
    deck_spaces = [0, 0, 0, 0, 0, 0] # Available spaces in each deck
    increments = [224, 135, 247.5, 135, 93, 314] # Increment value for each pass of the for loop (25% of total spaces)
    statuses = ['Red', 'Yellow', 'Green', 'Green', 'Green'] # Status color represented by each percentage

    cur = conn.cursor()  
    percentage = 0 
    for i in range(5):
        for j in range(6):
            cur.execute("INSERT INTO parking_status (lot_name, lot_street_address, available_spaces, percent_open, status, timestamp) \
                        VALUES (?, ?, ?, ?, ?, ?)", 
                        (lots[j], addresses[j], floor(deck_spaces[j]), percentage, statuses[i], datetime.now()))
        # Increase available spaces by 25% of total spaces
        for idx in range(len(deck_spaces)):
            deck_spaces[idx] += increments[idx]
        percentage += 25
    
    conn.commit()

def populate_safety_table(conn):
    """
    Create test data for the safety_feed table
    type!!, description, lat, lon, upvotes, downvotes, created_at
    :param conn: Connection with SQLite DB
    """


def create_db():
    """
    Call functions to create database schema
    Will also call functions to populate tables with test data for development
    """
    conn = get_connection()
    try:
        create_tables(conn)
        populate_user_table(conn)
        populate_token_table(conn)
        populate_parking_table(conn)
    finally:
        conn.close()

if __name__ == '__main__':
    create_db()
