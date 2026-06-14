function mergeSyncMeta(local, remote) {
    const l = local || { version: 0, lastUpdated: 0, deletedPatientIds: [] };
    const r = remote || { version: 0, lastUpdated: 0, deletedPatientIds: [] };
    return {
        version: Math.max(l.version || 0, r.version || 0),
        lastUpdated: Math.max(l.lastUpdated || 0, r.lastUpdated || 0),
        deletedPatientIds: Array.from(new Set([
            ...(l.deletedPatientIds || []),
            ...(r.deletedPatientIds || [])
        ])).slice(-5000)
    };
}

function applyTombstones(data) {
    const deleted = new Set((data.syncMeta && data.syncMeta.deletedPatientIds) || []);
    if (deleted.size === 0) return data;
    return {
        ...data,
        patients: (data.patients || []).filter(p => !deleted.has(p.id))
    };
}

function mergePatients(local, remote, deletedIds) {
    const deletedSet = new Set(deletedIds || []);
    const map = new Map();
    for (const p of (local || [])) {
        if (!deletedSet.has(p.id)) map.set(p.id, p);
    }
    for (const p of (remote || [])) {
        if (deletedSet.has(p.id)) continue;
        const existing = map.get(p.id);
        const pUpdated = p.updatedAt || p.timestamp || 0;
        const eUpdated = existing ? (existing.updatedAt || existing.timestamp || 0) : 0;
        if (!existing || pUpdated >= eUpdated) map.set(p.id, p);
    }
    return Array.from(map.values());
}

function mergeInventory(local, remote) {
    if (!remote || remote.length === 0) return local || [];
    if (!local || local.length === 0) return remote;
    const map = new Map();
    for (const i of local) map.set(i.id, i);
    for (const i of remote) map.set(i.id, i);
    return Array.from(map.values());
}

function mergeInvoices(local, remote) {
    if (!remote || remote.length === 0) return local || [];
    if (!local || local.length === 0) return remote;
    const map = new Map();
    for (const i of local) map.set(i.id, i);
    for (const i of remote) map.set(i.id, i);
    return Array.from(map.values());
}

function sanitizeData(data) {
    const copy = { ...(data || {}) };
    delete copy.backupTime;
    delete copy.backupReason;
    if (!copy.syncMeta) {
        copy.syncMeta = { version: 0, lastUpdated: 0, deletedPatientIds: [] };
    }
    return copy;
}

function finalizeClinicData(data) {
    const syncMeta = {
        ...data.syncMeta,
        version: (data.syncMeta.version || 0) + 1,
        lastUpdated: Date.now()
    };
    const merged = {
        ...data,
        syncMeta,
        patients: mergePatients([], data.patients, syncMeta.deletedPatientIds),
        inventory: data.inventory || [],
        invoices: data.invoices || []
    };
    return applyTombstones(merged);
}

module.exports = {
    mergeSyncMeta,
    applyTombstones,
    mergePatients,
    mergeInventory,
    mergeInvoices,
    sanitizeData,
    finalizeClinicData
};
