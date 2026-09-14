import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'demo-tucocina-test';

before(async () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8085,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test('1. Unauthenticated user restrictions', async (t) => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();

  await t.test('cannot write to users collection', async () => {
    await assertFails(
      unauthDb.collection('users').doc('user_anon').set({
        id: 'user_anon',
        email: 'anon@example.com',
        role: 'USER',
      })
    );
  });

  await t.test('cannot write to user favorites', async () => {
    await assertFails(
      unauthDb
        .collection('users')
        .doc('user1')
        .collection('favorites')
        .doc('video1')
        .set({
          id: 'video1',
          userId: 'user1',
          videoId: 'video1',
          createdAt: new Date().toISOString(),
        })
    );
  });

  await t.test('cannot create or modify reports', async () => {
    await assertFails(
      unauthDb.collection('reports').doc('rep1').set({
        id: 'rep1',
        videoId: 'video1',
        userId: 'user_anon',
        userEmail: 'anon@example.com',
        reason: 'SPAM',
        description: 'Contenido inapropiado',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await t.test('cannot modify admin videos', async () => {
    await assertFails(
      unauthDb.collection('videos').doc('vid1').set({
        title: 'Video Hack',
        status: 'PUBLISHED',
      })
    );
  });
});

test('2. Authenticated user access controls & privacy', async (t) => {
  const user1Db = testEnv.authenticatedContext('user_1').firestore();
  const user2Db = testEnv.authenticatedContext('user_2').firestore();

  await t.test('can create and read own user document', async () => {
    await assertSucceeds(
      user1Db.collection('users').doc('user_1').set({
        id: 'user_1',
        email: 'user1@example.com',
        displayName: 'Usuario Uno',
        photoURL: 'https://example.com/avatar.jpg',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    await assertSucceeds(user1Db.collection('users').doc('user_1').get());
  });

  await t.test('cannot read or write another user document', async () => {
    // Seed user_2 doc as admin in test context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user_2').set({
        id: 'user_2',
        email: 'user2@example.com',
        displayName: 'Usuario Dos',
        role: 'USER',
      });
    });

    await assertFails(user1Db.collection('users').doc('user_2').get());

    await assertFails(
      user1Db.collection('users').doc('user_2').set({
        id: 'user_2',
        email: 'hacked@example.com',
        role: 'USER',
      })
    );
  });

  await t.test('cannot modify field that determines role/privileges', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user_1').set({
        id: 'user_1',
        email: 'user1@example.com',
        displayName: 'Usuario Uno',
        role: 'USER',
      });
    });

    // Attempting to elevate role to ADMIN via user document update
    await assertFails(
      user1Db.collection('users').doc('user_1').update({
        role: 'ADMIN',
      })
    );
  });

  await t.test('can update allowed profile fields (displayName, photoURL, updatedAt)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user_1').set({
        id: 'user_1',
        email: 'user1@example.com',
        displayName: 'Usuario Uno',
        role: 'USER',
      });
    });

    await assertSucceeds(
      user1Db.collection('users').doc('user_1').update({
        displayName: 'Usuario Modificado',
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await t.test('cannot modify or read favorites of another user', async () => {
    await assertFails(
      user1Db
        .collection('users')
        .doc('user_2')
        .collection('favorites')
        .doc('vid1')
        .get()
    );

    await assertFails(
      user1Db
        .collection('users')
        .doc('user_2')
        .collection('favorites')
        .doc('vid1')
        .set({
          id: 'vid1',
          userId: 'user_2',
          videoId: 'vid1',
          createdAt: new Date().toISOString(),
        })
    );
  });

  await t.test('can manage own favorites', async () => {
    await assertSucceeds(
      user1Db
        .collection('users')
        .doc('user_1')
        .collection('favorites')
        .doc('vid_1')
        .set({
          id: 'vid_1',
          userId: 'user_1',
          videoId: 'vid_1',
          createdAt: new Date().toISOString(),
        })
    );

    await assertSucceeds(
      user1Db
        .collection('users')
        .doc('user_1')
        .collection('favorites')
        .doc('vid_1')
        .get()
    );

    await assertSucceeds(
      user1Db
        .collection('users')
        .doc('user_1')
        .collection('favorites')
        .doc('vid_1')
        .delete()
    );
  });
});

test('3. Custom Claim admin authorization', async (t) => {
  const normalUserDb = testEnv.authenticatedContext('user_normal', { admin: false }).firestore();
  const adminUserDb = testEnv.authenticatedContext('user_admin', { admin: true }).firestore();

  await t.test('normal user without admin claim cannot perform admin operations', async () => {
    await assertFails(
      normalUserDb.collection('videos').doc('vid_new').set({
        title: 'New Video',
        status: 'PUBLISHED',
      })
    );

    await assertFails(normalUserDb.collection('reports').get());

    await assertFails(
      normalUserDb.collection('categories').doc('cat1').set({
        name: 'Postres',
      })
    );
  });

  await t.test('admin user with { admin: true } can perform administrative operations', async () => {
    await assertSucceeds(
      adminUserDb.collection('videos').doc('vid_admin').set({
        title: 'Admin Created Video',
        status: 'PUBLISHED',
      })
    );

    await assertSucceeds(adminUserDb.collection('reports').get());

    await assertSucceeds(
      adminUserDb.collection('categories').doc('cat1').set({
        name: 'Postres',
      })
    );

    await assertSucceeds(
      adminUserDb.collection('categories').doc('cat1').delete()
    );
  });
});

test('4. Videos visibility by status', async (t) => {
  const seedVideos = async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('videos').doc('vid_draft').set({ title: 'Draft', status: 'DRAFT' });
      await db.collection('videos').doc('vid_hidden').set({ title: 'Hidden', status: 'HIDDEN' });
      await db.collection('videos').doc('vid_rejected').set({ title: 'Rejected', status: 'REJECTED' });
      await db.collection('videos').doc('vid_published').set({ title: 'Published', status: 'PUBLISHED' });
    });
  };

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const normalDb = testEnv.authenticatedContext('user_normal').firestore();
  const adminDb = testEnv.authenticatedContext('user_admin', { admin: true }).firestore();

  await t.test('DRAFT is not publicly readable', async () => {
    await seedVideos();
    await assertFails(unauthDb.collection('videos').doc('vid_draft').get());
    await assertFails(normalDb.collection('videos').doc('vid_draft').get());
    await assertSucceeds(adminDb.collection('videos').doc('vid_draft').get());
  });

  await t.test('HIDDEN is not publicly readable', async () => {
    await seedVideos();
    await assertFails(unauthDb.collection('videos').doc('vid_hidden').get());
    await assertFails(normalDb.collection('videos').doc('vid_hidden').get());
    await assertSucceeds(adminDb.collection('videos').doc('vid_hidden').get());
  });

  await t.test('REJECTED is not publicly readable', async () => {
    await seedVideos();
    await assertFails(unauthDb.collection('videos').doc('vid_rejected').get());
    await assertFails(normalDb.collection('videos').doc('vid_rejected').get());
    await assertSucceeds(adminDb.collection('videos').doc('vid_rejected').get());
  });

  await t.test('PUBLISHED is publicly readable', async () => {
    await seedVideos();
    await assertSucceeds(unauthDb.collection('videos').doc('vid_published').get());
    await assertSucceeds(normalDb.collection('videos').doc('vid_published').get());
    await assertSucceeds(adminDb.collection('videos').doc('vid_published').get());
  });

  await t.test('normal user cannot publish or modify admin videos', async () => {
    await seedVideos();
    await assertFails(
      normalDb.collection('videos').doc('vid_published').update({
        title: 'Tampered Title',
      })
    );
  });
});

test('5. Reports creation rules & status protection', async (t) => {
  const normalDb = testEnv.authenticatedContext('user_reporter').firestore();

  await t.test('authenticated user can create report with status OPEN and valid payload', async () => {
    await assertSucceeds(
      normalDb.collection('reports').doc('rep_valid').set({
        id: 'rep_valid',
        videoId: 'vid_published',
        userId: 'user_reporter',
        userEmail: 'reporter@example.com',
        reason: 'SPAM',
        description: 'Spam description',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await t.test('cannot create report with status other than OPEN (e.g., RESOLVED)', async () => {
    await assertFails(
      normalDb.collection('reports').doc('rep_invalid_status').set({
        id: 'rep_invalid_status',
        videoId: 'vid_published',
        userId: 'user_reporter',
        userEmail: 'reporter@example.com',
        reason: 'SPAM',
        description: 'Spam description',
        status: 'RESOLVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await t.test('cannot create report with wrong userId', async () => {
    await assertFails(
      normalDb.collection('reports').doc('rep_impersonated').set({
        id: 'rep_impersonated',
        videoId: 'vid_published',
        userId: 'another_user',
        userEmail: 'reporter@example.com',
        reason: 'SPAM',
        description: 'Spam description',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await t.test('normal user cannot modify or delete existing report', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('reports').doc('rep_existing').set({
        id: 'rep_existing',
        videoId: 'vid_published',
        userId: 'user_reporter',
        userEmail: 'reporter@example.com',
        reason: 'SPAM',
        description: 'Original description',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    await assertFails(
      normalDb.collection('reports').doc('rep_existing').update({
        status: 'CLOSED',
      })
    );

    await assertFails(normalDb.collection('reports').doc('rep_existing').delete());
  });
});

test('6. Deny-by-default on unhandled collections and routes', async (t) => {
  const adminDb = testEnv.authenticatedContext('user_admin', { admin: true }).firestore();
  const unauthDb = testEnv.unauthenticatedContext().firestore();

  await t.test('access to unhandled root collection is denied', async () => {
    await assertFails(unauthDb.collection('internal_audit').doc('entry1').get());
    await assertFails(adminDb.collection('internal_audit').doc('entry1').get());
    await assertFails(
      adminDb.collection('system_config').doc('settings').set({
        debug: true,
      })
    );
  });
});
