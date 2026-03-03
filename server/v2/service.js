const fs = require('fs');
const path = require('path');

const ACCOUNT_TYPES = new Set(['personal', 'farm', 'dealer']);
const KOI_STATUSES = new Set(['pending', 'verified', 'rejected', 'transferring']);

const DEFAULT_STATE = {
  meta: {
    version: 1,
    counters: {
      account: 0,
      collection: 0,
      koi: 0,
      growth: 0,
      note: 0,
      event: 0,
    },
    createdAt: null,
    updatedAt: null,
    legacySeeded: false,
  },
  accounts: [],
  collections: [],
  koiProfiles: [],
  growthLogs: [],
  traceEvents: [],
};

const toJsonClone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  const unique = new Set();
  arr.forEach((entry) => {
    const value = normalizeText(String(entry || ''));
    if (value) unique.add(value);
  });
  return [...unique];
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const boolFromQuery = (value, fallback = false) => {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const parseLimit = (value, defaultLimit = 20, maxLimit = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(Math.floor(parsed), maxLimit);
};

const makeId = (state, prefix, counterKey) => {
  state.meta.counters[counterKey] = (state.meta.counters[counterKey] || 0) + 1;
  const serial = String(state.meta.counters[counterKey]).padStart(6, '0');
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${serial}`;
};

const encodeCursor = (item) => {
  const payload = {
    id: item.id,
    updatedAt: item.updatedAt || item.createdAt || nowIso(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch (err) {
    return null;
  }
};

const sortByRecentDesc = (items) => {
  items.sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    const aId = a.id || '';
    const bId = b.id || '';
    return aId < bId ? 1 : -1;
  });
  return items;
};

const paginateByCursor = (records, { cursor, limit }) => {
  const sorted = sortByRecentDesc([...records]);
  if (!cursor) {
    const items = sorted.slice(0, limit);
    return {
      items,
      hasMore: sorted.length > items.length,
      nextCursor: sorted.length > items.length ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  const decoded = decodeCursor(cursor);
  if (!decoded?.id) {
    const items = sorted.slice(0, limit);
    return {
      items,
      hasMore: sorted.length > items.length,
      nextCursor: sorted.length > items.length ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  const startIndex = sorted.findIndex((item) => item.id === decoded.id);
  const sliceFrom = startIndex >= 0 ? startIndex + 1 : 0;
  const items = sorted.slice(sliceFrom, sliceFrom + limit);

  return {
    items,
    hasMore: sliceFrom + items.length < sorted.length,
    nextCursor: sliceFrom + items.length < sorted.length && items.length > 0
      ? encodeCursor(items[items.length - 1])
      : null,
  };
};

const createStore = (stateFile) => {
  const ensureState = () => {
    if (!fs.existsSync(stateFile)) {
      const initial = toJsonClone(DEFAULT_STATE);
      initial.meta.createdAt = nowIso();
      initial.meta.updatedAt = initial.meta.createdAt;
      fs.writeFileSync(stateFile, JSON.stringify(initial, null, 2), 'utf8');
    }
  };

  const read = () => {
    ensureState();
    try {
      const raw = fs.readFileSync(stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      const merged = {
        ...toJsonClone(DEFAULT_STATE),
        ...parsed,
        meta: {
          ...toJsonClone(DEFAULT_STATE).meta,
          ...(parsed?.meta || {}),
          counters: {
            ...toJsonClone(DEFAULT_STATE).meta.counters,
            ...(parsed?.meta?.counters || {}),
          },
        },
      };
      return merged;
    } catch (err) {
      return toJsonClone(DEFAULT_STATE);
    }
  };

  const write = (state) => {
    const next = {
      ...state,
      meta: {
        ...state.meta,
        updatedAt: nowIso(),
        createdAt: state.meta.createdAt || nowIso(),
      },
    };
    fs.writeFileSync(stateFile, JSON.stringify(next, null, 2), 'utf8');
    return next;
  };

  const mutate = (mutator) => {
    const state = read();
    const result = mutator(state);
    write(state);
    return result;
  };

  return { read, write, mutate };
};

const ensureMembershipConsistency = (state) => {
  const collectionIds = new Set(state.collections.map((collection) => collection.id));

  state.koiProfiles.forEach((koi) => {
    if (!Array.isArray(koi.collectionMemberships)) {
      koi.collectionMemberships = [];
    }

    koi.collectionMemberships = koi.collectionMemberships.filter((membership) => {
      return membership?.collectionId && collectionIds.has(membership.collectionId);
    });

    // De-duplicate memberships by collectionId, prefer manual over auto
    const byCollection = new Map();
    koi.collectionMemberships.forEach((membership) => {
      const current = byCollection.get(membership.collectionId);
      if (!current) {
        byCollection.set(membership.collectionId, membership);
        return;
      }
      if (current.source === 'auto' && membership.source === 'manual') {
        byCollection.set(membership.collectionId, membership);
      }
    });

    koi.collectionMemberships = [...byCollection.values()];
  });

  const counts = new Map();
  state.koiProfiles.forEach((koi) => {
    (koi.collectionMemberships || []).forEach((membership) => {
      counts.set(membership.collectionId, (counts.get(membership.collectionId) || 0) + 1);
    });
  });

  state.collections.forEach((collection) => {
    collection.itemCount = counts.get(collection.id) || 0;
  });
};

const normalizeRuleSet = (ruleSet) => {
  const autoVarieties = sanitizeArray(ruleSet?.autoVarieties).map(normalizeLower);
  const autoStatuses = sanitizeArray(ruleSet?.autoStatuses).map(normalizeLower);
  return { autoVarieties, autoStatuses };
};

const isKoiMatchingRule = (koi, ruleSet) => {
  const variety = normalizeLower(koi.variety || '');
  const status = normalizeLower(koi.status || '');
  const matchVariety = ruleSet.autoVarieties.length === 0 || ruleSet.autoVarieties.includes(variety);
  const matchStatus = ruleSet.autoStatuses.length === 0 || ruleSet.autoStatuses.includes(status);
  return matchVariety && matchStatus;
};

const summarizeMedia = (media) => {
  const images = Array.isArray(media?.images) ? media.images : [];
  const videos = Array.isArray(media?.videos) ? media.videos : [];
  return {
    thumbnail: media?.thumbnail || images[0] || '',
    imageCount: images.length,
    videoCount: videos.length,
  };
};

const compactKoi = (koi, { includeMedia = false } = {}) => {
  const notes = Array.isArray(koi.observationNotes) ? koi.observationNotes : [];
  const collectionIds = (koi.collectionMemberships || []).map((membership) => membership.collectionId);

  return {
    id: koi.id,
    koiIdentityId: koi.koiIdentityId,
    name: koi.name,
    variety: koi.variety,
    status: koi.status,
    breeder: koi.breeder,
    hatchYear: koi.hatchYear,
    sizeCm: koi.sizeCm,
    weightKg: koi.weightKg,
    originAccountId: koi.originAccountId,
    currentOwnerAccountId: koi.currentOwnerAccountId,
    collectionIds,
    createdAt: koi.createdAt,
    updatedAt: koi.updatedAt,
    growthSummary: koi.growthSummary || null,
    latestObservation: notes.length > 0 ? notes[notes.length - 1] : null,
    media: includeMedia ? (koi.media || { thumbnail: '', images: [], videos: [] }) : summarizeMedia(koi.media),
  };
};

const createV2Service = ({
  stateFile = path.join(__dirname, '..', 'v2-data.json'),
  readLegacyUsers = () => [],
  readLegacyKois = () => [],
} = {}) => {
  const store = createStore(stateFile);

  const findAccountById = (state, accountId) => state.accounts.find((account) => account.id === accountId);
  const findCollectionById = (state, collectionId) => state.collections.find((collection) => collection.id === collectionId);
  const findKoiById = (state, koiIdentityId) => state.koiProfiles.find((koi) => koi.id === koiIdentityId);

  const appendTraceEvent = (state, event) => {
    const traceEvent = {
      id: makeId(state, 'TEV', 'event'),
      koiIdentityId: event.koiIdentityId,
      eventType: event.eventType,
      at: event.at || nowIso(),
      actorAccountId: event.actorAccountId || null,
      fromAccountId: event.fromAccountId || null,
      toAccountId: event.toAccountId || null,
      note: normalizeText(event.note || ''),
      payload: event.payload || {},
    };

    state.traceEvents.push(traceEvent);
    return traceEvent;
  };

  const syncAutoMembershipsForKoi = (state, koi) => {
    const ownerCollections = state.collections.filter(
      (collection) => collection.ownerAccountId === koi.currentOwnerAccountId
    );

    const autoCollectionIds = ownerCollections
      .filter((collection) => isKoiMatchingRule(koi, collection.autoRules || { autoVarieties: [], autoStatuses: [] }))
      .map((collection) => collection.id);

    const manualMemberships = (koi.collectionMemberships || []).filter((membership) => membership.source === 'manual');

    const manualOwnerCollectionIds = new Set(
      ownerCollections.map((collection) => collection.id).filter((collectionId) =>
        manualMemberships.some((membership) => membership.collectionId === collectionId)
      )
    );

    const nextAutoMemberships = autoCollectionIds
      .filter((collectionId) => !manualOwnerCollectionIds.has(collectionId))
      .map((collectionId) => ({
        collectionId,
        source: 'auto',
        addedAt: nowIso(),
      }));

    const membershipsFromOtherOwners = (koi.collectionMemberships || []).filter((membership) => {
      const collection = findCollectionById(state, membership.collectionId);
      return collection && collection.ownerAccountId !== koi.currentOwnerAccountId;
    });

    koi.collectionMemberships = [...manualMemberships, ...membershipsFromOtherOwners, ...nextAutoMemberships];
  };

  const removeAllMembershipsFromOtherOwners = (state, koi) => {
    koi.collectionMemberships = (koi.collectionMemberships || []).filter((membership) => {
      const collection = findCollectionById(state, membership.collectionId);
      return collection && collection.ownerAccountId === koi.currentOwnerAccountId;
    });
  };

  const bootstrapLegacy = () => {
    store.mutate((state) => {
      if (state.meta.legacySeeded) return;

      const users = readLegacyUsers();
      const kois = readLegacyKois();

      const accountByEmail = new Map();

      users.forEach((user) => {
        const email = normalizeLower(user.email || '');
        if (!email || accountByEmail.has(email)) return;

        const account = {
          id: makeId(state, 'ACC', 'account'),
          type: 'personal',
          email,
          displayName: normalizeText(user.displayName || user.email || 'Weme Member'),
          role: normalizeText(user.role || 'user') || 'user',
          status: 'active',
          createdAt: user.createdAt || nowIso(),
          updatedAt: nowIso(),
        };

        state.accounts.push(account);
        accountByEmail.set(email, account);
      });

      kois.forEach((legacyKoi) => {
        const ownerEmail = normalizeLower(legacyKoi.owner || '');
        if (!ownerEmail) return;

        let ownerAccount = accountByEmail.get(ownerEmail);
        if (!ownerAccount) {
          ownerAccount = {
            id: makeId(state, 'ACC', 'account'),
            type: 'personal',
            email: ownerEmail,
            displayName: ownerEmail.split('@')[0] || ownerEmail,
            role: 'user',
            status: 'active',
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          state.accounts.push(ownerAccount);
          accountByEmail.set(ownerEmail, ownerAccount);
        }

        if (state.koiProfiles.some((item) => item.id === legacyKoi.id)) return;

        const status = KOI_STATUSES.has(normalizeLower(legacyKoi.status || ''))
          ? normalizeLower(legacyKoi.status)
          : legacyKoi.verified
            ? 'verified'
            : 'pending';

        const mediaImages = Array.isArray(legacyKoi.images)
          ? legacyKoi.images
          : legacyKoi.img
            ? [legacyKoi.img]
            : [];

        const koi = {
          id: legacyKoi.id || makeId(state, 'KOI', 'koi'),
          koiIdentityId: legacyKoi.id || makeId(state, 'KOI', 'koi'),
          legacyId: legacyKoi.id || null,
          name: normalizeText(legacyKoi.name || legacyKoi.id || 'Koi Profile'),
          variety: normalizeText(legacyKoi.variety || ''),
          breeder: normalizeText(legacyKoi.breeder || ''),
          hatchYear: toNumber(legacyKoi.year),
          sizeCm: toNumber(legacyKoi.size),
          weightKg: toNumber(legacyKoi.kg),
          status,
          originAccountId: ownerAccount.id,
          currentOwnerAccountId: ownerAccount.id,
          media: {
            thumbnail: legacyKoi.img || mediaImages[0] || '',
            images: mediaImages,
            videos: [],
          },
          observationNotes: [],
          collectionMemberships: [],
          growthSummary: null,
          createdAt: legacyKoi.createdAt || nowIso(),
          updatedAt: legacyKoi.updatedAt || legacyKoi.createdAt || nowIso(),
        };

        state.koiProfiles.push(koi);

        appendTraceEvent(state, {
          koiIdentityId: koi.id,
          eventType: 'LEGACY_IMPORT',
          at: koi.createdAt,
          actorAccountId: ownerAccount.id,
          toAccountId: ownerAccount.id,
          payload: {
            legacyId: legacyKoi.id || null,
          },
        });

        appendTraceEvent(state, {
          koiIdentityId: koi.id,
          eventType: 'REGISTERED',
          at: koi.createdAt,
          actorAccountId: ownerAccount.id,
          toAccountId: ownerAccount.id,
          payload: {
            status: koi.status,
          },
        });
      });

      ensureMembershipConsistency(state);
      state.meta.legacySeeded = true;
    });
  };

  const createOrUpdateAccount = (payload) => {
    return store.mutate((state) => {
      const type = normalizeLower(payload.type || 'personal');
      if (!ACCOUNT_TYPES.has(type)) {
        const err = new Error('type phải là personal | farm | dealer');
        err.status = 400;
        throw err;
      }

      const email = normalizeLower(payload.email || '');
      if (!email) {
        const err = new Error('email là bắt buộc');
        err.status = 400;
        throw err;
      }

      const existing = state.accounts.find(
        (account) => normalizeLower(account.email) === email && account.type === type
      );

      if (existing) {
        existing.displayName = normalizeText(payload.displayName || existing.displayName || email);
        existing.role = normalizeText(payload.role || existing.role || 'user') || 'user';
        existing.status = normalizeLower(payload.status || existing.status || 'active');
        existing.updatedAt = nowIso();
        return existing;
      }

      const account = {
        id: makeId(state, 'ACC', 'account'),
        type,
        email,
        displayName: normalizeText(payload.displayName || email),
        role: normalizeText(payload.role || 'user') || 'user',
        status: normalizeLower(payload.status || 'active'),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      state.accounts.push(account);
      return account;
    });
  };

  const updateAccount = (accountId, payload) => {
    return store.mutate((state) => {
      const account = findAccountById(state, accountId);
      if (!account) {
        const err = new Error('Không tìm thấy account');
        err.status = 404;
        throw err;
      }

      if (payload.displayName !== undefined) account.displayName = normalizeText(payload.displayName || account.displayName);
      if (payload.role !== undefined) account.role = normalizeText(payload.role || account.role);
      if (payload.status !== undefined) account.status = normalizeLower(payload.status || account.status);
      account.updatedAt = nowIso();
      return account;
    });
  };

  const listAccounts = ({ type, q, cursor, limit }) => {
    const state = store.read();
    const typeFilter = normalizeLower(type || '');
    const qFilter = normalizeLower(q || '');

    const filtered = state.accounts.filter((account) => {
      if (typeFilter && account.type !== typeFilter) return false;
      if (qFilter) {
        const haystack = `${account.id} ${account.email} ${account.displayName}`.toLowerCase();
        return haystack.includes(qFilter);
      }
      return true;
    });

    const page = paginateByCursor(filtered, { cursor, limit: parseLimit(limit, 20, 100) });

    return {
      ...page,
      items: page.items,
      total: filtered.length,
    };
  };

  const getAccount = (accountId) => {
    const state = store.read();
    return findAccountById(state, accountId) || null;
  };

  const createCollection = (payload) => {
    return store.mutate((state) => {
      const ownerAccountId = normalizeText(payload.ownerAccountId || '');
      const owner = findAccountById(state, ownerAccountId);
      if (!owner) {
        const err = new Error('ownerAccountId không hợp lệ');
        err.status = 400;
        throw err;
      }

      const name = normalizeText(payload.name || '');
      if (!name) {
        const err = new Error('Tên collection là bắt buộc');
        err.status = 400;
        throw err;
      }

      const duplicate = state.collections.find(
        (collection) => collection.ownerAccountId === ownerAccountId && normalizeLower(collection.name) === normalizeLower(name)
      );

      if (duplicate) {
        const err = new Error('Collection đã tồn tại cho account này');
        err.status = 409;
        throw err;
      }

      const collection = {
        id: makeId(state, 'COL', 'collection'),
        ownerAccountId,
        name,
        description: normalizeText(payload.description || ''),
        visibility: normalizeLower(payload.visibility || 'private') || 'private',
        autoRules: normalizeRuleSet(payload.autoRules || {}),
        itemCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      state.collections.push(collection);

      // Reclassify existing koi in the same owner to immediately apply new auto rule
      state.koiProfiles.forEach((koi) => {
        if (koi.currentOwnerAccountId !== ownerAccountId) return;
        syncAutoMembershipsForKoi(state, koi);
      });
      ensureMembershipConsistency(state);

      return collection;
    });
  };

  const updateCollection = (collectionId, payload) => {
    return store.mutate((state) => {
      const collection = findCollectionById(state, collectionId);
      if (!collection) {
        const err = new Error('Không tìm thấy collection');
        err.status = 404;
        throw err;
      }

      if (payload.name !== undefined) {
        const newName = normalizeText(payload.name || collection.name);
        if (!newName) {
          const err = new Error('Tên collection không hợp lệ');
          err.status = 400;
          throw err;
        }
        collection.name = newName;
      }

      if (payload.description !== undefined) collection.description = normalizeText(payload.description || '');
      if (payload.visibility !== undefined) collection.visibility = normalizeLower(payload.visibility || collection.visibility);
      if (payload.autoRules !== undefined) collection.autoRules = normalizeRuleSet(payload.autoRules || {});

      collection.updatedAt = nowIso();

      state.koiProfiles.forEach((koi) => {
        if (koi.currentOwnerAccountId !== collection.ownerAccountId) return;
        syncAutoMembershipsForKoi(state, koi);
      });

      ensureMembershipConsistency(state);
      return collection;
    });
  };

  const listCollections = ({ ownerAccountId, cursor, limit, q }) => {
    const state = store.read();
    const ownerFilter = normalizeText(ownerAccountId || '');
    const qFilter = normalizeLower(q || '');

    const filtered = state.collections.filter((collection) => {
      if (ownerFilter && collection.ownerAccountId !== ownerFilter) return false;
      if (qFilter) {
        const haystack = `${collection.id} ${collection.name} ${collection.description}`.toLowerCase();
        return haystack.includes(qFilter);
      }
      return true;
    });

    const page = paginateByCursor(filtered, { cursor, limit: parseLimit(limit, 20, 100) });

    return {
      ...page,
      items: page.items,
      total: filtered.length,
    };
  };

  const getCollection = (collectionId) => {
    const state = store.read();
    return findCollectionById(state, collectionId) || null;
  };

  const createKoiProfile = (payload) => {
    return store.mutate((state) => {
      const originAccountId = normalizeText(payload.originAccountId || payload.currentOwnerAccountId || '');
      const currentOwnerAccountId = normalizeText(payload.currentOwnerAccountId || originAccountId);

      const originAccount = findAccountById(state, originAccountId);
      const currentOwner = findAccountById(state, currentOwnerAccountId);

      if (!originAccount || !currentOwner) {
        const err = new Error('originAccountId/currentOwnerAccountId không hợp lệ');
        err.status = 400;
        throw err;
      }

      const name = normalizeText(payload.name || '');
      if (!name) {
        const err = new Error('Tên cá là bắt buộc');
        err.status = 400;
        throw err;
      }

      const statusRaw = normalizeLower(payload.status || 'pending');
      const status = KOI_STATUSES.has(statusRaw) ? statusRaw : 'pending';

      const koiIdentityId = normalizeText(payload.koiIdentityId || payload.id || makeId(state, 'KOI', 'koi'));
      if (state.koiProfiles.some((koi) => koi.id === koiIdentityId)) {
        const err = new Error('koiIdentityId đã tồn tại');
        err.status = 409;
        throw err;
      }

      const mediaImages = sanitizeArray(payload.media?.images || payload.images || []);
      const mediaVideos = sanitizeArray(payload.media?.videos || payload.videos || []);

      const koi = {
        id: koiIdentityId,
        koiIdentityId,
        name,
        variety: normalizeText(payload.variety || ''),
        breeder: normalizeText(payload.breeder || ''),
        hatchYear: toNumber(payload.hatchYear),
        sizeCm: toNumber(payload.sizeCm),
        weightKg: toNumber(payload.weightKg),
        status,
        originAccountId,
        currentOwnerAccountId,
        media: {
          thumbnail: normalizeText(payload.media?.thumbnail || payload.thumbnail || mediaImages[0] || ''),
          images: mediaImages,
          videos: mediaVideos,
        },
        observationNotes: [],
        collectionMemberships: sanitizeArray(payload.collectionIds).map((collectionId) => ({
          collectionId,
          source: 'manual',
          addedAt: nowIso(),
        })),
        growthSummary: {
          lastMeasuredAt: nowIso(),
          sizeCm: toNumber(payload.sizeCm),
          weightKg: toNumber(payload.weightKg),
        },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      // Keep only memberships that belong to owner account
      koi.collectionMemberships = koi.collectionMemberships.filter((membership) => {
        const collection = findCollectionById(state, membership.collectionId);
        return collection && collection.ownerAccountId === currentOwnerAccountId;
      });

      state.koiProfiles.push(koi);
      syncAutoMembershipsForKoi(state, koi);

      appendTraceEvent(state, {
        koiIdentityId: koi.id,
        eventType: 'REGISTERED',
        actorAccountId: currentOwnerAccountId,
        toAccountId: currentOwnerAccountId,
        payload: {
          status: koi.status,
          variety: koi.variety,
        },
      });

      ensureMembershipConsistency(state);
      return compactKoi(koi, { includeMedia: true });
    });
  };

  const listKoiProfiles = ({
    ownerAccountId,
    collectionId,
    variety,
    status,
    q,
    cursor,
    limit,
    includeMedia,
  }) => {
    const state = store.read();
    const ownerFilter = normalizeText(ownerAccountId || '');
    const collectionFilter = normalizeText(collectionId || '');
    const varietyFilter = normalizeLower(variety || '');
    const statusFilter = normalizeLower(status || '');
    const qFilter = normalizeLower(q || '');

    const filtered = state.koiProfiles.filter((koi) => {
      if (ownerFilter && koi.currentOwnerAccountId !== ownerFilter) return false;

      if (collectionFilter) {
        const inCollection = (koi.collectionMemberships || []).some(
          (membership) => membership.collectionId === collectionFilter
        );
        if (!inCollection) return false;
      }

      if (varietyFilter && normalizeLower(koi.variety) !== varietyFilter) return false;
      if (statusFilter && normalizeLower(koi.status) !== statusFilter) return false;

      if (qFilter) {
        const haystack = `${koi.id} ${koi.name} ${koi.variety} ${koi.breeder}`.toLowerCase();
        if (!haystack.includes(qFilter)) return false;
      }

      return true;
    });

    const page = paginateByCursor(filtered, { cursor, limit: parseLimit(limit, 20, 100) });

    return {
      ...page,
      items: page.items.map((koi) => compactKoi(koi, { includeMedia: boolFromQuery(includeMedia, false) })),
      total: filtered.length,
    };
  };

  const getKoiProfile = (koiIdentityId, { includeMedia = true } = {}) => {
    const state = store.read();
    const koi = findKoiById(state, koiIdentityId);
    if (!koi) return null;
    return compactKoi(koi, { includeMedia: boolFromQuery(includeMedia, true) });
  };

  const updateKoiProfile = (koiIdentityId, payload) => {
    return store.mutate((state) => {
      const koi = findKoiById(state, koiIdentityId);
      if (!koi) {
        const err = new Error('Không tìm thấy hồ sơ cá');
        err.status = 404;
        throw err;
      }

      const oldStatus = koi.status;
      const oldVariety = koi.variety;

      if (payload.name !== undefined) koi.name = normalizeText(payload.name || koi.name);
      if (payload.variety !== undefined) koi.variety = normalizeText(payload.variety || koi.variety);
      if (payload.breeder !== undefined) koi.breeder = normalizeText(payload.breeder || koi.breeder);
      if (payload.hatchYear !== undefined) koi.hatchYear = toNumber(payload.hatchYear);
      if (payload.sizeCm !== undefined) koi.sizeCm = toNumber(payload.sizeCm);
      if (payload.weightKg !== undefined) koi.weightKg = toNumber(payload.weightKg);

      if (payload.status !== undefined) {
        const nextStatus = normalizeLower(payload.status);
        koi.status = KOI_STATUSES.has(nextStatus) ? nextStatus : koi.status;
      }

      if (payload.media !== undefined) {
        const images = sanitizeArray(payload.media?.images || koi.media?.images || []);
        const videos = sanitizeArray(payload.media?.videos || koi.media?.videos || []);
        koi.media = {
          thumbnail: normalizeText(payload.media?.thumbnail || koi.media?.thumbnail || images[0] || ''),
          images,
          videos,
        };
      }

      if (payload.collectionIds !== undefined) {
        const manualCollectionIds = sanitizeArray(payload.collectionIds);
        const validManualMemberships = manualCollectionIds
          .map((collectionId) => findCollectionById(state, collectionId))
          .filter((collection) => collection && collection.ownerAccountId === koi.currentOwnerAccountId)
          .map((collection) => ({
            collectionId: collection.id,
            source: 'manual',
            addedAt: nowIso(),
          }));

        const autoMemberships = (koi.collectionMemberships || []).filter((membership) => membership.source === 'auto');
        koi.collectionMemberships = [...validManualMemberships, ...autoMemberships];
      }

      koi.growthSummary = {
        ...koi.growthSummary,
        sizeCm: koi.sizeCm,
        weightKg: koi.weightKg,
        lastMeasuredAt: koi.growthSummary?.lastMeasuredAt || nowIso(),
      };
      koi.updatedAt = nowIso();

      syncAutoMembershipsForKoi(state, koi);

      if (oldStatus !== koi.status || oldVariety !== koi.variety) {
        appendTraceEvent(state, {
          koiIdentityId: koi.id,
          eventType: 'PROFILE_UPDATED',
          actorAccountId: normalizeText(payload.actorAccountId || koi.currentOwnerAccountId),
          payload: {
            fromStatus: oldStatus,
            toStatus: koi.status,
            fromVariety: oldVariety,
            toVariety: koi.variety,
          },
        });
      }

      ensureMembershipConsistency(state);
      return compactKoi(koi, { includeMedia: true });
    });
  };

  const transferKoi = (koiIdentityId, payload) => {
    return store.mutate((state) => {
      const koi = findKoiById(state, koiIdentityId);
      if (!koi) {
        const err = new Error('Không tìm thấy hồ sơ cá');
        err.status = 404;
        throw err;
      }

      const fromAccountId = normalizeText(payload.fromAccountId || koi.currentOwnerAccountId);
      const toAccountId = normalizeText(payload.toAccountId || '');
      const actorAccountId = normalizeText(payload.actorAccountId || fromAccountId);

      if (!toAccountId) {
        const err = new Error('toAccountId là bắt buộc');
        err.status = 400;
        throw err;
      }

      if (koi.currentOwnerAccountId !== fromAccountId) {
        const err = new Error('fromAccountId không phải chủ sở hữu hiện tại');
        err.status = 403;
        throw err;
      }

      const fromAccount = findAccountById(state, fromAccountId);
      const toAccount = findAccountById(state, toAccountId);
      if (!fromAccount || !toAccount) {
        const err = new Error('fromAccountId/toAccountId không hợp lệ');
        err.status = 400;
        throw err;
      }

      koi.currentOwnerAccountId = toAccountId;
      koi.status = 'verified';
      koi.updatedAt = nowIso();

      removeAllMembershipsFromOtherOwners(state, koi);
      // Transfer changes ownership context, so manual memberships are dropped to avoid orphan links.
      koi.collectionMemberships = [];
      syncAutoMembershipsForKoi(state, koi);

      appendTraceEvent(state, {
        koiIdentityId: koi.id,
        eventType: 'TRANSFERRED',
        actorAccountId,
        fromAccountId,
        toAccountId,
        note: normalizeText(payload.note || ''),
        payload: {
          fromType: fromAccount.type,
          toType: toAccount.type,
        },
      });

      ensureMembershipConsistency(state);
      return compactKoi(koi, { includeMedia: true });
    });
  };

  const addGrowthLog = (koiIdentityId, payload) => {
    return store.mutate((state) => {
      const koi = findKoiById(state, koiIdentityId);
      if (!koi) {
        const err = new Error('Không tìm thấy hồ sơ cá');
        err.status = 404;
        throw err;
      }

      const measuredAt = normalizeText(payload.measuredAt || nowIso());
      const sizeCm = toNumber(payload.sizeCm);
      const weightKg = toNumber(payload.weightKg);

      if (sizeCm === null && weightKg === null) {
        const err = new Error('Cần ít nhất sizeCm hoặc weightKg');
        err.status = 400;
        throw err;
      }

      const prev = [...state.growthLogs]
        .filter((log) => log.koiIdentityId === koiIdentityId)
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())[0];

      const growthLog = {
        id: makeId(state, 'GRO', 'growth'),
        koiIdentityId,
        observerAccountId: normalizeText(payload.observerAccountId || koi.currentOwnerAccountId),
        measuredAt,
        sizeCm,
        weightKg,
        deltaSizeCm: sizeCm !== null && prev?.sizeCm !== null && prev?.sizeCm !== undefined
          ? Number((sizeCm - prev.sizeCm).toFixed(2))
          : null,
        deltaWeightKg: weightKg !== null && prev?.weightKg !== null && prev?.weightKg !== undefined
          ? Number((weightKg - prev.weightKg).toFixed(2))
          : null,
        note: normalizeText(payload.note || ''),
        createdAt: nowIso(),
      };

      state.growthLogs.push(growthLog);

      if (sizeCm !== null) koi.sizeCm = sizeCm;
      if (weightKg !== null) koi.weightKg = weightKg;
      koi.growthSummary = {
        sizeCm: koi.sizeCm,
        weightKg: koi.weightKg,
        lastMeasuredAt: measuredAt,
      };
      koi.updatedAt = nowIso();

      appendTraceEvent(state, {
        koiIdentityId,
        eventType: 'GROWTH_LOGGED',
        actorAccountId: growthLog.observerAccountId,
        payload: {
          growthLogId: growthLog.id,
          sizeCm: growthLog.sizeCm,
          weightKg: growthLog.weightKg,
        },
      });

      return growthLog;
    });
  };

  const listGrowthLogs = ({ koiIdentityId, cursor, limit }) => {
    const state = store.read();
    const filtered = state.growthLogs.filter((log) => log.koiIdentityId === koiIdentityId);
    const page = paginateByCursor(filtered, { cursor, limit: parseLimit(limit, 20, 100) });

    const series = [...filtered]
      .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
      .map((log) => ({
        measuredAt: log.measuredAt,
        sizeCm: log.sizeCm,
        weightKg: log.weightKg,
      }));

    return {
      ...page,
      total: filtered.length,
      series,
    };
  };

  const addObservationNote = (koiIdentityId, payload) => {
    return store.mutate((state) => {
      const koi = findKoiById(state, koiIdentityId);
      if (!koi) {
        const err = new Error('Không tìm thấy hồ sơ cá');
        err.status = 404;
        throw err;
      }

      const text = normalizeText(payload.text || '');
      if (!text) {
        const err = new Error('text là bắt buộc');
        err.status = 400;
        throw err;
      }

      const note = {
        id: makeId(state, 'NOT', 'note'),
        authorAccountId: normalizeText(payload.authorAccountId || koi.currentOwnerAccountId),
        mood: normalizeText(payload.mood || ''),
        tags: sanitizeArray(payload.tags || []),
        text,
        at: normalizeText(payload.at || nowIso()),
        createdAt: nowIso(),
      };

      if (!Array.isArray(koi.observationNotes)) koi.observationNotes = [];
      koi.observationNotes.push(note);
      koi.updatedAt = nowIso();

      appendTraceEvent(state, {
        koiIdentityId,
        eventType: 'NOTE_ADDED',
        actorAccountId: note.authorAccountId,
        payload: {
          noteId: note.id,
          mood: note.mood,
        },
      });

      return note;
    });
  };

  const listObservationNotes = ({ koiIdentityId, cursor, limit }) => {
    const state = store.read();
    const koi = findKoiById(state, koiIdentityId);
    if (!koi) {
      const err = new Error('Không tìm thấy hồ sơ cá');
      err.status = 404;
      throw err;
    }

    const notes = Array.isArray(koi.observationNotes) ? koi.observationNotes : [];
    const page = paginateByCursor(notes, { cursor, limit: parseLimit(limit, 20, 100) });

    return {
      ...page,
      total: notes.length,
    };
  };

  const getTraceability = (koiIdentityId) => {
    const state = store.read();
    const koi = findKoiById(state, koiIdentityId);
    if (!koi) return null;

    const accountMap = new Map(state.accounts.map((account) => [account.id, account]));

    const events = state.traceEvents
      .filter((event) => event.koiIdentityId === koiIdentityId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((event) => ({
        ...event,
        actor: event.actorAccountId ? accountMap.get(event.actorAccountId) || null : null,
        from: event.fromAccountId ? accountMap.get(event.fromAccountId) || null : null,
        to: event.toAccountId ? accountMap.get(event.toAccountId) || null : null,
      }));

    return {
      koi: compactKoi(koi, { includeMedia: false }),
      events,
      traceSummary: {
        totalEvents: events.length,
        firstEventAt: events[0]?.at || null,
        lastEventAt: events[events.length - 1]?.at || null,
        ownerPath: events
          .filter((event) => event.eventType === 'REGISTERED' || event.eventType === 'TRANSFERRED')
          .map((event) => ({
            at: event.at,
            fromAccountId: event.fromAccountId,
            toAccountId: event.toAccountId,
            eventType: event.eventType,
          })),
      },
    };
  };

  const addKoiToCollection = (collectionId, koiIdentityId) => {
    return store.mutate((state) => {
      const collection = findCollectionById(state, collectionId);
      const koi = findKoiById(state, koiIdentityId);
      if (!collection || !koi) {
        const err = new Error('Collection hoặc Koi không tồn tại');
        err.status = 404;
        throw err;
      }

      if (collection.ownerAccountId !== koi.currentOwnerAccountId) {
        const err = new Error('Collection phải thuộc cùng owner account với Koi hiện tại');
        err.status = 400;
        throw err;
      }

      if (!Array.isArray(koi.collectionMemberships)) koi.collectionMemberships = [];

      const existing = koi.collectionMemberships.find((membership) => membership.collectionId === collectionId);
      if (!existing) {
        koi.collectionMemberships.push({
          collectionId,
          source: 'manual',
          addedAt: nowIso(),
        });
      } else {
        existing.source = 'manual';
      }

      koi.updatedAt = nowIso();
      ensureMembershipConsistency(state);

      appendTraceEvent(state, {
        koiIdentityId: koi.id,
        eventType: 'COLLECTION_UPDATED',
        actorAccountId: koi.currentOwnerAccountId,
        payload: {
          collectionId,
          action: 'added_manual',
        },
      });

      return compactKoi(koi, { includeMedia: false });
    });
  };

  const removeKoiFromCollection = (collectionId, koiIdentityId) => {
    return store.mutate((state) => {
      const collection = findCollectionById(state, collectionId);
      const koi = findKoiById(state, koiIdentityId);
      if (!collection || !koi) {
        const err = new Error('Collection hoặc Koi không tồn tại');
        err.status = 404;
        throw err;
      }

      const before = (koi.collectionMemberships || []).length;
      koi.collectionMemberships = (koi.collectionMemberships || []).filter(
        (membership) => membership.collectionId !== collectionId
      );
      if ((koi.collectionMemberships || []).length === before) {
        const err = new Error('Koi không nằm trong collection này');
        err.status = 404;
        throw err;
      }

      koi.updatedAt = nowIso();
      ensureMembershipConsistency(state);

      appendTraceEvent(state, {
        koiIdentityId: koi.id,
        eventType: 'COLLECTION_UPDATED',
        actorAccountId: koi.currentOwnerAccountId,
        payload: {
          collectionId,
          action: 'removed',
        },
      });

      return compactKoi(koi, { includeMedia: false });
    });
  };

  const reclassifyCollection = (collectionId) => {
    return store.mutate((state) => {
      const collection = findCollectionById(state, collectionId);
      if (!collection) {
        const err = new Error('Không tìm thấy collection');
        err.status = 404;
        throw err;
      }

      let changed = 0;
      state.koiProfiles.forEach((koi) => {
        if (koi.currentOwnerAccountId !== collection.ownerAccountId) return;
        const before = (koi.collectionMemberships || []).map((membership) => membership.collectionId).sort().join(',');
        syncAutoMembershipsForKoi(state, koi);
        const after = (koi.collectionMemberships || []).map((membership) => membership.collectionId).sort().join(',');
        if (before !== after) changed += 1;
      });

      ensureMembershipConsistency(state);
      return {
        collectionId,
        changed,
        itemCount: collection.itemCount,
      };
    });
  };

  const getSchemaOverview = () => {
    const state = store.read();
    return {
      meta: state.meta,
      counts: {
        accounts: state.accounts.length,
        collections: state.collections.length,
        koiProfiles: state.koiProfiles.length,
        growthLogs: state.growthLogs.length,
        traceEvents: state.traceEvents.length,
      },
      entityDesign: {
        accountTypes: [...ACCOUNT_TYPES],
        koiStatuses: [...KOI_STATUSES],
        relationshipModel: {
          collectionToAccount: 'many collections -> one ownerAccountId',
          koiToCollection: 'many-to-many via collectionMemberships {manual|auto}',
          koiToTrace: 'one-to-many via traceEvents',
          koiToGrowth: 'one-to-many via growthLogs',
        },
      },
    };
  };

  bootstrapLegacy();

  return {
    boolFromQuery,
    createOrUpdateAccount,
    updateAccount,
    listAccounts,
    getAccount,
    createCollection,
    updateCollection,
    listCollections,
    getCollection,
    createKoiProfile,
    listKoiProfiles,
    getKoiProfile,
    updateKoiProfile,
    transferKoi,
    addGrowthLog,
    listGrowthLogs,
    addObservationNote,
    listObservationNotes,
    getTraceability,
    addKoiToCollection,
    removeKoiFromCollection,
    reclassifyCollection,
    getSchemaOverview,
  };
};

module.exports = {
  createV2Service,
};
