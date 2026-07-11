import { getDb } from '../database/connection';
import { generateId, generateApiKey } from '../utils/uuid';
import { Project } from '../types';

export class ProjectService {
  create(orgId: string, name: string, description: string = ''): Project {
    const db = getDb();
    const id = generateId();
    const apiKey = generateApiKey();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO projects (id, organization_id, name, description, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, orgId, name, description, apiKey, now, now);
    return { id, organization_id: orgId, name, description, api_key: apiKey, created_at: now, updated_at: now };
  }

  listByOrg(orgId: string): Project[] {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE organization_id = ? ORDER BY created_at DESC').all(orgId) as Project[];
  }

  getById(id: string): Project | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  }

  update(id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Project | undefined {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
    params.push(id);
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

export const projectService = new ProjectService();
