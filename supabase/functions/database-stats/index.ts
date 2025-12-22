import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableStats {
  tableName: string;
  displayName: string;
  rowCount: number;
  estimatedSizeMB: number;
  oldestRecord: string | null;
  newestRecord: string | null;
  category: 'temporary' | 'permanent' | 'cache';
  canDelete: boolean;
}

interface StorageStats {
  bucketName: string;
  displayName: string;
  fileCount: number;
  totalSizeMB: number;
  oldestFile: string | null;
  newestFile: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, tableName, olderThanDays } = await req.json().catch(() => ({}));

    // Action: delete data from specific table
    if (action === 'delete') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (olderThanDays || 7));
      const cutoffISO = cutoffDate.toISOString();

      let deletedCount = 0;

      // Helper to count before delete
      const countBeforeDelete = async (table: string, dateCol: string, statusFilter?: { col: string; val: string }) => {
        let query = supabase.from(table).select('id', { count: 'exact', head: true }).lt(dateCol, cutoffISO);
        if (statusFilter) {
          query = query.eq(statusFilter.col, statusFilter.val);
        }
        const { count } = await query;
        return count || 0;
      };

      switch (tableName) {
        case 'call_history':
          deletedCount = await countBeforeDelete('call_history', 'created_at');
          await supabase.from('call_history').delete().lt('created_at', cutoffISO);
          break;

        case 'patient_calls':
          deletedCount = await countBeforeDelete('patient_calls', 'created_at', { col: 'status', val: 'completed' });
          await supabase.from('patient_calls').delete().lt('created_at', cutoffISO).eq('status', 'completed');
          break;

        case 'chat_messages':
          deletedCount = await countBeforeDelete('chat_messages', 'created_at');
          await supabase.from('chat_messages').delete().lt('created_at', cutoffISO);
          break;

        case 'user_sessions':
          deletedCount = await countBeforeDelete('user_sessions', 'created_at');
          await supabase.from('user_sessions').delete().lt('created_at', cutoffISO);
          break;

        case 'system_error_logs':
          deletedCount = await countBeforeDelete('system_error_logs', 'created_at');
          await supabase.from('system_error_logs').delete().lt('created_at', cutoffISO);
          break;

        case 'edge_function_health_history':
          deletedCount = await countBeforeDelete('edge_function_health_history', 'created_at');
          await supabase.from('edge_function_health_history').delete().lt('created_at', cutoffISO);
          break;

        case 'test_history':
          deletedCount = await countBeforeDelete('test_history', 'created_at');
          await supabase.from('test_history').delete().lt('created_at', cutoffISO);
          break;

        case 'statistics_daily':
          const cutoffDateOnly = cutoffISO.split('T')[0];
          const { count: sdCount } = await supabase.from('statistics_daily').select('id', { count: 'exact', head: true }).lt('date', cutoffDateOnly);
          deletedCount = sdCount || 0;
          await supabase.from('statistics_daily').delete().lt('date', cutoffDateOnly);
          break;

        case 'tts_name_usage':
          deletedCount = await countBeforeDelete('tts_name_usage', 'used_at');
          await supabase.from('tts_name_usage').delete().lt('used_at', cutoffISO);
          break;

        case 'tts-cache':
          // Delete old files from storage
          const { data: files } = await supabase.storage
            .from('tts-cache')
            .list('', { limit: 1000 });

          if (files && files.length > 0) {
            const oldFiles = files.filter(f => {
              const fileDate = new Date(f.created_at);
              return fileDate < cutoffDate;
            });

            if (oldFiles.length > 0) {
              const { error: delError } = await supabase.storage
                .from('tts-cache')
                .remove(oldFiles.map(f => f.name));
              
              if (!delError) {
                deletedCount = oldFiles.length;
              }
            }
          }
          break;

        default:
          return new Response(
            JSON.stringify({ success: false, error: 'Tabela não permitida para exclusão' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
      }

      console.log(`Deleted ${deletedCount} records from ${tableName}`);

      return new Response(
        JSON.stringify({ success: true, deletedCount, tableName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: get stats
    const tableStats: TableStats[] = [];

    // Helper function to get table stats
    const getTableStats = async (
      table: string,
      displayName: string,
      category: 'temporary' | 'permanent' | 'cache',
      canDelete: boolean,
      dateColumn: string = 'created_at'
    ): Promise<TableStats> => {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      let oldest: string | null = null;
      let newest: string | null = null;

      if (count && count > 0) {
        const { data: oldestData } = await supabase
          .from(table)
          .select('*')
          .order(dateColumn, { ascending: true })
          .limit(1);

        const { data: newestData } = await supabase
          .from(table)
          .select('*')
          .order(dateColumn, { ascending: false })
          .limit(1);

        if (oldestData?.[0]) {
          oldest = (oldestData[0] as Record<string, unknown>)[dateColumn] as string || null;
        }
        if (newestData?.[0]) {
          newest = (newestData[0] as Record<string, unknown>)[dateColumn] as string || null;
        }
      }

      // Estimate size: approximately 0.5KB per row average
      const estimatedSizeMB = ((count || 0) * 0.5) / 1024;

      return {
        tableName: table,
        displayName,
        rowCount: count || 0,
        estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
        oldestRecord: oldest,
        newestRecord: newest,
        category,
        canDelete,
      };
    };

    // Fetch stats for all relevant tables
    const statsPromises = [
      getTableStats('call_history', 'Histórico de Chamadas', 'temporary', true),
      getTableStats('patient_calls', 'Chamadas de Pacientes', 'temporary', true),
      getTableStats('chat_messages', 'Mensagens do Chat', 'temporary', true),
      getTableStats('user_sessions', 'Sessões de Usuário', 'temporary', true),
      getTableStats('system_error_logs', 'Logs de Erros', 'temporary', true),
      getTableStats('edge_function_health_history', 'Saúde das Edge Functions', 'temporary', true),
      getTableStats('test_history', 'Histórico de Testes', 'temporary', true),
      getTableStats('statistics_daily', 'Estatísticas Diárias', 'temporary', true, 'date'),
      getTableStats('tts_name_usage', 'Uso de TTS (Nomes)', 'cache', true, 'used_at'),
      getTableStats('units', 'Unidades', 'permanent', false),
      getTableStats('operators', 'Operadores', 'permanent', false),
      getTableStats('modules', 'Módulos', 'permanent', false),
      getTableStats('destinations', 'Destinos', 'permanent', false),
      getTableStats('tts_phrases', 'Frases TTS', 'permanent', false),
      getTableStats('telegram_recipients', 'Destinatários Telegram', 'permanent', false),
      getTableStats('scheduled_announcements', 'Anúncios Agendados', 'permanent', false),
      getTableStats('scheduled_commercial_phrases', 'Frases Comerciais', 'permanent', false),
      getTableStats('appointments', 'Agendamentos', 'temporary', true),
    ];

    const results = await Promise.all(statsPromises);
    tableStats.push(...results);

    // Get storage stats
    const storageStats: StorageStats[] = [];
    
    const { data: cacheFiles } = await supabase.storage
      .from('tts-cache')
      .list('', { limit: 1000 });

    if (cacheFiles) {
      const totalSize = cacheFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
      const sortedByDate = [...cacheFiles].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      storageStats.push({
        bucketName: 'tts-cache',
        displayName: 'Cache de Áudio TTS',
        fileCount: cacheFiles.length,
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        oldestFile: sortedByDate[0]?.created_at || null,
        newestFile: sortedByDate[sortedByDate.length - 1]?.created_at || null,
      });
    }

    // Calculate totals
    const totalRows = tableStats.reduce((acc, t) => acc + t.rowCount, 0);
    const totalDbSizeMB = tableStats.reduce((acc, t) => acc + t.estimatedSizeMB, 0);
    const totalStorageSizeMB = storageStats.reduce((acc, s) => acc + s.totalSizeMB, 0);
    const temporaryDataMB = tableStats
      .filter(t => t.category === 'temporary' || t.category === 'cache')
      .reduce((acc, t) => acc + t.estimatedSizeMB, 0);

    // Calculate growth projection (based on last 7 days of call_history)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentCalls } = await supabase
      .from('call_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const dailyGrowthRows = Math.round((recentCalls || 0) / 7);
    const dailyGrowthMB = (dailyGrowthRows * 0.5) / 1024;
    const monthlyProjectionMB = dailyGrowthMB * 30;

    return new Response(
      JSON.stringify({
        success: true,
        tables: tableStats.sort((a, b) => b.rowCount - a.rowCount),
        storage: storageStats,
        summary: {
          totalRows,
          totalDbSizeMB: Math.round(totalDbSizeMB * 100) / 100,
          totalStorageSizeMB: Math.round(totalStorageSizeMB * 100) / 100,
          temporaryDataMB: Math.round(temporaryDataMB * 100) / 100,
          dailyGrowthRows,
          dailyGrowthMB: Math.round(dailyGrowthMB * 100) / 100,
          monthlyProjectionMB: Math.round(monthlyProjectionMB * 100) / 100,
        },
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in database-stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
