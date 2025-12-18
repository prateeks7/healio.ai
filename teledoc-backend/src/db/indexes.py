import pymongo
from src.db.client import get_database

async def create_indexes():
    db = get_database()
    
    # Users
    await db.users.create_index("google_sub", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    
    # Medical Histories
    await db.medical_histories.create_index("patient_id")
    
    # Uploads (GridFS metadata is stored in fs.files usually, but we have a separate metadata collection 'uploads' per requirements?)
    # Requirement says: "uploads (GridFS + metadata): Metadata fields: file_id, patient_id..."
    # We will use a separate collection 'uploads_metadata' or just 'uploads' to store the extra metadata linking to GridFS file_id.
    await db.uploads.create_index("patient_id")
    # Create text index on image_summary for keyword search
    await db.uploads.create_index([("image_summary", pymongo.TEXT)])
    
    # Chats
    await db.chats.create_index("patient_id")
    await db.chats.create_index([("keywords", pymongo.ASCENDING)]) # Multikey
    await db.chats.create_index([("messages.content", pymongo.TEXT)])
    
    # Reports
    await db.reports.create_index("patient_id")
    await db.reports.create_index("reviewed")
    await db.reports.create_index([("keywords", pymongo.ASCENDING)])

    print("Indexes created successfully")
