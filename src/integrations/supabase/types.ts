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
      checklist_execucoes: {
        Row: {
          checklist_id: string
          concluida_em: string | null
          conformes: number
          created_at: string
          equipamento_id: string
          id: string
          iniciada_em: string
          nao_aplicaveis: number
          nao_conformes: number
          observacoes: string | null
          percentual_conformidade: number
          status: string
          total_itens: number
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          checklist_id: string
          concluida_em?: string | null
          conformes?: number
          created_at?: string
          equipamento_id: string
          id?: string
          iniciada_em?: string
          nao_aplicaveis?: number
          nao_conformes?: number
          observacoes?: string | null
          percentual_conformidade?: number
          status?: string
          total_itens?: number
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          checklist_id?: string
          concluida_em?: string | null
          conformes?: number
          created_at?: string
          equipamento_id?: string
          id?: string
          iniciada_em?: string
          nao_aplicaveis?: number
          nao_conformes?: number
          observacoes?: string | null
          percentual_conformidade?: number
          status?: string
          total_itens?: number
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_execucoes_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_execucoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_execucoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          checklist_id: string
          componente: string
          componente_id: string | null
          created_at: string
          exige_foto: boolean
          id: string
          obrigatorio: boolean
          ordem: number
          pergunta: string
          tipo_resposta: string
        }
        Insert: {
          checklist_id: string
          componente: string
          componente_id?: string | null
          created_at?: string
          exige_foto?: boolean
          id?: string
          obrigatorio?: boolean
          ordem?: number
          pergunta: string
          tipo_resposta?: string
        }
        Update: {
          checklist_id?: string
          componente?: string
          componente_id?: string | null
          created_at?: string
          exige_foto?: boolean
          id?: string
          obrigatorio?: boolean
          ordem?: number
          pergunta?: string
          tipo_resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_itens_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_itens_componente_id_fkey"
            columns: ["componente_id"]
            isOneToOne: false
            referencedRelation: "equipamento_componentes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_modelo_itens: {
        Row: {
          componente: string
          created_at: string
          exige_foto: boolean
          id: string
          modelo_id: string
          obrigatorio: boolean
          ordem: number
          pergunta: string
          tipo_resposta: string
        }
        Insert: {
          componente: string
          created_at?: string
          exige_foto?: boolean
          id?: string
          modelo_id: string
          obrigatorio?: boolean
          ordem?: number
          pergunta: string
          tipo_resposta?: string
        }
        Update: {
          componente?: string
          created_at?: string
          exige_foto?: boolean
          id?: string
          modelo_id?: string
          obrigatorio?: boolean
          ordem?: number
          pergunta?: string
          tipo_resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_modelo_itens_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "checklist_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_modelos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          intervalo_dias: number | null
          nome: string
          periodicidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          intervalo_dias?: number | null
          nome: string
          periodicidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          intervalo_dias?: number | null
          nome?: string
          periodicidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_modelos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_respostas: {
        Row: {
          componente: string
          componente_id: string | null
          conforme: boolean | null
          created_at: string
          descricao_problema: string | null
          execucao_id: string
          foto_url: string | null
          gravidade: string | null
          id: string
          item_id: string | null
          necessita_manutencao: boolean
          observacao: string | null
          ordem: number
          os_id: string | null
          pergunta: string
          tipo_resposta: string
          valor: string | null
        }
        Insert: {
          componente: string
          componente_id?: string | null
          conforme?: boolean | null
          created_at?: string
          descricao_problema?: string | null
          execucao_id: string
          foto_url?: string | null
          gravidade?: string | null
          id?: string
          item_id?: string | null
          necessita_manutencao?: boolean
          observacao?: string | null
          ordem?: number
          os_id?: string | null
          pergunta: string
          tipo_resposta?: string
          valor?: string | null
        }
        Update: {
          componente?: string
          componente_id?: string | null
          conforme?: boolean | null
          created_at?: string
          descricao_problema?: string | null
          execucao_id?: string
          foto_url?: string | null
          gravidade?: string | null
          id?: string
          item_id?: string | null
          necessita_manutencao?: boolean
          observacao?: string | null
          ordem?: number
          os_id?: string | null
          pergunta?: string
          tipo_resposta?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_respostas_componente_id_fkey"
            columns: ["componente_id"]
            isOneToOne: false
            referencedRelation: "equipamento_componentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_respostas_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "checklist_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_respostas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_tipos_resposta: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          formato: string
          id: string
          nome: string
          opcoes: Json
          ordem: number
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          formato?: string
          id?: string
          nome: string
          opcoes?: Json
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          formato?: string
          id?: string
          nome?: string
          opcoes?: Json
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          equipamento_id: string
          id: string
          intervalo_dias: number | null
          modelo_id: string | null
          nome: string
          periodicidade: string
          proxima_execucao: string | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipamento_id: string
          id?: string
          intervalo_dias?: number | null
          modelo_id?: string | null
          nome: string
          periodicidade?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipamento_id?: string
          id?: string
          intervalo_dias?: number | null
          modelo_id?: string | null
          nome?: string
          periodicidade?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "checklist_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          grupo: string
          id: string
          natureza_padrao: string
          nome: string
          ordem: number
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo?: string
          id?: string
          natureza_padrao?: string
          nome: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo?: string
          id?: string
          natureza_padrao?: string
          nome?: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      equipamento_componentes: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          equipamento_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipamento_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          equipamento_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_componentes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_componentes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_documentos: {
        Row: {
          autor_id: string | null
          created_at: string
          equipamento_id: string
          id: string
          nome: string
          observacao: string | null
          tipo: string
          url: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          equipamento_id: string
          id?: string
          nome: string
          observacao?: string | null
          tipo?: string
          url: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          equipamento_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_documentos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_documentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_historico: {
        Row: {
          campo: string | null
          created_at: string
          descricao: string | null
          detalhes: Json
          equipamento_id: string
          id: string
          os_id: string | null
          tipo: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo?: string | null
          created_at?: string
          descricao?: string | null
          detalhes?: Json
          equipamento_id: string
          id?: string
          os_id?: string | null
          tipo: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string | null
          created_at?: string
          descricao?: string | null
          detalhes?: Json
          equipamento_id?: string
          id?: string
          os_id?: string | null
          tipo?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_historico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_paradas: {
        Row: {
          created_at: string
          equipamento_id: string
          fim: string | null
          id: string
          inicio: string
          motivo: string | null
          observacao: string | null
          os_id: string | null
          registrado_por: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipamento_id: string
          fim?: string | null
          id?: string
          inicio?: string
          motivo?: string | null
          observacao?: string | null
          os_id?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipamento_id?: string
          fim?: string | null
          id?: string
          inicio?: string
          motivo?: string | null
          observacao?: string | null
          os_id?: string | null
          registrado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_paradas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_paradas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_paradas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_status: {
        Row: {
          ativo: boolean
          categoria: string
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          baixa_destino: string | null
          baixa_em: string | null
          baixa_motivo: string | null
          baixa_tipo: string | null
          baixa_usuario_id: string | null
          baixa_valor: number | null
          categoria: string | null
          codigo: string | null
          created_at: string
          criado_por: string | null
          data_aquisicao: string | null
          data_instalacao: string | null
          estado_conservacao: string | null
          fornecedor_id: string | null
          foto_url: string | null
          frequencia_preventiva: string | null
          garantia_ate: string | null
          garantia_descricao: string | null
          id: string
          limite_custo_percentual: number
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          nota_fiscal: string | null
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string | null
          prop_condicoes: string | null
          prop_contrato_fim: string | null
          prop_contrato_inicio: string | null
          prop_contrato_numero: string | null
          prop_empresa: string | null
          prop_manutencao_por: string | null
          prop_observacoes: string | null
          prop_responsavel_id: string | null
          prop_telefone: string | null
          prop_valor_mensal: number | null
          propriedade_tipo_id: string | null
          proxima_manutencao: string | null
          responsavel_id: string | null
          setor_id: string | null
          situacao: string
          status_id: string | null
          tecnico_id: string | null
          tipo: string | null
          updated_at: string
          valor_aquisicao: number | null
          vida_util_meses: number | null
        }
        Insert: {
          ativo?: boolean
          baixa_destino?: string | null
          baixa_em?: string | null
          baixa_motivo?: string | null
          baixa_tipo?: string | null
          baixa_usuario_id?: string | null
          baixa_valor?: number | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aquisicao?: string | null
          data_instalacao?: string | null
          estado_conservacao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          frequencia_preventiva?: string | null
          garantia_ate?: string | null
          garantia_descricao?: string | null
          id?: string
          limite_custo_percentual?: number
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          nota_fiscal?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          prop_condicoes?: string | null
          prop_contrato_fim?: string | null
          prop_contrato_inicio?: string | null
          prop_contrato_numero?: string | null
          prop_empresa?: string | null
          prop_manutencao_por?: string | null
          prop_observacoes?: string | null
          prop_responsavel_id?: string | null
          prop_telefone?: string | null
          prop_valor_mensal?: number | null
          propriedade_tipo_id?: string | null
          proxima_manutencao?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          status_id?: string | null
          tecnico_id?: string | null
          tipo?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
        }
        Update: {
          ativo?: boolean
          baixa_destino?: string | null
          baixa_em?: string | null
          baixa_motivo?: string | null
          baixa_tipo?: string | null
          baixa_usuario_id?: string | null
          baixa_valor?: number | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aquisicao?: string | null
          data_instalacao?: string | null
          estado_conservacao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          frequencia_preventiva?: string | null
          garantia_ate?: string | null
          garantia_descricao?: string | null
          id?: string
          limite_custo_percentual?: number
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          nota_fiscal?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          prop_condicoes?: string | null
          prop_contrato_fim?: string | null
          prop_contrato_inicio?: string | null
          prop_contrato_numero?: string | null
          prop_empresa?: string | null
          prop_manutencao_por?: string | null
          prop_observacoes?: string | null
          prop_responsavel_id?: string | null
          prop_telefone?: string | null
          prop_valor_mensal?: number | null
          propriedade_tipo_id?: string | null
          proxima_manutencao?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          status_id?: string | null
          tecnico_id?: string | null
          tipo?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_baixa_usuario_id_fkey"
            columns: ["baixa_usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_prop_responsavel_id_fkey"
            columns: ["prop_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_propriedade_tipo_id_fkey"
            columns: ["propriedade_tipo_id"]
            isOneToOne: false
            referencedRelation: "propriedade_tipos"
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
            foreignKeyName: "equipamentos_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "equipamento_status"
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
      estoque_auditoria: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json
          ferramenta_id: string | null
          id: string
          item_id: string | null
          motivo: string | null
          quantidade_anterior: number | null
          quantidade_nova: number | null
          usuario_id: string | null
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json
          ferramenta_id?: string | null
          id?: string
          item_id?: string | null
          motivo?: string | null
          quantidade_anterior?: number | null
          quantidade_nova?: number | null
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json
          ferramenta_id?: string | null
          id?: string
          item_id?: string | null
          motivo?: string | null
          quantidade_anterior?: number | null
          quantidade_nova?: number | null
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_auditoria_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      estoque_config: {
        Row: {
          id: boolean
          metodo_valoracao: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          metodo_valoracao?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          metodo_valoracao?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_item_equipamentos: {
        Row: {
          created_at: string
          equipamento_id: string
          id: string
          item_id: string
        }
        Insert: {
          created_at?: string
          equipamento_id: string
          id?: string
          item_id: string
        }
        Update: {
          created_at?: string
          equipamento_id?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_item_equipamentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_item_equipamentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_itens: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo: string | null
          created_at: string
          criado_por: string | null
          custo_medio: number
          custo_unitario: number
          estoque_minimo: number
          fornecedor_id: string | null
          foto_url: string | null
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          quantidade: number
          quantidade_reservada: number
          ultima_compra: string | null
          ultimo_custo: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          custo_medio?: number
          custo_unitario?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          quantidade_reservada?: number
          ultima_compra?: string | null
          ultimo_custo?: number | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          custo_medio?: number
          custo_unitario?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          quantidade_reservada?: number
          ultima_compra?: string | null
          ultimo_custo?: number | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "estoque_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_itens_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_itens_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data: string
          equipamento_id: string | null
          fornecedor_id: string | null
          id: string
          item_id: string
          manutencao_id: string | null
          motivo: string | null
          nota_numero: string | null
          observacao: string | null
          os_custo_id: string | null
          os_id: string | null
          quantidade: number
          reserva_id: string | null
          saldo_anterior: number | null
          saldo_novo: number | null
          tipo: string
          usuario_id: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data?: string
          equipamento_id?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id: string
          manutencao_id?: string | null
          motivo?: string | null
          nota_numero?: string | null
          observacao?: string | null
          os_custo_id?: string | null
          os_id?: string | null
          quantidade: number
          reserva_id?: string | null
          saldo_anterior?: number | null
          saldo_novo?: number | null
          tipo: string
          usuario_id?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data?: string
          equipamento_id?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id?: string
          manutencao_id?: string | null
          motivo?: string | null
          nota_numero?: string | null
          observacao?: string | null
          os_custo_id?: string | null
          os_id?: string | null
          quantidade?: number
          reserva_id?: string | null
          saldo_anterior?: number | null
          saldo_novo?: number | null
          tipo?: string
          usuario_id?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_os_custo_id_fkey"
            columns: ["os_custo_id"]
            isOneToOne: false
            referencedRelation: "os_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "estoque_reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_reservas: {
        Row: {
          created_at: string
          id: string
          item_id: string
          manutencao_id: string | null
          motivo: string | null
          os_id: string | null
          quantidade: number
          status: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          manutencao_id?: string | null
          motivo?: string | null
          os_id?: string | null
          quantidade: number
          status?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          manutencao_id?: string | null
          motivo?: string | null
          os_id?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_reservas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_reservas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramenta_emprestimos: {
        Row: {
          created_at: string
          devolvido_em: string | null
          estado_devolucao: string | null
          ferramenta_id: string
          id: string
          observacao: string | null
          os_id: string | null
          previsao_devolucao: string | null
          registrado_por: string | null
          retirada_em: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          devolvido_em?: string | null
          estado_devolucao?: string | null
          ferramenta_id: string
          id?: string
          observacao?: string | null
          os_id?: string | null
          previsao_devolucao?: string | null
          registrado_por?: string | null
          retirada_em?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          devolvido_em?: string | null
          estado_devolucao?: string | null
          ferramenta_id?: string
          id?: string
          observacao?: string | null
          os_id?: string | null
          previsao_devolucao?: string | null
          registrado_por?: string | null
          retirada_em?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferramenta_emprestimos_ferramenta_id_fkey"
            columns: ["ferramenta_id"]
            isOneToOne: false
            referencedRelation: "ferramentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramenta_emprestimos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramenta_emprestimos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramenta_emprestimos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          criado_por: string | null
          data_aquisicao: string | null
          fornecedor_id: string | null
          foto_url: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          setor_id: string | null
          status: string
          updated_at: string
          valor_aquisicao: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aquisicao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          setor_id?: string | null
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          criado_por?: string | null
          data_aquisicao?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          setor_id?: string | null
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
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
      manutencoes_periodicas: {
        Row: {
          categoria_id: string | null
          checklist: Json
          created_at: string
          criado_por: string | null
          data_inicio: string | null
          descricao: string | null
          dia_mes: number | null
          dias_semana: number[] | null
          documentos: Json
          equipamento_id: string | null
          escalacao: Json
          ferramentas: string | null
          fornecedor_id: string | null
          geracao_os: string
          horario_preferencial: string | null
          id: string
          intervalo_custom: number | null
          localizacao: string | null
          materiais: string | null
          mes_ano: number | null
          nome: string
          observacoes: string | null
          periodicidade_id: string | null
          primeira_execucao: string | null
          prioridade: string
          procedimento: string | null
          proxima_execucao: string | null
          regra_mensal: string | null
          responsavel_id: string | null
          setor_id: string | null
          situacao: string
          tecnico_id: string | null
          tecnico_substituto_id: string | null
          tempo_estimado_min: number | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          checklist?: Json
          created_at?: string
          criado_por?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dia_mes?: number | null
          dias_semana?: number[] | null
          documentos?: Json
          equipamento_id?: string | null
          escalacao?: Json
          ferramentas?: string | null
          fornecedor_id?: string | null
          geracao_os?: string
          horario_preferencial?: string | null
          id?: string
          intervalo_custom?: number | null
          localizacao?: string | null
          materiais?: string | null
          mes_ano?: number | null
          nome: string
          observacoes?: string | null
          periodicidade_id?: string | null
          primeira_execucao?: string | null
          prioridade?: string
          procedimento?: string | null
          proxima_execucao?: string | null
          regra_mensal?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          tecnico_id?: string | null
          tecnico_substituto_id?: string | null
          tempo_estimado_min?: number | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          checklist?: Json
          created_at?: string
          criado_por?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dia_mes?: number | null
          dias_semana?: number[] | null
          documentos?: Json
          equipamento_id?: string | null
          escalacao?: Json
          ferramentas?: string | null
          fornecedor_id?: string | null
          geracao_os?: string
          horario_preferencial?: string | null
          id?: string
          intervalo_custom?: number | null
          localizacao?: string | null
          materiais?: string | null
          mes_ano?: number | null
          nome?: string
          observacoes?: string | null
          periodicidade_id?: string | null
          primeira_execucao?: string | null
          prioridade?: string
          procedimento?: string | null
          proxima_execucao?: string | null
          regra_mensal?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          situacao?: string
          tecnico_id?: string | null
          tecnico_substituto_id?: string | null
          tempo_estimado_min?: number | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_periodicas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_problema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_periodicidade_id_fkey"
            columns: ["periodicidade_id"]
            isOneToOne: false
            referencedRelation: "periodicidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_periodicas_tecnico_substituto_id_fkey"
            columns: ["tecnico_substituto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_execucoes: {
        Row: {
          checklist_respostas: Json
          concluida_em: string | null
          correcao: string | null
          created_at: string
          custo_total: number
          data_programada: string
          diagnostico: string | null
          encontrou_irregularidade: boolean | null
          executada_completa: boolean | null
          fotos_antes: Json
          fotos_depois: Json
          gerou_corretiva: boolean
          id: string
          iniciada_em: string | null
          irregularidades: string | null
          manutencao_id: string
          materiais_utilizados: string | null
          os_corretiva_id: string | null
          os_id: string | null
          proxima_data: string | null
          recomendacoes: string | null
          servico_realizado: string | null
          status: string
          tecnico_id: string | null
          updated_at: string
        }
        Insert: {
          checklist_respostas?: Json
          concluida_em?: string | null
          correcao?: string | null
          created_at?: string
          custo_total?: number
          data_programada: string
          diagnostico?: string | null
          encontrou_irregularidade?: boolean | null
          executada_completa?: boolean | null
          fotos_antes?: Json
          fotos_depois?: Json
          gerou_corretiva?: boolean
          id?: string
          iniciada_em?: string | null
          irregularidades?: string | null
          manutencao_id: string
          materiais_utilizados?: string | null
          os_corretiva_id?: string | null
          os_id?: string | null
          proxima_data?: string | null
          recomendacoes?: string | null
          servico_realizado?: string | null
          status?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Update: {
          checklist_respostas?: Json
          concluida_em?: string | null
          correcao?: string | null
          created_at?: string
          custo_total?: number
          data_programada?: string
          diagnostico?: string | null
          encontrou_irregularidade?: boolean | null
          executada_completa?: boolean | null
          fotos_antes?: Json
          fotos_depois?: Json
          gerou_corretiva?: boolean
          id?: string
          iniciada_em?: string | null
          irregularidades?: string | null
          manutencao_id?: string
          materiais_utilizados?: string | null
          os_corretiva_id?: string | null
          os_id?: string | null
          proxima_data?: string | null
          recomendacoes?: string | null
          servico_realizado?: string | null
          status?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_execucoes_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_execucoes_os_corretiva_id_fkey"
            columns: ["os_corretiva_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_execucoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_execucoes_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_lembrete_eventos: {
        Row: {
          created_at: string
          data_referencia: string | null
          id: string
          lembrete_id: string | null
          manutencao_id: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data_referencia?: string | null
          id?: string
          lembrete_id?: string | null
          manutencao_id: string
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data_referencia?: string | null
          id?: string
          lembrete_id?: string | null
          manutencao_id?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_lembrete_eventos_lembrete_id_fkey"
            columns: ["lembrete_id"]
            isOneToOne: false
            referencedRelation: "mp_lembretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_lembrete_eventos_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_lembrete_eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_lembretes: {
        Row: {
          ativo: boolean
          canais: string[]
          created_at: string
          destinatarios: string[]
          dias_antes: number
          id: string
          manutencao_id: string
          usuarios_extra: string[]
        }
        Insert: {
          ativo?: boolean
          canais?: string[]
          created_at?: string
          destinatarios?: string[]
          dias_antes?: number
          id?: string
          manutencao_id: string
          usuarios_extra?: string[]
        }
        Update: {
          ativo?: boolean
          canais?: string[]
          created_at?: string
          destinatarios?: string[]
          dias_antes?: number
          id?: string
          manutencao_id?: string
          usuarios_extra?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mp_lembretes_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_reagendamentos: {
        Row: {
          created_at: string
          data_original: string | null
          execucao_id: string | null
          id: string
          manutencao_id: string
          motivo: string
          nova_data: string
          observacao: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data_original?: string | null
          execucao_id?: string | null
          id?: string
          manutencao_id: string
          motivo: string
          nova_data: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data_original?: string | null
          execucao_id?: string | null
          id?: string
          manutencao_id?: string
          motivo?: string
          nova_data?: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_reagendamentos_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "mp_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_reagendamentos_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_reagendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_config: {
        Row: {
          extrema_repeticao_min: number
          id: boolean
          mp_atraso_repetir_dias: number
          os_nao_urgente_lembrete_diario: boolean
          updated_at: string
          urgente_mestre_min: number
          urgente_reforco_min: number
        }
        Insert: {
          extrema_repeticao_min?: number
          id?: boolean
          mp_atraso_repetir_dias?: number
          os_nao_urgente_lembrete_diario?: boolean
          updated_at?: string
          urgente_mestre_min?: number
          urgente_reforco_min?: number
        }
        Update: {
          extrema_repeticao_min?: number
          id?: boolean
          mp_atraso_repetir_dias?: number
          os_nao_urgente_lembrete_diario?: boolean
          updated_at?: string
          urgente_mestre_min?: number
          urgente_reforco_min?: number
        }
        Relationships: []
      }
      notificacao_envios: {
        Row: {
          created_at: string
          device_id: string | null
          erro: string | null
          http_status: number | null
          id: string
          notificacao_id: string | null
          status: string
          tentativa: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          erro?: string | null
          http_status?: number | null
          id?: string
          notificacao_id?: string | null
          status: string
          tentativa?: number
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          erro?: string | null
          http_status?: number | null
          id?: string
          notificacao_id?: string | null
          status?: string
          tentativa?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_envios_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacao_envios_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_preferencias: {
        Row: {
          silencio_ativo: boolean
          silencio_fim: string
          silencio_inicio: string
          som_urgente: boolean
          tipos: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          silencio_ativo?: boolean
          silencio_fim?: string
          silencio_inicio?: string
          som_urgente?: boolean
          tipos?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          silencio_ativo?: boolean
          silencio_fim?: string
          silencio_inicio?: string
          som_urgente?: boolean
          tipos?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          confirmada_em: string | null
          created_at: string
          dados: Json
          id: string
          lida_em: string | null
          manutencao_id: string | null
          mensagem: string
          os_id: string | null
          prioridade: string
          resolvida_em: string | null
          tentativas: number
          tipo: string
          titulo: string
          ultimo_envio_em: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          confirmada_em?: string | null
          created_at?: string
          dados?: Json
          id?: string
          lida_em?: string | null
          manutencao_id?: string | null
          mensagem: string
          os_id?: string | null
          prioridade?: string
          resolvida_em?: string | null
          tentativas?: number
          tipo: string
          titulo: string
          ultimo_envio_em?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          confirmada_em?: string | null
          created_at?: string
          dados?: Json
          id?: string
          lida_em?: string | null
          manutencao_id?: string | null
          mensagem?: string
          os_id?: string | null
          prioridade?: string
          resolvida_em?: string | null
          tentativas?: number
          tipo?: string
          titulo?: string
          ultimo_envio_em?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          assumida_em: string | null
          assumida_por: string | null
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
          escalonamento_nivel: number
          id: string
          iniciada_em: string | null
          local: string | null
          manutencao_periodica_id: string | null
          materiais_utilizados: string | null
          mp_execucao_id: string | null
          notificada_em: string | null
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
          ultimo_alerta_em: string | null
          updated_at: string
          urgencia_id: string | null
        }
        Insert: {
          assumida_em?: string | null
          assumida_por?: string | null
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
          escalonamento_nivel?: number
          id?: string
          iniciada_em?: string | null
          local?: string | null
          manutencao_periodica_id?: string | null
          materiais_utilizados?: string | null
          mp_execucao_id?: string | null
          notificada_em?: string | null
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
          ultimo_alerta_em?: string | null
          updated_at?: string
          urgencia_id?: string | null
        }
        Update: {
          assumida_em?: string | null
          assumida_por?: string | null
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
          escalonamento_nivel?: number
          id?: string
          iniciada_em?: string | null
          local?: string | null
          manutencao_periodica_id?: string | null
          materiais_utilizados?: string | null
          mp_execucao_id?: string | null
          notificada_em?: string | null
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
          ultimo_alerta_em?: string | null
          updated_at?: string
          urgencia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_assumida_por_fkey"
            columns: ["assumida_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "ordens_servico_manutencao_periodica_id_fkey"
            columns: ["manutencao_periodica_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_periodicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_mp_execucao_id_fkey"
            columns: ["mp_execucao_id"]
            isOneToOne: false
            referencedRelation: "mp_execucoes"
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
      os_custo_evidencias: {
        Row: {
          autor_id: string | null
          created_at: string
          custo_id: string
          id: string
          nome: string
          observacao: string | null
          tipo: string
          url: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          custo_id: string
          id?: string
          nome: string
          observacao?: string | null
          tipo?: string
          url: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          custo_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_custo_evidencias_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custo_evidencias_custo_id_fkey"
            columns: ["custo_id"]
            isOneToOne: false
            referencedRelation: "os_custos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_custos: {
        Row: {
          categoria_id: string | null
          comprador_id: string | null
          comprovacao: string
          comprovante_url: string | null
          created_at: string
          data_compra: string | null
          descricao: string
          equipamento_id: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          natureza: string
          nota_numero: string | null
          observacao: string | null
          origem: string
          os_id: string
          prestador: string | null
          previsto: boolean
          quantidade: number
          registrado_por: string | null
          tecnico_id: string | null
          tipo: string
          unidade: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          categoria_id?: string | null
          comprador_id?: string | null
          comprovacao?: string
          comprovante_url?: string | null
          created_at?: string
          data_compra?: string | null
          descricao: string
          equipamento_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          natureza?: string
          nota_numero?: string | null
          observacao?: string | null
          origem?: string
          os_id: string
          prestador?: string | null
          previsto?: boolean
          quantidade?: number
          registrado_por?: string | null
          tecnico_id?: string | null
          tipo: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          categoria_id?: string | null
          comprador_id?: string | null
          comprovacao?: string
          comprovante_url?: string | null
          created_at?: string
          data_compra?: string | null
          descricao?: string
          equipamento_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          natureza?: string
          nota_numero?: string | null
          observacao?: string | null
          origem?: string
          os_id?: string
          prestador?: string | null
          previsto?: boolean
          quantidade?: number
          registrado_por?: string | null
          tecnico_id?: string | null
          tipo?: string
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_custos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "custo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "os_custos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      os_edicao_permissoes: {
        Row: {
          atualizado_em: string
          campo: string
          permitido: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          atualizado_em?: string
          campo: string
          permitido?: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          atualizado_em?: string
          campo?: string
          permitido?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
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
      os_tecnicos: {
        Row: {
          adicionado_por: string | null
          created_at: string
          id: string
          os_id: string
          papel: string
          tecnico_id: string
          updated_at: string
        }
        Insert: {
          adicionado_por?: string | null
          created_at?: string
          id?: string
          os_id: string
          papel?: string
          tecnico_id: string
          updated_at?: string
        }
        Update: {
          adicionado_por?: string | null
          created_at?: string
          id?: string
          os_id?: string
          papel?: string
          tecnico_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_tecnicos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      periodicidades: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          intervalo: number | null
          nome: string
          ordem: number
          sistema: boolean
          tipo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          intervalo?: number | null
          nome: string
          ordem?: number
          sistema?: boolean
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          intervalo?: number | null
          nome?: string
          ordem?: number
          sistema?: boolean
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
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
      profile_setores: {
        Row: {
          created_at: string
          id: string
          setor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_setores_user_id_fkey"
            columns: ["user_id"]
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
          bloqueado: boolean
          bloqueado_ate: string | null
          created_at: string
          criado_por: string | null
          email: string | null
          funcao: string | null
          id: string
          is_master: boolean
          must_change_password: boolean
          nome: string
          nome_completo: string | null
          setor_id: string | null
          telefone: string | null
          tentativas_falhas: number
          ultimo_acesso: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          bloqueado?: boolean
          bloqueado_ate?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          funcao?: string | null
          id: string
          is_master?: boolean
          must_change_password?: boolean
          nome?: string
          nome_completo?: string | null
          setor_id?: string | null
          telefone?: string | null
          tentativas_falhas?: number
          ultimo_acesso?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          bloqueado?: boolean
          bloqueado_ate?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          funcao?: string | null
          id?: string
          is_master?: boolean
          must_change_password?: boolean
          nome?: string
          nome_completo?: string | null
          setor_id?: string | null
          telefone?: string | null
          tentativas_falhas?: number
          ultimo_acesso?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      propriedade_tipos: {
        Row: {
          ativo: boolean
          chave: string
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          ativo: boolean
          auth: string
          created_at: string
          endpoint: string
          id: string
          nome: string
          p256dh: string
          ultima_confirmacao_em: string | null
          ultimo_acesso: string
          ultimo_envio_em: string | null
          ultimo_erro: string | null
          ultimo_teste_em: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          nome?: string
          p256dh: string
          ultima_confirmacao_em?: string | null
          ultimo_acesso?: string
          ultimo_envio_em?: string | null
          ultimo_erro?: string | null
          ultimo_teste_em?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          nome?: string
          p256dh?: string
          ultima_confirmacao_em?: string | null
          ultimo_acesso?: string
          ultimo_envio_em?: string | null
          ultimo_erro?: string | null
          ultimo_teste_em?: string | null
          user_agent?: string | null
          user_id?: string
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
      usuarios_auditoria: {
        Row: {
          acao: string
          alvo_id: string | null
          ator_id: string | null
          created_at: string
          detalhes: Json | null
          id: string
        }
        Insert: {
          acao: string
          alvo_id?: string | null
          ator_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
        }
        Update: {
          acao?: string
          alvo_id?: string | null
          ator_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      editar_ordem_servico: {
        Args: {
          p_alteracoes?: Json
          p_os_id: string
          p_tecnicos_apoio?: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "responsavel" | "tecnico" | "mestre"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "gestor", "responsavel", "tecnico", "mestre"],
    },
  },
} as const
