# 🔍 ANÁLISE COMPLETA - GAPS DO QUOTE/BOOKING

## 📊 RESUMO EXECUTIVO

Análise comparativa entre `quote.min.js` do site oficial Soltour.com e a implementação atual do plugin WordPress.

**Arquivo analisado**: `quote.min.js` (1.369 linhas)
**Plugin atual**: Implementação básica de quote/booking
**Gaps identificados**: **14 funcionalidades críticas**

---

## ✅ O QUE O PLUGIN JÁ TEM

### Funcionalidades Básicas Implementadas:

1. ✅ **quote_package()** - Cotação básica
   - Endpoint: `/booking/quote`
   - Envia: availToken, budgetIds, productType

2. ✅ **generate_expedient()** - Geração de expediente
   - Endpoint: `/booking/generateExpedient`
   - Dados do titular

3. ✅ **book_package()** - Confirmação de reserva
   - Endpoint: `/booking/book`
   - Dados completos de reserva

4. ✅ **get_booking_details()** - Detalhes da reserva
   - Endpoint: `/booking/read`

5. ✅ **cancel_booking()** - Cancelamento
   - Endpoint: `/booking/cancel`

---

## ❌ O QUE FALTA NO PLUGIN

### 🔥 CRÍTICO (Impacta funcionalidade core)

#### 1. **DelayedQuote** - Carregamento Assíncrono de Preços
**Localização**: linhas 1151-1340
**Impacto**: ALTO - Performance e UX

**O que faz**:
- Carrega página de quote rapidamente com preços "calculando..."
- Busca preços finais em background (forceQuote=true)
- Mostra animação de blinking no preço enquanto carrega
- Desabilita botões e checkboxes durante carregamento
- Re-habilita tudo quando preços chegam

**Endpoints**:
```javascript
POST /package/process/quote/DelayedQuote
{
    budgetId: "...",
    myBpAccount: "...",
    availToken: "...",
    productType: "PACKAGE",
    fromPage: "SEARCHER",
    forceQuote: true
}
```

**Código relevante**:
```javascript
function initSearchingQuote() {
    $('.js-submit-form').prop("disabled", true);

    function blink_text() {
        $('#titlePrice').fadeOut(500);
        $('#titlePrice').fadeIn(500);
        $('#summaryPrice').fadeOut(500);
        $('#summaryPrice').fadeIn(500);
    }
    priceInterval = setInterval(blink_text, 1000);
}

function updateQuote() {
    let rq = {
        budgetId: api.options.quoteRq.budgetId,
        availToken: api.options.quoteRq.availToken,
        forceQuote: true
    };

    $.ajax({
        url: routes().quote.delayedQuote,
        data: {rq: JSON.stringify(rq)},
        success: function(response) {
            $('#titleContent').replaceWith(response.titleHtml);
            $('#breakdownContent').replaceWith(response.breakdownHtml);
            $('#formContent').replaceWith(response.formHtml);
            $('#summaryContent').replaceWith(response.summaryHtml);
            clearSearchingQuote();
        }
    });
}
```

---

#### 2. **CheckAllowedSelling ANTES do Submit**
**Localização**: linhas 531-559
**Impacto**: CRÍTICO - Validação obrigatória

**O que faz**:
- Valida com API ANTES de permitir submit do formulário
- Bloqueia submit se not allowed
- Mostra modal de erro explicativo

**Código relevante**:
```javascript
$('.js-submit-form').click(function() {
    $('.js-submit-form').prop('disabled', true);
    $.post(routes().availability.checkAllowedSelling)
    .then(function(response) {
        if (response && response.result && response.result.ok) {
            $form.find('input[type=submit]').trigger('click');
        } else {
            __showNotAllowedSellingDialog(response.result.errorMessage);
        }
    });
});
```

**Plugin atual**: ❌ Não faz essa validação antes do submit

---

#### 3. **UpdateOptionalService** - Serviços Opcionais Dinâmicos
**Localização**: linhas 425-478
**Impacto**: ALTO - Funcionalidade comercial

**O que faz**:
- Adiciona/remove serviços opcionais (seguros, transfers, golf, etc)
- Atualiza preços em tempo real
- Persiste no availToken

**Endpoint**:
```javascript
POST /package/process/quote/UpdateOptionalService
{
    availToken: "...",
    serviceId: "...",
    addService: true/false,
    passengers: [...],
    destinationCode: "..."
}
```

**Código relevante**:
```javascript
function __updateOptionalService($element, updateRq, callback) {
    let rq = {
        availToken: api.options.availToken,
        serviceId: $element.data('code'),
        addService: $element.is(':checked'),
        destinationCode: api.options.availRq.destinationCode
    };

    $.ajax({
        url: routes().quote.updateOptionalService,
        data: {rq: JSON.stringify(rq)},
        success: function(response) {
            if (response.result.ok) {
                if (callback) callback($element);
            } else {
                $element.prop('checked', '');
                notifications.toast(response.result.errorMessage);
            }
        }
    });
}
```

**Plugin atual**: ❌ Não suporta serviços opcionais dinâmicos

---

#### 4. **Validação de Idade vs Data de Nascimento**
**Localização**: linhas 577-625
**Impacto**: ALTO - Dados obrigatórios

**O que faz**:
- Valida se data de nascimento corresponde à idade informada
- Calcula idade baseado na data de início da viagem
- Bloqueia submit se houver incompatibilidade

**Código relevante**:
```javascript
function __submitForm(form) {
    let rq = __serializeForm(form);
    let localDate = new Date().toISOString().split('T')[0];
    let correctAge = true;

    if (rq.rooms && Array.isArray(rq.rooms)) {
        rq.rooms.forEach(room => {
            if (room.passengers && Array.isArray(room.passengers)) {
                room.passengers.forEach(passenger => {
                    if (passenger.birthDay) {
                        let age = __ageCalculate(
                            moment(passenger.birthDay, "DD/MM/YYYY"),
                            localDate
                        );
                        if (passenger.age != age) {
                            correctAge = false;
                        }
                    }
                });
            }
        });
    }

    if (!correctAge) {
        notifications.toast(
            'La fecha de nacimiento debe coincidir con la edad del pasajero.',
            'error'
        );
        return;
    }

    __submitBookForm(rq);
}

function __ageCalculate(date, startDate) {
    let today = buildDate(startDate);
    let birthday = new Date(date);
    let age = today.getFullYear() - birthday.getFullYear();
    let m = today.getMonth() - birthday.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }

    return age;
}
```

**Plugin atual**: ❌ Não valida idade vs data de nascimento

---

### 🔶 ALTA PRIORIDADE (Melhora experiência)

#### 5. **Validação de Nomes Duplicados**
**Localização**: linhas 704-762
**Impacto**: MÉDIO - UX

**O que faz**:
- Verifica se há passageiros com nomes duplicados
- Mostra modal perguntando se deseja continuar
- Permite prosseguir ou corrigir

**Endpoint**:
```javascript
POST /package/process/book/Book
{
    ...data,
    validationType: 'namesAndResidentDocuments'
}
```

**Código relevante**:
```javascript
function __checkDuplicatedNames(rq, callback) {
    rq.validationType = 'namesAndResidentDocuments';

    forms.validateRequest(rq, url, form, function(response) {
        if (response && response.result && !response.result.ok) {
            spinner.hide();
            __passengerDuplicatedNameModal(response.data);
        } else {
            callback(true);
        }
    });
}

function __passengerDuplicatedNameModal(response) {
    let dialog = {
        image: '/sltwww/st4/desktop/images/common/sorry3.png',
        text: response.info,
        buttons: [
            {
                label: literals['COMMON.GO_BACK'],
                events: {
                    click: function() {
                        response.input.focus();
                    }
                },
                dismiss: true
            },
            {
                label: literals['COMMON.CONTINUE'],
                events: {
                    click: function() {
                        __private.checkedPassengersName = true;
                    }
                },
                dismiss: true
            }
        ]
    };
    modals.dialog(dialog);
}
```

**Plugin atual**: ❌ Não valida nomes duplicados

---

#### 6. **Validação de Expediente em Tempo Real**
**Localização**: linhas 178-210
**Impacto**: MÉDIO - UX

**O que faz**:
- Valida código de expediente enquanto usuário digita
- Usa debouncing de 500ms
- Aborta requisições anteriores se pendentes
- Mostra feedback visual instantâneo

**Endpoint**:
```javascript
POST /package/process/book/Book
{
    ...data,
    clientCode: "...",
    branchOfficeCode: "...",
    validationType: 'expedient'
}
```

**Código relevante**:
```javascript
let currentExpedientRequest = {
    xhr: undefined,
    timeout: undefined,
    expired: true
};
const EXPEDIENT_VALIDATION_EXPIRATION_TIME = 500;

$(document.body).on('input', '.js-validate-expedient', function() {
    let rq = __serializeForm($form);
    rq.clientCode = $('input[name="clientCode"]').val();
    rq.branchOfficeCode = $('input[name="branchOfficeCode"]').val();
    rq.validationType = 'expedient';

    if (currentExpedientRequest.expired) {
        currentExpedientRequest.expired = false;

        // Aborta requisição anterior
        if (currentExpedientRequest.xhr &&
            currentExpedientRequest.xhr.readystate != 4) {
            currentExpedientRequest.xhr.abort();
        }

        // Timeout para permitir nova requisição
        currentExpedientRequest.timeout = setTimeout(function() {
            currentExpedientRequest.expired = true;
        }, EXPEDIENT_VALIDATION_EXPIRATION_TIME);

        currentExpedientRequest.xhr = forms.validateRequest(
            rq, url, $form, __onGetExpedientValueCallback, 'validity'
        );
    }
});

function __onGetExpedientValueCallback(response) {
    if (response && response.result && response.result.ok) {
        let dom = $form.find('.js-validate-expedient').get(0);
        dom.setCustomValidity('');
        dom.checkValidity();
    }
}
```

**Plugin atual**: ❌ Não valida expediente em tempo real

---

#### 7. **Breakdown Dinâmico (Desglose)**
**Localização**: linhas 215-300
**Impacto**: MÉDIO - Transparência de preços

**O que faz**:
- Alterna entre visão bruta (gross) e líquida (net)
- Calcula totais dinamicamente
- Suporta múltiplas moedas (EUR, USD, etc)
- Mostra/oculta colunas conforme seleção

**Código relevante**:
```javascript
function __setBreakdownView(value) {
    let $netColumns = $('.js-net-column');
    api.options.breakdown = value;

    if (value == 'gross') {
        $netColumns.hide();
    } else if (value == 'net') {
        $netColumns.show();
    }

    __calculateBreakdownTotals();
}

function __calculateBreakdownTotals() {
    $('.js-breakdown-total').each(function() {
        let column = $(this).data('column');
        if (column) {
            let total = 0;
            $('.js-breakdown-row:not(.u-display-none) .js-breakdown-column[data-column="'+column+'"]')
                .each(function() {
                    total += parseFloat($(this).data('value')) || 0;
                    total += parseFloat($(this).find('[data-luggage-total]')
                        .data('luggageTotal') || 0);
                });
            $(this).html(total).formatCurrency({
                region: __getLocale($(this).data().currency)
            });
        }
    });
}

function __getLocale(currency) {
    switch (currency) {
        case 'USD': return 'en-US';
        case 'EUR':
        default: return 'es-ES';
    }
}
```

**Plugin atual**: ❌ Não tem breakdown dinâmico

---

#### 8. **Validação de Email Duplo**
**Localização**: linhas 1124-1149
**Impacto**: MÉDIO - Evita erros de digitação

**O que faz**:
- Campo de confirmação de email
- Validação em tempo real
- Bloqueia submit se não coincidir

**Código relevante**:
```javascript
function __initCustomValidations() {
    let $email = $('#holderMail');
    let $repeatEmail = $('#holderRepeatMail');

    if ($repeatEmail.length > 0) {
        $email.on('keyup keypress blur change', __validateEmail);
        $repeatEmail.on('keyup keypress blur change', __validateEmail);
    }

    function __validateEmail() {
        let $email = $('#holderMail');
        let $repeatEmail = $('#holderRepeatMail');

        if ($email.val() != '' && $repeatEmail.val() != '' &&
            $email.val() != $repeatEmail.val()) {
            $repeatEmail[0].setCustomValidity(
                literals['QUOTE.FORM.VALIDATION.EMAILS_DONT_MATCH']
            );
        } else {
            $repeatEmail[0].setCustomValidity('');
        }
    }
}
```

**Plugin atual**: ❌ Não valida email duplo

---

### 🔷 MÉDIA PRIORIDADE (Funcionalidades adicionais)

#### 9. **Baggage Handling - Equipagem Adicional**
**Localização**: linhas 781-797
**Impacto**: MÉDIO - Receita adicional

**O que faz**:
- Seleção de equipagem adicional por passageiro
- Atualiza preço total dinamicamente
- Persiste seleção

**Código relevante**:
```javascript
function __initBaggage() {
    $('.js-change-summary-baggage').on('change', function() {
        let luggage = $(this).data("luggage");
        let luggageItem = $(this).data("luggage-item");
        let luggageItemCode = $('[data-luggage="' + luggage + '"]
            [data-luggage-item="' + luggageItem + '"]
            [data-luggage-item-code]').val();
        let providerCode = $('[data-luggage-code="' + luggageItemCode + '"]
            [data-luggage-option="' + luggageItem + '"]
            [data-luggage="' + luggage + '"]').data("luggage-provider-code");
        $('[data-luggage="' + luggage + '"]
          [data-luggage-item="' + luggageItem + '"]
          [data-luggage-item-provider-code]').val(providerCode);
        __updateTotalAmount();
    });

    $('.js-breakdown-baggage [data-luggage-total]').on('change', function() {
        let currentTotal = parseFloat($(this).data('luggageTotal')) || 0;
        $(this).closest('.js-breakdown-baggage')
            .toggleClass('u-display-none', !currentTotal);
        __calculateBreakdownTotals();
    });
}
```

**Plugin atual**: ❌ Não suporta equipagem adicional

---

#### 10. **Golf Extras**
**Localização**: linhas 803-850
**Impacto**: BAIXO - Nicho específico

**O que faz**:
- Serviços extras de golf
- Validação de número de jogadores
- Atualização dinâmica de preço

**Código relevante**:
```javascript
function __initGolf() {
    $('input[name="optionalGolf[]"]').on('change', function(e) {
        let $this = $(this);
        let $container = $this.parents('.js-extra-golf-container');
        let $data = $container.find('.js-extra-golf-total').data();

        if (parseInt($data.luggageQuantity, 10) == 0) {
            alert(literals['QUOTE.FORM.GOLF.SELECT_PLAYERS']);
            $this.prop('checked', '');
        } else {
            let totalPrice = parseFloat($data.luggageTotal);
            $this.data('price', totalPrice);

            let selectedGolf = {
                id: $(this).data('serviceId'),
                addService: $this.is(':checked'),
                passengers: []
            };

            if ($this.is(':checked')) {
                $selected.each(function() {
                    let numPaxes = $(this).data('luggageQuantity');
                    let type = $(this).data('type') == 'child' ? 'CHILD' : 'ADULT';
                    let age = type == 'CHILD' ? 10 : 30;

                    for (let i = 1; i <= numPaxes; i++) {
                        selectedGolf.passengers.push({
                            type: type,
                            age: age
                        });
                    }
                });
            }

            __updateOptionalService($this, selectedGolf, __toggleFromQuoteSummary);
        }
    });
}
```

**Plugin atual**: ❌ Não suporta golf extras

---

#### 11. **Print Quote / Send Email**
**Localização**: linhas 890-699
**Impacto**: MÉDIO - Funcionalidade útil

**O que faz**:
- Imprime cotação em PDF
- Envia cotação por email
- Mantém configurações de breakdown (bruto/líquido)

**Endpoints**:
```javascript
POST /package/process/quote/Print
POST /package/process/quote/Send
```

**Código relevante**:
```javascript
function __printQuote() {
    let rq = __serializeForm($form);
    rq.breakdownView = api.options.breakdown;
    forms.submitRequestForm(rq, routes().quote.print, true);
}

function __submitEmailForm(form) {
    let emailRq = __serializeForm(form);
    let rq = __serializeForm($form);
    rq = $.extend(true, rq, emailRq);
    rq.breakdownView = api.options.breakdown;

    spinner.show();

    $.post(routes().quote.send,
        {rq: JSON.stringify(rq)},
        function(response) {
            spinner.hide();
            let message, style;

            if (response && response.result && response.result.ok) {
                message = 'Correo enviado con éxito';
                style = 'success';
            } else {
                message = response && response.result && response.result.errorMessage
                    ? response.result.errorMessage
                    : 'Ocurrió un error inesperado';
            }

            notifications.toast(message, style);
        },
        'json'
    );
}
```

**Plugin atual**: ❌ Não tem print/email

---

#### 12. **Copy Holder to First Passenger**
**Localização**: linhas 504-525
**Impacto**: BAIXO - Conveniência

**O que faz**:
- Checkbox para copiar dados do titular para primeiro passageiro
- Sincroniza campos em tempo real

**Código relevante**:
```javascript
function __initPassengers() {
    $('.js-toggle-copy-holder').on('change', function() {
        __toggleCopyHolder(this);
    });
}

function __toggleCopyHolder(element) {
    let $toggleElements = $('.js-copy-to-first-passenger');

    if ($(element).is(':checked')) {
        $toggleElements.on('input', function() {
            let name = $(this).data('name');
            $('.js-copy-holder[data-name='+ name +']').val($(this).val());
        });
        $toggleElements.trigger('input');
    } else {
        $toggleElements.off('input');
    }
}
```

**Plugin atual**: ❌ Não tem essa funcionalidade

---

#### 13. **Go Back com Cache**
**Localização**: linhas 313-358
**Impacto**: MÉDIO - Navegação

**O que faz**:
- Volta para availability mantendo estado
- Usa `fromCache=true` e `availToken`
- Preserva filtros aplicados

**Código relevante**:
```javascript
$(document.body).on('click', '.js-go-back', function() {
    let rq_data = $(this).data();
    let rq = api.options.availRq;

    rq.fromPage = rq_data.fromPage;
    rq.fromCache = true;
    rq.availToken = rq_data.availToken;

    spinner.show();
    forms.submitRequestForm(rq, routes().availability.availability);
});
```

**Plugin atual**: ❌ Botão voltar não preserva estado

---

### ⚪ BAIXA PRIORIDADE (Casos específicos)

#### 14. **Immediate Payment Flow**
**Localização**: linhas 986-1114
**Impacto**: BAIXO - Apenas para agências prepago

**O que faz**:
- Fluxo de pagamento imediato para agências prepago
- Cria expediente antes do pagamento
- Abre modal de pagamento HPP (Hosted Payment Page)
- Callback para processar resultado

**Endpoints**:
```javascript
POST /package/process/quote/CreateExpedient
POST /b2b/slt/pagos/PagoReservaAddonHpp
```

**Código relevante**:
```javascript
function __startImmediatePayment(rq, params) {
    __private.immediatePaymentSubmitRq = rq;

    if (params) {
        $.post(routes().quote.createExpedient, {rq: JSON.stringify(rq)})
        .then(function(response) {
            if (response && response.result && response.result.ok) {
                // Atribui email de reserva
                if (rq.agency && rq.agency.email) {
                    params.emailPagando = rq.agency.email;
                }

                params.locataPagando = response.data;
                rq.expedient = response.data;

                // Abre modal de pagamento
                $("#payModal").addClass("is-active");

                let rqInside = {
                    importePagando: params.importePagando,
                    locataPagando: params.locataPagando,
                    emailPagando: params.emailPagando,
                    esPrepago: 'S',
                    rescod: params.rescod
                };

                let urlPayment = routes().quote.immediatePaymentSlt;
                if (api.options.isComing2) {
                    urlPayment = routes().quote.immediatePaymentCo2;
                    rqInside.locataPagando = rqInside.locataPagando
                        .substring(3, rqInside.locataPagando.length);
                }

                $.ajax({
                    url: urlPayment,
                    type: "POST",
                    async: false,
                    data: {rq: JSON.stringify(rqInside)},
                    dataType: 'json',
                    success: function(dataEnvio) {
                        spinner.hide();
                        let inputForm = "";
                        let datosRespuesta = dataEnvio.data;

                        $.each(datosRespuesta.formElements, function(key, value) {
                            inputForm += "<input type='hidden' name='" + key +
                                       "' value='" + value + "'>";
                        });

                        inputForm += "<input type='hidden' name='HPP_POST_DIMENSIONS' " +
                                   "value='" + datosRespuesta.formIframeUrl + "'>";
                        inputForm += "<input type='hidden' name='HPP_LANG' " +
                                   "value='" + datosRespuesta.formLang + "'>";

                        $("#addonForm").append(inputForm);
                        $("#addonForm").attr("action", datosRespuesta.formUrl);
                        $("#addonForm").submit();
                    }
                });
            }
        });
    }
}

function __immediatePaymentCallback(importe, authCode, currencyCode, orderId,
                                   timestamp, pasRef, reasonCode, resource,
                                   brand, market, result) {
    let rq = __private.immediatePaymentSubmitRq;
    let url = routes().book.book;

    if (result == "OK" && rq && url) {
        if (__private.immediatePaymentWindow &&
            !__private.immediatePaymentWindow.closed) {
            __private.immediatePaymentWindow.close();
        }

        rq.paymentData = {
            importe, authCode, currencyCode, orderId,
            timestamp, pasRef, reasonCode, resource, brand, market
        };

        forms.submitRequestForm(rq, url);
    } else {
        spinner.hide();
        modals.alert("Ocurrió un error al procesar el pago");
    }
}
```

**Plugin atual**: ❌ Não suporta pagamento imediato

---

## 📋 MODALS DE VALIDAÇÃO

O site oficial usa vários modals para validações:

### 1. **Flight Not Available**
```javascript
function __checkFlightPrebooking() {
    if (api.options.flightNoAvailable) {
        let dialog = {
            image: '/sltwww/st4/desktop/images/common/sorry3.png',
            text: literals[api.options.dialogLiteralKey],
            buttons: [{
                label: literals['COMMON.GO_BACK'],
                events: {
                    click: function() {
                        let rq = api.options.availRq;
                        spinner.show();
                        forms.submitRequestForm(rq, routes().availability.availability);
                    }
                }
            }]
        };
        modals.dialog(dialog);
    }
}
```

### 2. **Flight Price Changed**
```javascript
function __checkFlightPriceChanged() {
    if (api.options.flightPriceChanged) {
        let dialog = {
            image: '/sltwww/st4/desktop/images/common/sorry3.png',
            text: literals['QUOTE.WARNING.FLIGHT_PRICE_CHANGED'],
            buttons: [
                {
                    label: literals['COMMON.GO_BACK'],
                    events: {
                        click: function() {
                            let rq = api.options.availRq;
                            spinner.show();
                            forms.submitRequestForm(rq, routes().availability.availability);
                        }
                    }
                },
                {
                    label: literals['COMMON.CONTINUE'],
                    dismiss: true
                }
            ]
        };
        modals.dialog(dialog);
    }
}
```

### 3. **Hotel RQ with Immediate Issue**
```javascript
function __checkHotelRqWithInmediateIssue() {
    if (api.options.hotelRqWithInmediateIssue) {
        let dialog = {
            image: '/sltwww/st4/desktop/images/common/sorry3.png',
            text: literals['QUOTE.WARNING.HOTEL_RQ_WITH_INMEDIATE_ISSUE'],
            buttons: [
                {
                    label: literals['COMMON.GO_BACK'],
                    events: {
                        click: function() {
                            let rq = api.options.availRq;
                            spinner.show();
                            forms.submitRequestForm(rq, routes().availability.availability);
                        }
                    }
                },
                {
                    label: literals['COMMON.CONTINUE'],
                    dismiss: true
                }
            ]
        };
        modals.dialog(dialog);
    }
}
```

### 4. **Session Timeout**
```javascript
function __showSessionTimeoutModalError() {
    let dialog = {
        image: '/sltwwww/st4/desktop/images/common/sorry3.png',
        text: literals['QUOTE.WARNING.SESSION_TIMEOUT'],
        buttons: [{
            label: literals['COMMON.GO_BACK'],
            events: {
                click: function() {
                    let rq = api.options.availRq;
                    spinner.show();
                    forms.submitRequestForm(rq, routes().availability.availability);
                }
            }
        }]
    };
    modals.dialog(dialog);
}
```

**Plugin atual**: ❌ Não tem esses modals

---

## 🎯 RESUMO DE GAPS POR PRIORIDADE

### 🔥 CRÍTICO (4)
1. DelayedQuote
2. CheckAllowedSelling antes submit
3. UpdateOptionalService
4. Validação Idade vs Data Nascimento

### 🔶 ALTA (4)
5. Validação Nomes Duplicados
6. Validação Expediente Tempo Real
7. Breakdown Dinâmico
8. Validação Email Duplo

### 🔷 MÉDIA (5)
9. Baggage Handling
10. Golf Extras
11. Print/Send Email
12. Copy Holder to First Passenger
13. Go Back com Cache

### ⚪ BAIXA (1)
14. Immediate Payment Flow

---

## 📊 MÉTRICAS E IMPACTO

### Funcionalidades por Categoria:

| Categoria | Count | % |
|-----------|-------|---|
| Validações | 5 | 36% |
| Serviços Opcionais | 3 | 21% |
| UX/Navegação | 3 | 21% |
| Performance | 1 | 7% |
| Pagamento | 1 | 7% |
| Relatórios | 1 | 7% |

### Endpoints Novos Necessários:

1. `/booking/quote/DelayedQuote` - POST
2. `/booking/quote/UpdateOptionalService` - POST
3. `/booking/quote/Print` - POST
4. `/booking/quote/Send` - POST
5. `/booking/quote/CreateExpedient` - POST (já existe: generateExpedient)
6. `/booking/book` - Validações adicionais (expedient, namesAndResidentDocuments)

---

## 🚀 RECOMENDAÇÕES DE IMPLEMENTAÇÃO

### Fase 1 - CRÍTICO (Sprint 1 - 12-16h)
1. ✅ DelayedQuote (4-5h)
2. ✅ CheckAllowedSelling no submit (2h)
3. ✅ UpdateOptionalService (3-4h)
4. ✅ Validação Idade (3-4h)

### Fase 2 - ALTA (Sprint 2 - 10-12h)
5. ✅ Validação Nomes Duplicados (3h)
6. ✅ Validação Expediente RT (2-3h)
7. ✅ Breakdown Dinâmico (3-4h)
8. ✅ Validação Email (2h)

### Fase 3 - MÉDIA (Sprint 3 - 10-12h)
9. ✅ Baggage Handling (3-4h)
10. ✅ Golf Extras (2-3h)
11. ✅ Print/Send Email (3h)
12. ✅ Copy Holder (1-2h)
13. ✅ Go Back Cache (2h)

### Fase 4 - BAIXA (Sprint 4 - 8-10h)
14. ✅ Immediate Payment (8-10h)

**Tempo Total Estimado**: 40-50 horas

---

## 💡 DECISÕES ARQUITETURAIS

### Estrutura de Módulos JavaScript:

```
assets/js/
├── soltour-booking.js           # Main
├── modules/
│   ├── delayed-availability.js  # ✅ Já implementado
│   ├── toast-notifications.js   # ✅ Já implementado
│   ├── delayed-quote.js         # NOVO
│   ├── optional-services.js     # NOVO
│   ├── validations.js           # NOVO
│   ├── breakdown.js             # NOVO
│   └── quote-form.js            # NOVO
```

### Estrutura PHP:

```
includes/
├── class-soltour-api.php         # Adicionar novos métodos
├── class-soltour-quote.php       # NOVO - Lógica de quote
├── class-soltour-validations.php # NOVO - Validações
└── class-soltour-payments.php    # NOVO - Pagamentos
```

---

## ⚠️ AVISOS IMPORTANTES

1. **DelayedQuote** é similar ao DelayedAvailability já implementado
2. **CheckAllowedSelling** já foi parcialmente implementado na availability
3. **UpdateOptionalService** requer backend Soltour suportar
4. **Immediate Payment** é específico para B2B/agências
5. **Breakdown** pode variar por tipo de usuário (B2B vs B2C)

---

## 📝 PRÓXIMOS PASSOS

1. [ ] Revisar este documento com equipe
2. [ ] Priorizar fases conforme negócio
3. [ ] Criar issues no GitHub
4. [ ] Alocar sprints
5. [ ] Começar implementação

---

## 📚 REFERÊNCIAS

- **Arquivo analisado**: `quote.min.js` (1.369 linhas)
- **Data da análise**: 2025-11-12
- **Plugin versão**: v4.0
- **Site oficial**: https://soltour.com

---

**Status**: ✅ Análise completa
**Próximo passo**: Criar plano de implementação detalhado
