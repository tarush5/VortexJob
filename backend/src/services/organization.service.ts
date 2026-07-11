import { getDb } from '../database/connection';
import { generateId } from '../utils/uuid';
import { Organization, OrganizationMember } from '../types';

export class OrganizationService {
  create(name: string, userId: string): Organization {
    const db = getDb();
    const id = generateId();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();
    const memberId = generateId();

    const insertOrg = db.prepare(
      'INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    );
    const insertMember = db.prepare(
      'INSERT INTO organization_members (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const txn = db.transaction(() => {
      insertOrg.run(id, name, slug, now, now);
      insertMember.run(memberId, id, userId, 'admin', now);
    });
    txn();

    return { id, name, slug, created_at: now, updated_at: now };
  }

  list(userId: string): Organization[] {
    const db = getDb();
    return db.prepare(
      `SELECT o.* FROM organizations o
       JOIN organization_members om ON om.organization_id = o.id
       WHERE om.user_id = ?
       ORDER BY o.created_at DESC`
    ).all(userId) as Organization[];
  }

  getById(id: string): Organization | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as Organization | undefined;
  }

  addMember(orgId: string, userId: string, role: string): OrganizationMember {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO organization_members (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, orgId, userId, role, now);
    return { id, organization_id: orgId, user_id: userId, role: role as any, created_at: now };
  }

  getMembers(orgId: string): any[] {
    const db = getDb();
    return db.prepare(
      `SELECT om.*, u.email, u.full_name FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = ?`
    ).all(orgId);
  }
}

export const organizationService = new OrganizationService();
