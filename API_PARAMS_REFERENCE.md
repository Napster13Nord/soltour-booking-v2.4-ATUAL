# 📚 REFERÊNCIA COMPLETA DE PARÂMETROS DA API SOLTOUR

## 🎯 ENDPOINT: `/package/process/availability/Availability`

### REQUEST COMPLETO (baseado em availability.min.js)

```javascript
{
  // ==========================================
  // 1. PARÂMETROS BÁSICOS (Já implementados)
  // ==========================================

  "originCode": "LIS",                    // Código IATA da origem
  "destinationCode": "PUJ",               // Código IATA do destino
  "startDate": "2025-11-20",              // Data início (YYYY-MM-DD)
  "numNights": 7,                         // Número de noites (int)

  "accomodation": {
    "rooms": [
      {
        "passengers": [
          { "type": "ADULT", "age": 30 },
          { "type": "ADULT", "age": 28 },
          { "type": "CHILD", "age": 10 }
        ]
      }
    ]
  },

  // ==========================================
  // 2. TIPO DE PRODUTO (CRÍTICO - FALTA)
  // ==========================================

  "onlyHotel": "N",                       // "S" = só hotel | "N" = pacote com voo
  "productType": "PACKAGE",               // "PACKAGE" | "HOTEL_PRODUCT"

  // Regra:
  // - Se TEM originCode → onlyHotel="N", productType="PACKAGE"
  // - Se NÃO tem originCode → onlyHotel="S", productType="HOTEL_PRODUCT"

  // ==========================================
  // 3. CONTROLE DE DISPONIBILIDADE (CRÍTICO)
  // ==========================================

  "forceAvail": false,                    // true = forçar busca real de preços
                                          // false = pode retornar sem preços

  // Regra:
  // - Primeira busca: forceAvail=false (rápido, pode não ter preços)
  // - Segunda busca: forceAvail=true (lento, garante preços)

  // ==========================================
  // 4. TRACKING DE CATÁLOGO (IMPORTANTE)
  // ==========================================

  "catalogueHotelCodes": [],              // Array de códigos de hotéis do catálogo
  "catalogueHotels": [],                  // Array de objetos de hotéis
  "hotelTotalCount": 0,                   // Total de hotéis encontrados
  "hotelTotalCountInFilter": 0,           // Total após aplicar filtros

  // Regra:
  // - Estes valores são retornados na response
  // - Devem ser RE-ENVIADOS nas próximas requests (filtros, paginação)

  // ==========================================
  // 5. PAGINAÇÃO E ORDENAÇÃO (IMPORTANTE)
  // ==========================================

  "pageNumber": 1,                        // Página atual (int, começa em 1)
  "orderType": "PRICE",                   // Tipo de ordenação
                                          // Valores: "PRICE", "STARS", "NAME", etc
  "orderDirection": "ASC",                // Direção da ordenação
                                          // Valores: "ASC", "DESC"

  // ==========================================
  // 6. FILTROS (USADO EM /filter)
  // ==========================================

  "selectedHotelsCodes": [],              // Array de códigos de hotéis selecionados
                                          // Para filtrar por hotéis específicos

  // Filtros adicionais (variam por implementação)
  "filters": {
    "stars": [3, 4, 5],                   // Estrelas selecionadas
    "maxPrice": 5000,                     // Preço máximo
    "zones": ["BAVARO", "PUNTA_CANA"],    // Zonas selecionadas
    "mealPlans": ["AI", "BB"]             // Regimes alimentares
  },

  // ==========================================
  // 7. RESIDENTE (OPCIONAL)
  // ==========================================

  "residentType": "RESIDENT_CANARY",      // Código de tipo de residente
                                          // null se não aplicável

  // Regra:
  // - Verificar com checkResidentType(originCode, destinationCode)
  // - Só disponível para certos pares origem/destino

  // ==========================================
  // 8. LANDING PAGE / CAMPANHA (OPCIONAL)
  // ==========================================

  "idLanding": undefined,                 // ID da landing page (se houver)
  "idLandingConf": undefined,             // Configuração da landing
  "familyCode": undefined,                // Código da família de produtos
  "productCode": undefined,               // Código do produto específico

  // ==========================================
  // 9. TIMEZONE (IMPORTANTE PARA TIMESTAMPS)
  // ==========================================

  "utcOffset": 0,                         // Offset UTC em minutos
                                          // Exemplo: Lisboa = 0, Madrid = 60

  // Obter com: moment().utcOffset()

  // ==========================================
  // 10. TIPO DE VOO (USADO EM /flights)
  // ==========================================

  "flightType": "RECOMMENDED",            // Tipo de voo selecionado
                                          // Valores: "RECOMMENDED", "CHEAPEST"

  // ==========================================
  // 11. OPÇÕES DE RESULTADO (OPCIONAL)
  // ==========================================

  "resultsOnly": false,                   // true = retornar só resultados HTML
                                          // false = retornar estrutura completa

  // ==========================================
  // 12. NOME DA ORIGEM/DESTINO (DISPLAY)
  // ==========================================

  "originName": "Lisboa",                 // Nome da origem (para exibição)
  "destinationName": "Punta Cana"         // Nome do destino (para exibição)
}
```

---

## 📥 RESPONSE ESPERADO

```javascript
{
  "result": {
    "ok": true,                           // Sucesso da operação
    "errorMessage": null                  // Mensagem de erro (se ok=false)
  },

  "data": {
    // Token de disponibilidade (CRÍTICO)
    "availToken": "abc123xyz789",         // Guardar para próximas requests

    // Budgets (pacotes disponíveis)
    "budgets": [
      {
        "budgetId": "BUD123",
        "hotelServices": [
          {
            "hotelCode": "HTL001",
            "providerCode": "PROVIDER1",
            "startDate": "2025-11-20",
            "endDate": "2025-11-27",
            "mealPlan": {
              "code": "AI",
              "description": "All Inclusive"
            }
          }
        ],
        "flightServices": [...],
        "priceBreakdown": {
          "priceBreakdownDetails": [
            {
              "priceInfo": {
                "pvp": 2970.54,
                "currency": "EUR"
              }
            }
          ]
        }
      }
    ],

    // Hotéis (informação detalhada)
    "hotels": [
      {
        "code": "HTL001",
        "name": "Hotel Paraíso",
        "destinationCode": "PUJ",
        "destinationDescription": "Punta Cana",
        "categoryCode": "****",
        "mainImage": "https://...",
        "multimedias": [...]
      }
    ],

    // Tracking
    "totalCount": 150,                    // Total de budgets
    "catalogueHotelCodes": [...],
    "catalogueHotels": [...],
    "hotelTotalCount": 45,
    "hotelTotalCountInFilter": 45,

    // Delayed Availability
    "delayedAvailabilityActive": true,    // Se deve usar delayed

    // Contadores
    "flightsFound": 10,
    "flightsAlternativesFound": 5,
    "flightsConnectionFound": 3
  }
}
```

---

## 🔄 FLUXO DE REQUESTS

### 1️⃣ PRIMEIRA BUSCA (Initial Search)
```javascript
POST /package/process/availability/Availability
{
  originCode: "LIS",
  destinationCode: "PUJ",
  startDate: "2025-11-20",
  numNights: 7,
  accomodation: {...},
  onlyHotel: "N",
  productType: "PACKAGE",
  forceAvail: false,        // ← Primeira vez: false
  pageNumber: 1
}

RESPONSE → availToken = "ABC123"
```

### 2️⃣ DELAYED AVAILABILITY (Se ativo)
```javascript
POST /package/process/availability/AvailabilityDelayed
{
  // Mesmos parâmetros da busca anterior +
  availToken: "ABC123",     // ← Token da busca anterior
  forceAvail: true,         // ← Agora true para forçar preços
  catalogueHotelCodes: [...],
  catalogueHotels: [...],
  hotelTotalCount: 45,
  hotelTotalCountInFilter: 45
}

RESPONSE → availToken = "ABC124" (novo token)
```

### 3️⃣ FILTROS (Filter)
```javascript
POST /package/process/availability/AvailabilityFilter
{
  availToken: "ABC124",     // ← Último token
  selectedHotelsCodes: ";", // ← String separada por ;
  pageNumber: 1,
  orderType: "PRICE",
  orderDirection: "ASC",

  // Filtros específicos
  stars: [4, 5],
  zones: ["BAVARO"],

  // Tracking (da response anterior)
  catalogueHotelCodes: [...],
  catalogueHotels: [...],
  hotelTotalCount: 45,
  hotelTotalCountInFilter: 30  // ← Atualizado após filtro
}

RESPONSE → availToken = "ABC125" (novo token)
```

### 4️⃣ PAGINAÇÃO
```javascript
POST /package/process/availability/AvailabilityFilter
{
  availToken: "ABC125",
  pageNumber: 2,            // ← Próxima página
  // Manter todos os outros parâmetros
}
```

### 5️⃣ DETALHES DO HOTEL
```javascript
POST /package/process/hotel/HotelDetails
{
  availToken: "ABC125",
  budgetId: "BUD123",
  hotelCode: "HTL001",
  providerCode: "PROVIDER1",
  flightType: "RECOMMENDED"
}
```

### 6️⃣ CHECK ALLOWED SELLING
```javascript
POST /package/process/availability/CheckAllowedSelling
{
  // Sem parâmetros necessários (só sessão)
}

RESPONSE:
{
  "result": {
    "ok": true,
    "errorMessage": null
  }
}
```

### 7️⃣ QUOTE (Cotação)
```javascript
POST /package/process/quote/Quote
{
  availToken: "ABC125",
  budgetId: "BUD123",
  hotelCode: "HTL001",
  providerCode: "PROVIDER1"
}
```

---

## ⚠️ REGRAS IMPORTANTES

### 1. availToken
- **SEMPRE** usar o availToken mais recente
- Cada response pode retornar um novo availToken
- Guardar e atualizar após cada operação

### 2. onlyHotel e productType
```javascript
if (hasOriginCode) {
  onlyHotel = "N"
  productType = "PACKAGE"
} else {
  onlyHotel = "S"
  productType = "HOTEL_PRODUCT"
}
```

### 3. forceAvail
```javascript
// Primeira busca
forceAvail = false  // Rápido, pode não ter preços

// Delayed availability
forceAvail = true   // Lento, garante preços
```

### 4. Tracking de Catálogo
```javascript
// SEMPRE re-enviar os valores da response anterior:
catalogueHotelCodes
catalogueHotels
hotelTotalCount
hotelTotalCountInFilter
```

### 5. State no URL
```javascript
// Atualizar URL após cada operação
window.history.replaceState({}, '',
  `/availability?availToken=${availToken}&state=${stateCounter++}`
)
```

---

## 🧪 TESTES RECOMENDADOS

### Teste 1: Busca com voo (PACKAGE)
```javascript
{
  originCode: "LIS",
  destinationCode: "PUJ",
  onlyHotel: "N",
  productType: "PACKAGE"
}
// Deve retornar pacotes com voo
```

### Teste 2: Busca sem voo (HOTEL_PRODUCT)
```javascript
{
  // SEM originCode
  destinationCode: "PUJ",
  onlyHotel: "S",
  productType: "HOTEL_PRODUCT"
}
// Deve retornar só hotéis
```

### Teste 3: forceAvail
```javascript
// Request 1
{ forceAvail: false }
// Deve ser rápido, pode não ter preços

// Request 2 (com mesmo availToken)
{ forceAvail: true }
// Mais lento, deve ter preços
```

### Teste 4: Filtros
```javascript
// Request 1: Busca inicial
→ Recebe availToken + catalogueHotelCodes

// Request 2: Aplicar filtro
{
  availToken: "ABC123",
  catalogueHotelCodes: [...],  // Do request 1
  stars: [4, 5]
}
→ Deve retornar apenas 4-5 estrelas
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Enviar `onlyHotel` corretamente
- [ ] Enviar `productType` corretamente
- [ ] Implementar `forceAvail` (false → true)
- [ ] Guardar e reutilizar `availToken`
- [ ] Re-enviar `catalogueHotelCodes` nas requests subsequentes
- [ ] Re-enviar `hotelTotalCount` nas requests subsequentes
- [ ] Atualizar URL com `state` tracking
- [ ] Enviar `utcOffset` correto
- [ ] Implementar paginação com `pageNumber`
- [ ] Implementar ordenação com `orderType`/`orderDirection`
- [ ] Implementar `selectedHotelsCodes` para filtros

---

**Última atualização**: 2025-11-12
