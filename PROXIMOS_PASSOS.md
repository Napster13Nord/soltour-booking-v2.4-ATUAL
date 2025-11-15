# 📋 Próximos Passos - Finalização Para Produção
**Última atualização:** 15/11/2025
**Status:** Plugin funcionando ✅ | Preparação para produção em andamento 🚀

---

## 🎯 Estado Atual do Plugin

### ✅ O Que Está Funcionando Perfeitamente

#### 1. **Sistema de Busca e Disponibilidade**
- ✅ Formulário com múltiplos quartos
- ✅ Coleta de idades (adultos e crianças)
- ✅ Integração com `/booking/availability` (API Soltour)
- ✅ Paginação server-side alinhada (pageNumber/rowsPerPage)
- ✅ Deduplicação de hotéis (1 card por hotel, melhor preço)
- ✅ Mapeamento correto de dados de hotel (sem "integración (NO SE USA)")

#### 2. **Página de Resultados**
- ✅ Cards de pacotes com dados corretos
- ✅ Preços calculados corretamente
- ✅ Preço por pessoa preciso (via searchParams.rooms)
- ✅ Imagens e descrições dos hotéis funcionando
- ✅ Informações de voos (ida/volta)

#### 3. **Fluxo de Cotação**
- ✅ Chamada direta ao `/booking/quote` (sem fetchAvailability)
- ✅ Validação robusta de erros
- ✅ Renderização de seguros, extras e textos legais
- ✅ Cards de transfers e cancelamento
- ✅ Cálculo automático de preço total

#### 4. **Qualidade de Código**
- ✅ Sem referências a searchParams.adults/children incorretos
- ✅ Código limpo (função fetch_availability removida)
- ✅ Comentários e logs atualizados
- ✅ Alinhamento total com documentação Soltour

---

## 🚧 Tarefas Para Finalização (Prioridade)

### **FASE 1: Correções e Melhorias da UI** ⚠️

#### 1.1. Corrigir Card de Gastos de Cancelamento
**Problema identificado:** "Não está fazendo muito sentido"

**Arquivo:** `assets/js/quote-page.js` (linhas 1264-1321)

**O que verificar:**
```javascript
// Função atual: extractCancellationData(budget)
// Renderização: renderCancellationCard(cancellationData)
```

**Possíveis problemas:**
- [ ] Datas de cancelamento confusas (formato, ordem)
- [ ] Valores percentuais vs valores fixos não claros
- [ ] Falta de contexto sobre o que significa cada período
- [ ] Tradução/texto pouco claro

**Ação requerida:**
1. Analisar estrutura de dados retornada pela API
2. Melhorar labels e descrições
3. Adicionar tooltip ou texto explicativo
4. Formatar datas de forma mais clara (ex: "Até 7 dias antes: 50%")

---

#### 1.2. Melhorar UI da Página de Cotação
**Objetivo:** Interface profissional e intuitiva

**Arquivos:**
- `assets/css/quote-page.css`
- `assets/js/quote-page.js`

**Melhorias necessárias:**
- [ ] **Hierarquia visual** - Cards mais destacados
- [ ] **Espaçamento** - Respiração entre elementos
- [ ] **Cores** - Palette consistente e profissional
- [ ] **Tipografia** - Tamanhos e pesos adequados
- [ ] **Ícones** - Consistência visual
- [ ] **Responsividade** - Testar em mobile/tablet
- [ ] **Loading states** - Feedback visual durante carregamento
- [ ] **Estados vazios** - Mensagens quando não há seguros/extras

**Checklist de UI:**
```css
/* Verificar: */
- Botões têm hover/active states claros
- Cards têm sombras sutis
- Checkboxes são grandes e clicáveis
- Preços estão em destaque
- Totais têm cor diferenciada
- Formulários têm validação visual
- Erros são exibidos claramente
```

---

### **FASE 2: Sistema de Emails (SMTP)** 📧

#### 2.1. Configurar SMTP
**Objetivo:** Enviar emails profissionais via SMTP

**Arquivo novo:** `includes/class-soltour-email.php`

**Implementação:**
```php
<?php
/**
 * Classe para gerenciar emails do plugin Soltour
 */
class Soltour_Email {

    /**
     * Configurar SMTP usando WordPress wp_mail
     */
    public function __construct() {
        add_action('phpmailer_init', [$this, 'configure_smtp']);
    }

    /**
     * Configurar parâmetros SMTP
     */
    public function configure_smtp($phpmailer) {
        $phpmailer->isSMTP();
        $phpmailer->Host = get_option('soltour_smtp_host', 'smtp.gmail.com');
        $phpmailer->SMTPAuth = true;
        $phpmailer->Port = get_option('soltour_smtp_port', 587);
        $phpmailer->Username = get_option('soltour_smtp_username', '');
        $phpmailer->Password = get_option('soltour_smtp_password', '');
        $phpmailer->SMTPSecure = get_option('soltour_smtp_encryption', 'tls');
        $phpmailer->From = get_option('soltour_smtp_from_email', '');
        $phpmailer->FromName = get_option('soltour_smtp_from_name', 'BeautyTravel');
    }
}
```

**Página de configurações (admin):**
- [ ] Criar página "Soltour > Configurações de Email"
- [ ] Campos: Host, Port, Username, Password, From Email, From Name
- [ ] Botão "Testar Email" para validar configurações
- [ ] Salvar em options do WordPress

---

#### 2.2. Email para Agência
**Quando enviar:** Ao clicar "Gerar Cotação Final"

**Template:** `templates/email-agency.php`

**Conteúdo do email:**
```
Assunto: 🎯 Nova Cotação Gerada - [Nome do Cliente]

Olá Equipe BeautyTravel,

Uma nova cotação foi gerada no sistema:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DADOS DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome: [Nome Completo]
Email: [email@exemplo.com]
Telefone: [+351 912 345 678]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DADOS DO PACOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Destino: [Punta Cana, República Dominicana]
Hotel: [Riu Palace Macao - 5⭐]
Check-in: [19/04/2026]
Check-out: [26/04/2026]
Noites: [7]

Passageiros:
  • 2 Adultos
  • 0 Crianças

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 VALORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preço base: 1.500€
Transfers: 100€
Seguros: 50€
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 1.650€
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Ver detalhes completos no painel:
[Link para admin WordPress com ID da cotação]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 DADOS TÉCNICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quote Token: [QT123456...]
Budget ID: [H986##TI##0$...]
Data/Hora: [15/11/2025 14:30]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este email foi gerado automaticamente pelo sistema Soltour Booking.
```

---

#### 2.3. Email para Cliente
**Quando enviar:** Ao clicar "Gerar Cotação Final"

**Template:** `templates/email-client.php`

**Conteúdo do email:**
```
Assunto: ✈️ Sua Cotação de Viagem - BeautyTravel

Olá [Nome],

Obrigado por solicitar uma cotação connosco!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 RESUMO DA SUA VIAGEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Destino: [Punta Cana, República Dominicana]
Hotel: [Riu Palace Macao ⭐⭐⭐⭐⭐]
Check-in: [19/04/2026]
Check-out: [26/04/2026]
Duração: [7 noites]

Passageiros: [2 adultos]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 VALOR TOTAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1.650€
(Preço por pessoa: 825€)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE ESTÁ INCLUÍDO:
✅ Voos de ida e volta
✅ Alojamento com [Tudo Incluído]
✅ Transfers aeroporto-hotel-aeroporto
✅ Seguro de viagem

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 PRÓXIMOS PASSOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A nossa equipa entrará em contacto consigo nas próximas 24 horas para:
• Confirmar todos os detalhes
• Esclarecer quaisquer dúvidas
• Finalizar a sua reserva

Caso tenha alguma questão, não hesite em contactar-nos:
📧 Email: [email@beautytravel.pt]
📱 Telefone: [+351 XXX XXX XXX]

Obrigado por escolher a BeautyTravel!

Com os melhores cumprimentos,
Equipa BeautyTravel
```

---

### **FASE 3: Sistema de Logs no WordPress** 📊

#### 3.1. Custom Post Type para Cotações
**Objetivo:** Armazenar todas as cotações geradas

**Arquivo:** `includes/class-soltour-cpt.php`

**Implementação:**
```php
<?php
/**
 * Registrar Custom Post Type para Cotações
 */
class Soltour_CPT {

    public function __construct() {
        add_action('init', [$this, 'register_quote_cpt']);
    }

    public function register_quote_cpt() {
        register_post_type('soltour_quote', [
            'labels' => [
                'name' => 'Cotações Soltour',
                'singular_name' => 'Cotação',
                'add_new' => 'Nova Cotação',
                'add_new_item' => 'Adicionar Nova Cotação',
                'edit_item' => 'Editar Cotação',
                'view_item' => 'Ver Cotação',
                'all_items' => 'Todas as Cotações',
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'soltour-booking',
            'capability_type' => 'post',
            'supports' => ['title'],
            'menu_icon' => 'dashicons-clipboard'
        ]);
    }
}
```

---

#### 3.2. Salvar Cotação ao Gerar
**Quando:** Ao clicar "Gerar Cotação Final"

**Dados a salvar:**
```php
// Meta fields da cotação
$quote_data = [
    // Cliente
    'customer_name' => 'João Silva',
    'customer_email' => 'joao@exemplo.com',
    'customer_phone' => '+351 912 345 678',

    // Pacote
    'destination' => 'Punta Cana',
    'hotel_name' => 'Riu Palace Macao',
    'hotel_stars' => 5,
    'check_in' => '2026-04-19',
    'check_out' => '2026-04-26',
    'nights' => 7,

    // Passageiros
    'adults' => 2,
    'children' => 0,
    'total_passengers' => 2,
    'passengers_data' => json_encode($passengers), // Array completo

    // Preços
    'base_price' => 1500.00,
    'transfers_price' => 100.00,
    'insurance_price' => 50.00,
    'total_price' => 1650.00,

    // Técnico
    'quote_token' => 'QT123456...',
    'budget_id' => 'H986##TI##0$...',
    'avail_token' => 'AVL...',

    // Status
    'status' => 'pending', // pending, contacted, confirmed, cancelled
    'created_at' => current_time('mysql'),
];

// Criar post
$post_id = wp_insert_post([
    'post_type' => 'soltour_quote',
    'post_title' => sprintf(
        'Cotação #%d - %s - %s',
        $next_id,
        $quote_data['customer_name'],
        $quote_data['destination']
    ),
    'post_status' => 'publish',
]);

// Salvar meta fields
foreach ($quote_data as $key => $value) {
    update_post_meta($post_id, '_soltour_' . $key, $value);
}
```

---

#### 3.3. Página de Listagem no Admin
**Menu:** WordPress Admin > Soltour > Cotações

**Colunas da tabela:**
- [ ] **ID** - Número da cotação
- [ ] **Cliente** - Nome + Email
- [ ] **Destino** - Hotel + Destino
- [ ] **Datas** - Check-in → Check-out
- [ ] **Passageiros** - 2 adultos, 1 criança
- [ ] **Valor Total** - 1.650€
- [ ] **Status** - Badge colorido (Pendente, Contactado, Confirmado)
- [ ] **Data** - Data/hora de criação
- [ ] **Ações** - Ver detalhes | Marcar como contactado

**Filtros:**
- [ ] Por status
- [ ] Por intervalo de datas
- [ ] Por destino

---

#### 3.4. Página de Detalhes da Cotação
**Exibir:**

```
╔══════════════════════════════════════════════╗
║  COTAÇÃO #123 - João Silva                   ║
║  Status: Pendente 🟡                         ║
╚══════════════════════════════════════════════╝

┌─ DADOS DO CLIENTE ────────────────────────┐
│ Nome: João Silva                           │
│ Email: joao@exemplo.com                    │
│ Telefone: +351 912 345 678                 │
└────────────────────────────────────────────┘

┌─ DADOS DA VIAGEM ─────────────────────────┐
│ Destino: Punta Cana, República Dominicana │
│ Hotel: Riu Palace Macao (5⭐)              │
│ Check-in: 19/04/2026                       │
│ Check-out: 26/04/2026                      │
│ Noites: 7                                  │
│ Regime: Tudo Incluído                      │
└────────────────────────────────────────────┘

┌─ PASSAGEIROS ─────────────────────────────┐
│ Adulto 1: João Silva (30 anos)            │
│ Adulto 2: Maria Silva (28 anos)           │
└────────────────────────────────────────────┘

┌─ VALORES ─────────────────────────────────┐
│ Preço base: 1.500€                         │
│ Transfers: 100€                            │
│ Seguros: 50€                               │
│ ─────────────────────────────────────────  │
│ TOTAL: 1.650€                              │
└────────────────────────────────────────────┘

┌─ DADOS TÉCNICOS ──────────────────────────┐
│ Quote Token: QT123456...                   │
│ Budget ID: H986##TI##0$...                 │
│ Data/Hora: 15/11/2025 14:30               │
└────────────────────────────────────────────┘

[Botão: Marcar como Contactado]
[Botão: Enviar Email Novamente]
[Botão: Ver JSON Completo]
```

---

### **FASE 4: Limpeza Para Produção** 🧹

#### 4.1. Remover Console.logs
**Arquivos a limpar:**
- `assets/js/soltour-booking.js`
- `assets/js/quote-page.js`
- `assets/js/modules/*.js`

**Estratégia:**
```javascript
// REMOVER ou comentar todos os console.log, exceto erros críticos

// ❌ REMOVER:
console.log('[SOLTOUR DEBUG] ...');
console.log('╔═══════════════════');
console.log('📦 DADOS COMPLETOS...');

// ✅ MANTER (erros importantes):
console.error('Erro ao carregar cotação:', error);
console.warn('API Soltour não respondeu');
```

**Ferramenta sugerida:**
```bash
# Buscar todos os console.log
grep -r "console.log" soltour-booking-v4-COMPLETO/assets/js/

# Remover automaticamente (cuidado!)
find soltour-booking-v4-COMPLETO/assets/js/ -type f -name "*.js" \
  -exec sed -i '/console\.log/d' {} \;
```

---

#### 4.2. Remover Comentários de Debug
**Procurar por:**
```php
// DEBUG:
// TODO:
// FIXME:
// TESTE:
// REMOVER:
error_log('[SOLTOUR DEBUG]...');
```

**Manter apenas:**
- Comentários de documentação (PHPDoc)
- Comentários explicativos importantes
- error_log para erros críticos

---

#### 4.3. Limpar Código Morto
**Verificar:**
- [ ] Funções não utilizadas
- [ ] Variáveis declaradas mas não usadas
- [ ] Imports/requires desnecessários
- [ ] CSS não aplicado
- [ ] Arquivos obsoletos

**Ferramentas:**
```bash
# PHP - encontrar funções não usadas
phpmd soltour-booking-v4-COMPLETO/ text unusedcode

# CSS - encontrar classes não usadas
uncss quote-page.css --html quote-page.html
```

---

#### 4.4. Minificar Assets (Opcional)
**Arquivos a minificar:**
- CSS: `quote-page.css` → `quote-page.min.css`
- JS: `soltour-booking.js` → `soltour-booking.min.js`
- JS: `quote-page.js` → `quote-page.min.js`

**Ferramentas:**
```bash
# Minificar CSS
cssnano assets/css/quote-page.css assets/css/quote-page.min.css

# Minificar JS
uglifyjs assets/js/soltour-booking.js -o assets/js/soltour-booking.min.js
```

**Carregar versão minificada em produção:**
```php
// Em soltour-booking.php
if (WP_DEBUG) {
    wp_enqueue_script('soltour-booking', SOLTOUR_URL . 'assets/js/soltour-booking.js');
} else {
    wp_enqueue_script('soltour-booking', SOLTOUR_URL . 'assets/js/soltour-booking.min.js');
}
```

---

#### 4.5. Validar Segurança
**Checklist:**
- [ ] Todas as chamadas AJAX têm `check_ajax_referer`
- [ ] Todos os inputs são sanitizados (`sanitize_text_field`, `intval`, etc)
- [ ] Outputs têm `esc_html`, `esc_url`, `esc_attr`
- [ ] Queries SQL usam `$wpdb->prepare`
- [ ] Nenhuma senha/API key hardcoded no código
- [ ] Configurações sensíveis armazenadas em options (não em código)

---

#### 4.6. Testes Finais
**Cenários a testar:**
- [ ] Busca com 1 quarto
- [ ] Busca com múltiplos quartos
- [ ] Busca só adultos
- [ ] Busca com crianças
- [ ] Selecionar pacote e gerar cotação
- [ ] Marcar/desmarcar transfers
- [ ] Marcar/desmarcar seguros
- [ ] Preencher formulário com erros (validação)
- [ ] Preencher formulário corretamente
- [ ] Enviar cotação (verificar emails)
- [ ] Verificar cotação salva no admin
- [ ] Testar em Chrome, Firefox, Safari
- [ ] Testar em mobile (iOS, Android)

---

## 📋 Checklist Completo de Finalização

### FASE 1: Correções e UI
- [ ] Corrigir card de gastos de cancelamento
- [ ] Melhorar UI da página de cotação
- [ ] Adicionar loading states
- [ ] Melhorar mensagens de erro
- [ ] Validar responsividade mobile

### FASE 2: Sistema de Emails
- [ ] Criar classe Soltour_Email
- [ ] Configurar SMTP no admin
- [ ] Criar template email agência
- [ ] Criar template email cliente
- [ ] Testar envio de emails
- [ ] Validar templates em diferentes clientes de email

### FASE 3: Logs e Acompanhamento
- [ ] Criar CPT soltour_quote
- [ ] Salvar cotações ao gerar
- [ ] Criar página de listagem
- [ ] Criar página de detalhes
- [ ] Adicionar filtros e busca
- [ ] Adicionar estatísticas (dashboard widget)

### FASE 4: Limpeza
- [ ] Remover console.logs
- [ ] Remover comentários de debug
- [ ] Limpar código morto
- [ ] (Opcional) Minificar assets
- [ ] Validar segurança
- [ ] Testes completos

### FASE 5: Documentação
- [ ] README atualizado
- [ ] Guia de instalação
- [ ] Guia de configuração
- [ ] FAQ para cliente
- [ ] Changelog completo

---

## 🚀 Prioridade de Execução

### Sprint 1 (Crítico - 2-3 dias)
1. ✅ Corrigir card de cancelamento
2. ✅ Melhorar UI da página de cotação
3. ✅ Sistema de emails (SMTP + templates)

### Sprint 2 (Importante - 2 dias)
4. ✅ Sistema de logs no WordPress
5. ✅ Página de acompanhamento no admin

### Sprint 3 (Limpeza - 1 dia)
6. ✅ Remover debugs
7. ✅ Limpar código
8. ✅ Testes finais

### Sprint 4 (Documentação - 1 dia)
9. ✅ Documentação completa
10. ✅ Deploy em produção

**Total estimado: 6-7 dias de trabalho**

---

## 📝 Notas Importantes

### Sobre Emails
- Usar WP Mail SMTP plugin como fallback
- Testar com diferentes provedores (Gmail, Outlook, etc)
- Garantir que emails não vão para spam
- Adicionar SPF/DKIM records no DNS

### Sobre Logs
- Não salvar dados sensíveis (cartões de crédito, etc)
- Implementar limpeza automática de logs antigos (90 dias)
- Adicionar export para Excel/CSV
- GDPR compliance (direito de apagar dados)

### Sobre Produção
- Backup antes de deploy
- Testar em staging primeiro
- Monitorar erros nas primeiras 24h
- Ter plano de rollback pronto

---

**Próxima Ação:** Começar pela FASE 1 - Correção do card de cancelamento e melhoria da UI da página de cotação.
