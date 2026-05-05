import { getDatabase } from "../local/database";

import type { SyncCheckpointScope, SyncCursor } from "./types";

export interface SyncCheckpointRepositoryPort {
  getCursor(scope: SyncCheckpointScope): Promise<SyncCursor | null>;
  advanceCursor(scope: SyncCheckpointScope, cursor: SyncCursor): Promise<void>;
}

function compareCursor(left: SyncCursor, right: SyncCursor): number {
  const timestampCompare = left.updatedAt.localeCompare(right.updatedAt);
  if (timestampCompare !== 0) {
    return timestampCompare;
  }

  return left.id.localeCompare(right.id);
}

interface CheckpointRow {
  cursor_updated_at: string | null;
  cursor_id: string | null;
}

export class SyncCheckpointRepository implements SyncCheckpointRepositoryPort {
  async getCursor(scope: SyncCheckpointScope): Promise<SyncCursor | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<CheckpointRow>(
      `
      SELECT cursor_updated_at, cursor_id
      FROM sync_checkpoints
      WHERE scope = ?
      LIMIT 1;
      `,
      scope,
    );

    if (!row?.cursor_updated_at || !row.cursor_id) {
      return null;
    }

    return {
      updatedAt: row.cursor_updated_at,
      id: row.cursor_id,
    };
  }

  async advanceCursor(
    scope: SyncCheckpointScope,
    cursor: SyncCursor,
  ): Promise<void> {
    const db = getDatabase();
    const currentCursor = await this.getCursor(scope);

    if (currentCursor && compareCursor(cursor, currentCursor) <= 0) {
      return;
    }

    await db.runAsync(
      `
      INSERT INTO sync_checkpoints (scope, cursor_updated_at, cursor_id, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(scope) DO UPDATE SET
        cursor_updated_at = excluded.cursor_updated_at,
        cursor_id = excluded.cursor_id,
        updated_at = excluded.updated_at;
      `,
      scope,
      cursor.updatedAt,
      cursor.id,
      new Date().toISOString(),
    );
  }
}
