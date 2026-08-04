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
          manutencao_periodica_id: string | null
          materiais_utilizados: string | null
          mp_execucao_id: string | null
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
          manutencao_periodica_id?: string | null
          materiais_utilizados?: string | null
          mp_execucao_id?: string | null
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
          manutencao_periodica_id?: string | null
          materiais_utilizados?: string | null
          mp_execucao_id?: string | null
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
      [_ in never]: never
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
      app_role: ["admin", "gestor", "responsavel", "tecnico", "mestre"],
    },
  },
} as const
