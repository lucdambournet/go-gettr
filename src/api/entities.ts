import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;

function makeEntity(tableName: string) {
  return {
    async list(sort?: string, limit?: number) {
      if (import.meta.env.DEV) console.log('[api] list', { table: tableName });
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        const col = sort.replace(/^-/, '');
        const dbCol = col === 'created_date' ? 'created_at' : col;
        query = query.order(dbCol, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, created_date: row.created_at }));
    },

    async filter(filters: Row) {
      if (import.meta.env.DEV) console.log('[api] filter', { table: tableName, conditions: filters });
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value as string);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, created_date: row.created_at }));
    },

    async create(data: Row) {
      if (import.meta.env.DEV) console.log('[api] create', { table: tableName });
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return { ...result, created_date: result.created_at };
    },

    async update(id: string, data: Row) {
      if (import.meta.env.DEV) console.log('[api] update', { table: tableName, id });
      const { data: result, error } = await supabase
        .from(tableName)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...result, created_date: result.created_at };
    },

    async delete(id: string) {
      if (import.meta.env.DEV) console.log('[api] delete', { table: tableName, id });
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

function addProfileComputedFields(row: Row): Row {
  return {
    ...row,
    created_date: row.created_at,
    name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    is_parent: row.role === 'parent',
  };
}

const profileBase = makeEntity('profiles');

const profileEntity = {
  async list(sort?: string, limit?: number) {
    const rows = await profileBase.list(sort, limit);
    return rows.map(addProfileComputedFields);
  },
  async filter(filters: Row) {
    const rows = await profileBase.filter(filters);
    return rows.map(addProfileComputedFields);
  },
  async create(data: Row) {
    const row = await profileBase.create(data);
    return addProfileComputedFields(row);
  },
  async update(id: string, data: Row) {
    const row = await profileBase.update(id, data);
    return addProfileComputedFields(row);
  },
  async delete(id: string) {
    return profileBase.delete(id);
  },
};

export const entities = {
  Profile: profileEntity,
  Chore: makeEntity('chore'),
  ChoreLog: makeEntity('chore_log'),
  Streak: makeEntity('streak'),
  Payout: makeEntity('payout'),
  Notification: makeEntity('notification'),
  Achievement: makeEntity('achievement'),
  Family: makeEntity('families'),
  FamilyInvitation: makeEntity('family_invitations'),
};

export async function searchProfileByEmail(email: string) {
  if (import.meta.env.DEV) console.log('[api] rpc searchProfileByEmail', { email });
  const { data, error } = await supabase.rpc('search_profile_by_email', { search_email: email });
  if (error) throw error;
  return (data ?? []).map(addProfileComputedFields);
}

export async function addProfileToFamily(targetProfileId: string, role: 'parent' | 'child') {
  if (import.meta.env.DEV) console.log('[api] rpc addProfileToFamily', { targetProfileId, role });
  const { error } = await supabase.rpc('add_profile_to_family', {
    target_profile_id: targetProfileId,
    target_role: role,
  });
  if (error) throw error;
}
