const path = require('path');
const { createV2Service } = require('./service');

const sendError = (res, err) => {
  const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
  return res.status(status).json({
    message: err?.message || 'Internal Server Error',
  });
};

const registerV2Routes = ({ app, readLegacyUsers, readLegacyKois }) => {
  const service = createV2Service({
    stateFile: path.join(__dirname, '..', 'v2-data.json'),
    readLegacyUsers,
    readLegacyKois,
  });

  app.get('/api/v2/schema/overview', (req, res) => {
    try {
      return res.json(service.getSchemaOverview());
    } catch (err) {
      return sendError(res, err);
    }
  });

  // Account APIs
  app.post('/api/v2/accounts', (req, res) => {
    try {
      const account = service.createOrUpdateAccount(req.body || {});
      return res.status(201).json(account);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/accounts', (req, res) => {
    try {
      const result = service.listAccounts(req.query || {});
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/accounts/:id', (req, res) => {
    try {
      const account = service.getAccount(req.params.id);
      if (!account) return res.status(404).json({ message: 'Không tìm thấy account' });
      return res.json(account);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.put('/api/v2/accounts/:id', (req, res) => {
    try {
      const account = service.updateAccount(req.params.id, req.body || {});
      return res.json(account);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // Collection APIs
  app.post('/api/v2/collections', (req, res) => {
    try {
      const collection = service.createCollection(req.body || {});
      return res.status(201).json(collection);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/collections', (req, res) => {
    try {
      const result = service.listCollections(req.query || {});
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/collections/:id', (req, res) => {
    try {
      const collection = service.getCollection(req.params.id);
      if (!collection) return res.status(404).json({ message: 'Không tìm thấy collection' });
      return res.json(collection);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.put('/api/v2/collections/:id', (req, res) => {
    try {
      const collection = service.updateCollection(req.params.id, req.body || {});
      return res.json(collection);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.post('/api/v2/collections/:id/reclassify', (req, res) => {
    try {
      const result = service.reclassifyCollection(req.params.id);
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.post('/api/v2/collections/:id/items', (req, res) => {
    try {
      const koi = service.addKoiToCollection(req.params.id, req.body?.koiIdentityId);
      return res.json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.delete('/api/v2/collections/:id/items/:koiIdentityId', (req, res) => {
    try {
      const koi = service.removeKoiFromCollection(req.params.id, req.params.koiIdentityId);
      return res.json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // Koi Profile APIs
  app.post('/api/v2/koi-profiles', (req, res) => {
    try {
      const koi = service.createKoiProfile(req.body || {});
      return res.status(201).json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/koi-profiles', (req, res) => {
    try {
      const result = service.listKoiProfiles(req.query || {});
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/koi-profiles/:id', (req, res) => {
    try {
      const koi = service.getKoiProfile(req.params.id, {
        includeMedia: service.boolFromQuery(req.query.includeMedia, true),
      });
      if (!koi) return res.status(404).json({ message: 'Không tìm thấy hồ sơ cá' });
      return res.json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.put('/api/v2/koi-profiles/:id', (req, res) => {
    try {
      const koi = service.updateKoiProfile(req.params.id, req.body || {});
      return res.json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.post('/api/v2/koi-profiles/:id/transfer', (req, res) => {
    try {
      const koi = service.transferKoi(req.params.id, req.body || {});
      return res.json(koi);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.post('/api/v2/koi-profiles/:id/growth', (req, res) => {
    try {
      const log = service.addGrowthLog(req.params.id, req.body || {});
      return res.status(201).json(log);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/koi-profiles/:id/growth', (req, res) => {
    try {
      const result = service.listGrowthLogs({
        koiIdentityId: req.params.id,
        cursor: req.query.cursor,
        limit: req.query.limit,
      });
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.post('/api/v2/koi-profiles/:id/notes', (req, res) => {
    try {
      const note = service.addObservationNote(req.params.id, req.body || {});
      return res.status(201).json(note);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/koi-profiles/:id/notes', (req, res) => {
    try {
      const result = service.listObservationNotes({
        koiIdentityId: req.params.id,
        cursor: req.query.cursor,
        limit: req.query.limit,
      });
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  app.get('/api/v2/koi-profiles/:id/trace', (req, res) => {
    try {
      const trace = service.getTraceability(req.params.id);
      if (!trace) return res.status(404).json({ message: 'Không tìm thấy hồ sơ cá' });
      return res.json(trace);
    } catch (err) {
      return sendError(res, err);
    }
  });
};

module.exports = {
  registerV2Routes,
};
