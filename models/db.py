import mysql.connector
from contextlib import contextmanager

class db:
    def __init__(self, config):
        self.config = config
    
    @contextmanager
    def get_connection(self):
        conn = mysql.connector.connect(**self.config)
        try:
            yield conn
        finally:
            conn.close()

    def execute_query(self, query, params=None):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params or ())
                conn.commit()
                return cursor.fetchall()

    def call_proc(self, proc_name, params):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                new_params = cursor.callproc(proc_name, params)
                conn.commit()
                # Capture output parameters and result sets if any
                results = []
                for result in cursor.stored_results():
                    results.append(result.fetchall())
                return new_params, results  # Return parameters (which include outputs), and any result sets