# 📋 Próximos Passos - Finalização do Plugin Soltour Booking

## 🎯 Estado Atual do Plugin (Sessão Atual - 14/11/2025)

### ✅ Implementações Concluídas

#### 1. Formulário de Busca
- ✅ Coleta de idade de **cada adulto** (18-100 anos)
- ✅ Coleta de idade de **cada criança** (0-17 anos)
- ✅ Suporte para **múltiplos quartos**
- ✅ Dados estruturados corretamente no formato:
```json
{
  "rooms": [
    {
      "passengers": [
        { "type": "ADULT", "age": 30 },
        { "type": "CHILD", "age": 6 }
      ]
    },
    {
      "passengers": [
        { "type": "ADULT", "age": 26 },
        { "type": "CHILD", "age": 6 }
      ]
    }
  ]
}
```

#### 2. Pré-seleção de Quartos
- ✅ Correção do bug onde apenas 1 quarto era pré-selecionado
- ✅ Pré-seleção automática de N quartos (conforme busca)
- ✅ `numRoomsSearched` extraído corretamente do sessionStorage

#### 3. Página de Cotação
- ✅ Exibição de **TODOS os quartos** selecionados
- ✅ Informações detalhadas por quarto (adultos, crianças, idades)
- ✅ Dados completos salvos em `BeautyTravelQuote.budgetData`
- ✅ `searchParams` com `rooms` completo disponível

#### 4. Sistema de Debug
- ✅ Logs detalhados da requisição para `/booking/availability`
- ✅ Logs detalhados da resposta do endpoint
- ✅ Visualização formatada de todos os parâmetros
- ✅ Logs de erro completos para troubleshooting

#### 5. Melhorias de UX
- ✅ Ícone de avião ✈️ no campo "Origem" (substituído telefone)
- ✅ Labels descritivas para idades
- ✅ Visual consistency em todo formulário

---

## 🚀 Próxima Fase: Finalização do Fluxo de Disponibilidade

### 📍 Objetivo
Garantir que os dados dos passageiros (idades) sejam enviados corretamente para o endpoint `/booking/availability` e que os endpoints subsequentes utilizem o `availToken` sem reenviar os passageiros.

---

## 🔄 Fluxo Completo de Endpoints

### 1️⃣ `/booking/availability` (Busca Inicial)
**Status:** ⚠️ REQUER VERIFICAÇÃO

**O que deve ser enviado:**
```json
{
  "action": "soltour_search_packages",
  "origin_code": "LIS",
  "destination_code": "PUJ",
  "start_date": "2025-06-15",
  "num_nights": 7,
  "rooms": "[{\"passengers\":[{\"type\":\"ADULT\",\"age\":30},{\"type\":\"CHILD\",\"age\":6}]},{\"passengers\":[{\"type\":\"ADULT\",\"age\":26},{\"type\":\"CHILD\",\"age\":6}]}]",
  "only_hotel": "N",
  "product_type": "PACKAGE",
  "force_avail": true,
  "first_item": 0,
  "item_count": 100
}
```

**✅ JÁ IMPLEMENTADO:**
- Dados dos quartos com idades reais estão sendo coletados
- Estrutura JSON correta
- Logs de debug para verificar payload

**⚠️ PRECISA VERIFICAR:**
1. Se o backend PHP está recebendo o parâmetro `rooms` corretamente
2. Se está fazendo o parse do JSON de `rooms`
3. Se está montando o payload para a API Soltour no formato correto:
```json
{
  "params": {
    "accomodation": {
      "rooms": [
        {
          "passengers": [
            { "type": "ADULT", "age": 30 },
            { "type": "CHILD", "age": 6 }
          ]
        },
        {
          "passengers": [
            { "type": "ADULT", "age": 26 },
            { "type": "CHILD", "age": 6 }
          ]
        }
      ]
    }
  }
}
```

**O que a API retorna:**
```json
{
  "availToken": "AVL123456789...",
  "budgets": [...],
  "params": {
    "accomodation": {
      "rooms": [
        // Echo dos dados enviados
      ]
    }
  }
}
```

---

### 2️⃣ `/booking/fetchAvailability` (Ao clicar em um pacote)
**Status:** ⚠️ REQUER IMPLEMENTAÇÃO

**Quando chamar:**
- Quando usuário clica em "Selecionar" ou "Ver Quartos" em um pacote

**O que deve ser enviado:**
```json
{
  "productType": "PACKAGE",
  "availToken": "<mesmo do availability>",
  "selectedBudgetId": "<id do pacote escolhido>"
}
```

**⚠️ IMPORTANTE:**
- **NÃO** enviar dados de `rooms` ou `passengers`
- **NÃO** enviar `params.accomodation`
- A Soltour usa `availToken + selectedBudgetId` para reconstruir tudo

**O que a API retorna:**
```json
{
  "budget": {
    "budgetId": "H123##TI##...",
    "hotelServices": [{
      "mealPlan": {
        "combination": {
          "rooms": [
            {
              "passengers": [
                { "type": "ADULT", "age": 30 },
                { "type": "CHILD", "age": 6 }
              ]
            }
          ]
        }
      }
    }]
  }
}
```

---

### 3️⃣ `/booking/quote` (Página de Cotação Final)
**Status:** ⚠️ REQUER IMPLEMENTAÇÃO

**Quando chamar:**
- Quando usuário clica em "Gerar Cotação Final"

**O que deve ser enviado:**
```json
{
  "productType": "PACKAGE",
  "availToken": "<mesmo do availability>",
  "budgetIds": ["<budgetId do pacote>"]
}
```

**⚠️ IMPORTANTE:**
- **NÃO** enviar dados de `rooms` ou `passengers`
- **NÃO** enviar `params.accomodation`
- Tudo vem amarrado ao `availToken + budgetId`

**O que a API retorna:**
- Cotação final com preços
- Detalhes completos do pacote
- Dados de voos, hotel, quartos (já com passageiros corretos)

---

## 📝 Tarefas Pendentes para Amanhã

### 🔧 Backend PHP

#### Arquivo: `includes/class-soltour-ajax-handlers.php`

**1. Verificar método `search_packages()`**
```php
// ⚠️ VERIFICAR SE ESTÁ ASSIM:
public function search_packages() {
    // 1. Receber parâmetro 'rooms' do POST
    $rooms_json = isset($_POST['rooms']) ? $_POST['rooms'] : '[]';

    // 2. Fazer parse do JSON
    $rooms = json_decode($rooms_json, true);

    // 3. Montar payload para API Soltour
    $api_params = [
        'params' => [
            'accomodation' => [
                'rooms' => $rooms  // ← Enviar array com passengers e ages
            ],
            // ... outros parâmetros
        ]
    ];

    // 4. Chamar API /booking/availability
    $response = $this->soltour_api->call_availability($api_params);

    // 5. Retornar response (inclui availToken)
    return $response;
}
```

**2. Implementar método `fetch_availability()`**
```php
// ⚠️ NOVO - PRECISA CRIAR
public function fetch_availability() {
    // Receber apenas:
    // - availToken
    // - selectedBudgetId
    // - productType

    $avail_token = $_POST['availToken'];
    $budget_id = $_POST['selectedBudgetId'];
    $product_type = $_POST['productType'];

    // Chamar API /booking/fetchAvailability
    $response = $this->soltour_api->call_fetch_availability([
        'productType' => $product_type,
        'availToken' => $avail_token,
        'selectedBudgetId' => $budget_id
    ]);

    // Retornar rooms completos com passengers
    return $response;
}
```

**3. Implementar método `generate_quote()`**
```php
// ⚠️ VERIFICAR/AJUSTAR
public function generate_quote() {
    // Receber apenas:
    // - availToken
    // - budgetIds
    // - productType

    $avail_token = $_POST['availToken'];
    $budget_ids = $_POST['budgetIds'];
    $product_type = $_POST['productType'];

    // NÃO enviar passengers aqui!
    // Chamar API /booking/quote
    $response = $this->soltour_api->call_quote([
        'productType' => $product_type,
        'availToken' => $avail_token,
        'budgetIds' => $budget_ids
    ]);

    return $response;
}
```

---

### 🎨 Frontend JavaScript

#### Arquivo: `assets/js/soltour-booking.js`

**1. Verificar envio correto do `rooms` para availability**
```javascript
// ✅ JÁ ESTÁ CORRETO (linha 482)
rooms: JSON.stringify(rooms),  // String JSON com passengers e ages
```

**2. Adicionar chamada para `fetchAvailability` ao clicar em pacote**
```javascript
// ⚠️ PRECISA ADICIONAR
function selectPackage(budgetId) {
    // Mostrar modal de loading
    showLoadingModal('Carregando detalhes do pacote...');

    $.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        data: {
            action: 'soltour_fetch_availability',
            nonce: soltourData.nonce,
            productType: 'PACKAGE',
            availToken: SoltourApp.availToken,  // ← Já temos
            selectedBudgetId: budgetId
        },
        success: function(response) {
            if (response.success) {
                // Budget retornado tem rooms completos com passengers
                // Salvar e ir para página de cotação
                proceedWithPackageSelection(budgetId, response.data.budget);
            }
        }
    });
}
```

---

#### Arquivo: `assets/js/quote-page.js`

**3. Atualizar chamada de `generate_quote`**
```javascript
// ⚠️ PRECISA AJUSTAR (linha 744)
function generateFinalQuote() {
    // ...

    $.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        data: {
            action: 'soltour_generate_quote',
            nonce: soltourData.nonce,
            productType: 'PACKAGE',
            availToken: BeautyTravelQuote.budgetData.availToken,  // ← Usar availToken
            budgetIds: [BeautyTravelQuote.budgetData.budgetId],
            // ❌ NÃO ENVIAR: budget_data, passengers, rooms
        },
        success: function(response) {
            // A resposta já vem com todos os dados de passageiros
            // vindos do availToken
        }
    });
}
```

---

## 🧪 Testes para Validar

### Teste 1: Busca com 2 Quartos
1. Preencher formulário:
   - Origem: Lisboa
   - Destino: Punta Cana
   - 2 quartos
   - Quarto 1: 1 adulto (30 anos), 1 criança (6 anos)
   - Quarto 2: 1 adulto (26 anos), 1 criança (3 anos)

2. Verificar logs do console:
```
[SOLTOUR DEBUG] Dados dos quartos: [...]
[SOLTOUR DEBUG] REQUISIÇÃO PARA ENDPOINT AVAILABILITY
  Quarto 1: 1 adulto (30 anos), 1 criança (6 anos)
  Quarto 2: 1 adulto (26 anos), 1 criança (3 anos)
```

3. Verificar no backend PHP (adicionar log):
```php
error_log('Rooms recebido: ' . print_r($rooms, true));
error_log('Payload para API: ' . print_r($api_params, true));
```

4. Verificar resposta da API:
```
[SOLTOUR DEBUG] RESPOSTA DO ENDPOINT AVAILABILITY
  Avail Token: AVL...
  Total de Budgets: 25
```

### Teste 2: Seleção de Pacote
1. Clicar em um pacote
2. Verificar chamada `fetchAvailability`
3. Verificar que recebe rooms com passengers corretos
4. Página de cotação deve mostrar 2 quartos com idades corretas

### Teste 3: Geração de Cotação
1. Preencher dados dos passageiros
2. Clicar em "Gerar Cotação"
3. Verificar que envia apenas `availToken + budgetIds`
4. Backend deve reconstruir tudo a partir do token

---

## 📊 Checklist Final

### Backend PHP
- [ ] Verificar `search_packages()` envia `rooms` corretamente
- [ ] Implementar `fetch_availability()` action
- [ ] Ajustar `generate_quote()` para usar apenas availToken
- [ ] Adicionar logs de debug no PHP
- [ ] Testar parse de JSON do parâmetro `rooms`

### Frontend JavaScript
- [ ] Verificar que `rooms` está no formato correto
- [ ] Implementar chamada para `fetchAvailability`
- [ ] Ajustar `generateFinalQuote()` para não enviar passengers
- [ ] Adicionar tratamento de erros
- [ ] Validar que availToken está sendo preservado

### Integração
- [ ] Testar fluxo completo: Busca → Seleção → Cotação
- [ ] Verificar que idades são mantidas em todo fluxo
- [ ] Validar que múltiplos quartos funcionam corretamente
- [ ] Testar com diferentes combinações (1, 2, 3 quartos)

---

## 🎯 Resultado Esperado

Ao final desta implementação:

1. ✅ Usuário informa idades de adultos e crianças
2. ✅ Dados são enviados para `/booking/availability`
3. ✅ API retorna `availToken` com tudo amarrado
4. ✅ Clique no pacote chama `/booking/fetchAvailability` (só com token)
5. ✅ Página de cotação mostra quartos corretos
6. ✅ Geração final usa `/booking/quote` (só com token)
7. ✅ Todo fluxo mantém consistência de dados

---

## 📚 Referências de Código

### Logs de Debug Atuais
- `soltour-booking.js:464-465` - Log de dados dos quartos na busca
- `soltour-booking.js:862-932` - Log completo de requisição availability
- `soltour-booking.js:941-976` - Log completo de resposta availability
- `quote-page.js:76-79` - Log de quartos na página de cotação
- `quote-page.js:114-129` - Log de passageiros extraídos

### Estruturas de Dados
- `soltour-booking.js:447-459` - Montagem do array de rooms
- `soltour-booking.js:2127-2139` - Salvamento em sessionStorage
- `quote-page.js:71-72` - Extração de selectedRooms

---

**Última atualização:** 14/11/2025 - Sessão de Debug e Correções
**Status:** Pronto para Fase Final - Integração Backend
**Próxima sessão:** Implementação dos endpoints faltantes
