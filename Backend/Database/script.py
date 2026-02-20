'''
File for quick database transactions for development
'''
from initialize_db import get_connection
import sqlite3
from pathlib import Path

script_dir = Path(__file__).parent.absolute()
database_file = script_dir / "gsu_commute.db"

conn = get_connection(database_file)
cur = conn.cursor()

# Implement query here
# cur.execute("DELETE FROM auth_token WHERE user_id = 53")
conn.commit()
