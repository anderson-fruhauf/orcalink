import { Injectable, OnModuleInit } from '@nestjs/common';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  onModuleInit() {
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const resolvedPath = path.resolve(serviceAccountPath);
        const serviceAccount = JSON.parse(
          fs.readFileSync(resolvedPath, 'utf8'),
        );

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // Fallback para Application Default Credentials (ADC) ou Emuladores
        this.firebaseApp = admin.initializeApp();
      }
    } else {
      this.firebaseApp = admin.apps[0]!;
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth(this.firebaseApp).verifyIdToken(token);
  }
}
