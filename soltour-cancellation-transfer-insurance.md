# Soltour API – Como mapear Cancelamento, Transfer e Seguro no `/booking/availability`

Esta documentação explica para o desenvolvedor onde buscar:

- Gastos de Cancelación  
- Transfers incluídos  
- Seguros disponíveis  

Tudo baseado no endpoint `/booking/availability`.

---

# 1. Estrutura geral

Cada pacote aparece como um item dentro de:

```json
"budgets": [
  {
    "hotelServices": [],
    "flightServices": [],
    "transferServices": [],
    "insuranceServices": [],
    "carServices": [],
    "priceBreakdown": {}
  }
]
```

---

# 2. Como mapear **Gastos de Cancelación**

Aparecem dentro de:

- `hotelServices[].cancellationChargeServices[]`
- `flightServices[].cancellationChargeServices[]`
- `transferServices[].cancellationChargeServices[]`
- `insuranceServices[].cancellationChargeServices[]`

### Exemplo:

```json
"cancellationChargeServices": [
  {
    "startDate": "2025-11-09",
    "endDate": "2025-11-15",
    "priceInfo": {
      "pvp": 2366.93,
      "currency": "EUR"
    },
    "serviceType": "FLIGHT"
  }
]
```

### Pseudo-código para mapear:

```php
function getCancellationChargesForBudget(array $budget): array {
    $charges = [];

    $groups = [
        'HOTEL'    => $budget['hotelServices']    ?? [],
        'FLIGHT'   => $budget['flightServices']   ?? [],
        'TRANSFER' => $budget['transferServices'] ?? [],
        'INSURANCE'=> $budget['insuranceServices']?? [],
    ];

    foreach ($groups as $type => $services) {
        foreach ($services as $srv) {
            foreach ($srv['cancellationChargeServices'] ?? [] as $c) {
                $charges[] = [
                    'serviceType' => $c['serviceType'] ?? $type,
                    'startDate'   => $c['startDate'] ?? null,
                    'endDate'     => $c['endDate'] ?? null,
                    'amount'      => $c['priceInfo']['pvp'] ?? null,
                    'currency'    => $c['priceInfo']['currency'] ?? null
                ];
            }
        }
    }

    return $charges;
}
```

---

# 3. Como mapear **Transfers incluídos**

Aparecem no array:

```
budget.transferServices[]
```

### Exemplo:

```json
"transferServices": [
  {
    "type": "TRANSFER",
    "status": "OK",
    "startDate": "2025-11-15"
  }
]
```

### Como detectar:

```php
$hasTransfer = !empty($budget['transferServices'] ?? []);
```

---

# 4. Como mapear **Seguros disponíveis**

Eles aparecem em:

```
budget.insuranceServices[]
```

### Exemplo:

```json
"insuranceServices": [
  {
    "type": "INSURANCE",
    "status": "OK",
    "title": "Seguro de viagem internacional com a Europ Assistance"
  }
]
```

### Como detectar:

```php
$hasInsurance = !empty($budget['insuranceServices'] ?? []);
```

---

# 5. Resumo rápido para o desenvolvedor

Por pacote (`budget`):

### Gastos de Cancelación  
Verificar qualquer um destes arrays:

- `hotelServices[].cancellationChargeServices`
- `flightServices[].cancellationChargeServices`
- `transferServices[].cancellationChargeServices`
- `insuranceServices[].cancellationChargeServices`

### Transfer incluído  
→ `!empty(budget.transferServices)`

### Seguro disponível  
→ `!empty(budget.insuranceServices)`

---

# 6. Fluxo recomendado

```
availability
    ↓
mapear: cancelamento, transfer, seguro
    ↓
fetchAvailability
    ↓
quote
    ↓
book
```

---

Documento pronto para envio ao programador.
