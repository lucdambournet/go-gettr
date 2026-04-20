import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;

function makeEntity(tableName: string) {
  return {
    async list(sort?: string, limit?: number) {
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
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value as string);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, created_date: row.created_at }));
    },

    async create(data: Row) {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return { ...result, created_date: result.created_at };
    },

    async update(id: string, data: Row) {
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
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const entities = {
  Person: makeEntity('person'),
  Chore: makeEntity('chore'),
  ChoreLog: makeEntity('chore_log'),
  Streak: makeEntity('streak'),
  Payout: makeEntity('payout'),
  Notification: makeEntity('notification'),
};
