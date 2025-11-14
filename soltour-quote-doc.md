# Soltour API – Documentação do endpoint `booking/quote`

Esta documentação resume, a partir do material fornecido, **quais parâmetros são necessários** para chamar o endpoint `quote` e **de onde eles vêm** no fluxo anterior (`availability`, `fetchAvailability`, etc.).

## 1. Objetivo do endpoint `quote`

O endpoint `booking/quote` serve para:

- Bloquear o budget selecionado no cache da Soltour.
- Recalcular o preço final do pacote (hotel + voos + transfers + seguros).
- Retornar detalhes adicionais do pacote, como seguros, extras e breakdown de preços.

## 2. Fluxo anterior necessário

Antes de chamar `quote`, é necessário:

1. Chamar `booking/availability` → retorna lista de budgets + `availToken`.
2. (Opcional) Chamar `booking/fetchAvailability` → retorna budgets com `budgetId`.
3. O usuário escolhe um pacote e você guarda:  
   - `availToken`  
   - `budgetId`

---

## 3. Endpoint `POST /booking/quote`

### 3.1. URL

`https://soltour-svcext.grupo-pinero.com/soltour/v5/booking/quote`

### 3.2. Headers

- `Content-Type: application/json`
- `Authorization: Bearer {access_token}`

### 3.3. Corpo da requisição

```json
{
  "productType": "PACKAGE",
  "availToken": "<token da disponibilidade>",
  "budgetIds": ["<budgetId selecionado>"]
}
```

### Campos obrigatórios

| Campo | Descrição |
|-------|-----------|
| `productType` | Sempre `"PACKAGE"` |
| `availToken` | Token retornado pelo `availability` |
| `budgetIds` | Array contendo 1 ou mais `budgetId` |

---

## 4. De onde vêm os parâmetros

### 4.1. `availToken`

Retornado diretamente pelo endpoint `availability`:

```json
{
  "availToken": "+m1XkW5jpidIsOylIw0GNQtRwhlKEQ4fsINp6EZgdFI="
}
```

### 4.2. `budgetId`

Retornado por endpoints posteriores, como `fetchAvailability`:

```json
{
  "budgetId": "H24##TI##0$5477134021563942853@@FLEXIBLE03"
}
```

---

## 5. Fluxo completo da chamada

1. Usuário faz busca → chama `availability`
2. Sistema salva `availToken`
3. Sistema obtém `budgetIds`
4. Usuário seleciona pacote
5. Plugin chama `quote` com:

```json
{
  "productType": "PACKAGE",
  "availToken": "<availToken>",
  "budgetIds": ["<budgetId>"]
}
```

---

## 6. Estrutura resumida da resposta do quote

```json
{
  "productType": "PACKAGE",
  "availToken": "",
  "budget": {
    "hotelServices": [],
    "flightServices": [],
    "transferServices": [],
    "insuranceServices": [],
    "priceBreakdown": {}
  },
  "insurances": [],
  "extras": [],
  "requestParams": {},
  "result": { "ok": true }
}
```

---

## 7. Resumo prático para o desenvolvedor

Para chamar o endpoint `quote`, você precisa:

- Usar o `availToken` do availability.
- Enviar o `budgetId` do pacote selecionado pelo usuário.
- Manter a coerência: o `budgetId` deve pertencer ao mesmo `availToken`.

Se o retorno for `"budget not found in cache"` → o fluxo deve reiniciar a partir de `availability`.

