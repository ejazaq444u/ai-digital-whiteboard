import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storageService, UserRecord } from '../services/storageService';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role = 'teacher', gradeLevelsTaught = ['Class 10', 'Class 12', 'A Level'] } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required.' });
        return;
      }

      const existingUser = await storageService.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newUser: UserRecord = {
        id,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        gradeLevelsTaught,
        createdAt: new Date().toISOString()
      };

      await storageService.createUser(newUser);

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          gradeLevelsTaught: newUser.gradeLevelsTaught
        }
      });
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err);
      res.status(500).json({ error: 'Server error during registration.' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      let user = await storageService.findUserByEmail(email);

      // Auto-provision demo teacher if requested
      if (!user && email.toLowerCase() === 'teacher@mathboard.ai' && password === 'password123') {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        user = {
          id: 'usr_demo_teacher',
          name: 'Professor Alan Turing',
          email: 'teacher@mathboard.ai',
          passwordHash,
          role: 'teacher',
          gradeLevelsTaught: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'O Level', 'A Level'],
          createdAt: new Date().toISOString()
        };
        await storageService.createUser(user);
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gradeLevelsTaught: user.gradeLevelsTaught
        }
      });
    } catch (err: any) {
      console.error('[AuthController.login] Error:', err);
      res.status(500).json({ error: 'Server error during sign in.' });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }
      const user = await storageService.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gradeLevelsTaught: user.gradeLevelsTaught
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }
}
