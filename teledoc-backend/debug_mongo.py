import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi
import sys

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "teledoc")

if not MONGODB_URI:
    print("Error: MONGODB_URI not found in .env file")
    sys.exit(1)

print(f"Testing connection to: {MONGODB_URI.split('@')[-1]}") # Print only the host part for privacy

async def test_connection():
    print("Attempting to connect...")
    try:
        # Try with certifi and invalid certs allowed
        client = AsyncIOMotorClient(
            MONGODB_URI, 
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000
        )
        
        # Force a connection verification
        print("Pinging server...")
        await client.admin.command('ping')
        print("SUCCESS! Connected to MongoDB.")
        
        # List collections to be sure
        db = client[DB_NAME]
        collections = await db.list_collection_names()
        print(f"Collections in '{DB_NAME}': {collections}")
        
    except Exception as e:
        print("\nFAILED to connect.")
        print(f"Error type: {type(e).__name__}")
        print(f"Error details: {e}")
        print("\nTROUBLESHOOTING TIPS:")
        print("1. IP WHITELIST: Go to MongoDB Atlas -> Network Access -> Add Current IP Address.")
        print("2. FIREWALL/VPN: Disable any VPNs or strict firewalls.")
        print("3. CONNECTION STRING: Ensure your username/password in .env are correct.")

if __name__ == "__main__":
    asyncio.run(test_connection())
