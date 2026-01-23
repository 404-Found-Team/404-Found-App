import sqlite3
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
    conn  = sqlite3.connect("gsu_commute.db")
    return conn

def create_tables(conn):
    """
    Create table structures for database schema with proper contraints
    
    :param conn: Description
    """
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS user")
    cur.execute("CREATE TABLE user \
                 (user_id INT PRIMARY KEY, \
                 email VARCHAR(255) NOT NULL, \
                 password_hash VARCHAR(255) NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 updated_at DATETIME) \
                ")

    cur.execute("DROP TABLE IF EXISTS auth_token")
    cur.execute("CREATE TABLE auth_token \
                 (token_hash VARCHAR(255), \
                 user_id INT NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 PRIMARY KEY(token_hash, user_id), \
                 FOREIGN KEY(user_id) REFERENCES user(user_id)) \
                ")


    cur.execute("DROP TABLE IF EXISTS parking_status")
    cur.execute("CREATE TABLE parking_status \
                 (parking_status_id INT PRIMARY KEY, \
                 lot_name VARCHAR(50) NOT NULL, \
                 lot_street_address VARCHAR(255) NOT NULL, \
                 available_spaces INT NOT NULL, \
                 percent_open DECIMAL NOT NULL, \
                 status VARCHAR(10) CHECK(status IN ('Red', 'Yellow', 'Green')) NOT NULL, \
                 timestamp DATETIME NOT NULL) \
                ")

    cur.execute("DROP TABLE IF EXISTS traffic_status")
    cur.execute("CREATE TABLE traffic_status \
                 (traffic_status_id INT PRIMARY KEY, \
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
                 (alert_id INT PRIMARY KEY, \
                 user_id INT, \
                 type VARCHAR(75) NOT NULL, \
                 description TEXT NOT NULL, \
                 latitude DECIMAL, \
                 longitude DECIMAL, \
                 upvotes INT NOT NULL, \
                 downvotes INT NOT NULL, \
                 created_at DATETIME NOT NULL, \
                 FOREIGN KEY(user_id) REFERENCES user(user_id)) \
                ")

    cur.execute("DROP TABLE IF EXISTS marta_status")
    cur.execute("CREATE TABLE marta_status \
                 (status_id INT PRIMARY KEY, \
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
                 (route_id INT PRIMARY KEY, \
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
    
def create_db():
    """
    Call functions to create database schema
    Will also call functions to populate tables with test data for development
    """
    conn = get_connection()
    try:
        create_tables(conn)
    finally:
        conn.close()

if __name__ == '__main__':
    create_db()
