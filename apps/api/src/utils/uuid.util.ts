// src/utils/uuid.util.ts
export async function generateUUID() {
    const { v4: uuidv4 } = await import("uuid");
    return uuidv4();
  }
  