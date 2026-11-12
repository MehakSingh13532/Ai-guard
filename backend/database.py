import asyncio
from prisma import Prisma

# Global prisma client
prisma = Prisma()

async def init_db():
    """Initialize the database connection."""
    if not prisma.is_connected():
        await prisma.connect()

async def close_db():
    """Close the database connection."""
    if prisma.is_connected():
        await prisma.disconnect()

async def get_db():
    """Dependency to get the database client."""
    if not prisma.is_connected():
        await init_db()
    return prisma
