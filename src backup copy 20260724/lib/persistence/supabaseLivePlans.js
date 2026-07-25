import { createClient } from '@supabase/supabase-js';
import { generateInitialPlanSnapshot } from '../../features/self-onboarding-to-first-dashboard/plan.js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

let supabaseClient = null;
const PLAN_CONFLICT_ERROR_CODE = 'PLAN_CONFLICT';

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseClient;
}

function parseProfileId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid profile id.');
  }
  return parsed;
}

function toIsoDateString(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function resolveAgeFromBirthdate(birthdate, now = new Date()) {
  const date = new Date(`${birthdate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return NaN;
  }

  const current = new Date(now.getTime());
  let age = current.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = current.getUTCMonth() - date.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && current.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function toRuntimeProfile(row) {
  const fullName = `${row.first_name} ${row.last_name}`.trim();
  const age = resolveAgeFromBirthdate(row.birthdate, new Date());

  return {
    profileId: String(row.id),
    displayLabel: fullName,
    name: fullName,
    age,
    gender: row.gender,
    birthdate: row.birthdate,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    createdAt: row.created_at,
  };
}

function toReminder(itemRow) {
  if (!itemRow.reminder_scheduled_for) {
    return undefined;
  }

  return {
    timingType: itemRow.reminder_timing_type || 'custom_date',
    scheduledFor: itemRow.reminder_scheduled_for,
    createdAt: itemRow.reminder_created_at || new Date().toISOString(),
  };
}

function toPlanSnapshot(profileId, planRow, itemRows = []) {
  return {
    planId: String(planRow.id),
    profileId: String(profileId),
    catalogVersion: 'hosted-live-catalog',
    generatedAt: toIsoDateString(planRow.generated_at) ?? new Date().toISOString(),
    updatedAt: toIsoDateString(planRow.updated_at) ?? null,
    items: itemRows.map((itemRow) => ({
      catalogItemId: itemRow.catalog_item_id,
      name: itemRow.name,
      category: itemRow.category,
      interventionType: itemRow.intervention_type,
      interventionTypeLabel: itemRow.intervention_type_label,
      effortLevel: itemRow.effort_level,
      cadenceLabel: itemRow.cadence_label,
      recurrence: {
        intervalDays: itemRow.recurrence_interval_days,
        soonWindowDays: itemRow.recurrence_soon_window_days,
      },
      whyItMatters: itemRow.why_it_matters,
      targetAge: itemRow.target_age,
      priorityOrder: itemRow.priority_order,
      initialDueDate: toIsoDateString(itemRow.initial_due_date),
      nextDueDate: toIsoDateString(itemRow.next_due_date),
      initialBucket: itemRow.initial_bucket,
      status: itemRow.status,
      completedOn: formatDateOnly(itemRow.completed_on),
      reminder: toReminder(itemRow),
      updatedAt: toIsoDateString(itemRow.updated_at) ?? null,
    })),
  };
}

function toPlanItemRow(planId, item) {
  return {
    plan_id: planId,
    catalog_item_id: item.catalogItemId,
    name: item.name,
    category: item.category,
    intervention_type: item.interventionType,
    intervention_type_label: item.interventionTypeLabel,
    effort_level: item.effortLevel,
    cadence_label: item.cadenceLabel,
    why_it_matters: item.whyItMatters,
    recurrence_interval_days: Number.isFinite(Number(item?.recurrence?.intervalDays))
      ? Number(item.recurrence.intervalDays)
      : null,
    recurrence_soon_window_days: Number.isFinite(Number(item?.recurrence?.soonWindowDays))
      ? Number(item.recurrence.soonWindowDays)
      : null,
    target_age: Number.isFinite(Number(item.targetAge)) ? Number(item.targetAge) : null,
    priority_order: Number.isFinite(Number(item.priorityOrder)) ? Number(item.priorityOrder) : null,
    initial_due_date: item.initialDueDate ?? null,
    next_due_date: item.nextDueDate ?? null,
    initial_bucket: item.initialBucket ?? null,
    status: item.status,
    completed_on: item.completedOn ?? null,
    reminder_timing_type: item?.reminder?.timingType ?? null,
    reminder_scheduled_for: item?.reminder?.scheduledFor ?? null,
    reminder_created_at: item?.reminder?.createdAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

function toPlanItemMutableUpdateRow(item, updatedAtIso) {
  return {
    status: item.status,
    completed_on: item.completedOn ?? null,
    next_due_date: item.nextDueDate ?? null,
    reminder_timing_type: item?.reminder?.timingType ?? null,
    reminder_scheduled_for: item?.reminder?.scheduledFor ?? null,
    reminder_created_at: item?.reminder?.createdAt ?? null,
    updated_at: updatedAtIso,
  };
}

function normalizeComparisonValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

function hasMutablePlanItemChanges(existingRow, mutableUpdateRow) {
  const fields = [
    'status',
    'completed_on',
    'next_due_date',
    'reminder_timing_type',
    'reminder_scheduled_for',
    'reminder_created_at',
  ];

  return fields.some((field) => (
    normalizeComparisonValue(existingRow?.[field]) !== normalizeComparisonValue(mutableUpdateRow?.[field])
  ));
}

function createPlanConflictError(message) {
  const error = new Error(message);
  error.code = PLAN_CONFLICT_ERROR_CODE;
  return error;
}

function normalizeTimestampForComparison(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).trim();
  }

  return parsed.toISOString();
}

function areTimestampsEquivalent(a, b) {
  return normalizeTimestampForComparison(a) === normalizeTimestampForComparison(b);
}

export function isLivePlanConflictError(error) {
  return error?.code === PLAN_CONFLICT_ERROR_CODE;
}

async function ensureCurrentUser(options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  if (sessionData?.session?.user) {
    return sessionData.session.user;
  }

  throw new Error('You are not authenticated.');
}

async function loadPlansForProfileIds(client, profileIds) {
  if (profileIds.length === 0) {
    return { plansByProfileId: {}, planIdByProfileId: {} };
  }

  const { data: planRows, error: planError } = await client
    .from('plans')
    .select('*')
    .in('profile_id', profileIds);

  if (planError) {
    throw planError;
  }

  const plansByProfileId = {};
  const planIdByProfileId = {};

  for (const row of planRows ?? []) {
    planIdByProfileId[row.profile_id] = row.id;
  }

  const planIds = Object.values(planIdByProfileId);
  if (planIds.length === 0) {
    return { plansByProfileId, planIdByProfileId };
  }

  const { data: planItemRows, error: itemError } = await client
    .from('plan_items')
    .select('*')
    .in('plan_id', planIds)
    .order('priority_order', { ascending: true })
    .order('target_age', { ascending: true });

  if (itemError) {
    throw itemError;
  }

  const itemsByPlanId = (planItemRows ?? []).reduce((index, row) => {
    const key = row.plan_id;
    if (!index[key]) {
      index[key] = [];
    }
    index[key].push(row);
    return index;
  }, {});

  for (const profileId of profileIds) {
    const planId = planIdByProfileId[profileId];
    if (!planId) continue;

    const planRow = (planRows ?? []).find((row) => row.id === planId);
    if (!planRow) continue;

    plansByProfileId[String(profileId)] = toPlanSnapshot(
      String(profileId),
      planRow,
      itemsByPlanId[planId] ?? [],
    );
  }

  return { plansByProfileId, planIdByProfileId };
}

export function isSupabaseLivePlansConfigured() {
  return Boolean(getSupabaseClient());
}

export async function ensureLivePlansSession(options = {}) {
  return ensureCurrentUser(options);
}

export async function signInLiveUserWithPassword({ email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const normalizedPassword = String(password ?? '');
  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpLiveUserWithPassword({ email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const normalizedPassword = String(password ?? '');
  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutLiveUser() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function onLivePlansAuthStateChange(handler) {
  const client = getSupabaseClient();
  if (!client || typeof handler !== 'function') {
    return () => {};
  }

  const { data } = client.auth.onAuthStateChange((event, session) => {
    handler(event, session);
  });

  return () => {
    data?.subscription?.unsubscribe();
  };
}

export async function loadLiveProfilesAndPlans(options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const user = await ensureCurrentUser(options);

  const { data: membershipRows, error: membershipError } = await client
    .from('profile_memberships')
    .select('profile_id, role')
    .eq('user_id', user.id)
    .order('profile_id', { ascending: true });

  if (membershipError) {
    throw membershipError;
  }

  const profileIds = Array.from(new Set((membershipRows ?? []).map((row) => row.profile_id)));
  if (profileIds.length === 0) {
    return {
      userId: user.id,
      profiles: [],
      plansByProfileId: {},
      activeProfileId: null,
    };
  }

  const { data: profileRows, error: profileError } = await client
    .from('health_profiles')
    .select('*')
    .in('id', profileIds)
    .order('created_at', { ascending: true });

  if (profileError) {
    throw profileError;
  }

  const profiles = (profileRows ?? []).map(toRuntimeProfile);
  const { plansByProfileId } = await loadPlansForProfileIds(client, profileIds);

  const { data: preferenceRow, error: preferenceError } = await client
    .from('app_user_preferences')
    .select('active_profile_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (preferenceError) {
    throw preferenceError;
  }

  const preferredId = preferenceRow?.active_profile_id ? String(preferenceRow.active_profile_id) : null;
  const defaultActive = preferredId && profiles.some((profile) => profile.profileId === preferredId)
    ? preferredId
    : (profiles[0]?.profileId ?? null);

  return {
    userId: user.id,
    profiles,
    plansByProfileId,
    activeProfileId: defaultActive,
  };
}

export async function setLiveActiveProfile(profileId) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const user = await ensureCurrentUser();
  const normalizedProfileId = parseProfileId(profileId);

  const { error } = await client
    .from('app_user_preferences')
    .upsert({
      user_id: user.id,
      active_profile_id: normalizedProfileId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    throw error;
  }
}

export async function createLiveEnrollmentAndPlan(input, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const catalog = Array.isArray(options.catalog) ? options.catalog : [];
  if (catalog.length === 0) {
    throw new Error('Cannot enroll without loaded catalog data.');
  }

  const user = await ensureCurrentUser();
  const now = options.now instanceof Date ? new Date(options.now.getTime()) : new Date(options.now ?? Date.now());
  const requireAdult = options.requireAdult !== false;

  const firstName = String(input?.firstName ?? '').trim();
  const lastName = String(input?.lastName ?? '').trim();
  const birthdate = String(input?.birthdate ?? '').trim();
  const gender = String(input?.gender ?? '').trim().toLowerCase();
  const heightCm = Number(input?.heightCm);
  const weightKg = Number(input?.weightKg);

  if (!firstName || !lastName || !birthdate || !['female', 'male'].includes(gender)) {
    throw new Error('Invalid enrollment input.');
  }

  const age = resolveAgeFromBirthdate(birthdate, now);
  if (!Number.isFinite(age) || age < 0 || age > 120) {
    throw new Error('Birthdate is out of range.');
  }
  if (requireAdult && age < 18) {
    throw new Error('User must be at least 18 years old.');
  }
  if (!Number.isFinite(heightCm) || heightCm < 140 || heightCm > 210) {
    throw new Error('Height must be between 140 and 210 cm.');
  }
  if (!Number.isFinite(weightKg) || weightKg < 50 || weightKg > 150) {
    throw new Error('Weight must be between 50 and 150 kg.');
  }

  const { data: profileRow, error: profileInsertError } = await client
    .from('health_profiles')
    .insert({
      first_name: firstName,
      last_name: lastName,
      birthdate,
      gender,
      height_cm: heightCm,
      weight_kg: weightKg,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (profileInsertError) {
    throw profileInsertError;
  }

  const profileId = String(profileRow.id);

  const { error: membershipError } = await client
    .from('profile_memberships')
    .insert({
      profile_id: profileRow.id,
      user_id: user.id,
      role: 'owner',
    });

  if (membershipError) {
    throw membershipError;
  }

  const runtimeProfile = {
    profileId,
    name: `${firstName} ${lastName}`.trim(),
    displayLabel: `${firstName} ${lastName}`.trim(),
    age,
    gender,
    birthdate,
    heightCm,
    weightKg,
    createdAt: profileRow.created_at,
    onboardingCompletedAt: now.toISOString(),
  };

  const planSnapshot = generateInitialPlanSnapshot(runtimeProfile, {
    now,
    catalog,
    catalogVersion: options.catalogVersion ?? 'hosted-live-catalog',
  });

  const { data: planRow, error: planInsertError } = await client
    .from('plans')
    .insert({
      profile_id: profileRow.id,
      status: 'active',
      generated_at: planSnapshot.generatedAt,
    })
    .select('*')
    .single();

  if (planInsertError) {
    throw planInsertError;
  }

  const planItemRows = planSnapshot.items.map((item) => toPlanItemRow(planRow.id, item));
  if (planItemRows.length > 0) {
    const { error: itemInsertError } = await client
      .from('plan_items')
      .insert(planItemRows);

    if (itemInsertError) {
      throw itemInsertError;
    }
  }

  await setLiveActiveProfile(profileRow.id);

  return {
    profile: runtimeProfile,
    planSnapshot,
  };
}

export async function saveLivePlanForProfile(profileId, planSnapshot) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase live-plan persistence is not configured.');
  }

  const normalizedProfileId = parseProfileId(profileId);

  const { data: existingPlan, error: existingPlanError } = await client
    .from('plans')
    .select('*')
    .eq('profile_id', normalizedProfileId)
    .maybeSingle();

  if (existingPlanError) {
    throw existingPlanError;
  }

  let planId = existingPlan?.id;
  const persistedItemUpdatedAtByCatalogItemId = {};
  const nextPlanUpdatedAtIso = new Date().toISOString();
  let persistedPlanUpdatedAt = nextPlanUpdatedAtIso;

  if (!planId) {
    const { data: createdPlan, error: createPlanError } = await client
      .from('plans')
      .insert({
        profile_id: normalizedProfileId,
        status: 'active',
        generated_at: planSnapshot?.generatedAt ?? new Date().toISOString(),
      })
      .select('*')
      .single();

    if (createPlanError) {
      throw createPlanError;
    }

    planId = createdPlan.id;
    persistedPlanUpdatedAt = toIsoDateString(createdPlan.updated_at) ?? nextPlanUpdatedAtIso;
  } else {
    const snapshotPlanUpdatedAt = String(planSnapshot?.updatedAt ?? '').trim();
    const existingPlanUpdatedAt = String(existingPlan.updated_at ?? '').trim();
    if (
      snapshotPlanUpdatedAt
      && existingPlanUpdatedAt
      && !areTimestampsEquivalent(snapshotPlanUpdatedAt, existingPlanUpdatedAt)
    ) {
      throw createPlanConflictError('This plan was updated in another session. Please reload and try again.');
    }

    const { data: updatedPlanRow, error: updatePlanError } = await client
      .from('plans')
      .update({
        generated_at: planSnapshot?.generatedAt ?? new Date().toISOString(),
        updated_at: nextPlanUpdatedAtIso,
      })
      .eq('id', planId)
      .eq('updated_at', existingPlan.updated_at)
      .select('id, updated_at')
      .maybeSingle();

    if (updatePlanError) {
      throw updatePlanError;
    }
    if (!updatedPlanRow) {
      throw createPlanConflictError('This plan was updated in another session. Please reload and try again.');
    }
    persistedPlanUpdatedAt = toIsoDateString(updatedPlanRow.updated_at) ?? nextPlanUpdatedAtIso;
  }

  const itemRows = Array.isArray(planSnapshot?.items)
    ? planSnapshot.items.map((item) => ({
      source: item,
      fullInsertRow: toPlanItemRow(planId, item),
      mutableUpdateRow: toPlanItemMutableUpdateRow(item, nextPlanUpdatedAtIso),
    }))
    : [];

  const { data: existingItemRows, error: existingItemsError } = await client
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId);

  if (existingItemsError) {
    throw existingItemsError;
  }

  const existingItemByCatalogId = (existingItemRows ?? []).reduce((index, row) => {
    index[String(row.catalog_item_id)] = row;
    return index;
  }, {});
  const incomingCatalogIds = new Set(itemRows.map((row) => String(row.source.catalogItemId)));

  const rowsToInsert = [];
  const rowsToUpdate = [];

  for (const row of itemRows) {
    const catalogItemId = String(row.source.catalogItemId);
    const existingItem = existingItemByCatalogId[catalogItemId];

    if (!existingItem) {
      rowsToInsert.push(row);
      continue;
    }

    if (hasMutablePlanItemChanges(existingItem, row.mutableUpdateRow)) {
      const sourceItemUpdatedAt = String(row.source?.updatedAt ?? '').trim();
      const persistedItemUpdatedAt = String(existingItem.updated_at ?? '').trim();

      if (
        sourceItemUpdatedAt
        && persistedItemUpdatedAt
        && !areTimestampsEquivalent(sourceItemUpdatedAt, persistedItemUpdatedAt)
      ) {
        throw createPlanConflictError(`"${catalogItemId}" was updated in another session. Please reload and try again.`);
      }

      rowsToUpdate.push({
        catalogItemId,
        previousUpdatedAt: existingItem.updated_at,
        mutableUpdateRow: row.mutableUpdateRow,
      });
    } else {
      persistedItemUpdatedAtByCatalogItemId[catalogItemId] = toIsoDateString(existingItem.updated_at);
    }
  }

  if (rowsToInsert.length > 0) {
    const payload = rowsToInsert.map((row) => row.fullInsertRow);
    const { data: insertedRows, error: insertItemsError } = await client
      .from('plan_items')
      .insert(payload)
      .select('catalog_item_id, updated_at');

    if (insertItemsError) {
      throw insertItemsError;
    }

    for (const insertedRow of insertedRows ?? []) {
      persistedItemUpdatedAtByCatalogItemId[String(insertedRow.catalog_item_id)] = toIsoDateString(insertedRow.updated_at);
    }
  }

  for (const row of rowsToUpdate) {
    const { data: updatedRows, error: updateItemError } = await client
      .from('plan_items')
      .update(row.mutableUpdateRow)
      .eq('plan_id', planId)
      .eq('catalog_item_id', row.catalogItemId)
      .eq('updated_at', row.previousUpdatedAt)
      .select('catalog_item_id, updated_at');

    if (updateItemError) {
      throw updateItemError;
    }

    const updatedRow = Array.isArray(updatedRows) ? updatedRows[0] : null;
    if (!updatedRow) {
      throw createPlanConflictError(`"${row.catalogItemId}" changed while saving. Please reload and try again.`);
    }

    persistedItemUpdatedAtByCatalogItemId[String(updatedRow.catalog_item_id)] = toIsoDateString(updatedRow.updated_at);
  }

  const rowsToDelete = Object.keys(existingItemByCatalogId).filter((catalogItemId) => !incomingCatalogIds.has(catalogItemId));
  if (rowsToDelete.length > 0) {
    const { error: deleteItemsError } = await client
      .from('plan_items')
      .delete()
      .eq('plan_id', planId)
      .in('catalog_item_id', rowsToDelete);

    if (deleteItemsError) {
      throw deleteItemsError;
    }
  }

  return {
    planUpdatedAt: persistedPlanUpdatedAt,
    itemUpdatedAtByCatalogItemId: persistedItemUpdatedAtByCatalogItemId,
  };
}
