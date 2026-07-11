import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/connection';
import { config } from '../config';
import { generateId } from '../utils/uuid';
import { User, JwtPayload } from '../types';

export class AuthService {
  register(email: string, password: string, fullName: string): { user: Omit<User, 'password_hash'>; token: string } {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { status: 409, code: 'DUPLICATE_EMAIL' });
    }
    const id = generateId();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, email, passwordHash, fullName, 'admin', now, now);
    const token = this.generateToken({ userId: id, email });
    return {
      user: { id, email, full_name: fullName, role: 'admin', created_at: now, updated_at: now },
      token,
    };
  }

  login(email: string, password: string): { user: Omit<User, 'password_hash'>; token: string } {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401, code: 'INVALID_CREDENTIALS' });
    }
    const token = this.generateToken({ userId: user.id, email: user.email });
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  getMe(userId: string): Omit<User, 'password_hash'> | null {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  }
}

export const authService = new AuthService();
