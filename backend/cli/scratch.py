import asyncio
from database import get_db

async def main():
    prisma = await get_db()
    print(dir(prisma.session))
    await prisma.disconnect()

asyncio.run(main())
