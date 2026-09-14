import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { getAdminAuth, getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();

router.use(authenticateUser);

/**
 * Endpoint para asignar el Custom Claim `admin === true` en Firebase Authentication.
 * Permite que un usuario autenticado reclome o sincronice su rol de Administrador.
 */
router.post('/claim-admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado' } });
    }

    // 1. Asignar el Custom Claim de Firebase Auth
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.setCustomUserClaims(uid, { admin: true });
      console.log(`[AuthAdmin] Custom claim 'admin: true' asignado con éxito a uid: ${uid}`);
    } catch (claimErr: any) {
      console.warn(`[AuthAdmin] Advertencia al asignar custom claims en Firebase Auth:`, claimErr?.message || claimErr);
    }

    // 2. Actualizar el documento del perfil de usuario en Firestore
    try {
      const db = getAdminFirestore();
      const userRef = db.collection('users').doc(uid);
      const docSnap = await userRef.get();
      const now = new Date().toISOString();

      if (docSnap.exists) {
        await userRef.update({
          role: 'ADMIN',
          updatedAt: now,
        });
      } else {
        await userRef.set({
          id: uid,
          uid,
          email: req.user?.email || '',
          displayName: req.user?.email ? req.user.email.split('@')[0] : 'Administrador',
          photoURL: '',
          role: 'ADMIN',
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (fsErr: any) {
      console.warn(`[AuthAdmin] Advertencia al actualizar perfil de usuario en Firestore:`, fsErr?.message || fsErr);
    }

    return res.json({
      success: true,
      message: 'Rol de administrador activado exitosamente. Se ha asignado el Custom Claim admin === true.',
    });
  } catch (error: any) {
    console.error('[AuthAdmin] Error al procesar solicitud de admin:', error);
    return res.status(500).json({
      error: { code: 'ADMIN_CLAIM_FAILED', message: error.message || 'Error al asignar rol de administrador' },
    });
  }
});

export default router;
