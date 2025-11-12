# ✅ CHECKLIST DE VALIDAÇÃO - SOLTOUR PLUGIN V4

## 📋 COMO USAR ESTE CHECKLIST

Para cada fase de implementação, marque os itens conforme forem sendo completados e testados.

---

## FASE 1: Análise e Preparação

### Documentação
- [ ] Arquivo `API_PARAMS_REFERENCE.md` criado
- [ ] Todos os parâmetros documentados
- [ ] Exemplos de request/response documentados
- [ ] Regras de negócio documentadas

### Testes com API Real
- [ ] Testado endpoint com Postman/Insomnia
- [ ] Request com `onlyHotel="N"` testado
- [ ] Request com `onlyHotel="S"` testado
- [ ] Request com `forceAvail=false` testado
- [ ] Request com `forceAvail=true` testado
- [ ] Response com `availToken` validado
- [ ] Response com `hotels` array validado
- [ ] Response com `budgets` array validado

### Identificação de Parâmetros Críticos
- [ ] Parâmetros obrigatórios identificados
- [ ] Parâmetros opcionais identificados
- [ ] Parâmetros de tracking identificados
- [ ] Sequência de requests documentada

---

## FASE 2: Flags Críticos (onlyHotel, productType, forceAvail)

### JavaScript - Formulário de Busca
- [ ] Variável `onlyHotel` criada
- [ ] Variável `productType` criada
- [ ] Variável `forceAvail` criada
- [ ] Lógica de `onlyHotel` baseada em origem implementada
- [ ] Lógica de `productType` baseada em `onlyHotel` implementada
- [ ] Parâmetros adicionados ao `SoltourApp.searchParams`

### PHP - API Handler
- [ ] Parâmetro `only_hotel` aceito no backend
- [ ] Parâmetro `product_type` aceito no backend
- [ ] Parâmetro `force_avail` aceito no backend
- [ ] Conversão de snake_case para camelCase implementada
- [ ] Parâmetros enviados corretamente para API Soltour

### Testes Funcionais
- [ ] **Teste 1**: Busca COM origem
  - [ ] `onlyHotel` = "N"
  - [ ] `productType` = "PACKAGE"
  - [ ] Response contém voos
- [ ] **Teste 2**: Busca SEM origem
  - [ ] `onlyHotel` = "S"
  - [ ] `productType` = "HOTEL_PRODUCT"
  - [ ] Response contém apenas hotéis
- [ ] **Teste 3**: `forceAvail=false`
  - [ ] Request é rápido (< 3s)
  - [ ] Pode não retornar preços
- [ ] **Teste 4**: `forceAvail=true`
  - [ ] Request é mais lento (5-10s)
  - [ ] Retorna preços reais

### Logs e Debug
- [ ] Console.log mostra `onlyHotel` correto
- [ ] Console.log mostra `productType` correto
- [ ] Console.log mostra `forceAvail` correto
- [ ] Network tab mostra parâmetros corretos no payload

---

## FASE 3: State Tracking e URL Management

### JavaScript - State Management
- [ ] Variável `SoltourApp.state` criada
- [ ] Função `updateURLState()` criada
- [ ] `updateURLState()` atualiza URL com `replaceState`
- [ ] `updateURLState()` incrementa `state` counter
- [ ] `updateURLState()` adiciona `availToken` na URL

### JavaScript - Restauração de Estado
- [ ] Função `loadResultsFromToken()` criada
- [ ] URL params lidos ao carregar página
- [ ] `availToken` da URL usado se existir
- [ ] `state` da URL usado se existir
- [ ] Resultados restaurados corretamente

### Integração com Operações
- [ ] URL atualiza após busca inicial
- [ ] URL atualiza após aplicar filtros
- [ ] URL atualiza após paginação
- [ ] URL atualiza após delayed availability

### Testes Funcionais
- [ ] **Teste 1**: Busca inicial
  - [ ] URL = `/resultados?availToken=XXX&state=1`
- [ ] **Teste 2**: Aplicar filtro
  - [ ] URL = `/resultados?availToken=YYY&state=2`
- [ ] **Teste 3**: Mudar página
  - [ ] URL = `/resultados?availToken=YYY&state=3`
- [ ] **Teste 4**: Reload da página
  - [ ] Resultados mantidos
  - [ ] Filtros mantidos
  - [ ] Página mantida

### Logs e Debug
- [ ] Console mostra state incrementando
- [ ] Console mostra availToken sendo atualizado
- [ ] URL na barra do navegador atualiza visualmente

---

## FASE 4: DelayedAvailability

### Módulo DelayedAvailability
- [ ] Arquivo `delayed-availability.js` criado
- [ ] Namespace `SoltourApp.DelayedAvailability` criado
- [ ] Função `init()` implementada
- [ ] Função `startDelayedLoad()` implementada
- [ ] Função `showSkeletonPrices()` implementada
- [ ] Função `disableInteractions()` implementada
- [ ] Função `enableInteractions()` implementada
- [ ] Função `showBlinkingNotification()` implementada
- [ ] Função `hideBlinkingNotification()` implementada
- [ ] Função `loadDelayedPrices()` implementada
- [ ] Função `updatePricesInCards()` implementada
- [ ] Função `markUnavailableHotels()` implementada

### Integração com Fluxo Principal
- [ ] Check de `delayedAvailabilityActive` na response
- [ ] Renderização de hotéis sem preços primeiro
- [ ] Trigger de delayed load após renderização
- [ ] Data attribute `data-budget-id` nos cards

### PHP - Endpoint Delayed
- [ ] Action `soltour_delayed_availability` criado
- [ ] Nonce validation implementado
- [ ] Validação de `avail_token` obrigatório
- [ ] Request com `forceAvail=true` enviado
- [ ] Response processado corretamente

### UI/UX
- [ ] Skeleton shimmer nos preços
- [ ] Notification pisca durante loading
- [ ] Botões desabilitados durante loading
- [ ] Filtros desabilitados durante loading
- [ ] Cursor `not-allowed` nos elementos
- [ ] Opacity nos hotéis sem preço

### Testes Funcionais
- [ ] **Teste 1**: Primeira busca
  - [ ] Hotéis aparecem em < 2s
  - [ ] Preços mostram skeleton
  - [ ] Notification aparece
- [ ] **Teste 2**: Delayed load
  - [ ] Request com `forceAvail=true` enviado
  - [ ] Preços atualizam nos cards
  - [ ] Skeleton removido
  - [ ] Notification desaparece
- [ ] **Teste 3**: Hotéis sem disponibilidade
  - [ ] Cards marcados com opacity
  - [ ] Botão "Indisponível"
  - [ ] Botão desabilitado
- [ ] **Teste 4**: Erro no delayed load
  - [ ] Modal de erro exibido
  - [ ] Interações re-habilitadas
  - [ ] Notification escondida

### Performance
- [ ] Primeira renderização < 2s
- [ ] Delayed load completo < 10s
- [ ] Sem memory leaks (interval cleared)
- [ ] Sem múltiplas notifications

---

## FASE 5: Sistema de Filtros via AJAX

### PHP - Endpoint de Filtros
- [ ] Action `soltour_filter_packages` criado
- [ ] Parâmetros de filtro aceitos
- [ ] `availToken` validado
- [ ] `catalogueHotelCodes` re-enviado
- [ ] `hotelTotalCount` re-enviado
- [ ] Filtros processados no backend
- [ ] Response com hotéis filtrados

### JavaScript - Função applyFilters()
- [ ] Função modificada para usar AJAX
- [ ] Modal de loading exibido
- [ ] Request enviado com filtros
- [ ] Response processada
- [ ] `availToken` atualizado
- [ ] URL atualizada com state
- [ ] Resultados re-renderizados

### Filtros Implementados
- [ ] Filtro de estrelas via AJAX
- [ ] Filtro de preço via AJAX
- [ ] Filtro de ordenação via AJAX
- [ ] Filtro de zonas (se aplicável)
- [ ] Filtro de regimes (se aplicável)

### Testes Funcionais
- [ ] **Teste 1**: Filtrar por estrelas
  - [ ] Request enviado sem reload
  - [ ] Response < 2s
  - [ ] Apenas hotéis com estrelas selecionadas
- [ ] **Teste 2**: Filtrar por preço
  - [ ] Apenas hotéis abaixo do preço
- [ ] **Teste 3**: Mudar ordenação
  - [ ] Hotéis re-ordenados
  - [ ] Sem duplicatas
- [ ] **Teste 4**: Múltiplos filtros
  - [ ] Todos os filtros aplicados
  - [ ] Results corretos
- [ ] **Teste 5**: Remover filtros
  - [ ] Resultados restaurados
  - [ ] Todos os hotéis retornam

### State Management
- [ ] `availToken` atualizado após filtro
- [ ] State incrementado após filtro
- [ ] URL atualizada após filtro
- [ ] Filtros persistem após reload

---

## FASE 6: CheckAllowedSelling

### PHP - Endpoint
- [ ] Action `soltour_check_allowed_selling` criado
- [ ] Request para API Soltour implementado
- [ ] Response processado
- [ ] Error handling implementado

### JavaScript - Integração
- [ ] Função `checkAllowedSellingBeforeQuote()` criada
- [ ] Chamada ANTES de ir para detalhes
- [ ] Chamada ANTES de ir para reserva
- [ ] Modal de loading durante check
- [ ] Modal de erro se não permitido

### Testes Funcionais
- [ ] **Teste 1**: Selling permitido
  - [ ] Check passa
  - [ ] Continua para próximo passo
- [ ] **Teste 2**: Selling não permitido
  - [ ] Check falha
  - [ ] Modal de erro exibido
  - [ ] Não continua
- [ ] **Teste 3**: Erro de rede
  - [ ] Error handling correto
  - [ ] Mensagem amigável

---

## FASE 7: Toast Notifications

### Módulo Toast
- [ ] Namespace `SoltourApp.Toast` criado
- [ ] Função `show()` implementada
- [ ] Tipos: `info`, `success`, `error`, `warning`
- [ ] Auto-dismiss após duração
- [ ] CSS para toasts criado

### Integração
- [ ] Toasts em erros de rede
- [ ] Toasts em sucessos
- [ ] Toasts em avisos
- [ ] Toasts em informações

### Testes
- [ ] Toast aparece
- [ ] Toast desaparece após duração
- [ ] Múltiplos toasts não se sobrepõem
- [ ] Toast pode ser fechado manualmente

---

## FASE 8: Melhorias de UX

### Tooltips
- [ ] Tooltips em ícones de informação
- [ ] Tooltips em badges
- [ ] Tooltips responsivos

### Loading States
- [ ] Skeleton screens aprimorados
- [ ] Loading spinners em botões
- [ ] Disabled states visuais

### Animações
- [ ] Fade in/out suaves
- [ ] Transitions em hover
- [ ] Scroll suave para topo

### Hover States
- [ ] Cards com hover effect
- [ ] Botões com hover effect
- [ ] Links com hover effect

---

## 🎯 CHECKLIST FINAL - ANTES DO DEPLOY

### Code Quality
- [ ] Código comentado adequadamente
- [ ] Console.logs de debug removidos (ou com flag)
- [ ] Sem código comentado desnecessário
- [ ] Variáveis com nomes descritivos
- [ ] Funções pequenas e focadas

### Performance
- [ ] Sem requests duplicados
- [ ] Sem memory leaks
- [ ] Debounce em inputs de filtro
- [ ] Lazy loading de imagens
- [ ] Minificação de JS/CSS

### Testes Cross-browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Testes Responsivos
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

### Testes de Cenários
- [ ] Busca com resultados
- [ ] Busca sem resultados
- [ ] Erro de rede
- [ ] Timeout
- [ ] Parâmetros inválidos
- [ ] Sessão expirada

### Documentação
- [ ] README atualizado
- [ ] CHANGELOG atualizado
- [ ] API docs atualizadas
- [ ] Comentários inline

### Backup e Versionamento
- [ ] Backup do código anterior
- [ ] Git commit com mensagem descritiva
- [ ] Git tag com versão
- [ ] Branch de desenvolvimento separado

---

## 📊 MÉTRICAS DE SUCESSO

### Performance
- [ ] Primeira busca < 3s
- [ ] Delayed load completo < 10s
- [ ] Filtros aplicam < 1s
- [ ] Paginação < 1s

### UX
- [ ] Sem flickering
- [ ] Sem jumps de layout
- [ ] Feedback visual em todas as ações
- [ ] Mensagens de erro claras

### Funcionalidade
- [ ] 100% dos parâmetros críticos enviados
- [ ] availToken sempre atualizado
- [ ] State tracking funcional
- [ ] Filtros funcionam corretamente
- [ ] DelayedAvailability funciona

---

**Última atualização**: 2025-11-12
