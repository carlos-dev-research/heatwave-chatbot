from models import *
from config import load_config
from flask import Flask
from routes import register_routes

# Load Config
myconfig = load_config()

# Create Web App
app = Flask(__name__)
app.mydb = db(myconfig)
app.slm = SLM(model_name='llama3.2')
register_routes(app)


# Start the Flask application if this script is executed directly
if __name__ == '__main__':
    app.run(host="0.0.0.0",port=5000,debug=True)  # Enable debug mode for development purposes