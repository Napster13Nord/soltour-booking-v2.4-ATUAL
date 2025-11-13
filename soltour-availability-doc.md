# Soltour API --- Documentação para Implementação do Endpoint `/booking/availability`

**Projeto:** Plugin WordPress para reservas externas\
**Objetivo:** Orientar o desenvolvedor na coleta de voos, hotéis,
quartos, imagens e preços usando exclusivamente o endpoint
`/booking/availability`.

## 1. Requisição ao endpoint `/booking/availability`

``` json
POST /soltour/v5/booking/availability
{
  "productType": "PACKAGE",
  "criteria": {
    "order": {
      "type": "PRICE",
      "direction": "ASC"
    },
    "pagination": {
      "firstItem": 0,
      "itemCount": 10
    }
  },
  "languageCode": "PT",
  "params": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "residentType": "NONE",
    "accomodation": {
      "rooms": [
        {
          "passengers": [
            { "type": "ADULT", "age": 30 },
            { "type": "ADULT", "age": 30 }
          ]
        }
      ]
    },
    "hotelParams": {
      "destinationCode": "DESTINATION_CODE",
      "includeImmediatePayment": true
    },
    "flightParams": {
      "itineraries": [
        {
          "origins": ["LIS"],
          "destinations": ["PUJ"]
        }
      ]
    }
  }
}
```

## 1.1. Parâmetros obrigatórios

  -----------------------------------------------------------------------------------------
  Parâmetro                                   Origem                Exemplo
  ------------------------------------------- --------------------- -----------------------
  `startDate`                                 Seleção do usuário    `"2025-06-10"`

  `endDate`                                   Seleção do usuário    `"2025-06-17"`

  `destinationCode`                           Seleção do usuário    `"10#PUJ"`

  `flightParams.itineraries.origins[]`        Seleção do usuário    `"LIS"`

  `flightParams.itineraries.destinations[]`   Derivado do destino   `"PUJ"`

  `rooms[].passengers[]`                      Seleção               `{ age, type }`

  `criteria.pagination.firstItem`             Página                `0, 10, 20…`

  `criteria.pagination.itemCount`             Nº resultados         `10`
  -----------------------------------------------------------------------------------------

## 2. Estrutura da Resposta

A resposta contém: - `budgets[]` - `hotels[]` - `flights[]`

## 3. Dados do Hotel

Use:

``` php
$hotel = find($response['hotels'], fn($h) => $h['code'] === $hotelCode);
```

## 4. Dados dos Voos

Use:

``` php
$flight = find($response['flights'], fn($f) => $f['id'] === $flightId);
```

## 5. Dados dos Quartos

Local:

    budget.hotelServices[0].mealPlan.combination.rooms[]

## 6. Preço Total

Use:

    budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp

## 7. Resumo por Pacote

-   Hotel
-   Quartos
-   Voos
-   Preço final

## 8. Regras

1.  Não usar `/details`
2.  Paginação correta
3.  Sem duplicações

## 9. Entregáveis

-   Função PHP
-   Mapeamento
-   Templates
-   Paginação
