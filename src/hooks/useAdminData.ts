import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Unit, Module, Destination, Operator, OperatorPermission, TTSPhrase } from '@/types/admin';
import { toast } from 'sonner';

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('display_name');
    
    if (error) {
      console.error('Erro ao carregar unidades:', error);
      toast.error('Erro ao carregar unidades');
    } else {
      setUnits(data || []);
    }
    setLoading(false);
  }, []);

  const createUnit = async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar unidade: ' + error.message);
      return null;
    }
    
    toast.success('Unidade criada com sucesso!');
    await fetchUnits();
    return data;
  };

  const updateUnit = async (id: string, updates: Partial<Unit>) => {
    const { error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar unidade: ' + error.message);
      return false;
    }
    
    toast.success('Unidade atualizada!');
    await fetchUnits();
    return true;
  };

  const deleteUnit = async (id: string) => {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir unidade: ' + error.message);
      return false;
    }
    
    toast.success('Unidade excluída!');
    await fetchUnits();
    return true;
  };

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return { units, loading, fetchUnits, createUnit, updateUnit, deleteUnit };
}

export function useModules(unitId?: string) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('modules').select('*').order('display_order');
    
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao carregar módulos:', error);
    } else {
      setModules(data || []);
    }
    setLoading(false);
  }, [unitId]);

  const createModule = async (module: Omit<Module, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('modules')
      .insert(module)
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar módulo: ' + error.message);
      return null;
    }
    
    toast.success('Módulo criado!');
    await fetchModules();
    return data;
  };

  const updateModule = async (id: string, updates: Partial<Module>) => {
    const { error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar módulo: ' + error.message);
      return false;
    }
    
    toast.success('Módulo atualizado!');
    await fetchModules();
    return true;
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir módulo: ' + error.message);
      return false;
    }
    
    toast.success('Módulo excluído!');
    await fetchModules();
    return true;
  };

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return { modules, loading, fetchModules, createModule, updateModule, deleteModule };
}

export function useDestinations(unitId?: string) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('destinations').select('*').order('display_order');
    
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao carregar destinos:', error);
    } else {
      setDestinations(data || []);
    }
    setLoading(false);
  }, [unitId]);

  const createDestination = async (destination: Omit<Destination, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('destinations')
      .insert(destination)
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar destino: ' + error.message);
      return null;
    }
    
    toast.success('Destino criado!');
    await fetchDestinations();
    return data;
  };

  const updateDestination = async (id: string, updates: Partial<Destination>) => {
    const { error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar destino: ' + error.message);
      return false;
    }
    
    toast.success('Destino atualizado!');
    await fetchDestinations();
    return true;
  };

  const deleteDestination = async (id: string) => {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir destino: ' + error.message);
      return false;
    }
    
    toast.success('Destino excluído!');
    await fetchDestinations();
    return true;
  };

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  return { destinations, loading, fetchDestinations, createDestination, updateDestination, deleteDestination };
}

export function useOperators(unitId?: string) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('operators').select('*').order('name');
    
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao carregar operadores:', error);
    } else {
      setOperators(data || []);
    }
    setLoading(false);
  }, [unitId]);

  const createOperator = async (operator: Omit<Operator, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('operators')
      .insert(operator)
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar operador: ' + error.message);
      return null;
    }
    
    toast.success('Operador criado!');
    await fetchOperators();
    return data;
  };

  const updateOperator = async (id: string, updates: Partial<Operator>) => {
    const { error } = await supabase
      .from('operators')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar operador: ' + error.message);
      return false;
    }
    
    toast.success('Operador atualizado!');
    await fetchOperators();
    return true;
  };

  const deleteOperator = async (id: string) => {
    const { error } = await supabase
      .from('operators')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir operador: ' + error.message);
      return false;
    }
    
    toast.success('Operador excluído!');
    await fetchOperators();
    return true;
  };

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  return { operators, loading, fetchOperators, createOperator, updateOperator, deleteOperator };
}

export function useOperatorPermissions(operatorId?: string) {
  const [permissions, setPermissions] = useState<OperatorPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!operatorId) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('operator_permissions')
      .select('*')
      .eq('operator_id', operatorId);
    
    if (error) {
      console.error('Erro ao carregar permissões:', error);
    } else {
      setPermissions(data || []);
    }
    setLoading(false);
  }, [operatorId]);

  const setPermission = async (permission: Omit<OperatorPermission, 'id' | 'created_at'>) => {
    // Upsert - insert or update
    const { error } = await supabase
      .from('operator_permissions')
      .upsert(permission, { onConflict: 'operator_id,module_id' });
    
    if (error) {
      toast.error('Erro ao definir permissão: ' + error.message);
      return false;
    }
    
    await fetchPermissions();
    return true;
  };

  const deletePermission = async (id: string) => {
    const { error } = await supabase
      .from('operator_permissions')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover permissão: ' + error.message);
      return false;
    }
    
    await fetchPermissions();
    return true;
  };

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, fetchPermissions, setPermission, deletePermission };
}

export function useTTSPhrases(unitId?: string) {
  const [phrases, setPhrases] = useState<TTSPhrase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhrases = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tts_phrases').select('*').order('display_order');
    
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao carregar frases TTS:', error);
    } else {
      setPhrases(data || []);
    }
    setLoading(false);
  }, [unitId]);

  const createPhrase = async (phrase: Omit<TTSPhrase, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('tts_phrases')
      .insert(phrase)
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao criar frase: ' + error.message);
      return null;
    }
    
    toast.success('Frase TTS criada!');
    await fetchPhrases();
    return data;
  };

  const updatePhrase = async (id: string, updates: Partial<TTSPhrase>) => {
    const { error } = await supabase
      .from('tts_phrases')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar frase: ' + error.message);
      return false;
    }
    
    toast.success('Frase atualizada!');
    await fetchPhrases();
    return true;
  };

  const deletePhrase = async (id: string) => {
    const { error } = await supabase
      .from('tts_phrases')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir frase: ' + error.message);
      return false;
    }
    
    toast.success('Frase excluída!');
    await fetchPhrases();
    return true;
  };

  useEffect(() => {
    fetchPhrases();
  }, [fetchPhrases]);

  return { phrases, loading, fetchPhrases, createPhrase, updatePhrase, deletePhrase };
}
