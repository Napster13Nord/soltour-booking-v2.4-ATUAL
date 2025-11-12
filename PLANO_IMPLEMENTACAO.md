# 🚀 PLANO DE IMPLEMENTAÇÃO - Soltour Plugin v4

## 📊 VISÃO GERAL

Este documento detalha o plano completo para implementar todas as funcionalidades críticas que o site oficial da Soltour usa e o plugin atual não possui.

---

## 🎯 FASES DE IMPLEMENTAÇÃO

### **FASE 1: Análise e Preparação - Parâmetros Críticos**
**⏱️ Estimativa: 2-3 horas**
**🔥 Prioridade: CRÍTICA**

#### Objetivos:
1. Mapear TODOS os parâmetros que o endpoint availability espera
2. Documentar estrutura completa de request/response
3. Identificar parâmetros obrigatórios vs opcionais
4. Testar endpoint com parâmetros adicionais

#### Ações:
```javascript
// 1. Criar arquivo de documentação da API
docs/
  └── API_AVAILABILITY_PARAMS.md

// 2. Mapear parâmetros completos
Request completo que o site oficial envia:
{
  // BÁSICOS (já temos)
  originCode: "LIS",
  destinationCode: "PUJ",
  startDate: "2025-11-20",
  numNights: 7,
  accomodation: {
    rooms: [
      { passengers: [{ type: "ADULT", age: 30 }] }
    ]
  },

  // CRÍTICOS (FALTAM)
  onlyHotel: "N",              // "S" para só hotel, "N" para pacote
  productType: "PACKAGE",       // "HOTEL_PRODUCT" ou "PACKAGE"
  forceAvail: false,           // true para forçar disponibilidade

  // TRACKING (FALTAM)
  catalogueHotelCodes: [],     // Códigos de hotéis do catálogo
  catalogueHotels: [],         // Hotéis do catálogo
  hotelTotalCount: 0,          // Total de hotéis
  hotelTotalCountInFilter: 0,  // Total após filtros

  // FILTROS (FALTAM)
  pageNumber: 1,               // Página atual
  orderType: "PRICE",          // Tipo de ordenação
  orderDirection: "ASC",       // Direção da ordenação
  selectedHotelsCodes: [],     // Hotéis selecionados

  // RESIDENTE (FALTA)
  residentType: undefined,     // Código de residente (se aplicável)

  // METADATA (FALTAM)
  idLanding: undefined,        // ID da landing page
  idLandingConf: undefined,    // Configuração da landing
  familyCode: undefined,       // Código da família de produtos
  productCode: undefined,      // Código do produto

  // TIMEZONE (FALTA)
  utcOffset: 0                 // Offset UTC para timestamps corretos
}
```

#### Deliverables:
- ✅ Arquivo `docs/API_AVAILABILITY_PARAMS.md` com documentação completa
- ✅ Testes com Postman/Insomnia documentados
- ✅ Lista de parâmetros obrigatórios identificados

---

### **FASE 2: Flags Críticos (onlyHotel, productType, forceAvail)**
**⏱️ Estimativa: 3-4 horas**
**🔥 Prioridade: CRÍTICA**

#### Problema Atual:
O plugin NÃO envia `onlyHotel`, `productType` e `forceAvail`, que são essenciais para o endpoint processar corretamente.

#### Solução:

##### 2.1. Adicionar flags no formulário de busca
```javascript
// Em initSearchForm()
function performSearch() {
    // ... código existente ...

    // ADICIONAR: Determinar tipo de produto
    const hasOrigin = !!SoltourApp.searchParams.originCode;
    const onlyHotel = hasOrigin ? "N" : "S";
    const productType = onlyHotel === "S" ? "HOTEL_PRODUCT" : "PACKAGE";

    SoltourApp.searchParams = {
        action: 'soltour_search_packages',
        nonce: soltourData.nonce,
        origin_code: SoltourApp.searchParams.originCode,
        destination_code: SoltourApp.searchParams.destinationCode,
        start_date: startDate,
        num_nights: nights,
        rooms: JSON.stringify([{ passengers: passengers }]),

        // NOVOS PARÂMETROS
        only_hotel: onlyHotel,
        product_type: productType,
        force_avail: false,  // Inicialmente sempre false

        first_item: 0,
        item_count: SoltourApp.itemsPerPage
    };
}
```

##### 2.2. Atualizar PHP handler
```php
// Em includes/class-soltour-booking-api.php

public function search_packages($params) {
    // ... código existente ...

    // Adicionar novos parâmetros ao request
    $request_body = [
        'originCode' => $params['origin_code'],
        'destinationCode' => $params['destination_code'],
        'startDate' => $params['start_date'],
        'numNights' => (int)$params['num_nights'],
        'accomodation' => [
            'rooms' => $rooms
        ],

        // NOVOS
        'onlyHotel' => $params['only_hotel'] ?? 'N',
        'productType' => $params['product_type'] ?? 'PACKAGE',
        'forceAvail' => filter_var($params['force_avail'] ?? false, FILTER_VALIDATE_BOOLEAN),
    ];

    // ... resto do código ...
}
```

##### 2.3. Implementar forceAvail para DelayedAvailability
```javascript
// Criar função para re-processar disponibilidade
function forceAvailability() {
    SoltourApp.searchParams.force_avail = true;

    // Mostrar loading state
    showLoadingModal(
        'Atualizando preços...',
        'Buscando melhores tarifas disponíveis'
    );

    // Re-fazer request com forceAvail=true
    searchPackagesAjax();
}
```

#### Testes:
- ✅ Busca COM origem (deve ser PACKAGE)
- ✅ Busca SEM origem (deve ser HOTEL_PRODUCT)
- ✅ forceAvail=false na primeira busca
- ✅ forceAvail=true ao re-processar

---

### **FASE 3: State Tracking e URL Management**
**⏱️ Estimativa: 2-3 horas**
**🔥 Prioridade: ALTA**

#### Problema Atual:
O plugin não gerencia o estado no URL e não atualiza o availToken corretamente.

#### Solução:

##### 3.1. Implementar State Tracking
```javascript
// Adicionar ao SoltourApp
window.SoltourApp = {
    availToken: null,
    budgetId: null,
    state: 0,  // NOVO: Contador de estado
    // ... resto ...
};

// Função para atualizar URL com state
function updateURLState(availToken) {
    SoltourApp.state++;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('availToken', availToken);
    newUrl.searchParams.set('state', SoltourApp.state);
    window.history.replaceState({}, '', newUrl);

    log(`URL atualizado: state=${SoltourApp.state}, availToken=${availToken}`);
}
```

##### 3.2. Atualizar após cada operação
```javascript
// Em searchPackagesAjax() - após receber resposta
if (response.success && response.data) {
    SoltourApp.availToken = response.data.availToken;

    // NOVO: Atualizar URL
    updateURLState(SoltourApp.availToken);

    // ... resto do código ...
}

// Em applyFilters() - após receber resposta de filtro
function applyFilters() {
    // ... aplicar filtros ...

    // NOVO: Atualizar state
    updateURLState(SoltourApp.availToken);
}
```

##### 3.3. Restaurar estado ao carregar página
```javascript
// Em initResultsPage()
function initResultsPage() {
    if ($('#soltour-results-list').length === 0) return;

    // NOVO: Verificar se há availToken no URL
    const urlParams = new URLSearchParams(window.location.search);
    const availToken = urlParams.get('availToken');
    const state = parseInt(urlParams.get('state') || '0');

    if (availToken && state > 0) {
        // Restaurar estado existente
        SoltourApp.availToken = availToken;
        SoltourApp.state = state;
        log(`Estado restaurado: state=${state}, availToken=${availToken}`);

        // Carregar resultados com availToken existente
        loadResultsFromToken(availToken);
    } else {
        // Busca nova
        const savedParams = sessionStorage.getItem('soltour_search_params');
        if (savedParams) {
            SoltourApp.searchParams = JSON.parse(savedParams);
            searchPackagesAjax();
        }
    }
}
```

#### Testes:
- ✅ URL atualiza após busca inicial
- ✅ URL atualiza após filtrar
- ✅ URL atualiza após paginar
- ✅ State incrementa corretamente
- ✅ Reload da página mantém resultados

---

### **FASE 4: DelayedAvailability - Carregamento Assíncrono**
**⏱️ Estimativa: 4-5 horas**
**🔥 Prioridade: CRÍTICA**

#### Problema Atual:
O plugin busca todos os preços de uma vez, o que é lento. O site oficial usa "delayed availability" - mostra hotéis rapidamente e busca preços em background.

#### Solução:

##### 4.1. Criar módulo DelayedAvailability
```javascript
// Novo arquivo: assets/js/modules/delayed-availability.js
(function($) {
    'use strict';

    window.SoltourApp.DelayedAvailability = {
        isActive: false,
        interval: null,

        init: function(options) {
            this.isActive = options.delayedAvailActive || false;

            if (this.isActive) {
                this.startDelayedLoad();
            }
        },

        startDelayedLoad: function() {
            log('🔄 Iniciando carregamento tardio de preços');

            // Mostrar skeleton prices
            this.showSkeletonPrices();

            // Desabilitar interações
            this.disableInteractions();

            // Mostrar blinking notification
            this.showBlinkingNotification();

            // Iniciar carregamento
            this.loadDelayedPrices();
        },

        showSkeletonPrices: function() {
            $('.package-price .price-amount').each(function() {
                $(this).addClass('skeleton-shimmer');
                $(this).html('<div class="skeleton-line" style="width: 80%; height: 32px;"></div>');
            });
        },

        disableInteractions: function() {
            // Desabilitar botões
            $('.soltour-btn').attr('disabled', true);

            // Desabilitar filtros
            $('#soltour-sort-by').attr('disabled', true);
            $('#soltour-max-price').attr('disabled', true);
            $('.soltour-star-filter input').attr('disabled', true);

            // Mudar cursor
            $('.package-price').css('cursor', 'not-allowed');

            log('⏸️ Interações desabilitadas durante carregamento');
        },

        enableInteractions: function() {
            // Re-habilitar tudo
            $('.soltour-btn').attr('disabled', false);
            $('#soltour-sort-by').attr('disabled', false);
            $('#soltour-max-price').attr('disabled', false);
            $('.soltour-star-filter input').attr('disabled', false);
            $('.package-price').css('cursor', '');

            log('▶️ Interações re-habilitadas');
        },

        showBlinkingNotification: function() {
            const notification = `
                <div id="delayed-notification" style="
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 15px 30px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 9999;
                    color: #856404;
                    font-weight: 600;
                ">
                    🔄 Atualizando preços em tempo real...
                </div>
            `;

            $('body').append(notification);

            // Blink effect
            this.interval = setInterval(function() {
                $('#delayed-notification').fadeOut(800).fadeIn(800);
            }, 1600);
        },

        hideBlinkingNotification: function() {
            clearInterval(this.interval);
            $('#delayed-notification').fadeOut(300, function() {
                $(this).remove();
            });
        },

        loadDelayedPrices: function() {
            const self = this;

            // Preparar request com forceAvail=true
            const params = $.extend({}, SoltourApp.searchParams, {
                force_avail: true,
                avail_token: SoltourApp.availToken
            });

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: params,
                success: function(response) {
                    if (response.success && response.data) {
                        log('✅ Preços atualizados com sucesso');

                        // Atualizar preços nos cards
                        self.updatePricesInCards(response.data);

                        // Limpar skeleton
                        self.clearSkeletonPrices();

                        // Re-habilitar interações
                        self.enableInteractions();

                        // Esconder notification
                        self.hideBlinkingNotification();

                        // Marcar hotéis sem preço
                        self.markUnavailableHotels();

                    } else {
                        logError('Erro ao atualizar preços', response);
                        self.showErrorModal();
                    }
                },
                error: function(xhr, status, error) {
                    logError('Erro AJAX ao atualizar preços', error);
                    self.showErrorModal();
                }
            });
        },

        updatePricesInCards: function(data) {
            // Processar budgets atualizados
            if (data.budgets && data.budgets.length > 0) {
                data.budgets.forEach(function(budget) {
                    const budgetId = budget.budgetId;
                    const price = budget.priceBreakdown?.priceBreakdownDetails?.[0]?.priceInfo?.pvp || 0;

                    if (price > 0) {
                        // Encontrar card e atualizar preço
                        const $card = $(`[data-budget-id="${budgetId}"]`);
                        if ($card.length > 0) {
                            $card.find('.price-amount').text(price.toFixed(0) + '€');
                        }
                    }
                });
            }
        },

        clearSkeletonPrices: function() {
            $('.package-price .price-amount').removeClass('skeleton-shimmer');
        },

        markUnavailableHotels: function() {
            // Marcar hotéis que não retornaram preço
            $('.soltour-package-card').each(function() {
                const $card = $(this);
                const priceText = $card.find('.price-amount').text().trim();

                if (priceText === '' || priceText === '0€') {
                    $card.addClass('unavailable-hotel');
                    $card.css('opacity', '0.6');
                    $card.find('.soltour-btn').attr('disabled', true).text('Indisponível');
                }
            });
        },

        showErrorModal: function() {
            this.hideBlinkingNotification();
            this.enableInteractions();

            alert('Erro ao atualizar preços. Por favor, tente novamente.');
        }
    };
})(jQuery);
```

##### 4.2. Integrar no fluxo principal
```javascript
// Em searchPackagesAjax() após receber primeira resposta
if (response.success && response.data) {
    SoltourApp.availToken = response.data.availToken;

    // Verificar se deve usar delayed availability
    const useDelayed = response.data.delayedAvailabilityActive || false;

    if (useDelayed) {
        // Renderizar hotéis SEM preços primeiro (rápido)
        renderHotelsWithoutPrices(response.data.budgets);

        // Iniciar delayed availability
        SoltourApp.DelayedAvailability.init({
            delayedAvailActive: true
        });
    } else {
        // Fluxo normal (atual)
        loadAllDetailsWithDeduplication(SoltourApp.allBudgets);
    }
}
```

##### 4.3. Adicionar endpoint PHP para delayed
```php
// Em includes/class-soltour-booking-ajax.php

public function delayed_availability() {
    check_ajax_referer('soltour-nonce', 'nonce');

    $params = $_POST;

    // Validar que tenha availToken
    if (empty($params['avail_token'])) {
        wp_send_json_error(['message' => 'availToken obrigatório']);
    }

    // Fazer request com forceAvail=true
    $params['force_avail'] = true;

    $api = new Soltour_Booking_API();
    $result = $api->search_packages($params);

    if ($result['success']) {
        wp_send_json_success([
            'budgets' => $result['budgets'],
            'availToken' => $result['availToken'],
            'hotels' => $result['hotels']
        ]);
    } else {
        wp_send_json_error($result);
    }
}
```

#### Testes:
- ✅ Hotéis aparecem rapidamente sem preços
- ✅ Notification pisca durante carregamento
- ✅ Preços atualizam após alguns segundos
- ✅ Interações desabilitadas durante loading
- ✅ Hotéis sem disponibilidade marcados

---

### **FASE 5: Sistema de Filtros via AJAX**
**⏱️ Estimativa: 4-5 horas**
**🔥 Prioridade: ALTA**

#### Problema Atual:
Filtros funcionam localmente. O site oficial re-processa filtros no servidor.

#### Solução:

##### 5.1. Criar endpoint de filtros
```php
// Novo endpoint: wp-admin/admin-ajax.php?action=soltour_filter_packages

public function filter_packages() {
    check_ajax_referer('soltour-nonce', 'nonce');

    $params = $_POST;

    // Parâmetros de filtro
    $filters = [
        'availToken' => $params['avail_token'],
        'pageNumber' => (int)($params['page_number'] ?? 1),
        'orderType' => $params['order_type'] ?? 'PRICE',
        'orderDirection' => $params['order_direction'] ?? 'ASC',
        'selectedHotelsCodes' => $params['selected_hotels_codes'] ?? [],
        'filters' => [
            'stars' => $params['stars'] ?? [],
            'maxPrice' => $params['max_price'] ?? 10000,
            'zones' => $params['zones'] ?? []
        ]
    ];

    $api = new Soltour_Booking_API();
    $result = $api->filter_availability($filters);

    wp_send_json_success($result);
}
```

##### 5.2. Atualizar applyFilters() para usar AJAX
```javascript
function applyFilters() {
    log('=== APLICANDO FILTROS VIA AJAX ===');

    showLoadingModal('Aplicando filtros...', 'Buscando hotéis que correspondem aos seus critérios');

    $.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        data: {
            action: 'soltour_filter_packages',
            nonce: soltourData.nonce,
            avail_token: SoltourApp.availToken,
            page_number: 1,
            order_type: getOrderType(),
            order_direction: getOrderDirection(),
            stars: SoltourApp.filters.selectedStars,
            max_price: SoltourApp.filters.maxPrice
        },
        success: function(response) {
            hideLoadingModal();

            if (response.success && response.data) {
                // Atualizar availToken
                SoltourApp.availToken = response.data.availToken;
                updateURLState(SoltourApp.availToken);

                // Re-renderizar resultados
                SoltourApp.allUniqueHotels = response.data.hotels;
                renderLocalPage(1);

                logSuccess(`${response.data.hotels.length} hotéis após filtros`);
            }
        },
        error: function(xhr, status, error) {
            hideLoadingModal();
            logError('Erro ao aplicar filtros', error);
            alert('Erro ao aplicar filtros. Tente novamente.');
        }
    });
}
```

---

### **FASE 6: CheckAllowedSelling**
**⏱️ Estimativa: 2 horas**
**🔥 Prioridade: MÉDIA**

#### Objetivo:
Verificar se a venda está permitida ANTES de permitir reserva.

```javascript
// Antes de ir para detalhes/reserva
function checkAllowedSellingBeforeQuote(budgetId, hotelCode, providerCode) {
    showLoadingModal('Verificando...', 'Validando disponibilidade');

    $.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        data: {
            action: 'soltour_check_allowed_selling',
            nonce: soltourData.nonce,
            avail_token: SoltourApp.availToken
        },
        success: function(response) {
            hideLoadingModal();

            if (response.success && response.data.allowed) {
                // Permitir continuar
                selectPackage(budgetId, hotelCode, providerCode);
            } else {
                // Mostrar erro
                alert(response.data.message || 'Venda não permitida no momento');
            }
        }
    });
}
```

---

### **FASE 7: Toast Notifications**
**⏱️ Estimativa: 3 horas**
**🔥 Prioridade: BAIXA**

#### Implementar sistema de notificações
```javascript
// Criar módulo de toasts
window.SoltourApp.Toast = {
    show: function(message, type = 'info', duration = 3000) {
        const toast = `
            <div class="soltour-toast soltour-toast-${type}">
                ${message}
            </div>
        `;

        $('body').append(toast);

        setTimeout(function() {
            $('.soltour-toast').fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
};
```

---

### **FASE 8: Melhorias de UX**
**⏱️ Estimativa: 4 horas**
**🔥 Prioridade: BAIXA**

- Tooltips em ícones
- Animações de transição
- Estados de hover melhorados
- Cursor states durante loading
- Skeleton screens aprimorados

---

## 📅 CRONOGRAMA SUGERIDO

| Fase | Duração | Prioridade | Pode começar após |
|------|---------|------------|-------------------|
| FASE 1 | 2-3h | CRÍTICA | Imediato |
| FASE 2 | 3-4h | CRÍTICA | Fase 1 |
| FASE 3 | 2-3h | ALTA | Fase 2 |
| FASE 4 | 4-5h | CRÍTICA | Fase 2 |
| FASE 5 | 4-5h | ALTA | Fase 3 |
| FASE 6 | 2h | MÉDIA | Fase 2 |
| FASE 7 | 3h | BAIXA | Qualquer momento |
| FASE 8 | 4h | BAIXA | Qualquer momento |

**Total estimado: 24-31 horas**

---

## 🎯 ENTREGAS POR SPRINT

### **SPRINT 1 (8-10h) - CRÍTICO**
- ✅ FASE 1: Documentação de parâmetros
- ✅ FASE 2: Flags críticos (onlyHotel, productType, forceAvail)
- ✅ FASE 3: State tracking

### **SPRINT 2 (6-8h) - DELAYED AVAILABILITY**
- ✅ FASE 4: DelayedAvailability completo
- ✅ FASE 6: CheckAllowedSelling

### **SPRINT 3 (4-5h) - FILTROS**
- ✅ FASE 5: Filtros via AJAX

### **SPRINT 4 (7h) - POLISH**
- ✅ FASE 7: Toasts
- ✅ FASE 8: UX melhorias

---

## ✅ CRITÉRIOS DE SUCESSO

### FASE 1-3 (Fundação):
- [ ] Request enviado com TODOS os parâmetros necessários
- [ ] URL atualiza com state tracking
- [ ] availToken persiste entre operações

### FASE 4 (Delayed):
- [ ] Hotéis aparecem em <2 segundos
- [ ] Preços atualizam em background
- [ ] Notification pisca durante loading
- [ ] Hotéis sem preço marcados corretamente

### FASE 5 (Filtros):
- [ ] Filtros aplicam sem reload
- [ ] Response rápida (<1s)
- [ ] State persiste após filtrar

### FASE 6-8 (Polish):
- [ ] Validação antes de reserva
- [ ] Toasts funcionam
- [ ] UX fluida e responsiva

---

## 🚨 RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| API não aceita parâmetros novos | ALTO | Testar cada parâmetro isoladamente (Fase 1) |
| DelayedAvailability complexo | MÉDIO | Implementar versão simplificada primeiro |
| Performance de filtros | MÉDIO | Implementar cache no PHP |
| Conflito com código existente | BAIXO | Testes extensivos após cada fase |

---

## 📝 NOTAS IMPORTANTES

1. **NÃO fazer tudo de uma vez** - implementar fase por fase
2. **Testar extensivamente** após cada fase
3. **Fazer backup** antes de mudanças grandes
4. **Documentar** cada alteração
5. **Commit** após cada fase concluída

---

## 🔄 PRÓXIMOS PASSOS

1. **Agora**: Decidir se começar implementação
2. **Primeiro**: FASE 1 - Análise de parâmetros
3. **Depois**: FASE 2 - Flags críticos
4. **Seguir**: O plano sequencialmente

---

**Criado em**: 2025-11-12
**Última atualização**: 2025-11-12
