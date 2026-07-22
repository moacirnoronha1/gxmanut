export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias_problema: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          data_aquisicao: string | null
          data_instalacao: string | null
          fornecedor_id: string | null
          foto_url: string | null
          frequencia_preventiva: string | null
          garantia_ate: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string | null
          proxima_manutencao: string | null
          responsavel_id: string | null
          setor_id: string | null
          situacao: string
          tecnico_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_instalacao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          frequencia_preventiva?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          proxima_manutencao?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_instalacao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          frequencia_preventiva?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          proxima_manutencao?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          contato: string | null
          created_at: string
          documento: string | null
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          avaliacao: number | null
          avaliacao_comentario: string | null
          cancelada_motivo: string | null
          categoria_id: string | null
          causa: string | null
          concluida_em: string | null
          confirmacao_solicitante: string | null
          confirmada_em: string | null
          correcao: string | null
          created_at: string
          data_desejada: string | null
          descricao: string
          diagnostico: string | null
          equipamento_id: string | null
          equipamento_nao_cadastrado: string | null
          equipamento_parado: boolean
          id: string
          iniciada_em: string | null
          local: string | null
          materiais_utilizados: string | null
          numero: number
          previsao_atendimento: string | null
          reaberta_de: string | null
          recomendacoes: string | null
          resultado_testes: string | null
          risco: string | null
          setor_id: string | null
          situacao_final: string | null
          solicitante_id: string
          solucao: string | null
          status_id: string | null
          tecnico_id: string | null
          tempo_atendimento_min: number | null
          tempo_parado_min: number | null
          testes_realizados: string | null
          tipo: string
          titulo: string
          updated_at: string
          urgencia_id: string | null
        }
        Insert: {
          avaliacao?: number | null
          avaliacao_comentario?: string | null
          cancelada_motivo?: string | null
          categoria_id?: string | null
          causa?: string | null
          concluida_em?: string | null
          confirmacao_solicitante?: string | null
          confirmada_em?: string | null
          correcao?: string | null
          created_at?: string
          data_desejada?: string | null
          descricao: string
          diagnostico?: string | null
          equipamento_id?: string | null
          equipamento_nao_cadastrado?: string | null
          equipamento_parado?: boolean
          id?: string
          iniciada_em?: string | null
          local?: string | null
          materiais_utilizados?: string | null
          numero?: number
          previsao_atendimento?: string | null
          reaberta_de?: string | null
          recomendacoes?: string | null
          resultado_testes?: string | null
          risco?: string | null
          setor_id?: string | null
          situacao_final?: string | null
          solicitante_id: string
          solucao?: string | null
          status_id?: string | null
          tecnico_id?: string | null
          tempo_atendimento_min?: number | null
          tempo_parado_min?: number | null
          testes_realizados?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          urgencia_id?: string | null
        }
        Update: {
          avaliacao?: number | null
          avaliacao_comentario?: string | null
          cancelada_motivo?: string | null
          categoria_id?: string | null
          causa?: string | null
          concluida_em?: string | null
          confirmacao_solicitante?: string | null
          confirmada_em?: string | null
          correcao?: string | null
          created_at?: string
          data_desejada?: string | null
          descricao?: string
          diagnostico?: string | null
          equipamento_id?: string | null
          equipamento_nao_cadastrado?: string | null
          equipamento_parado?: boolean
          id?: string
          iniciada_em?: string | null
          local?: string | null
          materiais_utilizados?: string | null
          numero?: number
          previsao_atendimento?: string | null
          reaberta_de?: string | null
          recomendacoes?: string | null
          resultado_testes?: string | null
          risco?: string | null
          setor_id?: string | null
          situacao_final?: string | null
          solicitante_id?: string
          solucao?: string | null
          status_id?: string | null
          tecnico_id?: string | null
          tempo_atendimento_min?: number | null
          tempo_parado_min?: number | null
          testes_realizados?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          urgencia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_problema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_reaberta_de_fkey"
            columns: ["reaberta_de"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_os"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_urgencia_id_fkey"
            columns: ["urgencia_id"]
            isOneToOne: false
            referencedRelation: "urgencias"
            referencedColumns: ["id"]
          },
        ]
      }
      os_anexos: {
        Row: {
          autor_id: string | null
          created_at: string
          id: string
          nome: string
          os_id: string
          tipo: string | null
          url: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          id?: string
          nome: string
          os_id: string
          tipo?: string | null
          url: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          os_id?: string
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_anexos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_anexos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_comentarios: {
        Row: {
          anexo_url: string | null
          autor_id: string
          created_at: string
          id: string
          interno: boolean
          mensagem: string
          os_id: string
        }
        Insert: {
          anexo_url?: string | null
          autor_id: string
          created_at?: string
          id?: string
          interno?: boolean
          mensagem: string
          os_id: string
        }
        Update: {
          anexo_url?: string | null
          autor_id?: string
          created_at?: string
          id?: string
          interno?: boolean
          mensagem?: string
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_comentarios_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_custos: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_compra: string | null
          descricao: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          nota_numero: string | null
          observacao: string | null
          os_id: string
          quantidade: number
          registrado_por: string | null
          tipo: string
          unidade: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_compra?: string | null
          descricao: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nota_numero?: string | null
          observacao?: string | null
          os_id: string
          quantidade?: number
          registrado_por?: string | null
          tipo: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_compra?: string | null
          descricao?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nota_numero?: string | null
          observacao?: string | null
          os_id?: string
          quantidade?: number
          registrado_por?: string | null
          tipo?: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_custos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      os_historico: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          os_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          os_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          os_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_historico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_preventivos: {
        Row: {
          atividade: string
          ativo: boolean
          created_at: string
          equipamento_id: string
          frequencia: string
          id: string
          intervalo_dias: number | null
          materiais: string | null
          observacoes: string | null
          proxima_execucao: string | null
          responsavel_id: string | null
          tempo_estimado_min: number | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          atividade: string
          ativo?: boolean
          created_at?: string
          equipamento_id: string
          frequencia: string
          id?: string
          intervalo_dias?: number | null
          materiais?: string | null
          observacoes?: string | null
          proxima_execucao?: string | null
          responsavel_id?: string | null
          tempo_estimado_min?: number | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          atividade?: string
          ativo?: boolean
          created_at?: string
          equipamento_id?: string
          frequencia?: string
          id?: string
          intervalo_dias?: number | null
          materiais?: string | null
          observacoes?: string | null
          proxima_execucao?: string | null
          responsavel_id?: string | null
          tempo_estimado_min?: number | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_preventivos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_preventivos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      status_os: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          is_final: boolean
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      urgencias: {
        Row: {
          alerta_sonoro: boolean
          ativo: boolean
          cor: string
          created_at: string
          escalar: boolean
          id: string
          nome: string
          ordem: number
          prazo_horas: number | null
          requer_confirmacao: boolean
        }
        Insert: {
          alerta_sonoro?: boolean
          ativo?: boolean
          cor?: string
          created_at?: string
          escalar?: boolean
          id?: string
          nome: string
          ordem?: number
          prazo_horas?: number | null
          requer_confirmacao?: boolean
        }
        Update: {
          alerta_sonoro?: boolean
          ativo?: boolean
          cor?: string
          created_at?: string
          escalar?: boolean
          id?: string
          nome?: string
          ordem?: number
          prazo_horas?: number | null
          requer_confirmacao?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_gestor_or_admin: { Args: { _user_id: string }; Returns: boolean }
      pode_ver_os: {
        Args: { _os_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "responsavel" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "responsavel", "tecnico"],
    },
  },
} as const
