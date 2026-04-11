const crypto = require('crypto');

function createShareRoutes(deps) {
  const { sendJson, readJson, firebaseAdmin, adminFirestore } = deps;

  async function handleShareToken(req, res, SHARE_SECRET) {
    try {
      const body = await readJson(req);
      const studentName = String(body.studentName || 'Student').slice(0, 100);
      const weeklySnapshot = body.weeklySnapshot || null;

      let uid = '';
      let tokenType = 'digest';
      const authHeader = String(req.headers['authorization'] || '');
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (idToken && firebaseAdmin) {
        try {
          const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
          uid = decodedToken.uid;
          tokenType = 'report';
        } catch (_verifyErr) {}
      }

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const tokenPayloadObj = { tokenType, studentName, expiresAt };
      if (tokenType === 'report' && uid) {
        tokenPayloadObj.uid = uid;
      }
      if (weeklySnapshot && typeof weeklySnapshot === 'object') {
        tokenPayloadObj.weeklySnapshot = {
          studyHours: Number(weeklySnapshot.studyHours) || 0,
          focusScore: Number(weeklySnapshot.focusScore) || 0,
          accuracy: Number(weeklySnapshot.accuracy) || 0,
          streak: Number(weeklySnapshot.streak) || 0,
          questionsThisWeek: Number(weeklySnapshot.questionsThisWeek) || 0,
          topicsImproved: Number(weeklySnapshot.topicsImproved) || 0,
          mockScores: Array.isArray(weeklySnapshot.mockScores) ? weeklySnapshot.mockScores.slice(0, 10).map(m => ({
            subject: String(m.subject || '').slice(0, 50),
            percent: Number(m.percent) || 0,
            timestamp: Number(m.timestamp) || 0,
          })) : [],
          weakAreas: Array.isArray(weeklySnapshot.weakAreas) ? weeklySnapshot.weakAreas.slice(0, 8).map(w => ({
            topicName: String(w.topicName || '').slice(0, 80),
            subject: String(w.subject || '').slice(0, 30),
            accuracy: Number(w.accuracy) || 0,
          })) : [],
        };
      }
      const payload = JSON.stringify(tokenPayloadObj);
      const hmac = crypto.createHmac('sha256', SHARE_SECRET).update(payload).digest('hex');
      const token = Buffer.from(payload).toString('base64url') + '.' + hmac;
      return sendJson(res, 200, { ok: true, token });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: String(err && err.message || err) });
    }
  }

  function verifyToken(token, SHARE_SECRET) {
    const parts = token.split('.');
    if (parts.length !== 2) return { ok: false, error: 'Invalid token format' };

    const [payloadB64, sig] = parts;
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const expectedSig = crypto.createHmac('sha256', SHARE_SECRET).update(payload).digest('hex');

    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { ok: false, error: 'Invalid token signature' };
    }

    const data = JSON.parse(payload);
    if (data.expiresAt && Date.now() > data.expiresAt) {
      return { ok: false, error: 'Token expired' };
    }

    return { ok: true, data };
  }

  async function handleVerifyShareToken(req, res, SHARE_SECRET) {
    try {
      const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = reqUrl.searchParams.get('token');
      if (!token) return sendJson(res, 400, { ok: false, error: 'Missing token' });

      const result = verifyToken(token, SHARE_SECRET);
      if (!result.ok) return sendJson(res, 403, { ok: false, error: result.error });

      return sendJson(res, 200, {
        ok: true,
        uid: result.data.uid,
        studentName: result.data.studentName,
        weeklySnapshot: result.data.weeklySnapshot || null,
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: String(err && err.message || err) });
    }
  }

  async function handleSharedReport(req, res, SHARE_SECRET) {
    try {
      const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = reqUrl.searchParams.get('token');
      if (!token) return sendJson(res, 400, { ok: false, error: 'Missing token' });

      const result = verifyToken(token, SHARE_SECRET);
      if (!result.ok) return sendJson(res, 403, { ok: false, error: result.error });

      const tokenData = result.data;
      if (tokenData.tokenType && tokenData.tokenType !== 'report') {
        return sendJson(res, 403, { ok: false, error: 'Token type not authorized for report access. Only authenticated report tokens can access student data.' });
      }

      const studentUid = tokenData.uid;
      if (!studentUid) {
        return sendJson(res, 403, { ok: false, error: 'Token does not contain student identity' });
      }

      if (!adminFirestore) {
        return sendJson(res, 503, { ok: false, error: 'Firestore Admin not configured' });
      }

      const studentName = tokenData.studentName || 'Student';

      const [insightsDoc, mockScoresDoc, weakAreasDoc, topicMasteryDoc] = await Promise.all([
        adminFirestore.collection('practiceInsights').doc(studentUid).get(),
        adminFirestore.collection('mockScoreHistory').doc(studentUid).get(),
        adminFirestore.collection('weakAreaSummary').doc(studentUid).get(),
        adminFirestore.collection('topicMastery').doc(studentUid).get(),
      ]);

      return sendJson(res, 200, {
        ok: true,
        studentName,
        insights: insightsDoc.exists ? insightsDoc.data() : null,
        mockScores: mockScoresDoc.exists ? (mockScoresDoc.data().entries || []) : [],
        weakAreas: weakAreasDoc.exists ? weakAreasDoc.data() : null,
        topicMastery: topicMasteryDoc.exists ? topicMasteryDoc.data() : null,
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: String(err && err.message || err) });
    }
  }

  return { handleShareToken, handleVerifyShareToken, handleSharedReport };
}

module.exports = { createShareRoutes };
