# 🚀 QUICK START - Começar Implementação AGORA

## ⚡ INÍCIO RÁPIDO EM 5 PASSOS

### PASSO 1: Backup e Preparação (5 min)
```bash
# Criar branch de desenvolvimento
git checkout -b feature/availability-improvements

# Fazer backup do arquivo principal
cp soltour-booking-v4-COMPLETO/assets/js/soltour-booking.js \
   soltour-booking-v4-COMPLETO/assets/js/soltour-booking.js.backup

# Criar diretório para novos módulos
mkdir -p soltour-booking-v4-COMPLETO/assets/js/modules
```

### PASSO 2: Testar API com Parâmetros Atuais (10 min)
```javascript
// Abrir DevTools → Console → Colar este código:

// REQUEST ATUAL (que o plugin faz)
const currentRequest = {
  action: 'soltour_search_packages',
  nonce: soltourData.nonce,
  origin_code: 'LIS',
  destination_code: 'PUJ',
  start_date: '2025-11-20',
  num_nights: 7,
  rooms: JSON.stringify([{
    passengers: [
      { type: 'ADULT', age: 30 },
      { type: 'ADULT', age: 28 }
    ]
  }]),
  first_item: 0,
  item_count: 10
};

// Fazer request
$.post(soltourData.ajaxurl, currentRequest, function(response) {
  console.log('RESPONSE ATUAL:', response);

  if (response.success) {
    console.log('✅ Request funcionou');
    console.log('availToken:', response.data.availToken);
    console.log('Total budgets:', response.data.budgets?.length);
    console.log('Total hotels:', response.data.hotels?.length);
  } else {
    console.log('❌ Request falhou:', response);
  }
});
```

### PASSO 3: Adicionar Flags Críticos (30 min)

#### 3.1. Atualizar JavaScript
Abrir: `soltour-booking-v4-COMPLETO/assets/js/soltour-booking.js`

Encontrar a função `performSearch()` (linha ~262) e modificar:

```javascript
// ANTES (linha ~285):
SoltourApp.searchParams = {
    action: 'soltour_search_packages',
    nonce: soltourData.nonce,
    origin_code: SoltourApp.searchParams.originCode,
    destination_code: SoltourApp.searchParams.destinationCode,
    start_date: startDate,
    num_nights: nights,
    rooms: JSON.stringify([{ passengers: passengers }]),
    first_item: 0,
    item_count: SoltourApp.itemsPerPage
};

// DEPOIS:
// Determinar tipo de produto
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

    // NOVOS PARÂMETROS CRÍTICOS
    only_hotel: onlyHotel,
    product_type: productType,
    force_avail: false,

    first_item: 0,
    item_count: SoltourApp.itemsPerPage
};

// Log para debug
log('Parâmetros de busca:', {
    onlyHotel: onlyHotel,
    productType: productType,
    forceAvail: false
});
```

#### 3.2. Atualizar PHP
Abrir: `soltour-booking-v4-COMPLETO/includes/class-soltour-booking-api.php`

Encontrar a função `search_packages()` e modificar:

```php
// Encontrar onde monta o $request_body (por volta da linha 150-200)

// ANTES:
$request_body = [
    'originCode' => $params['origin_code'],
    'destinationCode' => $params['destination_code'],
    'startDate' => $params['start_date'],
    'numNights' => (int)$params['num_nights'],
    'accomodation' => [
        'rooms' => $rooms
    ]
];

// DEPOIS:
$request_body = [
    'originCode' => $params['origin_code'],
    'destinationCode' => $params['destination_code'],
    'startDate' => $params['start_date'],
    'numNights' => (int)$params['num_nights'],
    'accomodation' => [
        'rooms' => $rooms
    ],

    // NOVOS PARÂMETROS
    'onlyHotel' => isset($params['only_hotel']) ? $params['only_hotel'] : 'N',
    'productType' => isset($params['product_type']) ? $params['product_type'] : 'PACKAGE',
    'forceAvail' => isset($params['force_avail']) ? filter_var($params['force_avail'], FILTER_VALIDATE_BOOLEAN) : false
];

// Log para debug
error_log('Request body: ' . print_r($request_body, true));
```

### PASSO 4: Testar Mudanças (10 min)

```javascript
// DevTools → Console

// 1. Fazer uma busca COM origem
//    - Verificar console logs
//    - Verificar Network tab → Payload
//    - Deve ter: only_hotel="N", product_type="PACKAGE"

// 2. Ver payload no Network tab:
// Request Headers → Form Data deve mostrar:
only_hotel: N
product_type: PACKAGE
force_avail: false

// 3. Ver response:
// Deve retornar budgets normalmente
```

### PASSO 5: Implementar State Tracking (30 min)

#### 5.1. Adicionar variável de state
No início do arquivo `soltour-booking.js`, modificar:

```javascript
// Linha ~34 - Adicionar:
window.SoltourApp = {
    availToken: null,
    budgetId: null,
    hotelCode: null,
    providerCode: null,
    expedient: null,
    searchParams: {},
    selectedPackage: null,

    // NOVO
    state: 0,  // Contador de estado

    currentMonth: new Date().getMonth() + 1,
    // ... resto ...
};
```

#### 5.2. Criar função updateURLState
Adicionar após a função `hideLoadingModal()` (linha ~123):

```javascript
/**
 * Atualiza a URL com availToken e state tracking
 * @param {string} availToken - Token de disponibilidade
 */
function updateURLState(availToken) {
    if (!availToken) {
        logError('updateURLState chamado sem availToken');
        return;
    }

    SoltourApp.state++;

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('availToken', availToken);
    newUrl.searchParams.set('state', SoltourApp.state);

    window.history.replaceState({}, '', newUrl);

    log(`📍 URL atualizado: state=${SoltourApp.state}, availToken=${availToken.substring(0, 10)}...`);
}
```

#### 5.3. Atualizar searchPackagesAjax
Encontrar a função `searchPackagesAjax()` (linha ~580) e modificar o success:

```javascript
success: function(response) {
    $('#soltour-results-loading').hide();
    log('Resposta completa da API:', response);

    if (response.success && response.data) {
        SoltourApp.availToken = response.data.availToken;

        // NOVO: Atualizar URL com state tracking
        updateURLState(SoltourApp.availToken);

        SoltourApp.allBudgets = response.data.budgets || [];
        // ... resto do código ...
    }
}
```

### PASSO 6: Testar State Tracking (5 min)

```javascript
// 1. Fazer uma busca
// 2. Verificar URL mudou para:
//    /pacotes-resultados/?availToken=ABC123&state=1

// 3. Aplicar um filtro
// 4. Verificar URL mudou para:
//    /pacotes-resultados/?availToken=ABC123&state=2

// 5. Dar F5 na página
// 6. Verificar se resultados são mantidos
```

---

## 📊 RESULTADO ESPERADO APÓS 90 MIN

✅ **Implementado:**
- Flags críticos (`onlyHotel`, `productType`, `forceAvail`)
- State tracking básico
- URL management
- Logs de debug

✅ **Deve funcionar:**
- Busca normal continua funcionando
- Parâmetros corretos enviados para API
- URL atualiza com state
- Console mostra logs claros

✅ **Próximos passos preparados:**
- Base para DelayedAvailability
- Base para Filtros AJAX
- Estrutura para módulos

---

## 🐛 TROUBLESHOOTING RÁPIDO

### Problema: "Nenhum resultado encontrado"
```javascript
// Verificar console:
// 1. Parâmetros enviados estão corretos?
// 2. Response tem erro?
// 3. availToken foi retornado?

// Verificar Network tab:
// 1. Status 200?
// 2. Response tem data?
```

### Problema: "URL não atualiza"
```javascript
// Verificar:
// 1. Função updateURLState() foi chamada?
// 2. availToken existe?
// 3. Está na página de resultados?

// Debug:
console.log('availToken:', SoltourApp.availToken);
console.log('state:', SoltourApp.state);
console.log('URL atual:', window.location.href);
```

### Problema: "Console mostra erro PHP"
```php
// Verificar:
// 1. PHP error log
// 2. Sintaxe correta no PHP
// 3. Variáveis existem antes de usar

// Debug PHP:
error_log('Params recebidos: ' . print_r($params, true));
error_log('Request body: ' . print_r($request_body, true));
```

---

## 📝 COMMIT APÓS PASSO 5

```bash
# Adicionar mudanças
git add .

# Commit com mensagem descritiva
git commit -m "feat: Adicionar flags críticos e state tracking

- Implementar onlyHotel, productType, forceAvail
- Adicionar state tracking na URL
- Atualizar availToken após cada operação
- Adicionar logs de debug

BREAKING CHANGE: Parâmetros adicionais enviados para API"

# Push para branch
git push origin feature/availability-improvements
```

---

## 🎯 PRÓXIMOS 90 MINUTOS

Depois de completar os primeiros 90 minutos, você estará pronto para:

1. **Implementar DelayedAvailability** (FASE 4)
   - Arquivo novo: `modules/delayed-availability.js`
   - Seguir o plano detalhado em `PLANO_IMPLEMENTACAO.md`

2. **Testar com usuários reais**
   - Busca funciona?
   - Resultados aparecem?
   - Logs fazem sentido?

3. **Continuar para próxima fase**
   - Seguir checklist em `CHECKLIST_VALIDACAO.md`

---

## 💡 DICAS IMPORTANTES

1. **Use Console Logs**: Não tenha medo de adicionar muitos logs durante desenvolvimento
2. **Teste Incrementalmente**: Teste cada mudança antes de fazer a próxima
3. **Mantenha Backup**: Sempre tenha como voltar atrás
4. **Commit Frequente**: Commit pequeno é melhor que commit grande
5. **Leia Erros**: Messages de erro geralmente dizem exatamente o problema

---

## 🎓 APRENDIZADOS ESPERADOS

Após estes primeiros passos, você terá aprendido:

- ✅ Como o site oficial estrutura os requests
- ✅ Quais parâmetros são críticos
- ✅ Como fazer state tracking
- ✅ Como atualizar URL sem reload
- ✅ Base para continuar melhorias

---

## ❓ DÚVIDAS COMUNS

**P: Por que `onlyHotel` é string "N"/"S" e não boolean?**
R: É assim que a API Soltour espera. String é o formato original.

**P: O que é `forceAvail`?**
R: Flag que diz se deve forçar busca real de preços (lento) ou pode retornar sem preços (rápido).

**P: Por que incrementar `state`?**
R: Para tracking de operações e manter histórico. Útil para analytics e debug.

**P: Preciso mexer no PHP?**
R: Sim, PHP é quem monta o request para API Soltour. Precisa adicionar os novos parâmetros.

---

## 🚀 COMEÇAR AGORA!

**Tempo total estimado**: 90 minutos
**Dificuldade**: ⭐⭐ (Médio)
**Pré-requisitos**: Conhecimento básico de JavaScript e PHP

**LET'S GO!** 🎉

1. Abra o terminal
2. Execute o PASSO 1
3. Siga passo a passo
4. Teste após cada mudança
5. Commit quando funcionar

Boa sorte! 💪
