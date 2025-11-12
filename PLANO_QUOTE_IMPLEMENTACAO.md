# 🚀 PLANO DE IMPLEMENTAÇÃO - QUOTE/BOOKING

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fases de Implementação](#fases-de-implementação)
4. [Código de Exemplo](#código-de-exemplo)
5. [Testes](#testes)
6. [Cronograma](#cronograma)

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar 14 funcionalidades críticas de Quote/Booking identificadas no `quote.min.js` do site oficial da Soltour.

### Escopo
- **Arquivo analisado**: quote.min.js (1.369 linhas)
- **Funcionalidades**: 14 gaps identificados
- **Tempo estimado**: 40-50 horas
- **Sprints**: 4 sprints de 1 semana cada

### Priorização

| Prioridade | Funcionalidades | Tempo | Status |
|------------|----------------|-------|--------|
| 🔥 CRÍTICO | 4 | 12-16h | ⏳ |
| 🔶 ALTA | 4 | 10-12h | ⏳ |
| 🔷 MÉDIA | 5 | 10-12h | ⏳ |
| ⚪ BAIXA | 1 | 8-10h | ⏳ |

---

## 🏗️ ARQUITETURA

### Estrutura de Arquivos

```
soltour-booking-v4-COMPLETO/
├── assets/
│   └── js/
│       ├── soltour-booking.js          # Main file
│       └── modules/
│           ├── delayed-availability.js  # ✅ Implementado
│           ├── toast-notifications.js   # ✅ Implementado
│           ├── delayed-quote.js         # NOVO
│           ├── optional-services.js     # NOVO
│           ├── quote-validations.js     # NOVO
│           ├── breakdown.js             # NOVO
│           └── quote-form.js            # NOVO
│
├── includes/
│   ├── class-soltour-api.php            # Adicionar métodos
│   ├── class-soltour-quote.php          # NOVO
│   ├── class-soltour-validations.php    # NOVO
│   └── class-soltour-payments.php       # NOVO
│
└── templates/
    ├── quote-form.php                   # NOVO
    ├── booking-form.php                 # NOVO
    └── email/
        └── quote-email.php              # NOVO
```

### Fluxo de Dados

```
┌─────────────────┐
│   User clicks   │
│  "Select Hotel" │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│ CheckAllowedSelling API │ ◄── NOVO
└────────┬────────────────┘
         │ OK
         v
┌─────────────────┐
│  Quote Screen   │
│  (Fast Load)    │
└────────┬────────┘
         │
         v
┌──────────────────────┐
│  DelayedQuote API    │ ◄── NOVO  (Background)
│  (Get final prices)  │
└────────┬─────────────┘
         │
         v
┌─────────────────────────────┐
│  Update prices in real-time │
│  Enable interactions        │
└─────────────────────────────┘
         │
         v
┌──────────────────────────────┐
│  User adds optional services │ ◄── NOVO
│  (Insurance, Transfer, etc)  │
└────────┬─────────────────────┘
         │
         v
┌───────────────────────────┐
│  UpdateOptionalService API│ ◄── NOVO
│  (Update prices)          │
└────────┬──────────────────┘
         │
         v
┌─────────────────────┐
│  Fill passenger data│
└────────┬────────────┘
         │
         v
┌──────────────────────────┐
│  Real-time validations   │ ◄── NOVO
│  - Age vs BirthDate      │
│  - Email confirmation    │
│  - Duplicate names       │
│  - Expedient code        │
└────────┬─────────────────┘
         │ All valid
         v
┌─────────────────────────┐
│  CheckAllowedSelling    │ ◄── Validar novamente
│  before submit          │
└────────┬────────────────┘
         │ OK
         v
┌──────────────────┐
│  Generate        │
│  Expedient       │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Book Package    │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  Confirmation    │
└──────────────────┘
```

---

## 📝 FASES DE IMPLEMENTAÇÃO

---

## 🔥 FASE 1: FUNCIONALIDADES CRÍTICAS (Sprint 1 - 12-16h)

### 1.1 DelayedQuote (4-5h)

**Objetivo**: Carregar página de quote rapidamente e buscar preços finais em background.

**Arquivos a criar**:
- `assets/js/modules/delayed-quote.js`

**Arquivos a modificar**:
- `includes/class-soltour-api.php`
- `soltour-booking.php`

**Implementação**:

#### JavaScript Module (`delayed-quote.js`):

```javascript
/**
 * Módulo DelayedQuote
 * Carrega preços finais de forma assíncrona
 */
(function($) {
    'use strict';

    window.SoltourApp.DelayedQuote = {
        isActive: false,
        priceInterval: null,

        /**
         * Inicializa o delayed quote
         */
        init: function(options) {
            options = options || {};
            this.isActive = options.delayedQuoteActive || false;

            if (this.isActive) {
                console.log('🔄 DelayedQuote ATIVADO');
                this.startDelayedLoad();
            }
        },

        /**
         * Inicia processo de carregamento assíncrono
         */
        startDelayedLoad: function() {
            this.disableInteractions();
            this.showBlinkingNotification();
            this.startPriceBlinking();
            this.loadDelayedQuote();
        },

        /**
         * Desabilita interações durante loading
         */
        disableInteractions: function() {
            // Desabilitar botão de reservar
            $('.js-submit-form').prop('disabled', true);

            // Desabilitar checkboxes de serviços opcionais
            if ($("#insurancesQuoteData").length) {
                $("#insurancesQuoteData").find('.c-checkbox__element')
                    .prop('disabled', true);
            }
            if ($("#transferQuoteData").length) {
                $("#transferQuoteData").find('.c-checkbox__element')
                    .prop('disabled', true);
            }

            // Desabilitar botões de ação
            $('.js-print-quote').prop('disabled', true);
            $('.js-send-mail').prop('disabled', true);
            $('#breakdownToggle').prop('disabled', true);

            // Desabilitar campos de breakdown
            $('#quoteBreakdownBox :input').prop('disabled', true);

            // Ocultar seção MyBP
            $('.myBpContainer').addClass('u-display-none');
        },

        /**
         * Re-habilita interações após loading
         */
        enableInteractions: function() {
            $('.js-submit-form').prop('disabled', false);

            if ($("#insurancesQuoteData").length) {
                $("#insurancesQuoteData").find('.c-checkbox__element')
                    .prop('disabled', false);
            }
            if ($("#transferQuoteData").length) {
                $("#transferQuoteData").find('.c-checkbox__element')
                    .prop('disabled', false);
            }

            $('.js-print-quote').prop('disabled', false);
            $('.js-send-mail').prop('disabled', false);
            $('#breakdownToggle').prop('disabled', false);
            $('#quoteBreakdownBox :input').prop('disabled', false);
            $('.myBpContainer').removeClass('u-display-none');
        },

        /**
         * Mostra notificação piscando
         */
        showBlinkingNotification: function() {
            const notification = `
                <div id="delayedQuoteWarning" style="
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 15px;
                    font-weight: 500;
                ">
                    <span style="font-size: 20px;">⏳</span>
                    <span>Calculando preços finais...</span>
                </div>
            `;
            $('body').append(notification);
        },

        /**
         * Remove notificação
         */
        hideBlinkingNotification: function() {
            $('#delayedQuoteWarning').fadeOut(300, function() {
                $(this).remove();
            });
        },

        /**
         * Inicia animação de blinking no preço
         */
        startPriceBlinking: function() {
            const self = this;
            function blinkPrice() {
                $('#titlePrice').fadeOut(500);
                $('#titlePrice').fadeIn(500);
                $('#summaryPrice').fadeOut(500);
                $('#summaryPrice').fadeIn(500);
            }
            this.priceInterval = setInterval(blinkPrice, 1000);
        },

        /**
         * Para animação de blinking
         */
        stopPriceBlinking: function() {
            if (this.priceInterval) {
                clearInterval(this.priceInterval);
                this.priceInterval = null;
            }
        },

        /**
         * Carrega quote com preços finais
         */
        loadDelayedQuote: function() {
            const self = this;

            const params = {
                action: 'soltour_delayed_quote',
                nonce: soltourData.nonce,
                budget_id: window.SoltourApp.budgetId,
                avail_token: window.SoltourApp.availToken,
                force_quote: true
            };

            console.log('🔄 Carregando preços finais...', params);

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: params,
                timeout: 30000,
                success: function(response) {
                    console.log('✅ DelayedQuote response:', response);

                    if (response.success && response.data) {
                        self.updateQuoteContent(response.data);
                        self.stopPriceBlinking();
                        self.enableInteractions();
                        self.hideBlinkingNotification();
                        self.isActive = false;

                        // Mostrar toast de sucesso
                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.success(
                                'Preços atualizados com sucesso!',
                                3000
                            );
                        }
                    } else {
                        self.handleDelayedQuoteError(response);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('❌ Erro no DelayedQuote:', error);
                    self.handleDelayedQuoteError({
                        success: false,
                        data: {
                            message: 'Erro ao carregar preços. Tente novamente.'
                        }
                    });
                }
            });
        },

        /**
         * Atualiza conteúdo da página com novos preços
         */
        updateQuoteContent: function(data) {
            // Atualizar título com preço
            if (data.titleHtml) {
                $('#titleContent').html(data.titleHtml);
            }

            // Atualizar breakdown
            if (data.breakdownHtml) {
                $('#breakdownContent').html(data.breakdownHtml);
            }

            // Atualizar formulário
            if (data.formHtml) {
                $('#formContent').html(data.formHtml);
            }

            // Atualizar resumo
            if (data.summaryHtml) {
                $('#summaryContent').html(data.summaryHtml);
            }

            // Atualizar mensagens de warning
            if (data.warningMessagesHtml) {
                $('#quoteWarningMessages').html(data.warningMessagesHtml);
            }

            // Atualizar total
            if (data.totalAmount) {
                window.SoltourApp.totalAmount = data.totalAmount;
                $('[data-js-total-amount]').each(function() {
                    $(this).data('jsTotalAmount', data.totalAmount);
                    $(this).html(data.totalAmount.toFixed(2) + ' &euro;');
                });
            }

            // Re-inicializar componentes se necessário
            if (typeof window.SoltourApp.Quote !== 'undefined' &&
                typeof window.SoltourApp.Quote.initAfterDelayed === 'function') {
                window.SoltourApp.Quote.initAfterDelayed();
            }
        },

        /**
         * Trata erros do delayed quote
         */
        handleDelayedQuoteError: function(response) {
            this.stopPriceBlinking();
            this.enableInteractions();
            this.hideBlinkingNotification();
            this.isActive = false;

            let message = 'Não foi possível calcular os preços finais.';
            if (response.data && response.data.message) {
                message = response.data.message;
            }

            if (window.SoltourApp.Toast) {
                window.SoltourApp.Toast.error(message, 6000);
            } else {
                alert(message);
            }

            // Opcional: voltar para availability
            // window.location.href = '...';
        }
    };

})(jQuery);
```

#### PHP API (`class-soltour-api.php`):

```php
/**
 * POST /booking/quote/delayedQuote
 * Busca preços finais em background
 */
public function delayed_quote($params) {
    $data = array(
        'budgetId' => $params['budgetId'],
        'availToken' => $params['availToken'],
        'productType' => isset($params['productType']) ? $params['productType'] : 'PACKAGE',
        'fromPage' => isset($params['fromPage']) ? $params['fromPage'] : 'SEARCHER',
        'forceQuote' => true
    );

    $this->log('=== DELAYED QUOTE ===');
    $this->log('Request: ' . json_encode($data));

    $response = $this->make_request('booking/quote/delayedQuote', $data);

    $this->log('Response: ' . json_encode($response));

    return $response;
}

/**
 * AJAX Handler para delayed quote
 */
public function ajax_delayed_quote() {
    check_ajax_referer('soltour_booking_nonce', 'nonce');

    $this->log('=== AJAX DELAYED QUOTE ===');

    $params = array(
        'budgetId' => sanitize_text_field($_POST['budget_id']),
        'availToken' => sanitize_text_field($_POST['avail_token']),
        'productType' => isset($_POST['product_type']) ? sanitize_text_field($_POST['product_type']) : 'PACKAGE',
        'fromPage' => isset($_POST['from_page']) ? sanitize_text_field($_POST['from_page']) : 'SEARCHER',
        'forceQuote' => filter_var($_POST['force_quote'], FILTER_VALIDATE_BOOLEAN)
    );

    $response = $this->delayed_quote($params);

    if ($response && !isset($response['error'])) {
        wp_send_json_success($response);
    } else {
        $error_msg = isset($response['error']) ? $response['error'] : 'Erro ao buscar preços finais';
        wp_send_json_error(array('message' => $error_msg));
    }
}
```

#### Registro AJAX (`soltour-booking.php`):

```php
$ajax_actions = array(
    // ... existing actions
    'soltour_delayed_quote', // NOVO
);
```

#### Enqueue Script:

```php
wp_enqueue_script(
    'soltour-delayed-quote',
    SOLTOUR_PLUGIN_URL . 'assets/js/modules/delayed-quote.js',
    array('jquery', 'soltour-booking-script'),
    SOLTOUR_VERSION,
    true
);
```

**Testes**:
- [ ] Página de quote carrega rapidamente
- [ ] Notificação aparece durante loading
- [ ] Preço pisca durante loading
- [ ] Botões ficam desabilitados
- [ ] Preços atualizam após resposta
- [ ] Toast de sucesso aparece
- [ ] Botões são re-habilitados

---

### 1.2 CheckAllowedSelling antes Submit (2h)

**Objetivo**: Validar com API antes de permitir submit do formulário de reserva.

**Arquivos a modificar**:
- `assets/js/soltour-booking.js`

**Implementação**:

```javascript
/**
 * Valida com CheckAllowedSelling antes de permitir submit
 */
function initQuoteSubmit() {
    $('.js-submit-form').on('click', function(e) {
        e.preventDefault();

        const $form = $('form#bookForm');

        // Desabilitar botão para evitar duplo clique
        $('.js-submit-form').prop('disabled', true);

        // Mostrar loading
        showLoadingModal('Validando...', 'Verificando disponibilidade');

        // Validar com CheckAllowedSelling
        $.post(soltourData.ajaxurl, {
            action: 'soltour_check_allowed_selling',
            nonce: soltourData.nonce
        })
        .done(function(response) {
            hideLoadingModal();

            if (response.success && response.data && response.data.allowed) {
                // Permitido - triggerar submit real do formulário
                log('✅ CheckAllowedSelling: Permitido');
                $form.find('input[type=submit]').trigger('click');
            } else {
                // Não permitido - mostrar erro
                log('❌ CheckAllowedSelling: Bloqueado');

                const message = response.data && response.data.message
                    ? response.data.message
                    : 'Desculpe, não é possível realizar a reserva no momento.';

                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error(message, 6000);
                } else {
                    alert(message);
                }

                $('.js-submit-form').prop('disabled', false);
            }
        })
        .fail(function(xhr, status, error) {
            hideLoadingModal();
            logError('Erro ao validar venda:', error);

            // Fail-safe: permitir continuar
            log('⚠️ Erro na validação, permitindo continuar (fail-safe)');
            $form.find('input[type=submit]').trigger('click');
        });
    });

    // Submit real do formulário
    $('form#bookForm').on('submit', function(e) {
        e.preventDefault();
        submitBookingForm(this);
    });
}

/**
 * Submit do formulário de reserva
 */
function submitBookingForm(form) {
    const rq = serializeBookingForm(form);

    log('=== SUBMIT BOOKING FORM ===');
    log('Data:', rq);

    // Validações adicionais aqui...

    showLoadingModal('Processando reserva...', 'Aguarde um momento');

    $.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        data: {
            action: 'soltour_book_package',
            nonce: soltourData.nonce,
            booking_data: JSON.stringify(rq)
        },
        success: function(response) {
            hideLoadingModal();

            if (response.success) {
                log('✅ Reserva criada com sucesso');
                window.location.href = response.data.redirect_url;
            } else {
                logError('Erro ao criar reserva:', response.data);

                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error(
                        response.data.message || 'Erro ao criar reserva',
                        6000
                    );
                } else {
                    alert(response.data.message || 'Erro ao criar reserva');
                }

                $('.js-submit-form').prop('disabled', false);
            }
        },
        error: function(xhr, status, error) {
            hideLoadingModal();
            logError('Erro AJAX:', error);

            if (window.SoltourApp.Toast) {
                window.SoltourApp.Toast.error(
                    'Erro de conexão. Tente novamente.',
                    6000
                );
            } else {
                alert('Erro de conexão. Tente novamente.');
            }

            $('.js-submit-form').prop('disabled', false);
        }
    });
}
```

**Testes**:
- [ ] Botão desabilita ao clicar
- [ ] Loading aparece
- [ ] CheckAllowedSelling é chamado
- [ ] Se permitido, form é submetido
- [ ] Se bloqueado, erro é mostrado
- [ ] Botão é re-habilitado em erro

---

### 1.3 UpdateOptionalService (3-4h)

**Objetivo**: Adicionar/remover serviços opcionais dinamicamente com atualização de preço.

**Arquivos a criar**:
- `assets/js/modules/optional-services.js`

**Implementação**:

```javascript
/**
 * Módulo Optional Services
 * Gerencia serviços opcionais (seguros, transfers, golf, etc)
 */
(function($) {
    'use strict';

    window.SoltourApp.OptionalServices = {
        /**
         * Inicializa eventos
         */
        init: function() {
            this.bindEvents();
        },

        /**
         * Bind eventos
         */
        bindEvents: function() {
            const self = this;

            // Checkboxes de serviços opcionais
            $(document.body).on('change', '.js-toggle-from-quote-summary', function() {
                const $this = $(this);
                self.toggleOptionalService($this);

                if ($this.data('isDynamic') == true) {
                    self.updateOptionalService($this);
                }
            });
        },

        /**
         * Alterna serviço opcional no resumo
         */
        toggleOptionalService: function($element) {
            const checked = $element.is(':checked');
            const code = $element.data('code');
            const summaryType = $element.data('summaryType');
            const price = parseFloat($element.data('price')).toFixed(2);

            // Atualizar total
            this.updateTotalAmount();

            // Encontrar row do serviço
            const $row = $('.js-optional-service[data-summary-type=' + summaryType + ']' +
                          '[data-code="' + code + '"]');

            // Tratamento especial para transfers
            if (summaryType == 'transfer') {
                this.handleTransferToggle($element, checked);
            }

            // Tratamento especial para golf
            if (summaryType == 'golf') {
                $row.find('.js-breakdown-column').data('value', price);
                $row.find('.js-breakdown-column').html(price + '&nbsp;&euro;');
            }

            // Mostrar/ocultar row
            $row.toggleClass('u-display-none', !checked);

            // Atualizar containers
            this.toggleSummaryContainers();

            // Recalcular totais do breakdown
            this.calculateBreakdownTotals();
        },

        /**
         * Tratamento especial para transfers
         */
        handleTransferToggle: function($element, checked) {
            const code = $element.data('code');
            const toHotel = !!$('.js-toggle-from-quote-summary[data-summary-type="transfer"]' +
                               '[data-code^="AH"]:checked').length;
            const toAirport = !!$('.js-toggle-from-quote-summary[data-summary-type="transfer"]' +
                                 '[data-code^="HA"]:checked').length;
            const description = $element.data('description');

            $('.js-summary-hotel-transfer').find('.js-summary-collective-transfer')
                .toggleClass('u-display-none', toHotel);
            $('.js-summary-hotel-transfer').find('.js-summary-private-transfer')
                .toggleClass('u-display-none', !toHotel);
            $('.js-summary-airport-transfer').find('.js-summary-collective-transfer')
                .toggleClass('u-display-none', toAirport);
            $('.js-summary-airport-transfer').find('.js-summary-private-transfer')
                .toggleClass('u-display-none', !toAirport);

            const popoverContainer = code.indexOf('AH') == 0
                ? '.js-summary-hotel-transfer'
                : '.js-summary-airport-transfer';

            $(popoverContainer).find('.js-summary-transfer-popover').html(description);

            if ($element.data('isDynamic') == 'true') {
                this.updateTransferCancelTotals(checked, $element.data('price'));
            }
        },

        /**
         * Atualiza totais de cancelamento de transfer
         */
        updateTransferCancelTotals: function(checked, addPrice) {
            $('.js-cancellationCharges-transfer').each(function() {
                let newPrice;
                let price = this.innerHTML.match(/<strong>\d+\,?\d*<\/strong>/g)[0];
                price = parseFloat(price.substring(8, price.length - 9).replace(',', '.'));

                if (checked) {
                    newPrice = '<strong>' + (price + parseFloat(addPrice))
                        .toString().replace('.', ',') + '</strong>';
                } else {
                    newPrice = '<strong>' + (price - parseFloat(addPrice))
                        .toString().replace('.', ',') + '</strong>';
                }

                this.innerHTML = this.innerHTML.replace(/<strong>\d+\,?\d*<\/strong>/g, newPrice);
            });
        },

        /**
         * Atualiza serviço opcional via API
         */
        updateOptionalService: function($element, updateRq, callback) {
            const self = this;

            let rq;
            if (updateRq) {
                rq = {
                    availToken: window.SoltourApp.availToken,
                    serviceId: updateRq.id,
                    addService: updateRq.addService,
                    passengers: updateRq.passengers,
                    destinationCode: window.SoltourApp.searchParams.destinationCode
                };
            } else {
                rq = {
                    availToken: window.SoltourApp.availToken,
                    serviceId: $element.data('code'),
                    addService: $element.is(':checked'),
                    destinationCode: window.SoltourApp.searchParams.destinationCode
                };
            }

            showLoadingModal('Atualizando...', 'Recalculando preço');

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_update_optional_service',
                    nonce: soltourData.nonce,
                    service_data: JSON.stringify(rq)
                },
                success: function(response) {
                    hideLoadingModal();

                    if (response.success && response.data && response.data.ok) {
                        log('✅ Serviço opcional atualizado');

                        // Atualizar availToken se mudou
                        if (response.data.availToken) {
                            window.SoltourApp.availToken = response.data.availToken;
                        }

                        // Chamar callback se fornecido
                        if (callback) {
                            callback($element);
                        }

                        // Toast de sucesso
                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.success(
                                'Serviço atualizado com sucesso!',
                                2000
                            );
                        }
                    } else {
                        // Erro - reverter checkbox
                        logError('Erro ao atualizar serviço:', response);
                        $element.prop('checked', '');

                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Erro ao atualizar serviço';

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.error(message, 4000);
                        } else {
                            alert(message);
                        }
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    logError('Erro AJAX:', error);

                    // Reverter checkbox
                    $element.prop('checked', '');

                    if (window.SoltourApp.Toast) {
                        window.SoltourApp.Toast.error(
                            'Erro de conexão. Tente novamente.',
                            4000
                        );
                    } else {
                        alert('Erro de conexão');
                    }
                }
            });
        },

        /**
         * Atualiza total da cotação
         */
        updateTotalAmount: function() {
            let result = window.SoltourApp.baseAmount || 0;

            // Somar serviços opcionais selecionados
            $('.js-toggle-from-quote-summary:checked').each(function() {
                result += parseFloat($(this).data('price')) || 0;
            });

            // Somar equipagem
            $('.js-change-summary-baggage').each(function() {
                const code = $(this).val();
                result += window.SoltourApp.baggagePrices[code] || 0;
            });

            // Somar golf
            $('.js-golf-toggle-from-quote-summary:checked').each(function() {
                result += parseFloat($(this).data('price')) || 0;
            });

            // Atualizar no DOM
            $('[data-js-total-amount]').each(function() {
                $(this).data('jsTotalAmount', result);
                $(this).html(result.toFixed(2) + ' &euro;');
            });

            // Atualizar na tabela de penalidades
            $('#penaltiesTable tr:last-child td:last-child').text(result.toFixed(2) + ' €');
        },

        /**
         * Alterna containers do resumo
         */
        toggleSummaryContainers: function() {
            // Container de seguros
            const $insuranceContainer = $('.js-optional-services-container')
                .filter(function() {
                    return $(this).find('.js-optional-service[data-summary-type="insurance"]').length > 0;
                });

            if ($insuranceContainer.length &&
                $insuranceContainer.find('.js-optional-service:not(.u-display-none)').length) {
                $insuranceContainer.removeClass('u-display-none');
            }

            // Outros containers
            $('.js-optional-services-container:not(.js-dont-hide)')
                .not($insuranceContainer)
                .each(function() {
                    if ($(this).find('.js-optional-service:not(.u-display-none)').length) {
                        $(this).removeClass('u-display-none');
                    } else {
                        $(this).addClass('u-display-none');
                    }
                });
        },

        /**
         * Calcula totais do breakdown
         */
        calculateBreakdownTotals: function() {
            $('.js-breakdown-total').each(function() {
                const column = $(this).data('column');
                if (column) {
                    let total = 0;

                    $('.js-breakdown-row:not(.u-display-none) ' +
                      '.js-breakdown-column[data-column="' + column + '"]')
                        .each(function() {
                            total += parseFloat($(this).data('value')) || 0;
                            total += parseFloat($(this).find('[data-luggage-total]')
                                .data('luggageTotal') || 0);
                        });

                    $(this).html(total.toFixed(2) + ' &euro;');
                }
            });
        }
    };

})(jQuery);
```

#### PHP API:

```php
/**
 * POST /booking/quote/updateOptionalService
 * Adiciona/remove serviço opcional
 */
public function update_optional_service($params) {
    $data = array(
        'availToken' => $params['availToken'],
        'serviceId' => $params['serviceId'],
        'addService' => $params['addService'],
        'destinationCode' => $params['destinationCode']
    );

    if (isset($params['passengers'])) {
        $data['passengers'] = $params['passengers'];
    }

    $this->log('=== UPDATE OPTIONAL SERVICE ===');
    $this->log('Request: ' . json_encode($data));

    $response = $this->make_request('booking/quote/updateOptionalService', $data);

    $this->log('Response: ' . json_encode($response));

    return $response;
}

/**
 * AJAX Handler
 */
public function ajax_update_optional_service() {
    check_ajax_referer('soltour_booking_nonce', 'nonce');

    $service_data = json_decode(stripslashes($_POST['service_data']), true);

    $params = array(
        'availToken' => sanitize_text_field($service_data['availToken']),
        'serviceId' => sanitize_text_field($service_data['serviceId']),
        'addService' => filter_var($service_data['addService'], FILTER_VALIDATE_BOOLEAN),
        'destinationCode' => sanitize_text_field($service_data['destinationCode'])
    );

    if (isset($service_data['passengers'])) {
        $params['passengers'] = $service_data['passengers'];
    }

    $response = $this->update_optional_service($params);

    if ($response && !isset($response['error'])) {
        wp_send_json_success($response);
    } else {
        wp_send_json_error(array(
            'message' => isset($response['error']) ? $response['error'] : 'Erro ao atualizar serviço'
        ));
    }
}
```

**Testes**:
- [ ] Checkbox alterna serviço
- [ ] Preço atualiza dinamicamente
- [ ] API é chamada
- [ ] availToken é atualizado
- [ ] Erro reverte checkbox
- [ ] Toast mostra feedback

---

### 1.4 Validação Idade vs Data Nascimento (3-4h)

**Objetivo**: Validar se data de nascimento corresponde à idade informada.

**Arquivos a criar**:
- `assets/js/modules/quote-validations.js`

**Implementação**:

```javascript
/**
 * Módulo Quote Validations
 * Validações do formulário de quote/booking
 */
(function($) {
    'use strict';

    window.SoltourApp.QuoteValidations = {
        DISPLAY_DATE_FORMAT: "DD/MM/YYYY",

        /**
         * Inicializa validações
         */
        init: function() {
            this.initAgeValidation();
            this.initEmailValidation();
            this.initExpedientValidation();
        },

        /**
         * Validação de idade vs data de nascimento
         */
        initAgeValidation: function() {
            const self = this;

            // Validar ao mudar data de nascimento
            $(document.body).on('change', 'input[name*="[birthDay]"]', function() {
                self.validateAge($(this));
            });

            // Validar ao submit
            $('form#bookForm').on('submit', function(e) {
                if (!self.validateAllAges()) {
                    e.preventDefault();
                    return false;
                }
            });
        },

        /**
         * Valida idade de um passageiro
         */
        validateAge: function($input) {
            const birthDay = $input.val();
            if (!birthDay) return true;

            // Encontrar campo de idade correspondente
            const fieldName = $input.attr('name');
            const ageFieldName = fieldName.replace('[birthDay]', '[age]');
            const $ageInput = $('input[name="' + ageFieldName + '"]');

            if ($ageInput.length === 0) return true;

            const declaredAge = parseInt($ageInput.val());
            if (isNaN(declaredAge)) return true;

            // Calcular idade baseado na data de início da viagem
            const startDate = window.SoltourApp.searchParams.startDate ||
                             new Date().toISOString().split('T')[0];
            const calculatedAge = this.calculateAge(birthDay, startDate);

            // Validar
            if (calculatedAge !== declaredAge) {
                $input[0].setCustomValidity(
                    'A data de nascimento não corresponde à idade informada (' +
                    declaredAge + ' anos). ' +
                    'Idade calculada: ' + calculatedAge + ' anos.'
                );
                $input.addClass('invalid');
                return false;
            } else {
                $input[0].setCustomValidity('');
                $input.removeClass('invalid');
                return true;
            }
        },

        /**
         * Valida todas as idades
         */
        validateAllAges: function() {
            const self = this;
            let allValid = true;

            $('input[name*="[birthDay]"]').each(function() {
                if (!self.validateAge($(this))) {
                    allValid = false;
                }
            });

            if (!allValid) {
                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error(
                        'As datas de nascimento devem corresponder às idades informadas.',
                        5000
                    );
                } else {
                    alert('As datas de nascimento devem corresponder às idades informadas.');
                }

                $('.js-submit-form').prop('disabled', false);
            }

            return allValid;
        },

        /**
         * Calcula idade baseado em data de nascimento e data de referência
         */
        calculateAge: function(birthDayStr, startDateStr) {
            // Parse birthDay (DD/MM/YYYY)
            const parts = birthDayStr.split('/');
            const birthDay = new Date(parts[2], parts[1] - 1, parts[0]);

            // Parse startDate (YYYY-MM-DD)
            const startParts = startDateStr.split('-');
            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

            let age = startDate.getFullYear() - birthDay.getFullYear();
            const monthDiff = startDate.getMonth() - birthDay.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && startDate.getDate() < birthDay.getDate())) {
                age--;
            }

            return age;
        },

        /**
         * Validação de email duplo
         */
        initEmailValidation: function() {
            const self = this;
            const $email = $('#holderMail');
            const $repeatEmail = $('#holderRepeatMail');

            if ($repeatEmail.length > 0) {
                $email.on('keyup keypress blur change', function() {
                    self.validateEmail();
                });
                $repeatEmail.on('keyup keypress blur change', function() {
                    self.validateEmail();
                });
            }
        },

        /**
         * Valida emails
         */
        validateEmail: function() {
            const $email = $('#holderMail');
            const $repeatEmail = $('#holderRepeatMail');

            if ($email.val() !== '' && $repeatEmail.val() !== '' &&
                $email.val() !== $repeatEmail.val()) {
                $repeatEmail[0].setCustomValidity('Os emails não coincidem');
                return false;
            } else {
                $repeatEmail[0].setCustomValidity('');
                return true;
            }
        },

        /**
         * Validação de expediente em tempo real
         */
        initExpedientValidation: function() {
            const self = this;
            let validationTimeout = null;
            let currentRequest = null;
            const DEBOUNCE_TIME = 500;

            $(document.body).on('input', '.js-validate-expedient', function() {
                const $input = $(this);

                // Limpar timeout anterior
                if (validationTimeout) {
                    clearTimeout(validationTimeout);
                }

                // Abortar request anterior
                if (currentRequest && currentRequest.readyState !== 4) {
                    currentRequest.abort();
                }

                // Debounce
                validationTimeout = setTimeout(function() {
                    self.validateExpedient($input);
                }, DEBOUNCE_TIME);
            });
        },

        /**
         * Valida expediente
         */
        validateExpedient: function($input) {
            const expedient = $input.val();
            if (!expedient) return;

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_validate_expedient',
                    nonce: soltourData.nonce,
                    expedient: expedient,
                    client_code: $('input[name="clientCode"]').val(),
                    branch_office_code: $('input[name="branchOfficeCode"]').val()
                },
                success: function(response) {
                    if (response.success && response.data && response.data.valid) {
                        $input[0].setCustomValidity('');
                        $input.removeClass('invalid').addClass('valid');
                    } else {
                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Expediente inválido';
                        $input[0].setCustomValidity(message);
                        $input.removeClass('valid').addClass('invalid');
                    }
                    $input[0].checkValidity();
                }
            });
        }
    };

})(jQuery);
```

**Testes**:
- [ ] Idade é calculada corretamente
- [ ] Validação ocorre ao mudar data
- [ ] Erro é mostrado se não corresponder
- [ ] Submit é bloqueado se inválido
- [ ] Email duplo é validado
- [ ] Expediente valida em tempo real

---

## 📊 CRONOGRAMA ESTIMADO

### Sprint 1 (Semana 1) - CRÍTICO
**Tempo**: 12-16 horas
**Entregas**:
- ✅ DelayedQuote funcional
- ✅ CheckAllowedSelling no submit
- ✅ UpdateOptionalService básico
- ✅ Validação de idade

### Sprint 2 (Semana 2) - ALTA PRIORIDADE
**Tempo**: 10-12 horas
**Entregas**:
- ✅ Validação nomes duplicados
- ✅ Validação expediente RT
- ✅ Breakdown dinâmico
- ✅ Validação email

### Sprint 3 (Semana 3) - MÉDIA PRIORIDADE
**Tempo**: 10-12 horas
**Entregas**:
- ✅ Baggage handling
- ✅ Golf extras
- ✅ Print/Send email
- ✅ Copy holder
- ✅ Go back com cache

### Sprint 4 (Semana 4) - BAIXA PRIORIDADE + Testes
**Tempo**: 10-12 horas
**Entregas**:
- ✅ Immediate payment (se necessário)
- ✅ Testes completos
- ✅ Documentação
- ✅ Deploy

---

## ✅ CHECKLIST FINAL

### Funcionalidades
- [ ] DelayedQuote
- [ ] CheckAllowedSelling submit
- [ ] UpdateOptionalService
- [ ] Validação idade
- [ ] Validação nomes duplicados
- [ ] Validação expediente RT
- [ ] Breakdown dinâmico
- [ ] Validação email
- [ ] Baggage handling
- [ ] Golf extras
- [ ] Print/Send email
- [ ] Copy holder
- [ ] Go back cache
- [ ] Immediate payment

### Qualidade
- [ ] Todos os testes passam
- [ ] Código documentado
- [ ] Sem console.errors
- [ ] Performance OK
- [ ] UX fluida

### Deploy
- [ ] Testado em staging
- [ ] Aprovação do cliente
- [ ] Deploy em produção
- [ ] Monitoramento ativo

---

**LET'S BUILD!** 🚀
