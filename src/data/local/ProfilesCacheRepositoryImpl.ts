import { getDatabase } from "./database";
import type { ProfilesCacheRepository } from "../../features/auth/domain/profilesCacheRepository";
import type { Profile, Role } from "../../features/auth/domain/profile";

interface ProfileCacheRow {
  id: string;
  display_name: string;
  role: Role;
  is_shared_device: number;
}

function mapRow(row: ProfileCacheRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    isSharedDevice: row.is_shared_device === 1,
  };
}

export class ProfilesCacheRepositoryImpl implements ProfilesCacheRepository {
  async getOperarios(): Promise<Profile[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ProfileCacheRow>(
      `SELECT id, display_name, role, is_shared_device
       FROM profiles_cache
       WHERE is_shared_device = 0
       ORDER BY display_name ASC`,
    );
    return rows.map(mapRow);
  }
}
